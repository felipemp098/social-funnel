-- =============================================================================
-- CORREÇÃO URGENTE: POLÍTICAS RLS DA TABELA APP_USERS
-- Problema: Query travando no fetchAppUser
-- =============================================================================

-- EXECUTE IMEDIATAMENTE NO SUPABASE DASHBOARD - SQL EDITOR

-- -----------------------------------------------------------------------------
-- 1. VERIFICAR PROBLEMA ATUAL
-- -----------------------------------------------------------------------------
SELECT 'Verificando políticas atuais...' as status;

SELECT 
  policyname, 
  cmd, 
  qual as using_clause
FROM pg_policies 
WHERE tablename = 'app_users';

-- -----------------------------------------------------------------------------
-- 2. REMOVER TODAS AS POLÍTICAS PROBLEMÁTICAS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "app_users_select" ON public.app_users;
DROP POLICY IF EXISTS "app_users_insert_admin" ON public.app_users;
DROP POLICY IF EXISTS "app_users_insert_manager" ON public.app_users;
DROP POLICY IF EXISTS "app_users_update_self" ON public.app_users;
DROP POLICY IF EXISTS "app_users_update_admin" ON public.app_users;
DROP POLICY IF EXISTS "app_users_delete_admin" ON public.app_users;

-- Remover outras possíveis políticas
DROP POLICY IF EXISTS "Users can view own app_user" ON public.app_users;
DROP POLICY IF EXISTS "Admins can view all app_users" ON public.app_users;
DROP POLICY IF EXISTS "Managers can view hierarchy app_users" ON public.app_users;

SELECT 'Políticas antigas removidas' as status;

-- -----------------------------------------------------------------------------
-- 3. CRIAR POLÍTICAS SIMPLES E FUNCIONAIS
-- -----------------------------------------------------------------------------

-- Policy 1: SELECT - Acesso básico
CREATE POLICY "app_users_select_policy" 
  ON public.app_users 
  FOR SELECT 
  USING (
    -- Usuário pode ver próprios dados
    auth.uid() = id 
    OR 
    -- Admin pode ver todos
    (
      EXISTS (
        SELECT 1 FROM public.app_users au 
        WHERE au.id = auth.uid() 
        AND au.role = 'admin'
      )
    )
    OR
    -- Manager pode ver usuários criados por ele
    (
      EXISTS (
        SELECT 1 FROM public.app_users au 
        WHERE au.id = auth.uid() 
        AND au.role = 'manager'
      )
      AND created_by = auth.uid()
    )
  );

-- Policy 2: INSERT - Criação de usuários
CREATE POLICY "app_users_insert_policy" 
  ON public.app_users 
  FOR INSERT 
  WITH CHECK (
    -- Admin pode criar qualquer usuário
    EXISTS (
      SELECT 1 FROM public.app_users au 
      WHERE au.id = auth.uid() 
      AND au.role = 'admin'
    )
    OR
    -- Manager pode criar apenas users
    (
      EXISTS (
        SELECT 1 FROM public.app_users au 
        WHERE au.id = auth.uid() 
        AND au.role = 'manager'
      )
      AND role = 'user'
      AND created_by = auth.uid()
    )
  );

-- Policy 3: UPDATE - Atualização
CREATE POLICY "app_users_update_policy" 
  ON public.app_users 
  FOR UPDATE 
  USING (
    -- Admin pode atualizar qualquer
    EXISTS (
      SELECT 1 FROM public.app_users au 
      WHERE au.id = auth.uid() 
      AND au.role = 'admin'
    )
    OR
    -- Manager pode atualizar usuários criados por ele
    (
      EXISTS (
        SELECT 1 FROM public.app_users au 
        WHERE au.id = auth.uid() 
        AND au.role = 'manager'
      )
      AND created_by = auth.uid()
    )
  )
  WITH CHECK (
    -- Mesmas regras para o check
    EXISTS (
      SELECT 1 FROM public.app_users au 
      WHERE au.id = auth.uid() 
      AND au.role = 'admin'
    )
    OR
    (
      EXISTS (
        SELECT 1 FROM public.app_users au 
        WHERE au.id = auth.uid() 
        AND au.role = 'manager'
      )
      AND created_by = auth.uid()
    )
  );

-- Policy 4: DELETE - Apenas admins
CREATE POLICY "app_users_delete_policy" 
  ON public.app_users 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users au 
      WHERE au.id = auth.uid() 
      AND au.role = 'admin'
    )
  );

SELECT 'Políticas corrigidas criadas!' as status;

-- -----------------------------------------------------------------------------
-- 4. TESTE IMEDIATO
-- -----------------------------------------------------------------------------
-- Testar se consegue acessar próprios dados
SELECT 
  '✅ TESTE: Acesso próprio funcionando' as resultado,
  id, 
  email, 
  role 
FROM public.app_users 
WHERE id = auth.uid()
LIMIT 1;

-- -----------------------------------------------------------------------------
-- 5. VERIFICAR SE RESOLVEU
-- -----------------------------------------------------------------------------
SELECT 
  '🎉 CORREÇÃO APLICADA! Teste o carregamento da aplicação agora.' as resultado;

-- Instruções finais
SELECT 
  '📋 PRÓXIMOS PASSOS:' as instrucoes
UNION ALL
SELECT '1. Atualize a página da aplicação (F5)'
UNION ALL  
SELECT '2. Verifique se não trava mais em loading'
UNION ALL
SELECT '3. Olhe o console para ver se aparecem os logs de sucesso';
