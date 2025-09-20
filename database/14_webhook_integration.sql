-- =============================================================================
-- INTEGRAÇÃO COM WEBHOOK APÓS VINCULAÇÃO DE PLANILHA
-- Envio de dados para https://webhooks.adviser-pro.com.br/webhook/social-funnel/sheets
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. HABILITAR EXTENSÃO HTTP (necessária para fazer requisições)
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS http;

-- -----------------------------------------------------------------------------
-- 2. FUNÇÃO PARA ENVIAR WEBHOOK
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_sheet_webhook(
  client_data jsonb,
  action_type text DEFAULT 'linked'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  webhook_url text := 'https://webhooks.adviser-pro.com.br/webhook/social-funnel/sheets';
  payload jsonb;
  response http_response;
  success boolean := false;
BEGIN
  -- Preparar payload do webhook
  payload := jsonb_build_object(
    'event', 'sheet_' || action_type,
    'timestamp', now(),
    'client', client_data,
    'user_id', auth.uid(),
    'source', 'social-funnel'
  );
  
  -- Log do que será enviado
  RAISE LOG 'Enviando webhook para %: %', webhook_url, payload;
  
  BEGIN
    -- Fazer requisição HTTP POST
    SELECT * INTO response FROM http((
      'POST',
      webhook_url,
      ARRAY[http_header('Content-Type', 'application/json')],
      'application/json',
      payload::text
    )::http_request);
    
    -- Verificar se a requisição foi bem-sucedida
    IF response.status >= 200 AND response.status < 300 THEN
      success := true;
      RAISE LOG 'Webhook enviado com sucesso. Status: %, Response: %', response.status, response.content;
    ELSE
      RAISE WARNING 'Webhook falhou. Status: %, Response: %', response.status, response.content;
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Erro ao enviar webhook: %', SQLERRM;
      -- Não falhar a operação principal se o webhook falhar
      success := false;
  END;
  
  RETURN success;
END;
$$;

-- Comentário para documentação
COMMENT ON FUNCTION public.send_sheet_webhook IS 'Envia webhook com dados da planilha vinculada';

-- -----------------------------------------------------------------------------
-- 3. ATUALIZAR FUNÇÃO link_client_sheet COM WEBHOOK
-- -----------------------------------------------------------------------------
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
BEGIN
  -- Validar URL do Google Sheets
  IF NOT public.validate_google_sheets_url(sheet_url_param) THEN
    RAISE EXCEPTION 'URL deve ser uma planilha válida do Google Sheets' USING ERRCODE = 'check_violation';
  END IF;
  
  -- Buscar dados do cliente antes da atualização
  SELECT c.*, u.email as owner_email, u.role as owner_role
  INTO client_record
  FROM public.clients c
  JOIN public.app_users u ON c.owner_id = u.id
  WHERE c.id = link_client_sheet.client_id;
  
  -- Verificar se cliente existe e temos permissão
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente não encontrado ou sem permissão' USING ERRCODE = 'no_data_found';
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
  
  -- Preparar dados para o webhook
  webhook_payload := jsonb_build_object(
    'client_id', client_record.id,
    'client_name', client_record.name,
    'client_segment', client_record.segment,
    'client_temperature', client_record.temperature,
    'client_budget', client_record.budget,
    'client_goals', client_record.goals,
    'sheet_url', sheet_url_param,
    'sheet_tab', sheet_tab_param,
    'sheet_mapping', sheet_mapping_param,
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
  
  -- Retornar informações atualizadas da planilha
  RETURN QUERY
  SELECT c.id, c.name, c.sheet_status, c.sheet_url, c.sheet_tab, c.sheet_mapping, c.updated_at
  FROM public.clients c
  WHERE c.id = link_client_sheet.client_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. ATUALIZAR FUNÇÃO unlink_client_sheet COM WEBHOOK
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.unlink_client_sheet(client_id uuid)
RETURNS TABLE(id uuid, name text, sheet_status text, updated_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  client_record record;
  webhook_payload jsonb;
  webhook_sent boolean;
BEGIN
  -- Buscar dados do cliente antes da remoção
  SELECT c.*, u.email as owner_email, u.role as owner_role
  INTO client_record
  FROM public.clients c
  JOIN public.app_users u ON c.owner_id = u.id
  WHERE c.id = unlink_client_sheet.client_id;
  
  -- Verificar se cliente existe e temos permissão
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente não encontrado ou sem permissão' USING ERRCODE = 'no_data_found';
  END IF;
  
  -- Preparar dados para o webhook (antes de remover)
  webhook_payload := jsonb_build_object(
    'client_id', client_record.id,
    'client_name', client_record.name,
    'client_segment', client_record.segment,
    'client_temperature', client_record.temperature,
    'client_budget', client_record.budget,
    'client_goals', client_record.goals,
    'sheet_url', client_record.sheet_url,
    'sheet_tab', client_record.sheet_tab,
    'sheet_mapping', client_record.sheet_mapping,
    'sheet_status', 'not_linked',
    'owner', jsonb_build_object(
      'id', client_record.owner_id,
      'email', client_record.owner_email,
      'role', client_record.owner_role
    ),
    'unlinked_at', now()
  );
  
  -- Remover vinculação da planilha
  UPDATE public.clients
  SET sheet_url = NULL, sheet_tab = NULL, sheet_mapping = NULL, sheet_status = 'not_linked', updated_at = now()
  WHERE public.clients.id = unlink_client_sheet.client_id;
  
  -- Enviar webhook (não falha se der erro)
  SELECT public.send_sheet_webhook(webhook_payload, 'unlinked') INTO webhook_sent;
  
  -- Retornar status atualizado
  RETURN QUERY
  SELECT c.id, c.name, c.sheet_status, c.updated_at
  FROM public.clients c
  WHERE c.id = unlink_client_sheet.client_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. TABELA DE LOG DE WEBHOOKS (OPCIONAL)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhook_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_url text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status_code integer,
  response_body text,
  success boolean DEFAULT false,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_webhook_log_event_type ON public.webhook_log(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_log_created_at ON public.webhook_log(created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_log_success ON public.webhook_log(success);

-- Comentário
COMMENT ON TABLE public.webhook_log IS 'Log de webhooks enviados pelo sistema';

-- -----------------------------------------------------------------------------
-- 6. FUNÇÃO MELHORADA COM LOG
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_sheet_webhook_with_log(
  client_data jsonb,
  action_type text DEFAULT 'linked'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  webhook_url text := 'https://webhooks.adviser-pro.com.br/webhook/social-funnel/sheets';
  payload jsonb;
  response http_response;
  success boolean := false;
  log_id uuid;
BEGIN
  -- Preparar payload do webhook
  payload := jsonb_build_object(
    'event', 'sheet_' || action_type,
    'timestamp', now(),
    'client', client_data,
    'user_id', auth.uid(),
    'source', 'social-funnel'
  );
  
  -- Criar registro de log inicial
  INSERT INTO public.webhook_log (webhook_url, event_type, payload)
  VALUES (webhook_url, 'sheet_' || action_type, payload)
  RETURNING id INTO log_id;
  
  BEGIN
    -- Fazer requisição HTTP POST
    SELECT * INTO response FROM http((
      'POST',
      webhook_url,
      ARRAY[http_header('Content-Type', 'application/json')],
      'application/json',
      payload::text
    )::http_request);
    
    -- Verificar se a requisição foi bem-sucedida
    IF response.status >= 200 AND response.status < 300 THEN
      success := true;
      
      -- Atualizar log com sucesso
      UPDATE public.webhook_log
      SET status_code = response.status,
          response_body = response.content,
          success = true
      WHERE id = log_id;
      
      RAISE LOG 'Webhook enviado com sucesso. Status: %, Response: %', response.status, response.content;
    ELSE
      -- Atualizar log com falha
      UPDATE public.webhook_log
      SET status_code = response.status,
          response_body = response.content,
          success = false,
          error_message = 'HTTP Status: ' || response.status
      WHERE id = log_id;
      
      RAISE WARNING 'Webhook falhou. Status: %, Response: %', response.status, response.content;
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Atualizar log com erro
      UPDATE public.webhook_log
      SET success = false,
          error_message = SQLERRM
      WHERE id = log_id;
      
      RAISE WARNING 'Erro ao enviar webhook: %', SQLERRM;
      success := false;
  END;
  
  RETURN success;
END;
$$;

-- =============================================================================
-- FIM DA INTEGRAÇÃO COM WEBHOOK
-- =============================================================================

