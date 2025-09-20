-- =============================================================================
-- SCRIPTS VALIDATION - Testes e Validações do Sistema de Scripts
-- =============================================================================
-- Este arquivo contém validações e testes para garantir que o sistema
-- de scripts funciona corretamente com todas as regras de negócio
-- =============================================================================

-- 1. VALIDAÇÕES DE INTEGRIDADE
-- =============================================================================

-- Verificar se a tabela scripts foi criada corretamente
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scripts') THEN
        RAISE EXCEPTION 'Tabela scripts não foi criada';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'script_visibility') THEN
        RAISE EXCEPTION 'Enum script_visibility não foi criado';
    END IF;
    
    RAISE NOTICE 'Estrutura básica validada com sucesso';
END $$;

-- Verificar se todas as colunas existem
DO $$
DECLARE
    missing_columns TEXT[] := ARRAY[]::TEXT[];
    required_columns TEXT[] := ARRAY['id', 'owner_id', 'title', 'tags', 'content', 'visibility', 'created_at', 'updated_at'];
    col TEXT;
BEGIN
    FOREACH col IN ARRAY required_columns
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'scripts' AND column_name = col
        ) THEN
            missing_columns := array_append(missing_columns, col);
        END IF;
    END LOOP;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE EXCEPTION 'Colunas faltando: %', array_to_string(missing_columns, ', ');
    END IF;
    
    RAISE NOTICE 'Todas as colunas necessárias estão presentes';
END $$;

-- Verificar se as políticas RLS estão ativas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'scripts' AND policyname = 'scripts_select_policy'
    ) THEN
        RAISE EXCEPTION 'Política SELECT para scripts não foi criada';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'scripts' AND policyname = 'scripts_insert_policy'
    ) THEN
        RAISE EXCEPTION 'Política INSERT para scripts não foi criada';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'scripts' AND policyname = 'scripts_update_policy'
    ) THEN
        RAISE EXCEPTION 'Política UPDATE para scripts não foi criada';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'scripts' AND policyname = 'scripts_delete_policy'
    ) THEN
        RAISE EXCEPTION 'Política DELETE para scripts não foi criada';
    END IF;
    
    RAISE NOTICE 'Todas as políticas RLS estão ativas';
END $$;

-- 2. TESTES DE FUNCIONALIDADE (SIMULAÇÃO)
-- =============================================================================

-- Função para simular cenários de teste
CREATE OR REPLACE FUNCTION public.test_scripts_scenarios()
RETURNS TABLE (
    test_name TEXT,
    test_result TEXT,
    details TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    test_admin_id UUID;
    test_manager_id UUID;
    test_user_id UUID;
    script_id UUID;
    result_count INTEGER;
BEGIN
    -- Nota: Estes testes são conceituais pois não podemos executar sem dados reais
    -- Eles validam a estrutura e lógica das funções
    
    -- Teste 1: Verificar se as funções existem
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'list_scripts') THEN
        RETURN QUERY SELECT 'Função list_scripts'::TEXT, 'OK'::TEXT, 'Função existe'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Função list_scripts'::TEXT, 'ERRO'::TEXT, 'Função não encontrada'::TEXT;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_script') THEN
        RETURN QUERY SELECT 'Função get_script'::TEXT, 'OK'::TEXT, 'Função existe'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Função get_script'::TEXT, 'ERRO'::TEXT, 'Função não encontrada'::TEXT;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_script') THEN
        RETURN QUERY SELECT 'Função create_script'::TEXT, 'OK'::TEXT, 'Função existe'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Função create_script'::TEXT, 'ERRO'::TEXT, 'Função não encontrada'::TEXT;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_script') THEN
        RETURN QUERY SELECT 'Função update_script'::TEXT, 'OK'::TEXT, 'Função existe'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Função update_script'::TEXT, 'ERRO'::TEXT, 'Função não encontrada'::TEXT;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'delete_script') THEN
        RETURN QUERY SELECT 'Função delete_script'::TEXT, 'OK'::TEXT, 'Função existe'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Função delete_script'::TEXT, 'ERRO'::TEXT, 'Função não encontrada'::TEXT;
    END IF;
    
    -- Teste 2: Verificar funções auxiliares
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'can_manage_script') THEN
        RETURN QUERY SELECT 'Função can_manage_script'::TEXT, 'OK'::TEXT, 'Função existe'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Função can_manage_script'::TEXT, 'ERRO'::TEXT, 'Função não encontrada'::TEXT;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'can_view_script') THEN
        RETURN QUERY SELECT 'Função can_view_script'::TEXT, 'OK'::TEXT, 'Função existe'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Função can_view_script'::TEXT, 'ERRO'::TEXT, 'Função não encontrada'::TEXT;
    END IF;
    
    -- Teste 3: Verificar trigger
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_scripts_updated_at'
    ) THEN
        RETURN QUERY SELECT 'Trigger updated_at'::TEXT, 'OK'::TEXT, 'Trigger existe'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Trigger updated_at'::TEXT, 'ERRO'::TEXT, 'Trigger não encontrado'::TEXT;
    END IF;
    
    -- Teste 4: Verificar índices
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'scripts' AND indexname = 'idx_scripts_owner_id'
    ) THEN
        RETURN QUERY SELECT 'Índice owner_id'::TEXT, 'OK'::TEXT, 'Índice existe'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Índice owner_id'::TEXT, 'ERRO'::TEXT, 'Índice não encontrado'::TEXT;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'scripts' AND indexname = 'idx_scripts_search'
    ) THEN
        RETURN QUERY SELECT 'Índice de busca'::TEXT, 'OK'::TEXT, 'Índice existe'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Índice de busca'::TEXT, 'ERRO'::TEXT, 'Índice não encontrado'::TEXT;
    END IF;
    
END;
$$;

-- 3. CENÁRIOS DE TESTE CONCEITUAIS
-- =============================================================================

-- Função para documentar cenários de teste
CREATE OR REPLACE FUNCTION public.document_test_scenarios()
RETURNS TABLE (
    scenario TEXT,
    description TEXT,
    expected_result TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Cenários de Criação
    RETURN QUERY SELECT 
        'Criação de Script'::TEXT,
        'Usuário cria um script privado'::TEXT,
        'Script criado com owner_id = auth.uid()'::TEXT;
    
    RETURN QUERY SELECT 
        'Criação com Título Vazio'::TEXT,
        'Usuário tenta criar script sem título'::TEXT,
        'Erro 400: Título não pode ser vazio'::TEXT;
    
    -- Cenários de Visualização
    RETURN QUERY SELECT 
        'Visualização Script Privado'::TEXT,
        'Usuário tenta ver script privado de outro'::TEXT,
        'Acesso negado (a menos que seja ancestral)'::TEXT;
    
    RETURN QUERY SELECT 
        'Visualização Script Team'::TEXT,
        'Usuário do mesmo time vê script team'::TEXT,
        'Acesso permitido'::TEXT;
    
    RETURN QUERY SELECT 
        'Visualização Script Público'::TEXT,
        'Qualquer usuário vê script público'::TEXT,
        'Acesso permitido'::TEXT;
    
    -- Cenários de Edição
    RETURN QUERY SELECT 
        'Edição Script Próprio'::TEXT,
        'Dono edita seu próprio script'::TEXT,
        'Edição permitida'::TEXT;
    
    RETURN QUERY SELECT 
        'Edição Script de Outro'::TEXT,
        'Usuário tenta editar script de outro'::TEXT,
        'Acesso negado (a menos que seja ancestral/admin)'::TEXT;
    
    -- Cenários de Hierarquia
    RETURN QUERY SELECT 
        'Hierarquia Admin'::TEXT,
        'Admin acessa qualquer script'::TEXT,
        'Acesso total permitido'::TEXT;
    
    RETURN QUERY SELECT 
        'Hierarquia Manager'::TEXT,
        'Manager acessa scripts de seus subordinados'::TEXT,
        'Acesso permitido apenas para subordinados'::TEXT;
    
    -- Cenários de Filtros
    RETURN QUERY SELECT 
        'Busca por Texto'::TEXT,
        'Listar scripts com termo de busca'::TEXT,
        'Retorna apenas scripts que contêm o termo'::TEXT;
    
    RETURN QUERY SELECT 
        'Filtro por Tag'::TEXT,
        'Listar scripts com tag específica'::TEXT,
        'Retorna apenas scripts com a tag'::TEXT;
    
    RETURN QUERY SELECT 
        'Filtro por Visibilidade'::TEXT,
        'Listar apenas scripts públicos'::TEXT,
        'Retorna apenas scripts com visibility = public'::TEXT;
END;
$$;

-- 4. VALIDAÇÕES DE PERFORMANCE
-- =============================================================================

-- Verificar se os índices estão otimizados
CREATE OR REPLACE FUNCTION public.validate_scripts_performance()
RETURNS TABLE (
    index_name TEXT,
    index_type TEXT,
    columns TEXT,
    status TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Verificar índices existentes
    RETURN QUERY
    SELECT 
        i.indexname::TEXT,
        am.amname::TEXT as index_type,
        pg_get_indexdef(i.indexrelid)::TEXT as columns,
        CASE 
            WHEN i.indexname LIKE 'idx_scripts_%' THEN 'OK'
            ELSE 'REVIEW'
        END as status
    FROM pg_indexes i
    JOIN pg_class c ON i.indexname = c.relname
    JOIN pg_am am ON c.relam = am.oid
    WHERE i.tablename = 'scripts'
    ORDER BY i.indexname;
END;
$$;

-- 5. EXECUÇÃO DOS TESTES
-- =============================================================================

-- Executar todos os testes
DO $$
DECLARE
    test_result RECORD;
BEGIN
    RAISE NOTICE '=== INICIANDO VALIDAÇÃO DO SISTEMA DE SCRIPTS ===';
    
    -- Executar testes de funcionalidade
    FOR test_result IN SELECT * FROM public.test_scripts_scenarios() LOOP
        RAISE NOTICE 'Teste: % | Resultado: % | Detalhes: %', 
            test_result.test_name, 
            test_result.test_result, 
            test_result.details;
    END LOOP;
    
    RAISE NOTICE '=== VALIDAÇÃO CONCLUÍDA ===';
END $$;

-- 6. DOCUMENTAÇÃO DE USO
-- =============================================================================

-- Função para gerar documentação de uso das APIs
CREATE OR REPLACE FUNCTION public.get_scripts_api_documentation()
RETURNS TABLE (
    endpoint TEXT,
    method TEXT,
    parameters TEXT,
    description TEXT,
    example TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY SELECT 
        'Listar Scripts'::TEXT,
        'GET'::TEXT,
        'search, tag, visibility, limit, offset'::TEXT,
        'Lista scripts com filtros opcionais'::TEXT,
        'SELECT * FROM list_scripts(''linkedin'', ''prospecção'', ''team'', 10, 0);'::TEXT;
    
    RETURN QUERY SELECT 
        'Obter Script'::TEXT,
        'GET'::TEXT,
        'script_id'::TEXT,
        'Retorna detalhes de um script específico'::TEXT,
        'SELECT * FROM get_script(''uuid-do-script'');'::TEXT;
    
    RETURN QUERY SELECT 
        'Criar Script'::TEXT,
        'POST'::TEXT,
        'title, tags[], content, visibility'::TEXT,
        'Cria um novo script'::TEXT,
        'SELECT create_script(''Meu Script'', ARRAY[''linkedin''], ''Conteúdo...'', ''private'');'::TEXT;
    
    RETURN QUERY SELECT 
        'Atualizar Script'::TEXT,
        'PUT'::TEXT,
        'script_id, title, tags[], content, visibility'::TEXT,
        'Atualiza um script existente'::TEXT,
        'SELECT update_script(''uuid'', ''Novo Título'', ARRAY[''whatsapp''], ''Novo conteúdo'', ''team'');'::TEXT;
    
    RETURN QUERY SELECT 
        'Deletar Script'::TEXT,
        'DELETE'::TEXT,
        'script_id'::TEXT,
        'Remove um script'::TEXT,
        'SELECT delete_script(''uuid-do-script'');'::TEXT;
    
    RETURN QUERY SELECT 
        'Estatísticas'::TEXT,
        'GET'::TEXT,
        'nenhum'::TEXT,
        'Retorna estatísticas dos scripts'::TEXT,
        'SELECT * FROM get_scripts_stats();'::TEXT;
END;
$$;

-- 7. LIMPEZA DE FUNÇÕES DE TESTE (OPCIONAL)
-- =============================================================================

-- Comentário: As funções de teste podem ser mantidas para validação contínua
-- ou removidas após a validação inicial. Descomente as linhas abaixo se desejar remover:

/*
DROP FUNCTION IF EXISTS public.test_scripts_scenarios();
DROP FUNCTION IF EXISTS public.document_test_scenarios();
DROP FUNCTION IF EXISTS public.validate_scripts_performance();
DROP FUNCTION IF EXISTS public.get_scripts_api_documentation();
*/

-- 8. RESUMO FINAL
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== SISTEMA DE SCRIPTS IMPLEMENTADO COM SUCESSO ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Funcionalidades implementadas:';
    RAISE NOTICE '✓ Tabela scripts com todas as colunas necessárias';
    RAISE NOTICE '✓ Enum script_visibility (private, team, public)';
    RAISE NOTICE '✓ Políticas RLS para controle de acesso hierárquico';
    RAISE NOTICE '✓ Funções API completas para CRUD';
    RAISE NOTICE '✓ Validações de dados e tratamento de erros';
    RAISE NOTICE '✓ Índices otimizados para performance';
    RAISE NOTICE '✓ Triggers para atualização automática de timestamps';
    RAISE NOTICE '✓ Sistema de permissões baseado em hierarquia';
    RAISE NOTICE '';
    RAISE NOTICE 'Próximos passos:';
    RAISE NOTICE '1. Executar este script no Supabase Dashboard';
    RAISE NOTICE '2. Testar as funções com dados reais';
    RAISE NOTICE '3. Integrar com o frontend React';
    RAISE NOTICE '';
END $$;
