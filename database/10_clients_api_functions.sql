-- =============================================================================
-- FUNÇÕES DA API PARA GERENCIAMENTO DE CLIENTES
-- Implementação dos endpoints conforme especificação
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. FUNÇÃO: list_clients
-- GET /clients?search=&segment=&temperature=&status=
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.list_clients(
  search_term text DEFAULT NULL,
  segment_filter text DEFAULT NULL,
  temperature_filter text DEFAULT NULL,
  status_filter text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  name text,
  segment text,
  temperature text,
  budget text,
  notes text,
  goals jsonb,
  sheet_status text,
  sheet_url text,
  sheet_tab text,
  sheet_mapping jsonb,
  owner jsonb,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    c.id,
    c.name,
    c.segment,
    c.temperature,
    c.budget,
    c.notes,
    c.goals,
    c.sheet_status,
    c.sheet_url,
    c.sheet_tab,
    c.sheet_mapping,
    jsonb_build_object(
      'id', u.id,
      'name', u.email,
      'role', u.role
    ) as owner,
    c.created_at
  FROM public.clients c
  JOIN public.app_users u ON c.owner_id = u.id
  WHERE 
    -- RLS já garante que só vemos clientes que podemos gerenciar
    (search_term IS NULL OR c.name ILIKE '%' || search_term || '%')
    AND (segment_filter IS NULL OR c.segment = segment_filter)
    AND (temperature_filter IS NULL OR c.temperature = temperature_filter)
    AND (status_filter IS NULL OR c.sheet_status = status_filter)
  ORDER BY c.created_at DESC;
$$;

-- Comentário para documentação
COMMENT ON FUNCTION public.list_clients IS 'Lista clientes com filtros opcionais, respeitando hierarquia de permissões';

-- -----------------------------------------------------------------------------
-- 2. FUNÇÃO: get_client
-- GET /clients/:id
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_client(client_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  segment text,
  temperature text,
  budget text,
  notes text,
  goals jsonb,
  sheet_status text,
  sheet_url text,
  sheet_tab text,
  sheet_mapping jsonb,
  owner jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    c.id,
    c.name,
    c.segment,
    c.temperature,
    c.budget,
    c.notes,
    c.goals,
    c.sheet_status,
    c.sheet_url,
    c.sheet_tab,
    c.sheet_mapping,
    jsonb_build_object(
      'id', u.id,
      'name', u.email,
      'role', u.role
    ) as owner,
    c.created_at,
    c.updated_at
  FROM public.clients c
  JOIN public.app_users u ON c.owner_id = u.id
  WHERE c.id = client_id;
  -- RLS já garante que só vemos se podemos gerenciar
$$;

-- Comentário para documentação
COMMENT ON FUNCTION public.get_client IS 'Retorna detalhes completos de um cliente específico';

-- -----------------------------------------------------------------------------
-- 3. FUNÇÃO: create_client
-- POST /clients
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_client(
  client_name text,
  client_segment text DEFAULT NULL,
  client_temperature text DEFAULT 'morno',
  client_budget text DEFAULT NULL,
  client_notes text DEFAULT NULL,
  client_goals jsonb DEFAULT '{}'::jsonb,
  owner_id_param uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  name text,
  segment text,
  temperature text,
  budget text,
  notes text,
  goals jsonb,
  sheet_status text,
  owner jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_client_id uuid;
  final_owner_id uuid;
BEGIN
  -- Se owner_id não foi especificado, usar o usuário atual
  final_owner_id := COALESCE(owner_id_param, auth.uid());
  
  -- Validar se o usuário atual pode criar cliente para o owner especificado
  IF NOT public.can_manage(auth.uid(), final_owner_id) THEN
    RAISE EXCEPTION 'Não autorizado a criar cliente para este usuário' USING ERRCODE = 'insufficient_privilege';
  END IF;
  
  -- Validar temperatura
  IF client_temperature NOT IN ('frio', 'morno', 'quente') THEN
    RAISE EXCEPTION 'Temperatura deve ser: frio, morno ou quente' USING ERRCODE = 'check_violation';
  END IF;
  
  -- Inserir cliente
  INSERT INTO public.clients (
    name, segment, temperature, budget, notes, goals, owner_id
  ) VALUES (
    client_name, client_segment, client_temperature, client_budget, 
    client_notes, client_goals, final_owner_id
  ) RETURNING clients.id INTO new_client_id;
  
  -- Retornar cliente criado
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.segment,
    c.temperature,
    c.budget,
    c.notes,
    c.goals,
    c.sheet_status,
    jsonb_build_object(
      'id', u.id,
      'name', u.email,
      'role', u.role
    ) as owner,
    c.created_at
  FROM public.clients c
  JOIN public.app_users u ON c.owner_id = u.id
  WHERE c.id = new_client_id;
END;
$$;

-- Comentário para documentação
COMMENT ON FUNCTION public.create_client IS 'Cria novo cliente com validações de permissão e dados';

-- -----------------------------------------------------------------------------
-- 4. FUNÇÃO: update_client
-- PUT /clients/:id
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_client(
  client_id uuid,
  client_name text DEFAULT NULL,
  client_segment text DEFAULT NULL,
  client_temperature text DEFAULT NULL,
  client_budget text DEFAULT NULL,
  client_notes text DEFAULT NULL,
  client_goals jsonb DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  name text,
  segment text,
  temperature text,
  budget text,
  notes text,
  goals jsonb,
  sheet_status text,
  owner jsonb,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validar temperatura se fornecida
  IF client_temperature IS NOT NULL AND client_temperature NOT IN ('frio', 'morno', 'quente') THEN
    RAISE EXCEPTION 'Temperatura deve ser: frio, morno ou quente' USING ERRCODE = 'check_violation';
  END IF;
  
  -- Atualizar apenas campos fornecidos (não nulos)
  UPDATE public.clients
  SET 
    name = COALESCE(client_name, name),
    segment = COALESCE(client_segment, segment),
    temperature = COALESCE(client_temperature, temperature),
    budget = COALESCE(client_budget, budget),
    notes = COALESCE(client_notes, notes),
    goals = COALESCE(client_goals, goals),
    updated_at = now()
  WHERE id = client_id;
  
  -- Verificar se alguma linha foi afetada
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente não encontrado ou sem permissão' USING ERRCODE = 'no_data_found';
  END IF;
  
  -- Retornar cliente atualizado
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.segment,
    c.temperature,
    c.budget,
    c.notes,
    c.goals,
    c.sheet_status,
    jsonb_build_object(
      'id', u.id,
      'name', u.email,
      'role', u.role
    ) as owner,
    c.updated_at
  FROM public.clients c
  JOIN public.app_users u ON c.owner_id = u.id
  WHERE c.id = client_id;
END;
$$;

-- Comentário para documentação
COMMENT ON FUNCTION public.update_client IS 'Atualiza campos específicos de um cliente';

-- -----------------------------------------------------------------------------
-- 5. FUNÇÃO: link_client_sheet
-- PUT /clients/:id/link-sheet
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.link_client_sheet(
  client_id uuid,
  sheet_url_param text,
  sheet_tab_param text DEFAULT NULL,
  sheet_mapping_param jsonb DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  name text,
  sheet_status text,
  sheet_url text,
  sheet_tab text,
  sheet_mapping jsonb,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validar URL do Google Sheets
  IF NOT public.validate_google_sheets_url(sheet_url_param) THEN
    RAISE EXCEPTION 'URL deve ser uma planilha válida do Google Sheets' USING ERRCODE = 'check_violation';
  END IF;
  
  -- Atualizar informações da planilha
  UPDATE public.clients
  SET 
    sheet_url = sheet_url_param,
    sheet_tab = sheet_tab_param,
    sheet_mapping = sheet_mapping_param,
    sheet_status = 'linked_pending',
    updated_at = now()
  WHERE public.clients.id = link_client_sheet.client_id;
  
  -- Verificar se alguma linha foi afetada
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente não encontrado ou sem permissão' USING ERRCODE = 'no_data_found';
  END IF;
  
  -- Retornar informações atualizadas da planilha
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.sheet_status,
    c.sheet_url,
    c.sheet_tab,
    c.sheet_mapping,
    c.updated_at
  FROM public.clients c
  WHERE c.id = link_client_sheet.client_id;
END;
$$;

-- Comentário para documentação
COMMENT ON FUNCTION public.link_client_sheet IS 'Vincula planilha Google Sheets a um cliente';

-- -----------------------------------------------------------------------------
-- 6. FUNÇÃO: unlink_client_sheet
-- DELETE /clients/:id/sheet
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.unlink_client_sheet(client_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  sheet_status text,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Remover vinculação da planilha
  UPDATE public.clients
  SET 
    sheet_url = NULL,
    sheet_tab = NULL,
    sheet_mapping = NULL,
    sheet_status = 'not_linked',
    updated_at = now()
  WHERE public.clients.id = unlink_client_sheet.client_id;
  
  -- Verificar se alguma linha foi afetada
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente não encontrado ou sem permissão' USING ERRCODE = 'no_data_found';
  END IF;
  
  -- Retornar status atualizado
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.sheet_status,
    c.updated_at
  FROM public.clients c
  WHERE c.id = unlink_client_sheet.client_id;
END;
$$;

-- Comentário para documentação
COMMENT ON FUNCTION public.unlink_client_sheet IS 'Remove vinculação de planilha de um cliente';

-- -----------------------------------------------------------------------------
-- 7. FUNÇÃO: delete_client
-- DELETE /clients/:id
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.delete_client(client_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  deleted_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  client_record record;
BEGIN
  -- Buscar informações do cliente antes de deletar
  SELECT c.id, c.name INTO client_record
  FROM public.clients c
  WHERE c.id = delete_client.client_id;
  
  -- Verificar se cliente existe e temos permissão (RLS)
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente não encontrado ou sem permissão' USING ERRCODE = 'no_data_found';
  END IF;
  
  -- Deletar cliente (CASCADE vai remover relacionamentos)
  DELETE FROM public.clients WHERE public.clients.id = delete_client.client_id;
  
  -- Retornar informações do cliente deletado
  RETURN QUERY
  SELECT 
    client_record.id,
    client_record.name,
    now() as deleted_at;
END;
$$;

-- Comentário para documentação
COMMENT ON FUNCTION public.delete_client IS 'Remove um cliente e seus relacionamentos';

-- -----------------------------------------------------------------------------
-- 8. FUNÇÃO: get_client_segments
-- GET /clients/segments (para dropdown de filtros)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_client_segments()
RETURNS TABLE(segment text, count bigint)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    c.segment,
    COUNT(*) as count
  FROM public.clients c
  WHERE c.segment IS NOT NULL
  GROUP BY c.segment
  ORDER BY count DESC, c.segment ASC;
$$;

-- Comentário para documentação
COMMENT ON FUNCTION public.get_client_segments IS 'Retorna lista de segmentos únicos com contagem';

-- =============================================================================
-- FIM DAS FUNÇÕES DA API
-- =============================================================================
