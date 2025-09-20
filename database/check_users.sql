-- =============================================================================
-- SCRIPT PARA VERIFICAR USUÁRIOS DO BANCO DE DADOS
-- Execute este script no Supabase Dashboard > SQL Editor
-- =============================================================================

-- 1. Verificar se as tabelas existem
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('app_users', 'profiles')
ORDER BY table_name;

-- 2. Contar usuários por tabela
SELECT 
  'app_users' as tabela,
  COUNT(*) as total
FROM public.app_users

UNION ALL

SELECT 
  'profiles' as tabela,
  COUNT(*) as total
FROM public.profiles
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public');

-- 3. Listar todos os usuários com detalhes
SELECT 
  au.id,
  au.email,
  au.role,
  au.created_by,
  au.created_at,
  au.updated_at,
  creator.email as created_by_email,
  creator.role as creator_role
FROM public.app_users au
LEFT JOIN public.app_users creator ON au.created_by = creator.id
ORDER BY au.created_at DESC;

-- 4. Se a tabela profiles existir, mostrar dados combinados
SELECT 
  au.id,
  au.email,
  au.role,
  p.full_name,
  p.phone,
  p.avatar_url,
  au.created_at as user_created,
  p.created_at as profile_created,
  creator.email as created_by_email
FROM public.app_users au
LEFT JOIN public.profiles p ON au.id = p.id
LEFT JOIN public.app_users creator ON au.created_by = creator.id
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public')
ORDER BY au.created_at DESC;

-- 5. Estatísticas por papel
SELECT 
  role,
  COUNT(*) as quantidade,
  MIN(created_at) as primeiro_usuario,
  MAX(created_at) as ultimo_usuario
FROM public.app_users
GROUP BY role
ORDER BY 
  CASE role 
    WHEN 'admin' THEN 1 
    WHEN 'manager' THEN 2 
    WHEN 'user' THEN 3 
  END;

-- 6. Hierarquia de usuários (quem criou quem)
WITH RECURSIVE user_hierarchy AS (
  -- Usuários root (sem criador ou criados pelo sistema)
  SELECT 
    id,
    email,
    role,
    created_by,
    email as path,
    0 as level
  FROM public.app_users
  WHERE created_by IS NULL
  
  UNION ALL
  
  -- Usuários criados por outros
  SELECT 
    au.id,
    au.email,
    au.role,
    au.created_by,
    uh.path || ' -> ' || au.email as path,
    uh.level + 1 as level
  FROM public.app_users au
  JOIN user_hierarchy uh ON au.created_by = uh.id
)
SELECT 
  level,
  path,
  role,
  email,
  id
FROM user_hierarchy
ORDER BY level, path;

-- 7. Verificar se há usuários órfãos (created_by aponta para usuário inexistente)
SELECT 
  au.id,
  au.email,
  au.role,
  au.created_by as created_by_id,
  'Usuário criador não existe' as problema
FROM public.app_users au
WHERE au.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.app_users creator 
    WHERE creator.id = au.created_by
  );

-- =============================================================================
-- FIM DO SCRIPT DE VERIFICAÇÃO
-- =============================================================================


