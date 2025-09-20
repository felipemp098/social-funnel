-- =============================================================================
-- CORREÇÃO: ADICIONAR FILTRO POR CLIENTE NA FUNÇÃO get_dashboard_daily_metrics
-- Execute este script no Supabase Dashboard > SQL Editor
-- =============================================================================

-- Primeiro, remover a função existente para evitar conflito de assinatura
DROP FUNCTION IF EXISTS public.get_dashboard_daily_metrics(uuid, date, date, text, text, text);

-- Criar a função atualizada com o novo parâmetro filter_client_id
CREATE FUNCTION public.get_dashboard_daily_metrics(
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

-- Atualizar comentário da função
COMMENT ON FUNCTION public.get_dashboard_daily_metrics IS 'Calcula métricas diárias para gráficos com filtro opcional por cliente';

-- Verificação
SELECT 'Função get_dashboard_daily_metrics atualizada com sucesso!' as status;

-- =============================================================================
-- FIM DA CORREÇÃO
-- =============================================================================
