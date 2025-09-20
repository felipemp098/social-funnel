-- =============================================================================
-- FASE 7: TABELA PROFILES (Versão Segura)
-- Dados adicionais dos usuários (complementa auth.users)
-- Execute este arquivo se o principal der erro de dependências
-- =============================================================================

-- PASSO 1: Remover triggers existentes primeiro (se existirem)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- PASSO 2: Remover funções existentes (agora sem dependências)
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.sync_user_profile();

-- PASSO 3: Remover view se existir
DROP VIEW IF EXISTS public.user_profiles;

-- PASSO 4: Criar/recriar a tabela profiles
DROP TABLE IF EXISTS public.profiles;
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  avatar_url text,
  bio text,
  preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Validações
  CONSTRAINT profiles_phone_format CHECK (
    phone IS NULL OR 
    phone ~ '^\(\d{2}\) \d{4,5}-\d{4}$' OR -- Formato brasileiro: (11) 99999-9999
    phone ~ '^\+\d{1,3}\s\d{1,14}$'        -- Formato E.164: +55 11999999999
  ),
  CONSTRAINT profiles_full_name_length CHECK (
    full_name IS NULL OR 
    (length(trim(full_name)) >= 2 AND length(trim(full_name)) <= 80)
  )
);

-- Comentários para documentação
COMMENT ON TABLE public.profiles IS 'Dados complementares dos usuários (perfil público)';
COMMENT ON COLUMN public.profiles.id IS 'ID do usuário (referência para auth.users)';
COMMENT ON COLUMN public.profiles.full_name IS 'Nome completo do usuário (2-80 caracteres)';
COMMENT ON COLUMN public.profiles.phone IS 'Telefone em formato brasileiro ou E.164';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL da foto do perfil';
COMMENT ON COLUMN public.profiles.bio IS 'Biografia/descrição do usuário';
COMMENT ON COLUMN public.profiles.preferences IS 'Preferências do usuário em JSON';

-- PASSO 5: Criar índices
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- PASSO 6: Criar trigger para updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- PASSO 7: Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- PASSO 8: Criar policies de RLS
-- Policy: Usuários podem ver seu próprio perfil
CREATE POLICY "Users can view own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

-- Policy: Usuários podem atualizar seu próprio perfil
CREATE POLICY "Users can update own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Usuários podem inserir seu próprio perfil
CREATE POLICY "Users can insert own profile" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Policy: Admins podem ver todos os perfis
CREATE POLICY "Admins can view all profiles" 
  ON public.profiles 
  FOR SELECT 
  USING (public.is_admin(auth.uid()));

-- Policy: Managers podem ver perfis de sua hierarquia
CREATE POLICY "Managers can view hierarchy profiles" 
  ON public.profiles 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users au
      WHERE au.id = profiles.id
      AND public.can_manage(auth.uid(), au.id)
    )
  );

-- PASSO 9: Criar função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Criar perfil básico para o novo usuário
  INSERT INTO public.profiles (id, full_name, created_at, updated_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    now(),
    now()
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASSO 10: Criar função para sincronizar dados
CREATE OR REPLACE FUNCTION public.sync_user_profile()
RETURNS trigger AS $$
BEGIN
  -- Atualizar perfil quando user_metadata é alterado
  IF (old.raw_user_meta_data IS DISTINCT FROM new.raw_user_meta_data) THEN
    UPDATE public.profiles 
    SET 
      full_name = COALESCE(
        new.raw_user_meta_data->>'full_name', 
        profiles.full_name,
        new.email
      ),
      phone = COALESCE(
        new.raw_user_meta_data->>'phone',
        profiles.phone
      ),
      updated_at = now()
    WHERE id = new.id;
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASSO 11: Criar triggers (agora que as funções existem)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_profile();

-- PASSO 12: Criar view combinada
CREATE VIEW public.user_profiles AS
SELECT 
  au.id,
  au.email,
  au.role,
  au.created_by,
  au.created_at as user_created_at,
  au.updated_at as user_updated_at,
  p.full_name,
  p.phone,
  p.avatar_url,
  p.bio,
  p.preferences,
  p.created_at as profile_created_at,
  p.updated_at as profile_updated_at,
  -- Dados computados
  COALESCE(p.full_name, au.email) as display_name,
  CASE 
    WHEN p.avatar_url IS NOT NULL THEN p.avatar_url
    ELSE NULL -- Será gerado no frontend com iniciais
  END as effective_avatar
FROM public.app_users au
LEFT JOIN public.profiles p ON au.id = p.id;

-- Comentário da view
COMMENT ON VIEW public.user_profiles IS 'View combinada de dados do usuário (app_users + profiles)';

-- RLS para a view (herda das tabelas base)
ALTER VIEW public.user_profiles SET (security_invoker = true);

-- PASSO 13: Criar perfis para usuários existentes (se houver)
INSERT INTO public.profiles (id, full_name, created_at, updated_at)
SELECT 
  au.id,
  au.email, -- Usar email como nome inicial
  au.created_at,
  now()
FROM public.app_users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL; -- Apenas para usuários que não têm perfil

-- =============================================================================
-- FIM DA MIGRAÇÃO SEGURA
-- =============================================================================

-- Verificação final
SELECT 
  'Tabela profiles criada' as status,
  count(*) as total_profiles
FROM public.profiles

UNION ALL

SELECT 
  'View user_profiles disponível' as status,
  count(*) as total_records
FROM public.user_profiles;
