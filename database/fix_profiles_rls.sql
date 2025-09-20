-- =============================================================================
-- CORREÇÃO DAS POLÍTICAS RLS DA TABELA PROFILES
-- Problema: UPSERT não funcionando por falta de políticas adequadas
-- =============================================================================

-- Este script corrige as políticas RLS da tabela profiles para permitir
-- operações UPSERT (INSERT + UPDATE) corretamente.

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
-- 3. VERIFICAÇÕES
-- -----------------------------------------------------------------------------

-- Verificar se as políticas foram criadas
SELECT schemaname, tablename, policyname, permissive, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Comentários para documentação
COMMENT ON POLICY "profile_select_policy" ON public.profiles IS 
'Permite SELECT: próprio perfil, admins veem todos, managers veem hierarquia';

COMMENT ON POLICY "profile_insert_policy" ON public.profiles IS 
'Permite INSERT: próprio perfil ou admin inserindo para qualquer usuário';

COMMENT ON POLICY "profile_update_policy" ON public.profiles IS 
'Permite UPDATE: próprio perfil ou admin atualizando qualquer perfil';

COMMENT ON POLICY "profile_delete_policy" ON public.profiles IS 
'Permite DELETE: apenas admins para manutenção';

-- -----------------------------------------------------------------------------
-- 4. TESTE DAS POLÍTICAS (OPCIONAL)
-- -----------------------------------------------------------------------------

/*
-- Para testar se funcionou, execute como o usuário admin:

-- Teste 1: SELECT próprio perfil
SELECT id, full_name, phone FROM public.profiles WHERE id = auth.uid();

-- Teste 2: UPSERT próprio perfil
INSERT INTO public.profiles (id, full_name, phone, updated_at)
VALUES (auth.uid(), 'Teste Nome', '(11) 99999-9999', now())
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  updated_at = EXCLUDED.updated_at;

-- Teste 3: SELECT novamente para confirmar
SELECT id, full_name, phone, updated_at FROM public.profiles WHERE id = auth.uid();
*/

-- =============================================================================
-- INSTRUÇÕES DE USO
-- =============================================================================

/*
COMO APLICAR ESTA CORREÇÃO:

1. Execute este script SQL no seu cliente SQL (psql, pgAdmin, Supabase Dashboard)

2. O script irá:
   - Remover as políticas antigas que estavam causando problema
   - Criar novas políticas que suportam UPSERT corretamente
   - Manter a segurança: usuários só acessam próprios dados, admins acessam tudo

3. Após executar, teste a atualização de perfil na interface:
   - Vá para Configurações > Perfil
   - Altere nome ou telefone
   - Clique em "Salvar Alterações"
   - Deve funcionar sem ficar em loading infinito

4. As novas políticas permitem:
   - Usuários: ver/editar apenas seu próprio perfil
   - Admins: ver/editar qualquer perfil
   - Managers: ver perfis de usuários em sua hierarquia
   - UPSERT: funcionará corretamente para todas as operações

IMPORTANTE:
- Este script é seguro e não afeta dados existentes
- Apenas corrige as permissões de acesso
- Mantém toda a segurança original do sistema
*/
