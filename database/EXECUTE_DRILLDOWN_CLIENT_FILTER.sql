-- =============================================================================
-- CORREÇÃO: ADICIONAR FILTRO POR CLIENTE NA FUNÇÃO get_dashboard_drilldown
-- Execute este script no Supabase Dashboard > SQL Editor
-- =============================================================================

-- Primeiro, remover a função existente para evitar conflito de assinatura
DROP FUNCTION IF EXISTS public.get_dashboard_drilldown(uuid, text, date, date, text, text, text);

-- Criar a função atualizada com o novo parâmetro filter_client_id
CREATE FUNCTION public.get_dashboard_drilldown(
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

-- Atualizar comentário da função
COMMENT ON FUNCTION public.get_dashboard_drilldown IS 'Busca dados detalhados para drill-down com filtro opcional por cliente';

-- Verificação
SELECT 'Função get_dashboard_drilldown atualizada com sucesso!' as status;

-- =============================================================================
-- FIM DA CORREÇÃO
-- =============================================================================
