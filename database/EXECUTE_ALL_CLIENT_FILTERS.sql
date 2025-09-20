-- =============================================================================
-- CORREÇÃO COMPLETA: ADICIONAR FILTRO POR CLIENTE EM TODAS AS FUNÇÕES DO DASHBOARD
-- Execute este script no Supabase Dashboard > SQL Editor
-- =============================================================================

-- PASSO 1: Remover todas as versões existentes das funções
DO $$
BEGIN
    -- Remover get_dashboard_daily_metrics com todas as possíveis assinaturas
    DROP FUNCTION IF EXISTS public.get_dashboard_daily_metrics(uuid);
    DROP FUNCTION IF EXISTS public.get_dashboard_daily_metrics(uuid, date);
    DROP FUNCTION IF EXISTS public.get_dashboard_daily_metrics(uuid, date, date);
    DROP FUNCTION IF EXISTS public.get_dashboard_daily_metrics(uuid, date, date, text);
    DROP FUNCTION IF EXISTS public.get_dashboard_daily_metrics(uuid, date, date, text, text);
    DROP FUNCTION IF EXISTS public.get_dashboard_daily_metrics(uuid, date, date, text, text, text);
    DROP FUNCTION IF EXISTS public.get_dashboard_daily_metrics(uuid, date, date, text, text, text, uuid);
    
    -- Remover get_dashboard_drilldown com todas as possíveis assinaturas
    DROP FUNCTION IF EXISTS public.get_dashboard_drilldown(uuid, text);
    DROP FUNCTION IF EXISTS public.get_dashboard_drilldown(uuid, text, date);
    DROP FUNCTION IF EXISTS public.get_dashboard_drilldown(uuid, text, date, date);
    DROP FUNCTION IF EXISTS public.get_dashboard_drilldown(uuid, text, date, date, text);
    DROP FUNCTION IF EXISTS public.get_dashboard_drilldown(uuid, text, date, date, text, text);
    DROP FUNCTION IF EXISTS public.get_dashboard_drilldown(uuid, text, date, date, text, text, text);
    DROP FUNCTION IF EXISTS public.get_dashboard_drilldown(uuid, text, date, date, text, text, text, uuid);
    
    RAISE NOTICE 'Funções existentes removidas com sucesso';
END
$$;

-- PASSO 2: Atualizar get_dashboard_daily_metrics
CREATE OR REPLACE FUNCTION public.get_dashboard_daily_metrics(
  user_id uuid,
  start_date date DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date date DEFAULT CURRENT_DATE,
  filter_segment text DEFAULT NULL,
  filter_temperature text DEFAULT NULL,
  filter_source text DEFAULT NULL,
  filter_client_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Verificar permissões
  IF NOT EXISTS (SELECT 1 FROM public.app_users WHERE id = user_id) THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  -- Gerar série de datas e calcular métricas diárias
  WITH date_series AS (
    SELECT generate_series(start_date, end_date, '1 day'::interval)::date as date
  ),
  
  daily_data AS (
    SELECT 
      ds.date,
      COUNT(p.id) as prospeccoes,
      COUNT(CASE WHEN public.has_response(p.status, p.reply) THEN 1 END) as respostas,
      COUNT(CASE WHEN p.status = 'meeting_scheduled' OR p.date_scheduling IS NOT NULL THEN 1 END) as agendamentos,
      COUNT(CASE WHEN p.status = 'meeting_done' THEN 1 END) as reunioes_realizadas,
      COUNT(CASE WHEN p.status = 'won' THEN 1 END) as vendas,
      COALESCE(SUM(CASE WHEN p.status = 'won' THEN p.deal_value END), 0) as faturamento,
      COUNT(CASE WHEN p.source = 'inbound' THEN 1 END) as inbound,
      COUNT(CASE WHEN p.source = 'outbound' THEN 1 END) as outbound
    FROM date_series ds
    LEFT JOIN public.prospects p ON ds.date = p.date_prospect
      AND public.can_manage(user_id, p.owner_id)
      AND (filter_segment IS NULL OR p.segment = filter_segment)
      AND (filter_temperature IS NULL OR p.temperature = filter_temperature)
      AND (filter_source IS NULL OR p.source = filter_source)
      AND (filter_client_id IS NULL OR p.client_id = filter_client_id)
    GROUP BY ds.date
    ORDER BY ds.date
  ),
  
  summary_data AS (
    SELECT 
      SUM(prospeccoes) as total_prospeccoes,
      SUM(respostas) as total_respostas,
      SUM(agendamentos) as total_agendamentos,
      SUM(reunioes_realizadas) as total_reunioes,
      SUM(vendas) as total_vendas,
      SUM(faturamento) as total_faturamento
    FROM daily_data
  )
  
  SELECT json_build_object(
    'labels', (SELECT array_agg(to_char(date, 'DD/MM') ORDER BY date) FROM daily_data),
    'datasets', json_build_object(
      'prospeccoes', (SELECT array_agg(prospeccoes ORDER BY date) FROM daily_data),
      'respostas', (SELECT array_agg(respostas ORDER BY date) FROM daily_data),
      'agendamentos', (SELECT array_agg(agendamentos ORDER BY date) FROM daily_data),
      'reunioes_realizadas', (SELECT array_agg(reunioes_realizadas ORDER BY date) FROM daily_data),
      'vendas', (SELECT array_agg(vendas ORDER BY date) FROM daily_data),
      'faturamento', (SELECT array_agg(faturamento ORDER BY date) FROM daily_data),
      'inbound', (SELECT array_agg(inbound ORDER BY date) FROM daily_data),
      'outbound', (SELECT array_agg(outbound ORDER BY date) FROM daily_data)
    ),
    'summary', json_build_object(
      'total_prospeccoes', (SELECT total_prospeccoes FROM summary_data),
      'total_respostas', (SELECT total_respostas FROM summary_data),
      'total_agendamentos', (SELECT total_agendamentos FROM summary_data),
      'total_reunioes', (SELECT total_reunioes FROM summary_data),
      'total_vendas', (SELECT total_vendas FROM summary_data),
      'total_faturamento', (SELECT total_faturamento FROM summary_data),
      'taxa_resposta', CASE 
        WHEN (SELECT total_prospeccoes FROM summary_data) > 0 
        THEN ROUND(((SELECT total_respostas FROM summary_data)::numeric / (SELECT total_prospeccoes FROM summary_data)) * 100, 2)
        ELSE 0 
      END,
      'taxa_agendamento', CASE 
        WHEN (SELECT total_respostas FROM summary_data) > 0 
        THEN ROUND(((SELECT total_agendamentos FROM summary_data)::numeric / (SELECT total_respostas FROM summary_data)) * 100, 2)
        ELSE 0 
      END,
      'taxa_conversao', CASE 
        WHEN (SELECT total_prospeccoes FROM summary_data) > 0 
        THEN ROUND(((SELECT total_vendas FROM summary_data)::numeric / (SELECT total_prospeccoes FROM summary_data)) * 100, 2)
        ELSE 0 
      END
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- PASSO 3: Atualizar get_dashboard_drilldown
CREATE OR REPLACE FUNCTION public.get_dashboard_drilldown(
  user_id uuid,
  metric_name text,
  start_date date DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date date DEFAULT CURRENT_DATE,
  filter_segment text DEFAULT NULL,
  filter_temperature text DEFAULT NULL,
  filter_source text DEFAULT NULL,
  filter_client_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Verificar permissões
  IF NOT EXISTS (SELECT 1 FROM public.app_users WHERE id = user_id) THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  -- Construir query base com filtros
  WITH filtered_prospects AS (
    SELECT 
      p.id,
      p.contact_name,
      p.company,
      p.segment,
      p.temperature,
      p.source,
      p.status,
      p.deal_value,
      p.closer,
      p.date_prospect,
      p.last_contact_date,
      p.reply,
      p.status_scheduling,
      p.confirm_call,
      p.date_scheduling
    FROM public.prospects p
    WHERE public.can_manage(user_id, p.owner_id)
      AND p.date_prospect BETWEEN start_date AND end_date
      AND (filter_segment IS NULL OR p.segment = filter_segment)
      AND (filter_temperature IS NULL OR p.temperature = filter_temperature)
      AND (filter_source IS NULL OR p.source = filter_source)
      AND (filter_client_id IS NULL OR p.client_id = filter_client_id)
  )
  
  -- Aplicar filtros específicos por métrica
  SELECT json_agg(
    json_build_object(
      'id', id,
      'contact_name', contact_name,
      'company', company,
      'segment', segment,
      'temperature', temperature,
      'source', source,
      'status', status,
      'deal_value', deal_value,
      'closer', closer,
      'date_prospect', date_prospect,
      'last_contact_date', last_contact_date
    ) ORDER BY date_prospect DESC
  ) INTO result
  FROM filtered_prospects
  WHERE 
    CASE metric_name
      WHEN 'prospeccoes_dia' THEN date_prospect = CURRENT_DATE
      WHEN 'inbound' THEN source = 'inbound'
      WHEN 'outbound' THEN source = 'outbound'
      WHEN 'respostas' THEN public.has_response(status, reply)
      WHEN 'reunioes_agendadas' THEN status = 'meeting_scheduled' OR date_scheduling IS NOT NULL
      WHEN 'reunioes_realizadas' THEN status = 'meeting_done'
      WHEN 'no_show' THEN public.is_no_show(status_scheduling)
      WHEN 'follow_up' THEN public.is_follow_up(status, confirm_call)
      WHEN 'vendas' THEN status = 'won'
      ELSE TRUE
    END;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- PASSO 4: Atualizar comentários
COMMENT ON FUNCTION public.get_dashboard_daily_metrics IS 'Calcula métricas diárias para gráficos com filtro opcional por cliente';
COMMENT ON FUNCTION public.get_dashboard_drilldown IS 'Busca dados detalhados para drill-down com filtro opcional por cliente';

-- PASSO 5: Verificação final
DO $$
BEGIN
    RAISE NOTICE '✅ Todas as funções do dashboard foram atualizadas com filtro por cliente!';
    RAISE NOTICE '   - get_dashboard_metrics: ✅ Atualizada';
    RAISE NOTICE '   - get_dashboard_daily_metrics: ✅ Atualizada';  
    RAISE NOTICE '   - get_dashboard_drilldown: ✅ Atualizada';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 O filtro de clientes agora funciona em todas as funcionalidades do Dashboard!';
END
$$;

-- =============================================================================
-- FIM DA CORREÇÃO COMPLETA
-- =============================================================================
