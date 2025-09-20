-- =============================================================================
-- FIX PARA TIMEOUT DE AUTENTICAÇÃO
-- Criar função get_current_user_data se não existir
-- =============================================================================

-- Função para buscar dados do usuário atual (usada pelo useAuth)
CREATE OR REPLACE FUNCTION public.get_current_user_data(user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Buscar dados do app_users
  SELECT json_build_object(
    'id', au.id,
    'email', au.email,
    'role', au.role,
    'created_by', au.created_by,
    'created_at', au.created_at,
    'updated_at', au.updated_at,
    'first_login', au.first_login
  ) INTO result
  FROM public.app_users au
  WHERE au.id = user_id;

  RETURN result;
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION public.get_current_user_data IS 'Busca dados do usuário atual para autenticação';
