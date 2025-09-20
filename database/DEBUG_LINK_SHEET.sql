-- Script de debug para testar a função link_client_sheet

-- 1. Verificar se a função existe
SELECT 'Função link_client_sheet existe: ' || 
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'link_client_sheet') 
       THEN 'SIM' 
       ELSE 'NÃO' 
  END as status;

-- 2. Verificar estrutura da tabela clients
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'clients' 
  AND column_name IN ('sheet_url', 'sheet_tab', 'sheet_mapping', 'sheet_status')
ORDER BY ordinal_position;

-- 3. Testar a função com dados simples (substitua o UUID pelo ID de um cliente real)
DO $$
DECLARE
  test_client_id uuid := 'SUBSTITUA-PELO-ID-DO-CLIENTE'; -- ⚠️ SUBSTITUA ESTE UUID
  test_result record;
BEGIN
  -- Verificar se o cliente existe
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = test_client_id) THEN
    RAISE NOTICE '❌ Cliente com ID % não encontrado', test_client_id;
    RETURN;
  END IF;

  RAISE NOTICE '✅ Cliente encontrado, testando função...';

  -- Testar a função
  BEGIN
    SELECT * INTO test_result
    FROM public.link_client_sheet(
      test_client_id,
      'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      'Teste Debug',
      '{"Nome": "nome", "Email": "email"}'::jsonb
    );
    
    RAISE NOTICE '✅ Função executada com sucesso!';
    RAISE NOTICE 'Resultado: id=%, name=%, sheet_tab=%, sheet_mapping=%', 
      test_result.id, test_result.name, test_result.sheet_tab, test_result.sheet_mapping;
      
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Erro ao executar função: % - %', SQLSTATE, SQLERRM;
  END;
END;
$$;

-- 4. Verificar dados salvos na tabela
SELECT 
  id,
  name,
  sheet_url,
  sheet_tab,
  sheet_mapping,
  sheet_status,
  updated_at
FROM public.clients
WHERE sheet_url IS NOT NULL
ORDER BY updated_at DESC
LIMIT 5;
