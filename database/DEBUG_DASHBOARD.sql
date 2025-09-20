-- =============================================================================
-- DEBUG DO DASHBOARD - EXECUTE PARA VERIFICAR SE TUDO ESTÁ FUNCIONANDO
-- =============================================================================

-- 1. VERIFICAR SE AS FUNÇÕES FORAM CRIADAS
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_dashboard_metrics', 'get_dashboard_drilldown', 'is_no_show', 'has_response', 'is_follow_up');

-- 2. VERIFICAR SE OS CAMPOS FORAM ADICIONADOS À TABELA PROSPECTS
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'prospects' 
AND column_name IN ('segment', 'date_prospect', 'date_scheduling', 'status_scheduling', 'reply', 'closer')
ORDER BY ordinal_position;

-- 3. VERIFICAR SE HÁ PROSPECTS NA TABELA
SELECT COUNT(*) as total_prospects FROM public.prospects;

-- 4. VERIFICAR PROSPECTS POR USUÁRIO
SELECT 
  owner_id,
  COUNT(*) as total,
  COUNT(CASE WHEN date_prospect >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as ultimos_30_dias
FROM public.prospects 
GROUP BY owner_id;

-- 5. TESTAR A FUNÇÃO DO DASHBOARD (substitua pelo seu user_id)
-- SELECT public.get_dashboard_metrics('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid);

-- 6. VERIFICAR SE O USUÁRIO TEM PERMISSÃO PARA VER OS PROSPECTS
SELECT 
  p.id,
  p.owner_id,
  p.contact_name,
  p.date_prospect,
  p.source,
  p.status
FROM public.prospects p
WHERE public.can_manage('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, p.owner_id)
LIMIT 10;

-- 7. INSERIR DADOS DE TESTE (DESCOMENTE SE NECESSÁRIO)
/*
INSERT INTO public.prospects (
  owner_id,
  contact_name,
  contact_email,
  company,
  source,
  status,
  temperature,
  segment,
  deal_value,
  date_prospect,
  notes
) VALUES 
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'João Silva', 'joao@empresa.com', 'Empresa Tech', 'inbound', 'responded', 'hot', 'Tecnologia', 15000, CURRENT_DATE, 'Lead qualificado'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Maria Santos', 'maria@startup.com', 'Startup Inovadora', 'outbound', 'meeting_scheduled', 'warm', 'Tecnologia', 25000, CURRENT_DATE - 1, 'Reunião agendada'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Pedro Costa', 'pedro@consultoria.com', 'Consultoria ABC', 'inbound', 'won', 'hot', 'Consultoria', 50000, CURRENT_DATE - 2, 'Venda fechada!'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Ana Oliveira', 'ana@saude.com', 'Clínica Saúde', 'outbound', 'follow_up', 'cold', 'Saúde', 8000, CURRENT_DATE - 3, 'Aguardando retorno');
*/
