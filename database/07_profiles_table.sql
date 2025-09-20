-- =============================================================================
-- FASE 7: TABELA PROFILES
-- Dados adicionais dos usuários (complementa auth.users)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TABELA PROFILES (Dados complementares dos usuários)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
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

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- RLS (Row Level Security) para PROFILES
-- -----------------------------------------------------------------------------

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver seu próprio perfil
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

-- Policy: Usuários podem atualizar seu próprio perfil
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Usuários podem inserir seu próprio perfil
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Policy: Admins podem ver todos os perfis
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
  ON public.profiles 
  FOR SELECT 
  USING (public.is_admin(auth.uid()));

-- Policy: Managers podem ver perfis de sua hierarquia
DROP POLICY IF EXISTS "Managers can view hierarchy profiles" ON public.profiles;
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

-- -----------------------------------------------------------------------------
-- FUNÇÃO PARA CRIAR PERFIL AUTOMATICAMENTE
-- -----------------------------------------------------------------------------

-- Primeiro, remover o trigger se existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Agora podemos recriar a função sem problemas
DROP FUNCTION IF EXISTS public.handle_new_user();
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

-- Recriar o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- FUNÇÃO PARA SINCRONIZAR DADOS DO AUTH.USERS
-- -----------------------------------------------------------------------------

-- Primeiro, remover o trigger se existir
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Agora podemos recriar a função sem problemas
DROP FUNCTION IF EXISTS public.sync_user_profile();
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

-- Recriar o trigger
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_profile();

-- -----------------------------------------------------------------------------
-- VIEW PARA DADOS COMPLETOS DO USUÁRIO
-- -----------------------------------------------------------------------------

-- View que combina dados do auth.users e profiles
DROP VIEW IF EXISTS public.user_profiles;
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

-- =============================================================================
-- FIM DA FASE 7
-- =============================================================================
