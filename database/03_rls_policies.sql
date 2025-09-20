-- =============================================================================
-- FASE 3: POLÍTICAS RLS (ROW LEVEL SECURITY)
-- Aplicação das regras de hierarquia em todas as tabelas
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. POLÍTICAS RLS PARA app_users
-- -----------------------------------------------------------------------------

-- SELECT: Admin vê todos, Manager vê subárvore, User vê apenas si mesmo
CREATE POLICY app_users_select ON public.app_users
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR id = auth.uid()
  OR public.is_ancestor(auth.uid(), id)
);

-- INSERT: Apenas Admin e Manager podem criar usuários (com validações)
CREATE POLICY app_users_insert_admin ON public.app_users
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
);

CREATE POLICY app_users_insert_manager ON public.app_users
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.app_users me 
    WHERE me.id = auth.uid() AND me.role = 'manager'
  )
  AND role = 'user'
  AND created_by = auth.uid()
);

-- UPDATE: Usuários podem editar próprios dados não sensíveis
-- Admins podem editar qualquer coisa
CREATE POLICY app_users_update_self ON public.app_users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  -- Nota: O trigger já previne alteração de role por não-admins
);

CREATE POLICY app_users_update_admin ON public.app_users
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- DELETE: Apenas Admin pode deletar usuários
CREATE POLICY app_users_delete_admin ON public.app_users
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- 2. FUNÇÃO PARA SINCRONIZAR auth.users → app_users
-- Garante que todo usuário autenticado tenha entrada em app_users
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.app_users (id, email, role, created_by)
  VALUES (
    NEW.id,
    NEW.email,
    'user', -- Papel padrão
    NULL    -- Será definido manualmente pelo admin/manager
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Usuário já existe, não faz nada
    RETURN NEW;
END $$;

-- Trigger para sincronização automática
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 3. FUNÇÃO PARA ATUALIZAR EMAIL EM app_users
-- Mantém sincronização quando email é alterado em auth.users
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_user_email_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atualiza email em app_users quando mudado em auth.users
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    UPDATE public.app_users 
    SET email = NEW.email, updated_at = now()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END $$;

-- Trigger para sincronização de email
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_update();

-- =============================================================================
-- FIM DA FASE 3
-- =============================================================================
