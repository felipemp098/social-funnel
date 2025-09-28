-- =============================================================================
-- SCRIPT SIMPLES PARA CRIAR FUNÇÕES RPC DE PROSPECTS
-- Execute este script completo no Supabase SQL Editor
-- =============================================================================

-- 1. Função para listar prospects
CREATE OR REPLACE FUNCTION public.list_prospects(
  p_search text DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_temperature text DEFAULT NULL,
  p_segment text DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 10,
  p_order text DEFAULT 'updated_at.desc'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset integer;
  v_result json;
  v_total_count integer;
BEGIN
  -- Calcular offset
  v_offset := (p_page - 1) * p_page_size;
  
  -- Query para contar total
  SELECT COUNT(*) INTO v_total_count
  FROM public.prospects p 
  WHERE public.can_manage(auth.uid(), p.owner_id)
  AND (p_search IS NULL OR p_search = '' OR 
       p.contact_name ILIKE '%' || p_search || '%' OR 
       p.company ILIKE '%' || p_search || '%' OR 
       p.contact_email ILIKE '%' || p_search || '%' OR 
       p.contact_phone ILIKE '%' || p_search || '%')
  AND (p_source IS NULL OR p_source = 'all' OR p.source = p_source)
  AND (p_status IS NULL OR p_status = 'all' OR p.status = p_status)
  AND (p_temperature IS NULL OR p_temperature = 'all' OR p.temperature = p_temperature)
  AND (p_segment IS NULL OR p_segment = 'all' OR p.segment = p_segment)
  AND (p_start_date IS NULL OR p.created_at >= p_start_date)
  AND (p_end_date IS NULL OR p.created_at <= p_end_date + interval '1 day');
  
  -- Query principal
  SELECT json_agg(
    json_build_object(
      'id', p.id,
      'contact_name', p.contact_name,
      'contact_email', p.contact_email,
      'contact_phone', p.contact_phone,
      'company', p.company,
      'position', p.position,
      'source', p.source,
      'status', p.status,
      'temperature', p.temperature,
      'segment', p.segment,
      'budget', p.budget,
      'probability', p.probability,
      'notes', p.notes,
      'last_contact_date', p.last_contact_date,
      'next_follow_up', p.next_follow_up,
      'date_scheduling', p.date_scheduling,
      'date_call', p.date_call,
      'deal_value', p.deal_value,
      'closer', p.closer,
      'link', p.link,
      'authority', p.authority,
      'need', p.need,
      'time', p.time,
      'status_scheduling', p.status_scheduling,
      'reply', p.reply,
      'confirm_call', p.confirm_call,
      'complete', p.complete,
      'selling', p.selling,
      'payment', p.payment,
      'negotiations', p.negotiations,
      'social_selling', p.social_selling,
      'client_id', p.client_id,
      'id_sheets', p.id_sheets,
      'time_frame', p.time_frame,
      'date_prospect', p.created_at,
      'created_at', p.created_at,
      'updated_at', p.updated_at,
      'owner_id', p.owner_id
    )
  )
  INTO v_result
  FROM (
    SELECT * FROM public.prospects p 
    WHERE public.can_manage(auth.uid(), p.owner_id)
    AND (p_search IS NULL OR p_search = '' OR 
         p.contact_name ILIKE '%' || p_search || '%' OR 
         p.company ILIKE '%' || p_search || '%' OR 
         p.contact_email ILIKE '%' || p_search || '%' OR 
         p.contact_phone ILIKE '%' || p_search || '%')
    AND (p_source IS NULL OR p_source = 'all' OR p.source = p_source)
    AND (p_status IS NULL OR p_status = 'all' OR p.status = p_status)
    AND (p_temperature IS NULL OR p_temperature = 'all' OR p.temperature = p_temperature)
    AND (p_segment IS NULL OR p_segment = 'all' OR p.segment = p_segment)
    AND (p_start_date IS NULL OR p.created_at >= p_start_date)
    AND (p_end_date IS NULL OR p.created_at <= p_end_date + interval '1 day')
    ORDER BY p.updated_at DESC
    LIMIT p_page_size OFFSET v_offset
  ) p;
  
  -- Retornar resultado com paginação
  RETURN json_build_object(
    'items', COALESCE(v_result, '[]'::json),
    'page', p_page,
    'page_size', p_page_size,
    'total', v_total_count,
    'total_pages', CEIL(v_total_count::decimal / p_page_size)
  );
END;
$$;

-- 2. Função para obter prospect por ID
CREATE OR REPLACE FUNCTION public.get_prospect(p_id bigint)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    'id', p.id,
    'contact_name', p.contact_name,
    'contact_email', p.contact_email,
    'contact_phone', p.contact_phone,
    'company', p.company,
    'position', p.position,
    'source', p.source,
    'status', p.status,
    'temperature', p.temperature,
    'segment', p.segment,
    'budget', p.budget,
    'probability', p.probability,
    'notes', p.notes,
    'last_contact_date', p.last_contact_date,
    'next_follow_up', p.next_follow_up,
    'date_scheduling', p.date_scheduling,
    'date_call', p.date_call,
    'deal_value', p.deal_value,
    'closer', p.closer,
    'link', p.link,
    'authority', p.authority,
    'need', p.need,
    'time', p.time,
    'status_scheduling', p.status_scheduling,
    'reply', p.reply,
    'confirm_call', p.confirm_call,
    'complete', p.complete,
    'selling', p.selling,
    'payment', p.payment,
    'negotiations', p.negotiations,
    'social_selling', p.social_selling,
    'client_id', p.client_id,
    'id_sheets', p.id_sheets,
    'time_frame', p.time_frame,
    'date_prospect', p.created_at,
    'created_at', p.created_at,
    'updated_at', p.updated_at,
    'owner_id', p.owner_id
  )
  INTO v_result
  FROM public.prospects p
  WHERE p.id = p_id
  AND public.can_manage(auth.uid(), p.owner_id);
  
  RETURN v_result;
END;
$$;

-- 3. Função para criar prospect
CREATE OR REPLACE FUNCTION public.create_prospect(
  p_contact_name text,
  p_contact_email text DEFAULT NULL,
  p_contact_phone text DEFAULT NULL,
  p_company text DEFAULT NULL,
  p_position text DEFAULT NULL,
  p_source text DEFAULT 'inbound',
  p_status text DEFAULT 'new',
  p_temperature text DEFAULT 'warm',
  p_segment text DEFAULT NULL,
  p_budget text DEFAULT NULL,
  p_probability integer DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_last_contact_date timestamptz DEFAULT NULL,
  p_next_follow_up timestamptz DEFAULT NULL,
  p_date_scheduling timestamptz DEFAULT NULL,
  p_date_call timestamptz DEFAULT NULL,
  p_deal_value decimal DEFAULT NULL,
  p_closer text DEFAULT NULL,
  p_link text DEFAULT NULL,
  p_authority text DEFAULT NULL,
  p_need text DEFAULT NULL,
  p_time text DEFAULT NULL,
  p_status_scheduling text DEFAULT NULL,
  p_reply boolean DEFAULT NULL,
  p_confirm_call boolean DEFAULT NULL,
  p_complete boolean DEFAULT NULL,
  p_selling boolean DEFAULT NULL,
  p_payment boolean DEFAULT NULL,
  p_negotiations boolean DEFAULT NULL,
  p_social_selling boolean DEFAULT NULL,
  p_client_id uuid DEFAULT NULL,
  p_id_sheets text DEFAULT NULL,
  p_time_frame text DEFAULT NULL,
  p_owner_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_id bigint;
  v_actual_owner_id uuid;
BEGIN
  -- Validar se pode criar para o owner_id especificado
  v_actual_owner_id := COALESCE(p_owner_id, auth.uid());
  
  IF NOT public.can_manage(auth.uid(), v_actual_owner_id) THEN
    RAISE EXCEPTION 'Acesso negado: não é possível criar prospect para este usuário';
  END IF;
  
  -- Inserir prospect
  INSERT INTO public.prospects (
    owner_id, client_id, contact_name, contact_email, contact_phone,
    company, position, source, status, temperature, segment, budget,
    probability, notes, last_contact_date, next_follow_up, date_scheduling,
    date_call, deal_value, closer, link, authority, need, time,
    status_scheduling, reply, confirm_call, complete, selling, payment,
    negotiations, social_selling, id_sheets, time_frame
  ) VALUES (
    v_actual_owner_id, p_client_id, p_contact_name, p_contact_email, p_contact_phone,
    p_company, p_position, p_source, p_status, p_temperature, p_segment, p_budget,
    p_probability, p_notes, p_last_contact_date, p_next_follow_up, p_date_scheduling,
    p_date_call, p_deal_value, p_closer, p_link, p_authority, p_need, p_time,
    p_status_scheduling, p_reply, p_confirm_call, p_complete, p_selling, p_payment,
    p_negotiations, p_social_selling, p_id_sheets, p_time_frame
  ) RETURNING id INTO v_new_id;
  
  -- Retornar prospect criado
  RETURN public.get_prospect(v_new_id);
END;
$$;

-- 4. Função para atualizar prospect
CREATE OR REPLACE FUNCTION public.update_prospect(
  p_id bigint,
  p_contact_name text DEFAULT NULL,
  p_contact_email text DEFAULT NULL,
  p_contact_phone text DEFAULT NULL,
  p_company text DEFAULT NULL,
  p_position text DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_temperature text DEFAULT NULL,
  p_segment text DEFAULT NULL,
  p_budget text DEFAULT NULL,
  p_probability integer DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_last_contact_date timestamptz DEFAULT NULL,
  p_next_follow_up timestamptz DEFAULT NULL,
  p_date_scheduling timestamptz DEFAULT NULL,
  p_date_call timestamptz DEFAULT NULL,
  p_deal_value decimal DEFAULT NULL,
  p_closer text DEFAULT NULL,
  p_link text DEFAULT NULL,
  p_authority text DEFAULT NULL,
  p_need text DEFAULT NULL,
  p_time text DEFAULT NULL,
  p_status_scheduling text DEFAULT NULL,
  p_reply boolean DEFAULT NULL,
  p_confirm_call boolean DEFAULT NULL,
  p_complete boolean DEFAULT NULL,
  p_selling boolean DEFAULT NULL,
  p_payment boolean DEFAULT NULL,
  p_negotiations boolean DEFAULT NULL,
  p_social_selling boolean DEFAULT NULL,
  p_client_id uuid DEFAULT NULL,
  p_id_sheets text DEFAULT NULL,
  p_time_frame text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_rows integer;
BEGIN
  -- Verificar se pode gerenciar o prospect
  IF NOT EXISTS (
    SELECT 1 FROM public.prospects p 
    WHERE p.id = p_id 
    AND public.can_manage(auth.uid(), p.owner_id)
  ) THEN
    RAISE EXCEPTION 'Prospect não encontrado ou sem permissão de acesso';
  END IF;
  
  -- Atualizar prospect (apenas campos fornecidos)
  UPDATE public.prospects SET
    contact_name = COALESCE(p_contact_name, contact_name),
    contact_email = COALESCE(p_contact_email, contact_email),
    contact_phone = COALESCE(p_contact_phone, contact_phone),
    company = COALESCE(p_company, company),
    position = COALESCE(p_position, position),
    source = COALESCE(p_source, source),
    status = COALESCE(p_status, status),
    temperature = COALESCE(p_temperature, temperature),
    segment = COALESCE(p_segment, segment),
    budget = COALESCE(p_budget, budget),
    probability = COALESCE(p_probability, probability),
    notes = COALESCE(p_notes, notes),
    last_contact_date = COALESCE(p_last_contact_date, last_contact_date),
    next_follow_up = COALESCE(p_next_follow_up, next_follow_up),
    date_scheduling = COALESCE(p_date_scheduling, date_scheduling),
    date_call = COALESCE(p_date_call, date_call),
    deal_value = COALESCE(p_deal_value, deal_value),
    closer = COALESCE(p_closer, closer),
    link = COALESCE(p_link, link),
    authority = COALESCE(p_authority, authority),
    need = COALESCE(p_need, need),
    time = COALESCE(p_time, time),
    status_scheduling = COALESCE(p_status_scheduling, status_scheduling),
    reply = COALESCE(p_reply, reply),
    confirm_call = COALESCE(p_confirm_call, confirm_call),
    complete = COALESCE(p_complete, complete),
    selling = COALESCE(p_selling, selling),
    payment = COALESCE(p_payment, payment),
    negotiations = COALESCE(p_negotiations, negotiations),
    social_selling = COALESCE(p_social_selling, social_selling),
    client_id = COALESCE(p_client_id, client_id),
    id_sheets = COALESCE(p_id_sheets, id_sheets),
    time_frame = COALESCE(p_time_frame, time_frame),
    updated_at = now()
  WHERE id = p_id
  AND public.can_manage(auth.uid(), owner_id);
  
  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
  
  IF v_updated_rows = 0 THEN
    RAISE EXCEPTION 'Nenhum prospect foi atualizado';
  END IF;
  
  -- Retornar prospect atualizado
  RETURN public.get_prospect(p_id);
END;
$$;

-- 5. Função para deletar prospect
CREATE OR REPLACE FUNCTION public.delete_prospect(p_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_rows integer;
BEGIN
  DELETE FROM public.prospects 
  WHERE id = p_id
  AND public.can_manage(auth.uid(), owner_id);
  
  GET DIAGNOSTICS v_deleted_rows = ROW_COUNT;
  
  IF v_deleted_rows = 0 THEN
    RAISE EXCEPTION 'Prospect não encontrado ou sem permissão de acesso';
  END IF;
  
  RETURN true;
END;
$$;

-- 6. Função para obter segmentos
CREATE OR REPLACE FUNCTION public.get_prospect_segments()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'segment', segment,
      'count', count
    )
  )
  INTO v_result
  FROM (
    SELECT 
      segment,
      COUNT(*) as count
    FROM public.prospects p
    WHERE public.can_manage(auth.uid(), p.owner_id)
    AND segment IS NOT NULL
    AND segment != ''
    GROUP BY segment
    ORDER BY count DESC, segment ASC
  ) segments;
  
  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- Verificar se as funções foram criadas
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%prospect%'
ORDER BY routine_name;
