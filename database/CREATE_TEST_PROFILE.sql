-- Criar perfil de teste para o usuário admin
-- Execute no Supabase Dashboard

-- Inserir perfil para o usuário admin (fmedeiros8570@gmail.com)
INSERT INTO profiles (id, full_name, phone, bio)
SELECT 
  id, 
  'Felipe Medeiros', 
  '+55 11 99999-9999',
  'Administrador do sistema SocialFunnel'
FROM app_users 
WHERE email = 'fmedeiros8570@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  bio = EXCLUDED.bio,
  updated_at = NOW();

-- Verificar se foi criado
SELECT 
  u.email,
  p.full_name,
  p.phone,
  p.bio
FROM app_users u
JOIN profiles p ON u.id = p.id
WHERE u.email = 'fmedeiros8570@gmail.com';
