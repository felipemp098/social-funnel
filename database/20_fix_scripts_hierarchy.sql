-- =============================================================================
-- FIX SCRIPTS HIERARCHY - Correção da Hierarquia de Usuários
-- =============================================================================
-- Este arquivo corrige o sistema de scripts para seguir a hierarquia de usuários:
-- - Público: Criador do script + criador do usuário (hierarquia)
-- - Privado: Apenas o criador do script
-- =============================================================================

-- 1. REMOVER ENUM 'team' E RECRIAR COM APENAS 'private' E 'public'
-- =============================================================================
-- Primeiro, vamos verificar se há scripts com visibility 'team' e convertê-los
UPDATE public.scripts 
SET visibility = 'public' 
WHERE visibility = 'team';

-- Remover o enum antigo e recriar
DROP TYPE IF EXISTS script_visibility CASCADE;

-- Criar novo enum com apenas private e public
CREATE TYPE script_visibility AS ENUM ('private', 'public');

-- Recriar a tabela scripts com o novo enum
ALTER TABLE public.scripts 
ALTER COLUMN visibility TYPE script_visibility 
USING visibility::text::script_visibility;

-- 2. ATUALIZAR FUNÇÃO can_view_script PARA HIERARQUIA
-- =============================================================================
CREATE OR REPLACE FUNCTION public.can_view_script(
    user_id UUID,
    script_owner_id UUID,
    script_visibility script_visibility
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Se é o próprio dono, sempre pode ver
    IF user_id = script_owner_id THEN
        RETURN TRUE;
    END IF;
    
    -- Se é privado, apenas o dono pode ver
    IF script_visibility = 'private' THEN
        RETURN FALSE;
    END IF;
    
    -- Se é público, verificar hierarquia (criador do usuário)
    IF script_visibility = 'public' THEN
        RETURN public.can_manage(user_id, script_owner_id);
    END IF;
    
    RETURN FALSE;
END;
$$;

-- 3. ATUALIZAR FUNÇÃO list_scripts
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
        public.can_view_script(auth.uid(), s.owner_id, s.visibility)
        AND (visibility_filter IS NULL OR s.visibility = visibility_filter)
        AND (search_term IS NULL OR (
            to_tsvector('portuguese', s.title || ' ' || s.content) @@ plainto_tsquery('portuguese', search_term)
        ))
        AND (tag_filter IS NULL OR tag_filter = ANY(s.tags))
    ORDER BY s.updated_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;

-- 4. ATUALIZAR FUNÇÃO get_script
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
    WHERE s.id = script_id
    AND public.can_view_script(auth.uid(), s.owner_id, s.visibility);
END;
$$;

-- 5. ATUALIZAR FUNÇÃO get_scripts_stats
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_scripts_stats()
RETURNS TABLE (
    total_scripts BIGINT,
    my_scripts BIGINT,
    public_scripts BIGINT,
    total_tags BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM public.scripts WHERE public.can_view_script(auth.uid(), owner_id, visibility)) as total_scripts,
        (SELECT COUNT(*) FROM public.scripts WHERE owner_id = auth.uid()) as my_scripts,
        (SELECT COUNT(*) FROM public.scripts WHERE visibility = 'public' AND public.can_view_script(auth.uid(), owner_id, visibility)) as public_scripts,
        (SELECT COUNT(DISTINCT tag) FROM public.scripts, unnest(tags) as tag WHERE public.can_view_script(auth.uid(), owner_id, visibility)) as total_tags;
END;
$$;

-- 6. ATUALIZAR RLS POLICIES
-- =============================================================================
-- Remover políticas antigas
DROP POLICY IF EXISTS "scripts_select_policy" ON public.scripts;
DROP POLICY IF EXISTS "scripts_insert_policy" ON public.scripts;
DROP POLICY IF EXISTS "scripts_update_policy" ON public.scripts;
DROP POLICY IF EXISTS "scripts_delete_policy" ON public.scripts;

-- Criar novas políticas baseadas na hierarquia
CREATE POLICY "scripts_select_policy" ON public.scripts
    FOR SELECT USING (public.can_view_script(auth.uid(), owner_id, visibility));

CREATE POLICY "scripts_insert_policy" ON public.scripts
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "scripts_update_policy" ON public.scripts
    FOR UPDATE USING (public.can_manage(auth.uid(), owner_id));

CREATE POLICY "scripts_delete_policy" ON public.scripts
    FOR DELETE USING (public.can_manage(auth.uid(), owner_id));

-- 7. VERIFICAÇÃO FINAL
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== HIERARQUIA DE SCRIPTS CORRIGIDA ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Mudanças aplicadas:';
    RAISE NOTICE '✓ Removido visibility "team"';
    RAISE NOTICE '✓ Mantido apenas "private" e "public"';
    RAISE NOTICE '✓ Público: Criador + Hierarquia (can_manage)';
    RAISE NOTICE '✓ Privado: Apenas criador';
    RAISE NOTICE '✓ RLS policies atualizadas';
    RAISE NOTICE '✓ Funções atualizadas para hierarquia';
    RAISE NOTICE '';
    RAISE NOTICE 'Sistema de scripts agora segue a hierarquia correta!';
    RAISE NOTICE '';
END $$;
