-- =============================================================================
-- VALIDAÇÃO E AJUSTE DAS POLÍTICAS RLS PARA CLIENTS
-- Garantir que as políticas estão alinhadas com a especificação
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. VERIFICAR SE RLS ESTÁ HABILITADO
-- -----------------------------------------------------------------------------

-- Habilitar RLS na tabela clients (caso não esteja)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 2. REMOVER POLÍTICAS EXISTENTES PARA RECRIAR
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS clients_select ON public.clients;
DROP POLICY IF EXISTS clients_insert ON public.clients;
DROP POLICY IF EXISTS clients_update ON public.clients;
DROP POLICY IF EXISTS clients_delete ON public.clients;

-- -----------------------------------------------------------------------------
-- 3. POLÍTICAS RLS ATUALIZADAS CONFORME ESPECIFICAÇÃO
-- -----------------------------------------------------------------------------

-- SELECT: Admin vê todos, Manager vê seus + descendentes, User vê apenas próprios
CREATE POLICY clients_select ON public.clients
FOR SELECT 
TO authenticated
USING (public.can_manage(auth.uid(), owner_id));

-- INSERT: Pode criar cliente para si ou para descendente (se can_manage)
CREATE POLICY clients_insert ON public.clients
FOR INSERT 
TO authenticated
WITH CHECK (public.can_manage(auth.uid(), owner_id));

-- UPDATE: Pode editar clientes que consegue gerenciar
CREATE POLICY clients_update ON public.clients
FOR UPDATE 
TO authenticated
USING (public.can_manage(auth.uid(), owner_id))
WITH CHECK (public.can_manage(auth.uid(), owner_id));

-- DELETE: Pode deletar clientes que consegue gerenciar
-- Admin e Manager podem deletar, User só próprios
CREATE POLICY clients_delete ON public.clients
FOR DELETE 
TO authenticated
USING (public.can_manage(auth.uid(), owner_id));

-- -----------------------------------------------------------------------------
-- 4. FUNÇÃO AUXILIAR PARA VERIFICAR PERMISSÕES ESPECÍFICAS
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_client_permission(
  client_id uuid,
  action text -- 'read', 'write', 'delete'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  client_owner_id uuid;
  current_user_role public.user_role;
BEGIN
  -- Buscar owner do cliente
  SELECT owner_id INTO client_owner_id
  FROM public.clients
  WHERE id = client_id;
  
  -- Se cliente não existe, retornar false
  IF client_owner_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Buscar role do usuário atual
  SELECT role INTO current_user_role
  FROM public.app_users
  WHERE id = auth.uid();
  
  -- Aplicar regras específicas por ação
  CASE action
    WHEN 'read' THEN
      -- Leitura: usar can_manage
      RETURN public.can_manage(auth.uid(), client_owner_id);
      
    WHEN 'write' THEN
      -- Escrita: usar can_manage
      RETURN public.can_manage(auth.uid(), client_owner_id);
      
    WHEN 'delete' THEN
      -- Exclusão: Admin pode tudo, Manager/User apenas se can_manage
      RETURN public.can_manage(auth.uid(), client_owner_id);
      
    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- Comentário para documentação
COMMENT ON FUNCTION public.check_client_permission IS 'Verifica permissões específicas sobre um cliente';

-- -----------------------------------------------------------------------------
-- 5. FUNÇÃO PARA AUDIT LOG DE OPERAÇÕES EM CLIENTES
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.client_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES public.app_users(id),
  action text NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'sheet_linked', 'sheet_unlinked')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Índices para performance do audit log
CREATE INDEX IF NOT EXISTS idx_client_audit_client_id ON public.client_audit_log(client_id);
CREATE INDEX IF NOT EXISTS idx_client_audit_user_id ON public.client_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_client_audit_created_at ON public.client_audit_log(created_at);

-- Função para registrar audit log
CREATE OR REPLACE FUNCTION public.log_client_action(
  client_id uuid,
  action text,
  old_data jsonb DEFAULT NULL,
  new_data jsonb DEFAULT NULL
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

-- Trigger para audit log automático
CREATE OR REPLACE FUNCTION public.client_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_client_action(
      NEW.id, 
      'created', 
      NULL, 
      to_jsonb(NEW)
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_client_action(
      NEW.id, 
      'updated', 
      to_jsonb(OLD), 
      to_jsonb(NEW)
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_client_action(
      OLD.id, 
      'deleted', 
      to_jsonb(OLD), 
      NULL
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Aplicar trigger de audit
DROP TRIGGER IF EXISTS client_audit_trigger ON public.clients;
CREATE TRIGGER client_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.client_audit_trigger();

-- -----------------------------------------------------------------------------
-- 6. RLS PARA AUDIT LOG (usuários só veem logs dos clientes que gerenciam)
-- -----------------------------------------------------------------------------

ALTER TABLE public.client_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_audit_select ON public.client_audit_log;

CREATE POLICY client_audit_select ON public.client_audit_log
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_audit_log.client_id
    AND public.can_manage(auth.uid(), c.owner_id)
  )
);

-- -----------------------------------------------------------------------------
-- 7. FUNÇÃO PARA TESTAR PERMISSÕES (ÚTIL PARA DEBUG)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.test_client_permissions(test_client_id uuid)
RETURNS TABLE(
  permission text,
  allowed boolean,
  reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  client_owner_id uuid;
  current_user_id uuid;
  current_user_role public.user_role;
BEGIN
  current_user_id := auth.uid();
  
  -- Buscar dados do cliente
  SELECT owner_id INTO client_owner_id
  FROM public.clients
  WHERE id = test_client_id;
  
  -- Buscar role do usuário atual
  SELECT role INTO current_user_role
  FROM public.app_users
  WHERE id = current_user_id;
  
  -- Testar permissão de leitura
  RETURN QUERY
  SELECT 
    'read'::text,
    public.can_manage(current_user_id, client_owner_id),
    CASE 
      WHEN current_user_role = 'admin' THEN 'Admin pode ler tudo'
      WHEN current_user_id = client_owner_id THEN 'Próprio cliente'
      WHEN public.is_ancestor(current_user_id, client_owner_id) THEN 'Cliente de descendente'
      ELSE 'Sem permissão'
    END;
  
  -- Testar permissão de escrita
  RETURN QUERY
  SELECT 
    'write'::text,
    public.can_manage(current_user_id, client_owner_id),
    CASE 
      WHEN current_user_role = 'admin' THEN 'Admin pode escrever tudo'
      WHEN current_user_id = client_owner_id THEN 'Próprio cliente'
      WHEN public.is_ancestor(current_user_id, client_owner_id) THEN 'Cliente de descendente'
      ELSE 'Sem permissão'
    END;
  
  -- Testar permissão de exclusão
  RETURN QUERY
  SELECT 
    'delete'::text,
    public.can_manage(current_user_id, client_owner_id),
    CASE 
      WHEN current_user_role = 'admin' THEN 'Admin pode deletar tudo'
      WHEN current_user_id = client_owner_id THEN 'Próprio cliente'
      WHEN public.is_ancestor(current_user_id, client_owner_id) THEN 'Cliente de descendente'
      ELSE 'Sem permissão'
    END;
END;
$$;

-- Comentário para documentação
COMMENT ON FUNCTION public.test_client_permissions IS 'Testa todas as permissões de um usuário sobre um cliente específico';

-- =============================================================================
-- FIM DA VALIDAÇÃO RLS
-- =============================================================================
