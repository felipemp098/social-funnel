-- Execute este script no Supabase Dashboard para corrigir os erros

-- 1. Corrigir a validação de URL (regex)
CREATE OR REPLACE FUNCTION public.validate_google_sheets_url(url text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF url IS NULL THEN
    RETURN true;
  END IF;
  
  -- Corrigido: colocar o hífen no final para não ser interpretado como range
  RETURN url ~ '^https://docs\.google\.com/spreadsheets/d/[a-zA-Z0-9_-]+';
END;
$$;

-- 2. Corrigir a função link_client_sheet (ambiguidade de colunas)
CREATE OR REPLACE FUNCTION public.link_client_sheet(
  client_id uuid,
  sheet_url_param text,
  sheet_tab_param text DEFAULT NULL,
  sheet_mapping_param jsonb DEFAULT NULL
)
RETURNS TABLE(
  id uuid, name text, sheet_status text, sheet_url text, sheet_tab text, sheet_mapping jsonb, updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.validate_google_sheets_url(sheet_url_param) THEN
    RAISE EXCEPTION 'URL deve ser uma planilha válida do Google Sheets' USING ERRCODE = 'check_violation';
  END IF;
  
  UPDATE public.clients
  SET 
    sheet_url = sheet_url_param,
    sheet_tab = sheet_tab_param,
    sheet_mapping = sheet_mapping_param,
    sheet_status = 'linked_pending',
    updated_at = now()
  WHERE public.clients.id = link_client_sheet.client_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente não encontrado ou sem permissão' USING ERRCODE = 'no_data_found';
  END IF;
  
  RETURN QUERY
  SELECT c.id, c.name, c.sheet_status, c.sheet_url, c.sheet_tab, c.sheet_mapping, c.updated_at
  FROM public.clients c
  WHERE c.id = link_client_sheet.client_id;
END;
$$;

-- 3. Corrigir a função unlink_client_sheet (ambiguidade de colunas)
CREATE OR REPLACE FUNCTION public.unlink_client_sheet(client_id uuid)
RETURNS TABLE(id uuid, name text, sheet_status text, updated_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.clients
  SET sheet_url = NULL, sheet_tab = NULL, sheet_mapping = NULL, sheet_status = 'not_linked', updated_at = now()
  WHERE public.clients.id = unlink_client_sheet.client_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente não encontrado ou sem permissão' USING ERRCODE = 'no_data_found';
  END IF;
  
  RETURN QUERY
  SELECT c.id, c.name, c.sheet_status, c.updated_at
  FROM public.clients c
  WHERE c.id = unlink_client_sheet.client_id;
END;
$$;
