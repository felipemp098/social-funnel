-- =============================================================================
-- MIGRAÇÃO DASHBOARD - EXECUTE ESTE SCRIPT NO SUPABASE DASHBOARD
-- =============================================================================

-- 1. ADICIONAR CAMPOS À TABELA PROSPECTS
ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS segment text,
ADD COLUMN IF NOT EXISTS budget decimal(12,2),
ADD COLUMN IF NOT EXISTS authority text,
ADD COLUMN IF NOT EXISTS need text,
ADD COLUMN IF NOT EXISTS time_frame text,
ADD COLUMN IF NOT EXISTS date_prospect date DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS date_scheduling timestamptz,
ADD COLUMN IF NOT EXISTS date_call timestamptz,
ADD COLUMN IF NOT EXISTS status_scheduling text,
ADD COLUMN IF NOT EXISTS reply text,
ADD COLUMN IF NOT EXISTS confirm_call text,
ADD COLUMN IF NOT EXISTS complete boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS selling text,
ADD COLUMN IF NOT EXISTS payment text,
ADD COLUMN IF NOT EXISTS negotiations text,
ADD COLUMN IF NOT EXISTS social_selling text,
ADD COLUMN IF NOT EXISTS id_sheets text,
ADD COLUMN IF NOT EXISTS link text,
ADD COLUMN IF NOT EXISTS closer text,
ADD COLUMN IF NOT EXISTS obs text;

-- 2. CRIAR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_prospects_date_prospect ON public.prospects(date_prospect);
CREATE INDEX IF NOT EXISTS idx_prospects_segment ON public.prospects(segment);
CREATE INDEX IF NOT EXISTS idx_prospects_temperature ON public.prospects(temperature);
CREATE INDEX IF NOT EXISTS idx_prospects_date_scheduling ON public.prospects(date_scheduling);
CREATE INDEX IF NOT EXISTS idx_prospects_date_call ON public.prospects(date_call);

-- 3. FUNÇÕES AUXILIARES
CREATE OR REPLACE FUNCTION public.is_no_show(status_scheduling text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN status_scheduling IS NOT NULL AND 
         LOWER(status_scheduling) LIKE '%no show%';
END;
$$;

CREATE OR REPLACE FUNCTION public.has_response(status text, reply text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN status = 'responded' OR reply IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_follow_up(status text, confirm_call text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN status = 'follow_up' OR confirm_call IS NOT NULL;
END;
$$;

-- 4. FUNÇÃO PRINCIPAL DO DASHBOARD
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(
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

  -- Buscar dados base de prospects no período
  WITH filtered_prospects AS (
    SELECT *
    FROM public.prospects p
    WHERE public.can_manage(user_id, p.owner_id)
      AND p.date_prospect BETWEEN start_date AND end_date
      AND (filter_segment IS NULL OR p.segment = filter_segment)
      AND (filter_temperature IS NULL OR p.temperature = filter_temperature)
      AND (filter_source IS NULL OR p.source = filter_source)
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
        'total', total,
        'vendas', vendas,
        'faturamento', faturamento
      )
    ) as distribution
    FROM (
      SELECT 
        segment,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'won' THEN 1 END) as vendas,
        COALESCE(SUM(CASE WHEN status = 'won' THEN deal_value END), 0) as faturamento
      FROM filtered_prospects
      GROUP BY segment
      ORDER BY total DESC
    ) s
  )
  
  -- Construir resultado final
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
          WHEN COALESCE(im.respostas, 0) > 0 
          THEN ROUND((COALESCE(im.vendas, 0)::numeric / im.respostas) * 100, 2)
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
          WHEN COALESCE(om.respostas, 0) > 0 
          THEN ROUND((COALESCE(om.vendas, 0)::numeric / om.respostas) * 100, 2)
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
    ) INTO result
  FROM general_metrics gm
  CROSS JOIN inbound_metrics im
  CROSS JOIN outbound_metrics om
  CROSS JOIN temperature_dist td
  CROSS JOIN segment_dist sd;

  RETURN result;
END;
$$;

-- 5. FUNÇÃO PARA DRILL-DOWN
CREATE OR REPLACE FUNCTION public.get_dashboard_drilldown(
  user_id uuid,
  metric_name text,
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
  where_clause text := '';
BEGIN
  -- Verificar permissões
  IF NOT EXISTS (SELECT 1 FROM public.app_users WHERE id = user_id) THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  -- Construir condições baseadas na métrica
  CASE metric_name
    WHEN 'vendas' THEN
      where_clause := 'AND p.status = ''won''';
    WHEN 'respostas' THEN
      where_clause := 'AND (p.status = ''responded'' OR p.reply IS NOT NULL)';
    WHEN 'reunioes_agendadas' THEN
      where_clause := 'AND (p.status = ''meeting_scheduled'' OR p.date_scheduling IS NOT NULL)';
    WHEN 'reunioes_realizadas' THEN
      where_clause := 'AND p.status = ''meeting_done''';
    WHEN 'no_show' THEN
      where_clause := 'AND public.is_no_show(p.status_scheduling)';
    WHEN 'follow_up' THEN
      where_clause := 'AND (p.status = ''follow_up'' OR p.confirm_call IS NOT NULL)';
    ELSE
      where_clause := '';
  END CASE;

  -- Executar query dinâmica
  EXECUTE format('
    SELECT json_agg(
      json_build_object(
        ''id'', p.id,
        ''contact_name'', p.contact_name,
        ''company'', p.company,
        ''segment'', p.segment,
        ''temperature'', p.temperature,
        ''source'', p.source,
        ''status'', p.status,
        ''deal_value'', p.deal_value,
        ''closer'', p.closer,
        ''date_prospect'', p.date_prospect,
        ''last_contact_date'', p.last_contact_date
      )
    )
    FROM public.prospects p
    WHERE public.can_manage($1, p.owner_id)
      AND p.date_prospect BETWEEN $2 AND $3
      AND ($4 IS NULL OR p.segment = $4)
      AND ($5 IS NULL OR p.temperature = $5)
      AND ($6 IS NULL OR p.source = $6)
      %s
    ORDER BY p.date_prospect DESC, p.created_at DESC
  ', where_clause)
  INTO result
  USING user_id, start_date, end_date, filter_segment, filter_temperature, filter_source;

  RETURN COALESCE(result, '[]'::json);
END;
$$;
