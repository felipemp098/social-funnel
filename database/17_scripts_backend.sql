-- =============================================================================
-- SCRIPTS BACKEND - Sistema de Gerenciamento de Scripts de Social Selling
-- =============================================================================
-- Este arquivo implementa o backend completo para gerenciar scripts
-- com controle de acesso hierárquico e diferentes níveis de visibilidade
-- =============================================================================

-- 1. CRIAR ENUM PARA VISIBILIDADE
-- =============================================================================
DO $$ 
BEGIN
    -- Verificar se o enum já existe
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'script_visibility') THEN
        CREATE TYPE script_visibility AS ENUM ('private', 'team', 'public');
    END IF;
END $$;

-- 2. CRIAR TABELA SCRIPTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    tags TEXT[] DEFAULT '{}' CHECK (array_length(tags, 1) IS NULL OR array_length(tags, 1) >= 0),
    content TEXT NOT NULL DEFAULT '',
    visibility script_visibility NOT NULL DEFAULT 'private',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints adicionais
    CONSTRAINT scripts_title_not_empty CHECK (length(trim(title)) > 0),
    CONSTRAINT scripts_content_not_null CHECK (content IS NOT NULL)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_scripts_owner_id ON public.scripts(owner_id);
CREATE INDEX IF NOT EXISTS idx_scripts_visibility ON public.scripts(visibility);
CREATE INDEX IF NOT EXISTS idx_scripts_created_at ON public.scripts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scripts_updated_at ON public.scripts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_scripts_tags ON public.scripts USING GIN(tags);

-- Índice para busca de texto (título e conteúdo)
CREATE INDEX IF NOT EXISTS idx_scripts_search 
ON public.scripts USING GIN(to_tsvector('portuguese', title || ' ' || content));

-- 3. FUNÇÕES AUXILIARES PARA HIERARQUIA E PERMISSÕES
-- =============================================================================

-- Função para verificar se um usuário pode gerenciar outro (hierarquia transitiva)
CREATE OR REPLACE FUNCTION public.can_manage_script(
    manager_id UUID,
    owner_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Admin pode gerenciar qualquer script
    IF EXISTS (
        SELECT 1 FROM public.app_users 
        WHERE id = manager_id AND role = 'admin'
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Usuário pode gerenciar seus próprios scripts
    IF manager_id = owner_id THEN
        RETURN TRUE;
    END IF;
    
    -- Verificar hierarquia transitiva (ancestrais podem gerenciar descendentes)
    RETURN public.is_ancestor(manager_id, owner_id);
END;
$$;

-- Função para verificar se um usuário pode visualizar um script
CREATE OR REPLACE FUNCTION public.can_view_script(
    viewer_id UUID,
    script_owner_id UUID,
    script_visibility script_visibility
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Scripts públicos podem ser vistos por todos
    IF script_visibility = 'public' THEN
        RETURN TRUE;
    END IF;
    
    -- Dono sempre pode ver
    IF viewer_id = script_owner_id THEN
        RETURN TRUE;
    END IF;
    
    -- Admin pode ver todos
    IF EXISTS (
        SELECT 1 FROM public.app_users 
        WHERE id = viewer_id AND role = 'admin'
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Para scripts 'team', verificar se o viewer é do mesmo time (ancestral ou descendente)
    IF script_visibility = 'team' THEN
        RETURN public.is_ancestor(viewer_id, script_owner_id) 
            OR public.is_ancestor(script_owner_id, viewer_id)
            OR EXISTS (
                SELECT 1 FROM public.app_users a1, public.app_users a2
                WHERE a1.id = viewer_id 
                AND a2.id = script_owner_id
                AND a1.created_by = a2.created_by
            );
    END IF;
    
    -- Para scripts 'private', apenas dono e ancestrais
    RETURN public.is_ancestor(viewer_id, script_owner_id);
END;
$$;

-- 4. TRIGGER PARA ATUALIZAR updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_scripts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_scripts_updated_at
    BEFORE UPDATE ON public.scripts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_scripts_updated_at();

-- 5. POLÍTICAS RLS
-- =============================================================================

-- Habilitar RLS
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;

-- Política SELECT: usuários podem ver scripts baseado na visibilidade e hierarquia
CREATE POLICY "scripts_select_policy" ON public.scripts
    FOR SELECT
    USING (public.can_view_script(auth.uid(), owner_id, visibility));

-- Política INSERT: usuários podem criar scripts apenas para si mesmos
CREATE POLICY "scripts_insert_policy" ON public.scripts
    FOR INSERT
    WITH CHECK (owner_id = auth.uid());

-- Política UPDATE: usuários podem atualizar apenas scripts que podem gerenciar
CREATE POLICY "scripts_update_policy" ON public.scripts
    FOR UPDATE
    USING (public.can_manage_script(auth.uid(), owner_id))
    WITH CHECK (public.can_manage_script(auth.uid(), owner_id));

-- Política DELETE: usuários podem deletar apenas scripts que podem gerenciar
CREATE POLICY "scripts_delete_policy" ON public.scripts
    FOR DELETE
    USING (public.can_manage_script(auth.uid(), owner_id));

-- 6. FUNÇÕES API PARA CRUD
-- =============================================================================

-- Função para listar scripts com filtros
CREATE OR REPLACE FUNCTION public.list_scripts(
    search_term TEXT DEFAULT NULL,
    tag_filter TEXT DEFAULT NULL,
    visibility_filter script_visibility DEFAULT NULL,
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0
) RETURNS TABLE (
    id UUID,
    title TEXT,
    tags TEXT[],
    content TEXT,
    visibility script_visibility,
    owner_id UUID,
    owner_name TEXT,
    owner_role user_role,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.title,
        s.tags,
        s.content,
        s.visibility,
        s.owner_id,
        au.name as owner_name,
        au.role as owner_role,
        s.created_at,
        s.updated_at
    FROM public.scripts s
    JOIN public.app_users au ON s.owner_id = au.id
    WHERE 
        -- Filtro de visibilidade e permissão (RLS já aplicado)
        (visibility_filter IS NULL OR s.visibility = visibility_filter)
        -- Filtro de busca por texto
        AND (search_term IS NULL OR (
            to_tsvector('portuguese', s.title || ' ' || s.content) @@ plainto_tsquery('portuguese', search_term)
        ))
        -- Filtro por tag
        AND (tag_filter IS NULL OR tag_filter = ANY(s.tags))
    ORDER BY s.updated_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;

-- Função para obter um script específico
CREATE OR REPLACE FUNCTION public.get_script(script_id UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    tags TEXT[],
    content TEXT,
    visibility script_visibility,
    owner_id UUID,
    owner_name TEXT,
    owner_role user_role,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.title,
        s.tags,
        s.content,
        s.visibility,
        s.owner_id,
        au.name as owner_name,
        au.role as owner_role,
        s.created_at,
        s.updated_at
    FROM public.scripts s
    JOIN public.app_users au ON s.owner_id = au.id
    WHERE s.id = script_id;
END;
$$;

-- Função para criar um script
CREATE OR REPLACE FUNCTION public.create_script(
    script_title TEXT,
    script_tags TEXT[] DEFAULT '{}',
    script_content TEXT DEFAULT '',
    script_visibility script_visibility DEFAULT 'private'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_script_id UUID;
BEGIN
    -- Validações
    IF script_title IS NULL OR length(trim(script_title)) = 0 THEN
        RAISE EXCEPTION 'Título do script não pode ser vazio';
    END IF;
    
    IF script_tags IS NULL THEN
        script_tags := '{}';
    END IF;
    
    -- Criar o script
    INSERT INTO public.scripts (
        owner_id,
        title,
        tags,
        content,
        visibility
    ) VALUES (
        auth.uid(),
        trim(script_title),
        script_tags,
        COALESCE(script_content, ''),
        script_visibility
    ) RETURNING id INTO new_script_id;
    
    RETURN new_script_id;
END;
$$;

-- Função para atualizar um script
CREATE OR REPLACE FUNCTION public.update_script(
    script_id UUID,
    script_title TEXT DEFAULT NULL,
    script_tags TEXT[] DEFAULT NULL,
    script_content TEXT DEFAULT NULL,
    script_visibility script_visibility DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_rows INTEGER;
BEGIN
    -- Verificar se o script existe e se o usuário pode editá-lo
    IF NOT EXISTS (
        SELECT 1 FROM public.scripts 
        WHERE id = script_id AND public.can_manage_script(auth.uid(), owner_id)
    ) THEN
        RAISE EXCEPTION 'Script não encontrado ou sem permissão para editar';
    END IF;
    
    -- Validação do título se fornecido
    IF script_title IS NOT NULL AND length(trim(script_title)) = 0 THEN
        RAISE EXCEPTION 'Título do script não pode ser vazio';
    END IF;
    
    -- Atualizar apenas campos fornecidos
    UPDATE public.scripts SET
        title = COALESCE(trim(script_title), title),
        tags = COALESCE(script_tags, tags),
        content = COALESCE(script_content, content),
        visibility = COALESCE(script_visibility, visibility),
        updated_at = NOW()
    WHERE id = script_id;
    
    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    RETURN updated_rows > 0;
END;
$$;

-- Função para deletar um script
CREATE OR REPLACE FUNCTION public.delete_script(script_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_rows INTEGER;
BEGIN
    -- Verificar se o script existe e se o usuário pode deletá-lo
    IF NOT EXISTS (
        SELECT 1 FROM public.scripts 
        WHERE id = script_id AND public.can_manage_script(auth.uid(), owner_id)
    ) THEN
        RAISE EXCEPTION 'Script não encontrado ou sem permissão para deletar';
    END IF;
    
    DELETE FROM public.scripts WHERE id = script_id;
    
    GET DIAGNOSTICS deleted_rows = ROW_COUNT;
    RETURN deleted_rows > 0;
END;
$$;

-- Função para obter estatísticas de scripts
CREATE OR REPLACE FUNCTION public.get_scripts_stats()
RETURNS TABLE (
    total_scripts BIGINT,
    my_scripts BIGINT,
    team_scripts BIGINT,
    public_scripts BIGINT,
    total_tags BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM public.scripts) as total_scripts,
        (SELECT COUNT(*) FROM public.scripts WHERE owner_id = auth.uid()) as my_scripts,
        (SELECT COUNT(*) FROM public.scripts WHERE visibility = 'team' AND public.can_view_script(auth.uid(), owner_id, visibility)) as team_scripts,
        (SELECT COUNT(*) FROM public.scripts WHERE visibility = 'public') as public_scripts,
        (SELECT COUNT(DISTINCT unnest(tags)) FROM public.scripts WHERE public.can_view_script(auth.uid(), owner_id, visibility)) as total_tags;
END;
$$;

-- 7. COMENTÁRIOS E DOCUMENTAÇÃO
-- =============================================================================

COMMENT ON TABLE public.scripts IS 'Tabela para armazenar scripts de social selling com controle de acesso hierárquico';
COMMENT ON COLUMN public.scripts.owner_id IS 'ID do usuário que criou o script';
COMMENT ON COLUMN public.scripts.title IS 'Título/nome do script';
COMMENT ON COLUMN public.scripts.tags IS 'Array de tags para categorização';
COMMENT ON COLUMN public.scripts.content IS 'Conteúdo do script (suporta Markdown)';
COMMENT ON COLUMN public.scripts.visibility IS 'Nível de visibilidade: private (apenas dono/ancestrais), team (time), public (todos)';

COMMENT ON FUNCTION public.list_scripts IS 'Lista scripts com filtros de busca, tag e visibilidade';
COMMENT ON FUNCTION public.get_script IS 'Obtém detalhes de um script específico';
COMMENT ON FUNCTION public.create_script IS 'Cria um novo script';
COMMENT ON FUNCTION public.update_script IS 'Atualiza um script existente';
COMMENT ON FUNCTION public.delete_script IS 'Remove um script';
COMMENT ON FUNCTION public.get_scripts_stats IS 'Retorna estatísticas de scripts para o usuário atual';

-- 8. GRANTS DE PERMISSÃO
-- =============================================================================

-- Permitir que usuários autenticados usem as funções
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scripts TO authenticated;
GRANT USAGE ON TYPE script_visibility TO authenticated;

-- Permitir execução das funções
GRANT EXECUTE ON FUNCTION public.list_scripts TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_script TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_script TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_script TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_script TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_scripts_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_script TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_script TO authenticated;
