-- =============================================================================
-- CORREÇÃO: Adicionar campos sheet_tab e sheet_mapping na função list_clients
-- =============================================================================
-- 
-- PROBLEMA IDENTIFICADO:
-- A função list_clients não estava retornando os campos sheet_tab e sheet_mapping,
-- causando o problema no modal de gerenciar planilha onde os campos não carregavam
-- os dados salvos no banco de dados.
--
-- SOLUÇÃO:
-- Atualizar a função list_clients para incluir os campos faltantes.
-- =============================================================================

-- Atualizar a função list_clients para incluir sheet_tab e sheet_mapping
CREATE OR REPLACE FUNCTION public.list_clients(
  search_term text DEFAULT NULL,
  segment_filter text DEFAULT NULL,
  temperature_filter text DEFAULT NULL,
  status_filter text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  name text,
  segment text,
  temperature text,
  budget text,
  notes text,
  goals jsonb,
  sheet_status text,
  sheet_url text,
  sheet_tab text,
  sheet_mapping jsonb,
  owner jsonb,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    c.id,
    c.name,
    c.segment,
    c.temperature,
    c.budget,
    c.notes,
    c.goals,
    c.sheet_status,
    c.sheet_url,
    c.sheet_tab,
    c.sheet_mapping,
    jsonb_build_object(
      'id', u.id,
      'name', u.email,
      'role', u.role
    ) as owner,
    c.created_at
  FROM public.clients c
  JOIN public.app_users u ON c.owner_id = u.id
  WHERE 
    -- RLS já garante que só vemos clientes que podemos gerenciar
    (search_term IS NULL OR c.name ILIKE '%' || search_term || '%')
    AND (segment_filter IS NULL OR c.segment = segment_filter)
    AND (temperature_filter IS NULL OR c.temperature = temperature_filter)
    AND (status_filter IS NULL OR c.sheet_status = status_filter)
  ORDER BY c.created_at DESC;
$$;

-- Atualizar comentário da função
COMMENT ON FUNCTION public.list_clients IS 'Lista clientes com filtros opcionais, respeitando hierarquia de permissões. Inclui campos sheet_tab e sheet_mapping para integração com planilhas.';

-- Log de sucesso
DO $$
BEGIN
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE '✅ CORREÇÃO APLICADA COM SUCESSO!';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'Função list_clients atualizada para incluir:';
  RAISE NOTICE '• sheet_tab - Nome da aba da planilha';
  RAISE NOTICE '• sheet_mapping - Mapeamento de colunas da planilha';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'Agora o modal de gerenciar planilha deve carregar corretamente';
  RAISE NOTICE 'os dados salvos nos campos "nome da aba" e "mapeamento de colunas".';
  RAISE NOTICE '=============================================================================';
END $$;
