-- =============================================================================
-- DEBUG: VERIFICAR POLÍTICAS RLS DA TABELA APP_USERS
-- Para identificar se as políticas estão bloqueando o carregamento inicial
-- =============================================================================

-- EXECUTE ESTE SCRIPT NO SUPABASE DASHBOARD - SQL EDITOR

-- -----------------------------------------------------------------------------
-- 1. VERIFICAR POLÍTICAS ATUAIS DA TABELA APP_USERS
-- -----------------------------------------------------------------------------
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive,
  cmd as operacao,
  qual as using_clause,
  with_check
FROM pg_policies 
WHERE tablename = 'app_users'
ORDER BY policyname;

-- -----------------------------------------------------------------------------
-- 2. VERIFICAR SE RLS ESTÁ HABILITADO
-- -----------------------------------------------------------------------------
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  forcerowsecurity as force_rls
FROM pg_tables 
WHERE tablename = 'app_users';

-- -----------------------------------------------------------------------------
-- 3. TESTAR ACESSO COMO USUÁRIO ATUAL
-- -----------------------------------------------------------------------------
-- Verificar se consegue acessar próprios dados
SELECT 
  'Teste de acesso próprio' as teste,
  id, 
  email, 
  role 
FROM public.app_users 
WHERE id = auth.uid()
LIMIT 1;

-- -----------------------------------------------------------------------------
-- 4. VERIFICAR FUNÇÕES DE AUTORIZAÇÃO
-- -----------------------------------------------------------------------------
-- Testar se as funções estão funcionando
SELECT 
  'is_admin' as funcao,
  public.is_admin(auth.uid()) as resultado
UNION ALL
SELECT 
  'can_manage (self)',
  public.can_manage(auth.uid(), auth.uid())
UNION ALL
SELECT 
  'auth.uid()',
  CASE WHEN auth.uid() IS NOT NULL THEN 'OK' ELSE 'NULL' END;

-- -----------------------------------------------------------------------------
-- 5. VERIFICAR SE USUÁRIO EXISTE EM APP_USERS
-- -----------------------------------------------------------------------------
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Usuário existe em app_users'
    ELSE '❌ Usuário NÃO existe em app_users'
  END as status,
  COUNT(*) as total_registros
FROM public.app_users 
WHERE id = auth.uid();

-- -----------------------------------------------------------------------------
-- 6. SOLUÇÃO TEMPORÁRIA: DESABILITAR RLS (SE NECESSÁRIO)
-- -----------------------------------------------------------------------------
-- DESCOMENTE APENAS SE QUISER TESTAR SEM RLS:
/*
ALTER TABLE public.app_users DISABLE ROW LEVEL SECURITY;
SELECT '⚠️  RLS DESABILITADO TEMPORARIAMENTE para app_users' as aviso;
*/

-- -----------------------------------------------------------------------------
-- 7. REABILITAR RLS (APÓS TESTE)
-- -----------------------------------------------------------------------------
-- DESCOMENTE PARA REABILITAR:
/*
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
SELECT '✅ RLS REABILITADO para app_users' as status;
*/

-- -----------------------------------------------------------------------------
-- RESULTADO
-- -----------------------------------------------------------------------------
SELECT '🔍 Debug concluído! Verifique os resultados acima.' as resultado;
