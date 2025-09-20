-- =============================================================================
-- FIX SCRIPTS BACKEND ERRORS - Correções dos Erros Identificados
-- =============================================================================
-- Este arquivo corrige os erros encontrados na integração de scripts:
-- 1. Coluna 'au.name' não existe - usar user_profiles
-- 2. Função agregada com unnest - corrigir sintaxe
-- =============================================================================

-- 1. CORRIGIR FUNÇÃO list_scripts
-- =============================================================================
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
        COALESCE(au.full_name, au.email) as owner_name,
        au.role as owner_role,
        s.created_at,
        s.updated_at
    FROM public.scripts s
    JOIN public.user_profiles au ON s.owner_id = au.id
    WHERE 
        (visibility_filter IS NULL OR s.visibility = visibility_filter)
        AND (search_term IS NULL OR (
            to_tsvector('portuguese', s.title || ' ' || s.content) @@ plainto_tsquery('portuguese', search_term)
        ))
        AND (tag_filter IS NULL OR tag_filter = ANY(s.tags))
    ORDER BY s.updated_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;

-- 2. CORRIGIR FUNÇÃO get_script
-- =============================================================================
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
        COALESCE(au.full_name, au.email) as owner_name,
        au.role as owner_role,
        s.created_at,
        s.updated_at
    FROM public.scripts s
    JOIN public.user_profiles au ON s.owner_id = au.id
    WHERE s.id = script_id;
END;
$$;

-- 3. CORRIGIR FUNÇÃO get_scripts_stats
-- =============================================================================
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
        (SELECT COUNT(DISTINCT tag) FROM public.scripts, unnest(tags) as tag WHERE public.can_view_script(auth.uid(), owner_id, visibility)) as total_tags;
END;
$$;

-- 4. VERIFICAÇÃO FINAL
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== CORREÇÕES APLICADAS COM SUCESSO ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Correções realizadas:';
    RAISE NOTICE '✓ Função list_scripts corrigida (user_profiles)';
    RAISE NOTICE '✓ Função get_script corrigida (user_profiles)';
    RAISE NOTICE '✓ Função get_scripts_stats corrigida (unnest)';
    RAISE NOTICE '✓ Uso de COALESCE para nome do usuário';
    RAISE NOTICE '';
    RAISE NOTICE 'Sistema de scripts pronto para uso!';
    RAISE NOTICE '';
END $$;
