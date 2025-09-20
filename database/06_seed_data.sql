-- =============================================================================
-- FASE 6: DADOS INICIAIS (SEED)
-- Criação do primeiro admin e dados de exemplo
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. INSERIR PRIMEIRO ADMIN
-- IMPORTANTE: Substitua o email e UUID pelos valores reais do seu usuário
-- -----------------------------------------------------------------------------

-- Primeiro, você precisa se registrar no sistema via interface web
-- Depois, execute esta query substituindo os valores:

/*
-- EXEMPLO - SUBSTITUA PELOS VALORES REAIS:
INSERT INTO public.app_users (id, email, role, created_by)
VALUES (
  'SEU_UUID_DO_AUTH_USERS',  -- UUID do auth.users
  'seu@email.com',           -- Seu email
  'admin',                   -- Papel de administrador
  NULL                       -- Admin não tem criador
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  updated_at = now();
*/

-- Para encontrar seu UUID, execute primeiro:
-- SELECT id, email FROM auth.users WHERE email = 'seu@email.com';

-- -----------------------------------------------------------------------------
-- 2. FUNÇÃO PARA PROMOVER USUÁRIO A ADMIN
-- Útil para promover o primeiro usuário ou em emergências
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.promote_to_admin(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
BEGIN
  -- Buscar o ID do usuário pelo email
  SELECT au.id INTO user_id 
  FROM auth.users au 
  WHERE au.email = user_email;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário com email % não encontrado', user_email;
  END IF;
  
  -- Inserir ou atualizar em app_users como admin
  INSERT INTO public.app_users (id, email, role, created_by)
  VALUES (user_id, user_email, 'admin', NULL)
  ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    updated_at = now();
    
  RETURN true;
END $$;

-- Comentário para documentação
COMMENT ON FUNCTION public.promote_to_admin(text) IS 'Promove usuário a administrador pelo email';

-- -----------------------------------------------------------------------------
-- 3. DADOS DE EXEMPLO PARA DESENVOLVIMENTO (OPCIONAL)
-- Execute apenas se quiser dados de teste
-- -----------------------------------------------------------------------------

-- Função para criar dados de exemplo
CREATE OR REPLACE FUNCTION public.create_sample_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_id uuid;
  manager1_id uuid;
  manager2_id uuid;
  user1_id uuid;
  user2_id uuid;
  user3_id uuid;
  client1_id uuid;
  client2_id uuid;
  client3_id uuid;
BEGIN
  -- Buscar o admin existente
  SELECT id INTO admin_id FROM public.app_users WHERE role = 'admin' LIMIT 1;
  
  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum admin encontrado. Crie um admin primeiro.';
  END IF;
  
  -- Criar usuários de exemplo (apenas se não existirem)
  
  -- Manager 1
  INSERT INTO auth.users (id, email, created_at, updated_at)
  VALUES (gen_random_uuid(), 'manager1@exemplo.com', now(), now())
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO manager1_id;
  
  IF manager1_id IS NULL THEN
    SELECT id INTO manager1_id FROM auth.users WHERE email = 'manager1@exemplo.com';
  END IF;
  
  INSERT INTO public.app_users (id, email, role, created_by)
  VALUES (manager1_id, 'manager1@exemplo.com', 'manager', admin_id)
  ON CONFLICT (id) DO NOTHING;
  
  -- Manager 2
  INSERT INTO auth.users (id, email, created_at, updated_at)
  VALUES (gen_random_uuid(), 'manager2@exemplo.com', now(), now())
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO manager2_id;
  
  IF manager2_id IS NULL THEN
    SELECT id INTO manager2_id FROM auth.users WHERE email = 'manager2@exemplo.com';
  END IF;
  
  INSERT INTO public.app_users (id, email, role, created_by)
  VALUES (manager2_id, 'manager2@exemplo.com', 'manager', admin_id)
  ON CONFLICT (id) DO NOTHING;
  
  -- User 1 (criado pelo Manager 1)
  INSERT INTO auth.users (id, email, created_at, updated_at)
  VALUES (gen_random_uuid(), 'user1@exemplo.com', now(), now())
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO user1_id;
  
  IF user1_id IS NULL THEN
    SELECT id INTO user1_id FROM auth.users WHERE email = 'user1@exemplo.com';
  END IF;
  
  INSERT INTO public.app_users (id, email, role, created_by)
  VALUES (user1_id, 'user1@exemplo.com', 'user', manager1_id)
  ON CONFLICT (id) DO NOTHING;
  
  -- User 2 (criado pelo Manager 1)
  INSERT INTO auth.users (id, email, created_at, updated_at)
  VALUES (gen_random_uuid(), 'user2@exemplo.com', now(), now())
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO user2_id;
  
  IF user2_id IS NULL THEN
    SELECT id INTO user2_id FROM auth.users WHERE email = 'user2@exemplo.com';
  END IF;
  
  INSERT INTO public.app_users (id, email, role, created_by)
  VALUES (user2_id, 'user2@exemplo.com', 'user', manager1_id)
  ON CONFLICT (id) DO NOTHING;
  
  -- User 3 (criado pelo Manager 2)
  INSERT INTO auth.users (id, email, created_at, updated_at)
  VALUES (gen_random_uuid(), 'user3@exemplo.com', now(), now())
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO user3_id;
  
  IF user3_id IS NULL THEN
    SELECT id INTO user3_id FROM auth.users WHERE email = 'user3@exemplo.com';
  END IF;
  
  INSERT INTO public.app_users (id, email, role, created_by)
  VALUES (user3_id, 'user3@exemplo.com', 'user', manager2_id)
  ON CONFLICT (id) DO NOTHING;
  
  -- Criar clientes de exemplo
  INSERT INTO public.clients (owner_id, name, segment, revenue_range, temperature, notes, active_prospects, conversion_rate)
  VALUES 
    (user1_id, 'TechCorp Solutions', 'Tecnologia', 'R$ 1M - 5M', 'hot', 'Cliente promissor na área de tecnologia', 23, 18.5),
    (user2_id, 'MedHealth Clínicas', 'Saúde', 'R$ 500K - 1M', 'warm', 'Rede de clínicas médicas', 18, 14.2),
    (user3_id, 'FinanceFlow', 'Finanças', 'R$ 5M - 20M', 'hot', 'Fintech em crescimento', 31, 22.8)
  ON CONFLICT (id) DO NOTHING;
  
  -- Criar alguns prospects de exemplo
  INSERT INTO public.prospects (owner_id, client_id, contact_name, contact_email, company, position, source, status, temperature, deal_value, probability)
  VALUES 
    (user1_id, (SELECT id FROM public.clients WHERE owner_id = user1_id LIMIT 1), 'João Silva', 'joao@techcorp.com', 'TechCorp Solutions', 'CTO', 'inbound', 'meeting_scheduled', 'hot', 15000.00, 80),
    (user1_id, (SELECT id FROM public.clients WHERE owner_id = user1_id LIMIT 1), 'Maria Santos', 'maria@techcorp.com', 'TechCorp Solutions', 'CEO', 'inbound', 'proposal_sent', 'hot', 25000.00, 90),
    (user2_id, (SELECT id FROM public.clients WHERE owner_id = user2_id LIMIT 1), 'Pedro Oliveira', 'pedro@medhealth.com', 'MedHealth Clínicas', 'Diretor', 'outbound', 'contacted', 'warm', 12000.00, 60),
    (user3_id, (SELECT id FROM public.clients WHERE owner_id = user3_id LIMIT 1), 'Ana Costa', 'ana@financeflow.com', 'FinanceFlow', 'CPO', 'inbound', 'won', 'hot', 35000.00, 100);
  
  -- Criar metas de exemplo
  INSERT INTO public.goals (owner_id, client_id, period_start, period_end, target_responses, target_meetings, target_sales, target_revenue, actual_responses, actual_meetings, actual_sales, actual_revenue)
  VALUES 
    (user1_id, NULL, '2024-01-01', '2024-01-31', 50, 20, 5, 75000.00, 42, 18, 3, 45000.00),
    (user2_id, NULL, '2024-01-01', '2024-01-31', 30, 15, 3, 50000.00, 25, 12, 2, 28000.00),
    (user3_id, NULL, '2024-01-01', '2024-01-31', 60, 25, 8, 120000.00, 55, 22, 6, 95000.00);
  
  RAISE NOTICE 'Dados de exemplo criados com sucesso!';
END $$;

-- Para executar a criação de dados de exemplo, descomente a linha abaixo:
-- SELECT public.create_sample_data();

-- =============================================================================
-- FIM DA FASE 6
-- =============================================================================
