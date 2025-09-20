-- =============================================================================
-- CORREÇÃO URGENTE: DEPENDÊNCIA CIRCULAR NAS POLÍTICAS RLS
-- Problema: Políticas RLS de app_users dependem da própria tabela app_users
-- =============================================================================

-- EXECUTE IMEDIATAMENTE NO SUPABASE DASHBOARD - SQL EDITOR

-- -----------------------------------------------------------------------------
-- 1. REMOVER POLÍTICAS COM DEPENDÊNCIA CIRCULAR
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "app_users_select_policy" ON public.app_users;
DROP POLICY IF EXISTS "app_users_insert_policy" ON public.app_users;
DROP POLICY IF EXISTS "app_users_update_policy" ON public.app_users;
DROP POLICY IF EXISTS "app_users_delete_policy" ON public.app_users;

-- Remover outras políticas existentes
DROP POLICY IF EXISTS "app_users_select" ON public.app_users;
DROP POLICY IF EXISTS "app_users_insert_admin" ON public.app_users;
DROP POLICY IF EXISTS "app_users_insert_manager" ON public.app_users;
DROP POLICY IF EXISTS "app_users_update_self" ON public.app_users;
DROP POLICY IF EXISTS "app_users_update_admin" ON public.app_users;
DROP POLICY IF EXISTS "app_users_delete_admin" ON public.app_users;

SELECT '🗑️ Políticas com dependência circular removidas' as status;

-- -----------------------------------------------------------------------------
-- 2. CRIAR POLÍTICAS SEM DEPENDÊNCIA CIRCULAR
-- -----------------------------------------------------------------------------

-- Policy 1: SELECT - SEM consultar app_users dentro da policy
CREATE POLICY "app_users_select_simple" 
  ON public.app_users 
  FOR SELECT 
  USING (
    -- Qualquer usuário autenticado pode ver seus próprios dados
    auth.uid() = id
  );

-- Policy 2: INSERT - Usando função is_admin que já existe
CREATE POLICY "app_users_insert_simple" 
  ON public.app_users 
  FOR INSERT 
  WITH CHECK (
    -- Apenas admins podem criar usuários
    public.is_admin(auth.uid())
  );

-- Policy 3: UPDATE - Usando função is_admin
CREATE POLICY "app_users_update_simple" 
  ON public.app_users 
  FOR UPDATE 
  USING (
    -- Apenas admins podem atualizar
    public.is_admin(auth.uid())
  )
  WITH CHECK (
    public.is_admin(auth.uid())
  );

-- Policy 4: DELETE - Usando função is_admin
CREATE POLICY "app_users_delete_simple" 
  ON public.app_users 
  FOR DELETE 
  USING (
    public.is_admin(auth.uid())
  );

SELECT '✅ Políticas simples sem dependência circular criadas' as status;

-- -----------------------------------------------------------------------------
-- 3. VERIFICAR SE A FUNÇÃO is_admin NÃO TEM DEPENDÊNCIA CIRCULAR
-- -----------------------------------------------------------------------------

-- Verificar o código da função is_admin
SELECT 
  'Verificando função is_admin...' as status,
  pg_get_functiondef(oid) as definicao
FROM pg_proc 
WHERE proname = 'is_admin' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
LIMIT 1;

-- -----------------------------------------------------------------------------
-- 4. SE is_admin TIVER PROBLEMA, CRIAR VERSÃO ALTERNATIVA
-- -----------------------------------------------------------------------------

-- Função alternativa que usa apenas auth.uid() sem consultar app_users
CREATE OR REPLACE FUNCTION public.is_admin_safe(uid uuid)
RETURNS boolean 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
AS $$
  -- Lista hardcoded de UUIDs de admins (temporário)
  SELECT uid IN (
    '446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid
    -- Adicione outros UUIDs de admin aqui se necessário
  );
$$;

-- Comentário
COMMENT ON FUNCTION public.is_admin_safe(uuid) IS 'Versão segura sem dependência circular - lista hardcoded de admins';

-- -----------------------------------------------------------------------------
-- 5. RECRIAR POLÍTICAS COM FUNÇÃO SEGURA
-- -----------------------------------------------------------------------------

-- Remover políticas anteriores
DROP POLICY IF EXISTS "app_users_insert_simple" ON public.app_users;
DROP POLICY IF EXISTS "app_users_update_simple" ON public.app_users;
DROP POLICY IF EXISTS "app_users_delete_simple" ON public.app_users;

-- Recriar com função segura
CREATE POLICY "app_users_insert_safe" 
  ON public.app_users 
  FOR INSERT 
  WITH CHECK (public.is_admin_safe(auth.uid()));

CREATE POLICY "app_users_update_safe" 
  ON public.app_users 
  FOR UPDATE 
  USING (public.is_admin_safe(auth.uid()))
  WITH CHECK (public.is_admin_safe(auth.uid()));

CREATE POLICY "app_users_delete_safe" 
  ON public.app_users 
  FOR DELETE 
  USING (public.is_admin_safe(auth.uid()));

SELECT '🔒 Políticas seguras com função hardcoded criadas' as status;

-- -----------------------------------------------------------------------------
-- 6. TESTE FINAL
-- -----------------------------------------------------------------------------

-- Testar acesso
SELECT 
  '🧪 TESTE: Tentando acessar app_users...' as teste,
  id, 
  email, 
  role 
FROM public.app_users 
WHERE id = auth.uid()
LIMIT 1;

-- -----------------------------------------------------------------------------
-- 7. RESULTADO
-- -----------------------------------------------------------------------------
SELECT 
  '🎉 CORREÇÃO DA DEPENDÊNCIA CIRCULAR APLICADA!' as resultado
UNION ALL
SELECT '📋 PRÓXIMOS PASSOS:'
UNION ALL
SELECT '1. Atualize a página da aplicação (F5)'
UNION ALL  
SELECT '2. Teste várias vezes (primeira vez, segunda, terceira...)'
UNION ALL
SELECT '3. Verifique se funciona consistentemente'
UNION ALL
SELECT '4. Olhe o console para confirmar que não trava mais';
