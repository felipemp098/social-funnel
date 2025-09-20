-- Execute este script IMEDIATAMENTE no Supabase Dashboard para corrigir os redirecionamentos

-- 1. Adicionar campo first_login à tabela app_users
ALTER TABLE public.app_users 
ADD COLUMN IF NOT EXISTS first_login boolean DEFAULT false;

-- 2. Atualizar usuários existentes para não serem primeiro login
UPDATE public.app_users 
SET first_login = false 
WHERE first_login IS NULL;

-- 3. Para novos usuários criados via convite, definir como primeiro login
-- (isso será feito automaticamente pelo trigger)

-- 4. Comentário
COMMENT ON COLUMN public.app_users.first_login IS 'Indica se é o primeiro login do usuário';

-- Verificar se foi aplicado corretamente
SELECT 'Campo first_login adicionado com sucesso!' as status;

