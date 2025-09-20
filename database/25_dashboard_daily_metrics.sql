-- =============================================================================
-- FUNÇÃO PARA MÉTRICAS DIÁRIAS DO DASHBOARD
-- Retorna dados para gráficos de linha temporal
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_daily_metrics(
  user_id uuid,
  start_date date DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date date DEFAULT CURRENT_DATE,
  filter_segment text DEFAULT NULL,
  filter_temperature text DEFAULT NULL,
  filter_source text DEFAULT NULL
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

  -- Gerar série de datas e calcular métricas por dia
  WITH date_series AS (
    SELECT generate_series(start_date, end_date, '1 day'::interval)::date as data
  ),
  
  daily_metrics AS (
    SELECT 
      ds.data,
      -- Prospecções do dia
      COUNT(p.id) as prospeccoes,
      
      -- Respostas do dia
      COUNT(CASE WHEN public.has_response(p.status, p.reply) THEN 1 END) as respostas,
      
      -- Agendamentos do dia (baseado na data de prospecção)
      COUNT(CASE WHEN p.status = 'meeting_scheduled' OR p.date_scheduling IS NOT NULL THEN 1 END) as agendamentos,
      
      -- Reuniões realizadas
      COUNT(CASE WHEN p.status = 'meeting_done' THEN 1 END) as reunioes_realizadas,
      
      -- Vendas fechadas
      COUNT(CASE WHEN p.status = 'won' THEN 1 END) as vendas,
      
      -- Faturamento do dia
      COALESCE(SUM(CASE WHEN p.status = 'won' THEN p.deal_value END), 0) as faturamento,
      
      -- Métricas por origem
      COUNT(CASE WHEN p.source = 'inbound' THEN 1 END) as inbound,
      COUNT(CASE WHEN p.source = 'outbound' THEN 1 END) as outbound
      
    FROM date_series ds
    LEFT JOIN public.prospects p ON (
      p.date_prospect = ds.data
      AND public.can_manage(user_id, p.owner_id)
      AND (filter_segment IS NULL OR p.segment = filter_segment)
      AND (filter_temperature IS NULL OR p.temperature = filter_temperature)
      AND (filter_source IS NULL OR p.source = filter_source)
    )
    GROUP BY ds.data
    ORDER BY ds.data
  )
  
  -- Construir resultado JSON
  SELECT json_build_object(
    'labels', json_agg(to_char(data, 'DD/MM')),
    'datasets', json_build_object(
      'prospeccoes', json_agg(prospeccoes),
      'respostas', json_agg(respostas),
      'agendamentos', json_agg(agendamentos),
      'reunioes_realizadas', json_agg(reunioes_realizadas),
      'vendas', json_agg(vendas),
      'faturamento', json_agg(faturamento),
      'inbound', json_agg(inbound),
      'outbound', json_agg(outbound)
    ),
    'summary', json_build_object(
      'total_prospeccoes', SUM(prospeccoes),
      'total_respostas', SUM(respostas),
      'total_agendamentos', SUM(agendamentos),
      'total_reunioes', SUM(reunioes_realizadas),
      'total_vendas', SUM(vendas),
      'total_faturamento', SUM(faturamento),
      'taxa_resposta', CASE 
        WHEN SUM(prospeccoes) > 0 
        THEN ROUND((SUM(respostas)::numeric / SUM(prospeccoes)) * 100, 2)
        ELSE 0 
      END,
      'taxa_agendamento', CASE 
        WHEN SUM(respostas) > 0 
        THEN ROUND((SUM(agendamentos)::numeric / SUM(respostas)) * 100, 2)
        ELSE 0 
      END,
      'taxa_conversao', CASE 
        WHEN SUM(agendamentos) > 0 
        THEN ROUND((SUM(vendas)::numeric / SUM(agendamentos)) * 100, 2)
        ELSE 0 
      END
    )
  ) INTO result
  FROM daily_metrics;

  RETURN result;
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION public.get_dashboard_daily_metrics IS 'Retorna métricas diárias para gráficos de linha temporal do dashboard';
