-- =============================================================================
-- ⚠️  EXECUTE ESTE SCRIPT NO SUPABASE DASHBOARD - SQL EDITOR
-- =============================================================================
-- 
-- PROBLEMA: Atualização de perfil fica em loading infinito
-- CAUSA: Políticas RLS não suportam operação UPSERT adequadamente
-- SOLUÇÃO: Recriar políticas RLS com suporte completo
--
-- COMO EXECUTAR:
-- 1. Acesse: https://supabase.com/dashboard/project/uxkcwvzfdmxzmzeymchm
-- 2. Vá para: SQL Editor
-- 3. Cole este script completo
-- 4. Clique em "RUN" 
-- 5. Teste a atualização de perfil na aplicação
--
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PASSO 1: REMOVER POLÍTICAS ANTIGAS (que estão causando o problema)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;  
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Managers can view hierarchy profiles" ON public.profiles;

-- Confirmar remoção
SELECT 'Políticas antigas removidas' as status;

-- -----------------------------------------------------------------------------
-- PASSO 2: CRIAR POLÍTICAS CORRIGIDAS (que suportam UPSERT)
-- -----------------------------------------------------------------------------

-- Policy 1: SELECT - Ver perfis
CREATE POLICY "profile_select_policy" 
  ON public.profiles 
  FOR SELECT 
  USING (
    -- Usuário pode ver próprio perfil
    auth.uid() = id 
    OR 
    -- Admin pode ver todos os perfis
    public.is_admin(auth.uid()) 
    OR
    -- Manager pode ver perfis da hierarquia
    EXISTS (
      SELECT 1 FROM public.app_users au
      WHERE au.id = profiles.id
      AND public.can_manage(auth.uid(), au.id)
    )
  );

-- Policy 2: INSERT - Criar perfis
CREATE POLICY "profile_insert_policy" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (
    -- Usuário pode inserir próprio perfil
    auth.uid() = id 
    OR 
    -- Admin pode inserir qualquer perfil
    public.is_admin(auth.uid())
  );

-- Policy 3: UPDATE - Atualizar perfis  
CREATE POLICY "profile_update_policy" 
  ON public.profiles 
  FOR UPDATE 
  USING (
    -- Usuário pode atualizar próprio perfil
    auth.uid() = id 
    OR 
    -- Admin pode atualizar qualquer perfil
    public.is_admin(auth.uid())
  )
  WITH CHECK (
    -- Mesmas condições para o check
    auth.uid() = id 
    OR 
    public.is_admin(auth.uid())
  );

-- Policy 4: DELETE - Deletar perfis (apenas admins)
CREATE POLICY "profile_delete_policy" 
  ON public.profiles 
  FOR DELETE 
  USING (public.is_admin(auth.uid()));

-- Confirmar criação
SELECT 'Políticas corrigidas criadas' as status;

-- -----------------------------------------------------------------------------
-- PASSO 3: VERIFICAR SE FOI APLICADO CORRETAMENTE
-- -----------------------------------------------------------------------------
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd as operacao,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING definido'
    ELSE 'Sem USING'
  END as using_status,
  CASE 
    WHEN with_check IS NOT NULL THEN 'WITH CHECK definido'  
    ELSE 'Sem WITH CHECK'
  END as with_check_status
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- -----------------------------------------------------------------------------
-- PASSO 4: TESTE RÁPIDO (OPCIONAL)
-- -----------------------------------------------------------------------------
-- Este teste só funciona se você estiver logado como o usuário admin

/*
-- Descomente para testar:

-- Teste 1: Verificar se consegue fazer SELECT
SELECT id, full_name, phone FROM public.profiles WHERE id = auth.uid() LIMIT 1;

-- Teste 2: Testar UPSERT (INSERT + UPDATE)
INSERT INTO public.profiles (id, full_name, phone, updated_at)
VALUES (auth.uid(), 'Teste Correção', '(11) 99999-9999', now())
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  updated_at = EXCLUDED.updated_at;

-- Teste 3: Verificar se foi atualizado
SELECT id, full_name, phone, updated_at FROM public.profiles WHERE id = auth.uid();
*/

-- =============================================================================
-- ✅ CONCLUSÃO
-- =============================================================================
SELECT '🎉 Correção aplicada com sucesso! Agora teste a atualização de perfil na aplicação.' as resultado;

-- As novas políticas permitem:
-- ✅ Usuários: ver/editar apenas seu próprio perfil
-- ✅ Admins: ver/editar qualquer perfil  
-- ✅ Managers: ver perfis de usuários em sua hierarquia
-- ✅ UPSERT: funcionará corretamente para todas as operações
-- ✅ Segurança: mantida conforme especificação original
