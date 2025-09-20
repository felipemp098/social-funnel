-- Script para debugar perfis de usuários
-- Execute no Supabase Dashboard para verificar os dados

-- 1. Verificar usuários na tabela app_users
SELECT 
  id,
  email,
  role,
  created_at
FROM app_users
ORDER BY created_at DESC;

-- 2. Verificar perfis na tabela profiles
SELECT 
  id,
  full_name,
  phone,
  avatar_url,
  created_at
FROM profiles
ORDER BY created_at DESC;

-- 3. Verificar usuários com seus perfis (LEFT JOIN)
SELECT 
  u.id,
  u.email,
  u.role,
  p.full_name,
  p.phone,
  p.avatar_url,
  u.created_at as user_created,
  p.created_at as profile_created
FROM app_users u
LEFT JOIN profiles p ON u.id = p.id
ORDER BY u.created_at DESC;

-- 4. Inserir um perfil de teste (se necessário)
-- DESCOMENTE APENAS SE NÃO HOUVER PERFIS
-- INSERT INTO profiles (id, full_name, phone)
-- SELECT id, 'Felipe Medeiros', '+55 11 99999-9999'
-- FROM app_users 
-- WHERE email = 'fmedeiros8570@gmail.com'
-- ON CONFLICT (id) DO UPDATE SET
--   full_name = EXCLUDED.full_name,
--   phone = EXCLUDED.phone,
--   updated_at = NOW();
