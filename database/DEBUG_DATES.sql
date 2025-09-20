-- =============================================================================
-- DEBUG DAS DATAS - VERIFICAR SE ESTÁ CORRETO
-- =============================================================================

-- Verificar os dados de prospects com suas datas
SELECT 
  id,
  contact_name,
  date_prospect,
  created_at,
  status,
  source
FROM public.prospects 
WHERE owner_id = '446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid
ORDER BY date_prospect DESC
LIMIT 10;

-- Verificar contagem por data
SELECT 
  date_prospect,
  COUNT(*) as total
FROM public.prospects 
WHERE owner_id = '446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid
AND date_prospect >= '2025-09-01'
AND date_prospect <= '2025-09-20'
GROUP BY date_prospect
ORDER BY date_prospect DESC;

-- Testar função do dashboard
SELECT public.get_dashboard_metrics(
  '446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid,
  '2025-09-01'::date,
  '2025-09-20'::date
);
