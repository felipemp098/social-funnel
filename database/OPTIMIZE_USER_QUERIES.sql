-- Execute este script para otimizar as queries de usuário

-- 1. Função otimizada para buscar dados do próprio usuário (bypassa RLS)
CREATE OR REPLACE FUNCTION public.get_current_user_data(user_id uuid)
RETURNS TABLE(
  id uuid,
  email text,
  role public.user_role,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  first_login boolean
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- Query direta sem RLS para melhor performance
  SELECT 
    au.id,
    au.email,
    au.role,
    au.created_by,
    au.created_at,
    au.updated_at,
    COALESCE(au.first_login, false) as first_login
  FROM public.app_users au
  WHERE au.id = user_id;
$$;

-- 2. Função otimizada para buscar perfil do usuário
CREATE OR REPLACE FUNCTION public.get_current_user_profile(user_id uuid)
RETURNS TABLE(
  id uuid,
  full_name text,
  phone text,
  avatar_url text,
  bio text,
  preferences jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- Query direta na tabela profiles
  SELECT 
    p.id,
    p.full_name,
    p.phone,
    p.avatar_url,
    p.bio,
    p.preferences,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE p.id = user_id;
$$;

-- 3. Função combinada para buscar usuário + perfil em uma query
CREATE OR REPLACE FUNCTION public.get_current_user_complete(user_id uuid)
RETURNS TABLE(
  -- Dados do app_users
  id uuid,
  email text,
  role public.user_role,
  created_by uuid,
  user_created_at timestamptz,
  user_updated_at timestamptz,
  first_login boolean,
  -- Dados do profiles
  full_name text,
  phone text,
  avatar_url text,
  bio text,
  preferences jsonb,
  profile_created_at timestamptz,
  profile_updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- Query combinada otimizada
  SELECT 
    au.id,
    au.email,
    au.role,
    au.created_by,
    au.created_at as user_created_at,
    au.updated_at as user_updated_at,
    COALESCE(au.first_login, false) as first_login,
    p.full_name,
    p.phone,
    p.avatar_url,
    p.bio,
    p.preferences,
    p.created_at as profile_created_at,
    p.updated_at as profile_updated_at
  FROM public.app_users au
  LEFT JOIN public.profiles p ON au.id = p.id
  WHERE au.id = user_id;
$$;

-- 4. Comentários
COMMENT ON FUNCTION public.get_current_user_data IS 'Busca dados do usuário de forma otimizada (bypassa RLS)';
COMMENT ON FUNCTION public.get_current_user_profile IS 'Busca perfil do usuário de forma otimizada';
COMMENT ON FUNCTION public.get_current_user_complete IS 'Busca dados completos do usuário em uma query';

-- 5. Verificar se foi aplicado
SELECT 'Funções otimizadas de usuário criadas!' as status;
