-- =============================================================================
-- EXECUTAR FUNÇÕES RPC PARA PROSPECTS
-- Execute este script no Supabase SQL Editor
-- =============================================================================

-- Executar o arquivo com as funções RPC
\i 27_prospects_rpc_functions.sql

-- Verificar se as funções foram criadas
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%prospect%'
ORDER BY routine_name;

-- Testar função de listagem (exemplo)
-- SELECT public.list_prospects();

-- Testar função de segmentos (exemplo)  
-- SELECT public.get_prospect_segments();

-- =============================================================================
-- FIM
-- =============================================================================

