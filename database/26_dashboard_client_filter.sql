-- =============================================================================
-- MIGRAÇÃO: ADICIONAR FILTRO POR CLIENTE NAS FUNÇÕES DO DASHBOARD
-- Execute este script no Supabase Dashboard > SQL Editor
-- =============================================================================

-- Atualizar função get_dashboard_metrics para incluir filtro por cliente
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(
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

-- Atualizar função get_dashboard_drilldown para incluir filtro por cliente
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
  where_clause text := '';
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
      p.last_contact_date
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
      WHEN 'respostas' THEN public.has_response(status, NULL) -- Assumindo que reply está em outro campo
      WHEN 'reunioes_agendadas' THEN status = 'meeting_scheduled'
      WHEN 'reunioes_realizadas' THEN status = 'meeting_done'
      WHEN 'no_show' THEN public.is_no_show(status)
      WHEN 'follow_up' THEN public.is_follow_up(status, NULL) -- Assumindo que confirm_call está em outro campo
      WHEN 'vendas' THEN status = 'won'
      ELSE TRUE
    END;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Atualizar função get_dashboard_daily_metrics para incluir filtro por cliente
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
      COUNT(CASE WHEN public.has_response(p.status, NULL) THEN 1 END) as respostas,
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
    'labels', array_agg(to_char(date, 'DD/MM') ORDER BY date),
    'datasets', json_build_object(
      'prospeccoes', array_agg(prospeccoes ORDER BY date),
      'respostas', array_agg(respostas ORDER BY date),
      'agendamentos', array_agg(agendamentos ORDER BY date),
      'reunioes_realizadas', array_agg(reunioes_realizadas ORDER BY date),
      'vendas', array_agg(vendas ORDER BY date),
      'faturamento', array_agg(faturamento ORDER BY date),
      'inbound', array_agg(inbound ORDER BY date),
      'outbound', array_agg(outbound ORDER BY date)
    ),
    'summary', json_build_object(
      'total_prospeccoes', s.total_prospeccoes,
      'total_respostas', s.total_respostas,
      'total_agendamentos', s.total_agendamentos,
      'total_reunioes', s.total_reunioes,
      'total_vendas', s.total_vendas,
      'total_faturamento', s.total_faturamento,
      'taxa_resposta', CASE 
        WHEN s.total_prospeccoes > 0 
        THEN ROUND((s.total_respostas::numeric / s.total_prospeccoes) * 100, 2)
        ELSE 0 
      END,
      'taxa_agendamento', CASE 
        WHEN s.total_respostas > 0 
        THEN ROUND((s.total_agendamentos::numeric / s.total_respostas) * 100, 2)
        ELSE 0 
      END,
      'taxa_conversao', CASE 
        WHEN s.total_prospeccoes > 0 
        THEN ROUND((s.total_vendas::numeric / s.total_prospeccoes) * 100, 2)
        ELSE 0 
      END
    )
  ) INTO result
  FROM daily_data
  CROSS JOIN summary_data s;

  RETURN result;
END;
$$;

-- Atualizar comentários das funções
COMMENT ON FUNCTION public.get_dashboard_metrics IS 'Calcula métricas agregadas para o dashboard com filtro opcional por cliente';
COMMENT ON FUNCTION public.get_dashboard_drilldown IS 'Busca dados detalhados para drill-down com filtro opcional por cliente';
COMMENT ON FUNCTION public.get_dashboard_daily_metrics IS 'Calcula métricas diárias para gráficos com filtro opcional por cliente';

-- =============================================================================
-- FIM DA MIGRAÇÃO
-- =============================================================================
