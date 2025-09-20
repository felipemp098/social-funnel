-- =============================================================================
-- MIGRAÇÃO 08: CORREÇÃO DAS POLÍTICAS RLS DA TABELA PROFILES
-- Problema: UPSERT não funcionando por falta de políticas adequadas
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. REMOVER POLÍTICAS ANTIGAS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Managers can view hierarchy profiles" ON public.profiles;

-- -----------------------------------------------------------------------------
-- 2. CRIAR POLÍTICAS MELHORADAS
-- -----------------------------------------------------------------------------

-- Policy: Usuários podem ver seu próprio perfil + Admins veem todos
CREATE POLICY "profile_select_policy" 
  ON public.profiles 
  FOR SELECT 
  USING (
    auth.uid() = id OR 
    public.is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.app_users au
      WHERE au.id = profiles.id
      AND public.can_manage(auth.uid(), au.id)
    )
  );

-- Policy: Usuários podem inserir seu próprio perfil + Admins podem inserir qualquer
CREATE POLICY "profile_insert_policy" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = id OR 
    public.is_admin(auth.uid())
  );

-- Policy: Usuários podem atualizar seu próprio perfil + Admins podem atualizar qualquer
CREATE POLICY "profile_update_policy" 
  ON public.profiles 
  FOR UPDATE 
  USING (
    auth.uid() = id OR 
    public.is_admin(auth.uid())
  )
  WITH CHECK (
    auth.uid() = id OR 
    public.is_admin(auth.uid())
  );

-- Policy: Permitir DELETE apenas para admins (para manutenção)
CREATE POLICY "profile_delete_policy" 
  ON public.profiles 
  FOR DELETE 
  USING (public.is_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- 3. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- -----------------------------------------------------------------------------
COMMENT ON POLICY "profile_select_policy" ON public.profiles IS 
'Permite SELECT: próprio perfil, admins veem todos, managers veem hierarquia';

COMMENT ON POLICY "profile_insert_policy" ON public.profiles IS 
'Permite INSERT: próprio perfil ou admin inserindo para qualquer usuário';

COMMENT ON POLICY "profile_update_policy" ON public.profiles IS 
'Permite UPDATE: próprio perfil ou admin atualizando qualquer perfil';

COMMENT ON POLICY "profile_delete_policy" ON public.profiles IS 
'Permite DELETE: apenas admins para manutenção';
