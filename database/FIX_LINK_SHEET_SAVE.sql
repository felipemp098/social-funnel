-- Execute este script para corrigir o problema de salvamento de sheet_tab e sheet_mapping

-- Função melhorada com logs e validações extras
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
DECLARE
  client_record record;
  webhook_payload jsonb;
  webhook_sent boolean;
  final_sheet_tab text;
  final_sheet_mapping jsonb;
BEGIN
  -- Log dos parâmetros recebidos
  RAISE LOG 'link_client_sheet chamada com: client_id=%, sheet_url_param=%, sheet_tab_param=%, sheet_mapping_param=%', 
    client_id, sheet_url_param, sheet_tab_param, sheet_mapping_param;

  -- Validar URL do Google Sheets
  IF NOT public.validate_google_sheets_url(sheet_url_param) THEN
    RAISE EXCEPTION 'URL deve ser uma planilha válida do Google Sheets' USING ERRCODE = 'check_violation';
  END IF;
  
  -- Processar sheet_tab (garantir que não seja string vazia)
  final_sheet_tab := CASE 
    WHEN sheet_tab_param IS NULL OR trim(sheet_tab_param) = '' THEN NULL
    ELSE trim(sheet_tab_param)
  END;
  
  -- Processar sheet_mapping (garantir que não seja objeto vazio)
  final_sheet_mapping := CASE 
    WHEN sheet_mapping_param IS NULL OR sheet_mapping_param = '{}'::jsonb THEN NULL
    ELSE sheet_mapping_param
  END;
  
  RAISE LOG 'Valores processados: final_sheet_tab=%, final_sheet_mapping=%', 
    final_sheet_tab, final_sheet_mapping;
  
  -- Buscar dados do cliente antes da atualização
  SELECT c.*, u.email as owner_email, u.role as owner_role
  INTO client_record
  FROM public.clients c
  JOIN public.app_users u ON c.owner_id = u.id
  WHERE c.id = client_id;
  
  -- Verificar se cliente existe e temos permissão
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente não encontrado ou sem permissão' USING ERRCODE = 'no_data_found';
  END IF;
  
  RAISE LOG 'Cliente encontrado: %, owner: %', client_record.name, client_record.owner_email;
  
  -- Atualizar informações da planilha (com valores processados)
  UPDATE public.clients
  SET 
    sheet_url = sheet_url_param,
    sheet_tab = final_sheet_tab,
    sheet_mapping = final_sheet_mapping,
    sheet_status = 'linked_pending',
    updated_at = now()
  WHERE public.clients.id = client_id;
  
  -- Verificar se a atualização funcionou
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Falha ao atualizar cliente' USING ERRCODE = 'no_data_found';
  END IF;
  
  RAISE LOG 'Cliente atualizado com sucesso';
  
  -- Preparar dados para o webhook
  webhook_payload := jsonb_build_object(
    'client_id', client_record.id,
    'client_name', client_record.name,
    'client_segment', client_record.segment,
    'client_temperature', client_record.temperature,
    'client_budget', client_record.budget,
    'client_goals', client_record.goals,
    'sheet_url', sheet_url_param,
    'sheet_tab', final_sheet_tab,
    'sheet_mapping', final_sheet_mapping,
    'sheet_status', 'linked_pending',
    'owner', jsonb_build_object(
      'id', client_record.owner_id,
      'email', client_record.owner_email,
      'role', client_record.owner_role
    ),
    'linked_at', now()
  );
  
  -- Enviar webhook (não falha se der erro)
  SELECT public.send_sheet_webhook(webhook_payload, 'linked') INTO webhook_sent;
  
  RAISE LOG 'Webhook enviado: %', webhook_sent;
  
  -- Retornar informações atualizadas da planilha
  RETURN QUERY
  SELECT c.id, c.name, c.sheet_status, c.sheet_url, c.sheet_tab, c.sheet_mapping, c.updated_at
  FROM public.clients c
  WHERE c.id = client_id;
  
  RAISE LOG 'Dados retornados da função';
END;
$$;
