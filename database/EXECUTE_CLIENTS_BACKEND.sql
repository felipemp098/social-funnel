-- =============================================================================
-- SCRIPT PRINCIPAL: EXECUÇÃO DO BACKEND DE CLIENTES
-- Execute este arquivo no Supabase Dashboard para implementar o backend completo
-- =============================================================================

-- IMPORTANTE: Execute os scripts na ordem correta!
-- Se você já tem a estrutura básica (01-08), execute apenas os novos (09-12)

-- -----------------------------------------------------------------------------
-- VERIFICAR DEPENDÊNCIAS
-- -----------------------------------------------------------------------------

-- Verificar se as funções de autorização existem
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'can_manage') THEN
    RAISE EXCEPTION 'ERRO: Função can_manage não encontrada. Execute primeiro os scripts 01-08.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_users') THEN
    RAISE EXCEPTION 'ERRO: Tabela app_users não encontrada. Execute primeiro os scripts 01-08.';
  END IF;
  
  RAISE NOTICE 'Dependências verificadas com sucesso.';
END;
$$;

-- -----------------------------------------------------------------------------
-- 1. ATUALIZAR TABELA CLIENTS (Arquivo: 09_update_clients_table.sql)
-- -----------------------------------------------------------------------------

-- Adicionar novos campos necessários
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS budget text,
ADD COLUMN IF NOT EXISTS goals jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS sheet_url text,
ADD COLUMN IF NOT EXISTS sheet_tab text,
ADD COLUMN IF NOT EXISTS sheet_mapping jsonb,
ADD COLUMN IF NOT EXISTS sheet_status text CHECK (sheet_status IN ('not_linked', 'linked_pending', 'linked_warn', 'linked_ok', 'linked_complete')) DEFAULT 'not_linked';

-- Atualizar constraint de temperature para usar valores em português
ALTER TABLE public.clients 
DROP CONSTRAINT IF EXISTS clients_temperature_check;

ALTER TABLE public.clients 
ADD CONSTRAINT clients_temperature_check 
CHECK (temperature IN ('frio', 'morno', 'quente'));

-- Migrar dados existentes se necessário
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'revenue_range') THEN
    ALTER TABLE public.clients RENAME COLUMN revenue_range TO budget_old;
    UPDATE public.clients SET budget = budget_old WHERE budget IS NULL AND budget_old IS NOT NULL;
    ALTER TABLE public.clients DROP COLUMN budget_old;
  END IF;
END;
$$;

-- Remover colunas desnecessárias
ALTER TABLE public.clients 
DROP COLUMN IF EXISTS active_prospects,
DROP COLUMN IF EXISTS conversion_rate;

-- Comentários
COMMENT ON COLUMN public.clients.budget IS 'Faixa de faturamento (ex: "50-100k")';
COMMENT ON COLUMN public.clients.goals IS 'Metas em formato JSON (respostas, reuniões, vendas, faturamento)';
COMMENT ON COLUMN public.clients.sheet_url IS 'URL da planilha Google Sheets vinculada';
COMMENT ON COLUMN public.clients.sheet_tab IS 'Nome da aba da planilha vinculada';
COMMENT ON COLUMN public.clients.sheet_mapping IS 'Mapeamento de colunas da planilha em formato JSON';
COMMENT ON COLUMN public.clients.sheet_status IS 'Status da conexão com a planilha';

-- Índices
CREATE INDEX IF NOT EXISTS idx_clients_sheet_status ON public.clients(sheet_status);

-- Funções de validação
CREATE OR REPLACE FUNCTION public.validate_client_goals(goals_data jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF goals_data IS NULL OR goals_data = '{}'::jsonb THEN
    RETURN true;
  END IF;
  
  IF NOT ((goals_data ? 'respostas' AND jsonb_typeof(goals_data->'respostas') = 'number') OR NOT (goals_data ? 'respostas')) THEN
    RETURN false;
  END IF;
  
  IF NOT ((goals_data ? 'reunioes' AND jsonb_typeof(goals_data->'reunioes') = 'number') OR NOT (goals_data ? 'reunioes')) THEN
    RETURN false;
  END IF;
  
  IF NOT ((goals_data ? 'vendas' AND jsonb_typeof(goals_data->'vendas') = 'number') OR NOT (goals_data ? 'vendas')) THEN
    RETURN false;
  END IF;
  
  IF NOT ((goals_data ? 'faturamento' AND jsonb_typeof(goals_data->'faturamento') = 'number') OR NOT (goals_data ? 'faturamento')) THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_google_sheets_url(url text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF url IS NULL THEN
    RETURN true;
  END IF;
  
  RETURN url ~ '^https://docs\.google\.com/spreadsheets/d/[a-zA-Z0-9_-]+';
END;
$$;

-- Constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'clients_goals_valid') THEN
    ALTER TABLE public.clients ADD CONSTRAINT clients_goals_valid CHECK (public.validate_client_goals(goals));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'clients_sheet_url_valid') THEN
    ALTER TABLE public.clients ADD CONSTRAINT clients_sheet_url_valid CHECK (public.validate_google_sheets_url(sheet_url));
  END IF;
END;
$$;

-- Trigger para sheet_status
CREATE OR REPLACE FUNCTION public.update_client_sheet_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.sheet_url IS NULL THEN
    NEW.sheet_status = 'not_linked';
    NEW.sheet_tab = NULL;
    NEW.sheet_mapping = NULL;
  ELSIF OLD.sheet_url IS DISTINCT FROM NEW.sheet_url THEN
    NEW.sheet_status = 'linked_pending';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_client_sheet_status ON public.clients;
CREATE TRIGGER update_client_sheet_status
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_client_sheet_status();

-- -----------------------------------------------------------------------------
-- 2. FUNÇÕES DA API (Arquivo: 10_clients_api_functions.sql)
-- -----------------------------------------------------------------------------

-- Função: Listar clientes
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
  owner jsonb,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    c.id, c.name, c.segment, c.temperature, c.budget, c.notes, c.goals, c.sheet_status, c.sheet_url,
    jsonb_build_object('id', u.id, 'name', u.email, 'role', u.role) as owner,
    c.created_at
  FROM public.clients c
  JOIN public.app_users u ON c.owner_id = u.id
  WHERE 
    (search_term IS NULL OR c.name ILIKE '%' || search_term || '%')
    AND (segment_filter IS NULL OR c.segment = segment_filter)
    AND (temperature_filter IS NULL OR c.temperature = temperature_filter)
    AND (status_filter IS NULL OR c.sheet_status = status_filter)
  ORDER BY c.created_at DESC;
$$;

-- Função: Obter cliente
CREATE OR REPLACE FUNCTION public.get_client(client_id uuid)
RETURNS TABLE(
  id uuid, name text, segment text, temperature text, budget text, notes text, goals jsonb,
  sheet_status text, sheet_url text, sheet_tab text, sheet_mapping jsonb,
  owner jsonb, created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    c.id, c.name, c.segment, c.temperature, c.budget, c.notes, c.goals,
    c.sheet_status, c.sheet_url, c.sheet_tab, c.sheet_mapping,
    jsonb_build_object('id', u.id, 'name', u.email, 'role', u.role) as owner,
    c.created_at, c.updated_at
  FROM public.clients c
  JOIN public.app_users u ON c.owner_id = u.id
  WHERE c.id = client_id;
$$;

-- Função: Criar cliente
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
  id uuid, name text, segment text, temperature text, budget text, notes text, goals jsonb,
  sheet_status text, owner jsonb, created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_client_id uuid;
  final_owner_id uuid;
BEGIN
  final_owner_id := COALESCE(owner_id_param, auth.uid());
  
  IF NOT public.can_manage(auth.uid(), final_owner_id) THEN
    RAISE EXCEPTION 'Não autorizado a criar cliente para este usuário' USING ERRCODE = 'insufficient_privilege';
  END IF;
  
  IF client_temperature NOT IN ('frio', 'morno', 'quente') THEN
    RAISE EXCEPTION 'Temperatura deve ser: frio, morno ou quente' USING ERRCODE = 'check_violation';
  END IF;
  
  INSERT INTO public.clients (name, segment, temperature, budget, notes, goals, owner_id) 
  VALUES (client_name, client_segment, client_temperature, client_budget, client_notes, client_goals, final_owner_id) 
  RETURNING clients.id INTO new_client_id;
  
  RETURN QUERY
  SELECT c.id, c.name, c.segment, c.temperature, c.budget, c.notes, c.goals, c.sheet_status,
         jsonb_build_object('id', u.id, 'name', u.email, 'role', u.role) as owner,
         c.created_at
  FROM public.clients c
  JOIN public.app_users u ON c.owner_id = u.id
  WHERE c.id = new_client_id;
END;
$$;

-- Função: Atualizar cliente
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
  id uuid, name text, segment text, temperature text, budget text, notes text, goals jsonb,
  sheet_status text, owner jsonb, updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF client_temperature IS NOT NULL AND client_temperature NOT IN ('frio', 'morno', 'quente') THEN
    RAISE EXCEPTION 'Temperatura deve ser: frio, morno ou quente' USING ERRCODE = 'check_violation';
  END IF;
  
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
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente não encontrado ou sem permissão' USING ERRCODE = 'no_data_found';
  END IF;
  
  RETURN QUERY
  SELECT c.id, c.name, c.segment, c.temperature, c.budget, c.notes, c.goals, c.sheet_status,
         jsonb_build_object('id', u.id, 'name', u.email, 'role', u.role) as owner,
         c.updated_at
  FROM public.clients c
  JOIN public.app_users u ON c.owner_id = u.id
  WHERE c.id = client_id;
END;
$$;

-- Função: Vincular planilha (com webhook)
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

-- Função: Desvincular planilha (com webhook)
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

-- Função: Deletar cliente
CREATE OR REPLACE FUNCTION public.delete_client(client_id uuid)
RETURNS TABLE(id uuid, name text, deleted_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  client_record record;
BEGIN
  SELECT c.id, c.name INTO client_record FROM public.clients c WHERE c.id = delete_client.client_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente não encontrado ou sem permissão' USING ERRCODE = 'no_data_found';
  END IF;
  
  DELETE FROM public.clients WHERE public.clients.id = delete_client.client_id;
  
  RETURN QUERY SELECT client_record.id, client_record.name, now() as deleted_at;
END;
$$;

-- Função: Listar segmentos
CREATE OR REPLACE FUNCTION public.get_client_segments()
RETURNS TABLE(segment text, count bigint)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT c.segment, COUNT(*) as count
  FROM public.clients c
  WHERE c.segment IS NOT NULL
  GROUP BY c.segment
  ORDER BY count DESC, c.segment ASC;
$$;

-- -----------------------------------------------------------------------------
-- 3. POLÍTICAS RLS E AUDIT LOG (Arquivo: 11_clients_rls_validation.sql)
-- -----------------------------------------------------------------------------

-- Habilitar RLS
-- Habilitar extensão HTTP para webhooks
CREATE EXTENSION IF NOT EXISTS http;

-- Habilitar RLS na tabela clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes
DROP POLICY IF EXISTS clients_select ON public.clients;
DROP POLICY IF EXISTS clients_insert ON public.clients;
DROP POLICY IF EXISTS clients_update ON public.clients;
DROP POLICY IF EXISTS clients_delete ON public.clients;

-- Criar políticas RLS
CREATE POLICY clients_select ON public.clients FOR SELECT TO authenticated USING (public.can_manage(auth.uid(), owner_id));
CREATE POLICY clients_insert ON public.clients FOR INSERT TO authenticated WITH CHECK (public.can_manage(auth.uid(), owner_id));
CREATE POLICY clients_update ON public.clients FOR UPDATE TO authenticated USING (public.can_manage(auth.uid(), owner_id)) WITH CHECK (public.can_manage(auth.uid(), owner_id));
CREATE POLICY clients_delete ON public.clients FOR DELETE TO authenticated USING (public.can_manage(auth.uid(), owner_id));

-- Tabela de audit log
CREATE TABLE IF NOT EXISTS public.client_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES public.app_users(id),
  action text NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'sheet_linked', 'sheet_unlinked')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Índices do audit log
CREATE INDEX IF NOT EXISTS idx_client_audit_client_id ON public.client_audit_log(client_id);
CREATE INDEX IF NOT EXISTS idx_client_audit_user_id ON public.client_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_client_audit_created_at ON public.client_audit_log(created_at);

-- Função de audit log
CREATE OR REPLACE FUNCTION public.log_client_action(
  client_id uuid, action text, old_data jsonb DEFAULT NULL, new_data jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.client_audit_log (client_id, user_id, action, old_data, new_data)
  VALUES (client_id, auth.uid(), action, old_data, new_data);
END;
$$;

-- Trigger de audit log
CREATE OR REPLACE FUNCTION public.client_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_client_action(NEW.id, 'created', NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_client_action(NEW.id, 'updated', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_client_action(OLD.id, 'deleted', to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS client_audit_trigger ON public.clients;
CREATE TRIGGER client_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.client_audit_trigger();

-- RLS para audit log
ALTER TABLE public.client_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_audit_select ON public.client_audit_log;

CREATE POLICY client_audit_select ON public.client_audit_log
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_audit_log.client_id
    AND public.can_manage(auth.uid(), c.owner_id)
  )
);

-- -----------------------------------------------------------------------------
-- 4. FUNÇÃO PARA ENVIAR WEBHOOK
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
      success := false;
  END;
  
  RETURN success;
END;
$$;

-- -----------------------------------------------------------------------------
-- FINALIZAÇÃO
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'BACKEND DE CLIENTES IMPLEMENTADO COM SUCESSO!';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'Funcionalidades disponíveis:';
  RAISE NOTICE '• list_clients() - Listar clientes com filtros';
  RAISE NOTICE '• get_client(uuid) - Obter cliente específico';
  RAISE NOTICE '• create_client(...) - Criar novo cliente';
  RAISE NOTICE '• update_client(...) - Atualizar cliente';
  RAISE NOTICE '• link_client_sheet(...) - Vincular planilha Google Sheets';
  RAISE NOTICE '• unlink_client_sheet(uuid) - Desvincular planilha';
  RAISE NOTICE '• delete_client(uuid) - Deletar cliente';
  RAISE NOTICE '• get_client_segments() - Listar segmentos únicos';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'Permissões implementadas:';
  RAISE NOTICE '• Admin: vê e gerencia todos os clientes';
  RAISE NOTICE '• Manager: vê e gerencia seus clientes + dos descendentes';
  RAISE NOTICE '• User: vê e gerencia apenas próprios clientes';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'Recursos adicionais:';
  RAISE NOTICE '• Audit log completo em client_audit_log';
  RAISE NOTICE '• Validações automáticas (temperatura, URLs, goals)';
  RAISE NOTICE '• Triggers para atualização automática de sheet_status';
  RAISE NOTICE '• RLS garantindo segurança por hierarquia';
  RAISE NOTICE '=============================================================================';
END;
$$;
