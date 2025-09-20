-- =============================================================================
-- CORRIGIR DADOS EXISTENTES DOS PROSPECTS
-- =============================================================================

-- 1. ATUALIZAR PROSPECTS EXISTENTES COM DADOS VÁLIDOS
UPDATE public.prospects 
SET 
  source = CASE 
    WHEN id % 2 = 0 THEN 'inbound'
    ELSE 'outbound'
  END,
  temperature = CASE 
    WHEN id % 3 = 0 THEN 'hot'
    WHEN id % 3 = 1 THEN 'warm'
    ELSE 'cold'
  END,
  segment = CASE 
    WHEN id % 4 = 0 THEN 'Tecnologia'
    WHEN id % 4 = 1 THEN 'Saúde'
    WHEN id % 4 = 2 THEN 'Educação'
    ELSE 'Consultoria'
  END,
  deal_value = (id % 10 + 1) * 5000, -- Valores entre 5k e 50k
  date_prospect = CURRENT_DATE - INTERVAL '1 day' * (id % 30), -- Espalhar nos últimos 30 dias
  status = CASE 
    WHEN id % 8 = 0 THEN 'won'
    WHEN id % 8 = 1 THEN 'responded'
    WHEN id % 8 = 2 THEN 'meeting_scheduled'
    WHEN id % 8 = 3 THEN 'meeting_done'
    WHEN id % 8 = 4 THEN 'follow_up'
    WHEN id % 8 = 5 THEN 'proposal_sent'
    WHEN id % 8 = 6 THEN 'lost'
    ELSE 'new'
  END
WHERE owner_id = '446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid;

-- 2. VERIFICAR OS DADOS ATUALIZADOS
SELECT 
  id,
  contact_name,
  source,
  status,
  temperature,
  segment,
  deal_value,
  date_prospect
FROM public.prospects 
WHERE owner_id = '446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid
ORDER BY date_prospect DESC
LIMIT 10;

-- 3. TESTAR A FUNÇÃO DO DASHBOARD
SELECT public.get_dashboard_metrics('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid);

-- 4. VERIFICAR CONTADORES RÁPIDOS
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN source = 'inbound' THEN 1 END) as inbound,
  COUNT(CASE WHEN source = 'outbound' THEN 1 END) as outbound,
  COUNT(CASE WHEN status = 'won' THEN 1 END) as vendas,
  COUNT(CASE WHEN date_prospect >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as ultimos_30_dias
FROM public.prospects 
WHERE owner_id = '446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid;
