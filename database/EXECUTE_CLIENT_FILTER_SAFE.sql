-- =============================================================================
-- CORREÇÃO SEGURA: ADICIONAR FILTRO POR CLIENTE NA FUNÇÃO get_dashboard_metrics
-- Execute este script no Supabase Dashboard > SQL Editor
-- =============================================================================

-- Verificar e remover todas as versões existentes da função get_dashboard_metrics
DO $$
BEGIN
    -- Remover todas as possíveis assinaturas existentes
    DROP FUNCTION IF EXISTS public.get_dashboard_metrics(uuid);
    DROP FUNCTION IF EXISTS public.get_dashboard_metrics(uuid, date);
    DROP FUNCTION IF EXISTS public.get_dashboard_metrics(uuid, date, date);
    DROP FUNCTION IF EXISTS public.get_dashboard_metrics(uuid, date, date, text);
    DROP FUNCTION IF EXISTS public.get_dashboard_metrics(uuid, date, date, text, text);
    DROP FUNCTION IF EXISTS public.get_dashboard_metrics(uuid, date, date, text, text, text);
    DROP FUNCTION IF EXISTS public.get_dashboard_metrics(uuid, date, date, text, text, text, uuid);
    
    RAISE NOTICE 'Funções existentes removidas com sucesso';
END
$$;

-- Criar a função atualizada com o novo parâmetro filter_client_id
CREATE FUNCTION public.get_dashboard_metrics(
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
  prospects_data record;
  inbound_data record;
  outbound_data record;
  temperature_data json;
  segment_data json;
BEGIN
  -- Verificar permissões
  IF NOT EXISTS (SELECT 1 FROM public.app_users WHERE id = user_id) THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  -- Buscar dados base de prospects no período
  WITH filtered_prospects AS (
    SELECT *
    FROM public.prospects p
    WHERE public.can_manage(user_id, p.owner_id)
      AND p.date_prospect BETWEEN start_date AND end_date
      AND (filter_segment IS NULL OR p.segment = filter_segment)
      AND (filter_temperature IS NULL OR p.temperature = filter_temperature)
      AND (filter_source IS NULL OR p.source = filter_source)
      AND (filter_client_id IS NULL OR p.client_id = filter_client_id)
  ),
  
  -- Métricas gerais
  general_metrics AS (
    SELECT 
      COUNT(*) as total_periodo,
      COUNT(CASE WHEN date_prospect = CURRENT_DATE THEN 1 END) as prospeccoes_dia,
      COUNT(CASE WHEN source = 'inbound' THEN 1 END) as total_inbound,
      COUNT(CASE WHEN source = 'outbound' THEN 1 END) as total_outbound,
      COALESCE(SUM(CASE WHEN status = 'won' THEN deal_value END), 0) as faturamento_total
    FROM filtered_prospects
  ),
  
  -- Métricas Inbound
  inbound_metrics AS (
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN public.has_response(status, reply) THEN 1 END) as respostas,
      COUNT(CASE WHEN status = 'meeting_scheduled' OR date_scheduling IS NOT NULL THEN 1 END) as reunioes_agendadas,
      COUNT(CASE WHEN status = 'meeting_done' THEN 1 END) as reunioes_realizadas,
      COUNT(CASE WHEN public.is_no_show(status_scheduling) THEN 1 END) as no_show,
      COUNT(CASE WHEN public.is_follow_up(status, confirm_call) THEN 1 END) as follow_up,
      COUNT(CASE WHEN status = 'won' THEN 1 END) as vendas,
      COALESCE(SUM(CASE WHEN status = 'won' THEN deal_value END), 0) as faturamento
    FROM filtered_prospects
    WHERE source = 'inbound'
  ),
  
  -- Métricas Outbound
  outbound_metrics AS (
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN public.has_response(status, reply) THEN 1 END) as respostas,
      COUNT(CASE WHEN status = 'meeting_scheduled' OR date_scheduling IS NOT NULL THEN 1 END) as reunioes_agendadas,
      COUNT(CASE WHEN status = 'meeting_done' THEN 1 END) as reunioes_realizadas,
      COUNT(CASE WHEN public.is_no_show(status_scheduling) THEN 1 END) as no_show,
      COUNT(CASE WHEN public.is_follow_up(status, confirm_call) THEN 1 END) as follow_up,
      COUNT(CASE WHEN status = 'won' THEN 1 END) as vendas,
      COALESCE(SUM(CASE WHEN status = 'won' THEN deal_value END), 0) as faturamento
    FROM filtered_prospects
    WHERE source = 'outbound'
  ),
  
  -- Distribuição por temperatura
  temperature_dist AS (
    SELECT json_object_agg(
      COALESCE(temperature, 'undefined'), 
      count
    ) as distribution
    FROM (
      SELECT 
        temperature,
        COUNT(*) as count
      FROM filtered_prospects
      GROUP BY temperature
    ) t
  ),
  
  -- Distribuição por segmento
  segment_dist AS (
    SELECT json_agg(
      json_build_object(
        'segmento', COALESCE(segment, 'Não definido'),
        'total', count,
        'vendas', vendas,
        'faturamento', faturamento
      ) ORDER BY count DESC
    ) as distribution
    FROM (
      SELECT 
        segment,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'won' THEN 1 END) as vendas,
        COALESCE(SUM(CASE WHEN status = 'won' THEN deal_value END), 0) as faturamento
      FROM filtered_prospects
      GROUP BY segment
    ) s
  )

  -- Montar resultado final
  SELECT 
    json_build_object(
      'prospeccoesDoDia', gm.prospeccoes_dia,
      'totalPeriodo', gm.total_periodo,
      'inbound', json_build_object(
        'total', COALESCE(im.total, 0),
        'respostas', COALESCE(im.respostas, 0),
        'reunioesAgendadas', COALESCE(im.reunioes_agendadas, 0),
        'reunioesRealizadas', COALESCE(im.reunioes_realizadas, 0),
        'noShow', COALESCE(im.no_show, 0),
        'followUp', COALESCE(im.follow_up, 0),
        'vendas', COALESCE(im.vendas, 0),
        'faturamento', COALESCE(im.faturamento, 0),
        'taxaNoShow', CASE 
          WHEN COALESCE(im.reunioes_agendadas, 0) > 0 
          THEN ROUND((COALESCE(im.no_show, 0)::numeric / im.reunioes_agendadas) * 100, 2)
          ELSE 0 
        END,
        'taxaConversao', CASE 
          WHEN COALESCE(im.total, 0) > 0 
          THEN ROUND((COALESCE(im.vendas, 0)::numeric / im.total) * 100, 2)
          ELSE 0 
        END
      ),
      'outbound', json_build_object(
        'total', COALESCE(om.total, 0),
        'respostas', COALESCE(om.respostas, 0),
        'reunioesAgendadas', COALESCE(om.reunioes_agendadas, 0),
        'reunioesRealizadas', COALESCE(om.reunioes_realizadas, 0),
        'noShow', COALESCE(om.no_show, 0),
        'followUp', COALESCE(om.follow_up, 0),
        'vendas', COALESCE(om.vendas, 0),
        'faturamento', COALESCE(om.faturamento, 0),
        'taxaNoShow', CASE 
          WHEN COALESCE(om.reunioes_agendadas, 0) > 0 
          THEN ROUND((COALESCE(om.no_show, 0)::numeric / om.reunioes_agendadas) * 100, 2)
          ELSE 0 
        END,
        'taxaConversao', CASE 
          WHEN COALESCE(om.total, 0) > 0 
          THEN ROUND((COALESCE(om.vendas, 0)::numeric / om.total) * 100, 2)
          ELSE 0 
        END
      ),
      'taxaInbound', CASE 
        WHEN gm.total_periodo > 0 
        THEN ROUND((gm.total_inbound::numeric / gm.total_periodo) * 100, 2) / 100
        ELSE 0 
      END,
      'taxaOutbound', CASE 
        WHEN gm.total_periodo > 0 
        THEN ROUND((gm.total_outbound::numeric / gm.total_periodo) * 100, 2) / 100
        ELSE 0 
      END,
      'porTemperatura', COALESCE(td.distribution, '{}'::json),
      'porSegmento', COALESCE(sd.distribution, '[]'::json)
    )
  INTO result
  FROM general_metrics gm
  CROSS JOIN inbound_metrics im
  CROSS JOIN outbound_metrics om
  CROSS JOIN temperature_dist td
  CROSS JOIN segment_dist sd;

  RETURN result;
END;
$$;

-- Atualizar comentário da função
COMMENT ON FUNCTION public.get_dashboard_metrics IS 'Calcula métricas agregadas para o dashboard com filtro opcional por cliente';

-- Verificar se a função foi criada corretamente
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'get_dashboard_metrics' 
        AND specific_schema = 'public'
        AND routine_type = 'FUNCTION'
    ) THEN
        RAISE NOTICE '✅ Função get_dashboard_metrics criada com sucesso!';
    ELSE
        RAISE EXCEPTION '❌ Erro: Função get_dashboard_metrics não foi criada!';
    END IF;
END
$$;

-- =============================================================================
-- FIM DA CORREÇÃO SEGURA
-- =============================================================================
