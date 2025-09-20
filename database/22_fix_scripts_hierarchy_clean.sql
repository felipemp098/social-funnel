-- =============================================================================
-- FIX SCRIPTS HIERARCHY CLEAN - Correção Limpa da Hierarquia
-- =============================================================================
-- Este arquivo remove todas as funções existentes e cria as novas com hierarquia correta
-- =============================================================================

-- 1. REMOVER POLÍTICAS E FUNÇÕES EXISTENTES
-- =============================================================================
-- Remover políticas primeiro (elas dependem das funções)
DROP POLICY IF EXISTS "scripts_select_policy" ON public.scripts;
DROP POLICY IF EXISTS "scripts_insert_policy" ON public.scripts;
DROP POLICY IF EXISTS "scripts_update_policy" ON public.scripts;
DROP POLICY IF EXISTS "scripts_delete_policy" ON public.scripts;

-- Agora remover as funções
DROP FUNCTION IF EXISTS public.can_view_script(uuid, uuid, script_visibility);
DROP FUNCTION IF EXISTS public.can_view_script(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.can_manage_script(uuid, uuid);
DROP FUNCTION IF EXISTS public.list_scripts(text, text, script_visibility, integer, integer);
DROP FUNCTION IF EXISTS public.get_script(uuid);
DROP FUNCTION IF EXISTS public.get_scripts_stats();

-- 2. CRIAR FUNÇÃO can_view_script PARA HIERARQUIA CORRETA
-- =============================================================================
CREATE OR REPLACE FUNCTION public.can_view_script(
    user_id UUID,
    script_owner_id UUID,
    script_visibility script_visibility
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role_val user_role;
    script_owner_role_val user_role;
    user_creator_id UUID;
    script_owner_creator_id UUID;
BEGIN
    -- Se é o próprio dono, sempre pode ver
    IF user_id = script_owner_id THEN
        RETURN TRUE;
    END IF;
    
    -- Buscar informações do usuário atual
    SELECT role, created_by INTO user_role_val, user_creator_id
    FROM public.app_users 
    WHERE id = user_id;
    
    -- Buscar informações do dono do script
    SELECT role, created_by INTO script_owner_role_val, script_owner_creator_id
    FROM public.app_users 
    WHERE id = script_owner_id;
    
    -- Se não encontrou os dados, negar acesso
    IF user_role_val IS NULL OR script_owner_role_val IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- ADMIN: pode ver todos os scripts (privados e públicos)
    IF user_role_val = 'admin' THEN
        RETURN TRUE;
    END IF;
    
    -- MANAGER: pode ver seus próprios + dos usuários que ele criou
    IF user_role_val = 'manager' THEN
        -- Se o script é do manager ou de usuário criado por ele
        IF script_owner_id = user_id OR script_owner_creator_id = user_id THEN
            RETURN TRUE;
        END IF;
    END IF;
    
    -- USER: pode ver apenas seus próprios + scripts públicos do seu criador
    IF user_role_val = 'user' THEN
        -- Se é o próprio script
        IF script_owner_id = user_id THEN
            RETURN TRUE;
        END IF;
        
        -- Se o script é público e o dono do script é o criador do usuário
        IF script_visibility = 'public' AND script_owner_id = user_creator_id THEN
            RETURN TRUE;
        END IF;
    END IF;
    
    RETURN FALSE;
END;
$$;

-- 3. CRIAR FUNÇÃO can_manage_script PARA EDIÇÃO/EXCLUSÃO
-- =============================================================================
CREATE OR REPLACE FUNCTION public.can_manage_script(
    user_id UUID,
    script_owner_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role_val user_role;
    script_owner_role_val user_role;
    user_creator_id UUID;
    script_owner_creator_id UUID;
BEGIN
    -- Se é o próprio dono, sempre pode gerenciar
    IF user_id = script_owner_id THEN
        RETURN TRUE;
    END IF;
    
    -- Buscar informações do usuário atual
    SELECT role, created_by INTO user_role_val, user_creator_id
    FROM public.app_users 
    WHERE id = user_id;
    
    -- Buscar informações do dono do script
    SELECT role, created_by INTO script_owner_role_val, script_owner_creator_id
    FROM public.app_users 
    WHERE id = script_owner_id;
    
    -- Se não encontrou os dados, negar acesso
    IF user_role_val IS NULL OR script_owner_role_val IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- ADMIN: pode gerenciar todos os scripts
    IF user_role_val = 'admin' THEN
        RETURN TRUE;
    END IF;
    
    -- MANAGER: pode gerenciar seus próprios + dos usuários que ele criou
    IF user_role_val = 'manager' THEN
        IF script_owner_creator_id = user_id THEN
            RETURN TRUE;
        END IF;
    END IF;
    
    -- USER: pode gerenciar apenas seus próprios scripts
    -- (não pode gerenciar scripts de outros usuários)
    
    RETURN FALSE;
END;
$$;

-- 4. CRIAR FUNÇÃO list_scripts
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

-- 5. CRIAR FUNÇÃO get_script
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

-- 6. CRIAR FUNÇÃO get_scripts_stats
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

-- 7. CRIAR RLS POLICIES
-- =============================================================================
-- Criar novas políticas baseadas na hierarquia correta
CREATE POLICY "scripts_select_policy" ON public.scripts
    FOR SELECT USING (public.can_view_script(auth.uid(), owner_id, visibility));

CREATE POLICY "scripts_insert_policy" ON public.scripts
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "scripts_update_policy" ON public.scripts
    FOR UPDATE USING (public.can_manage_script(auth.uid(), owner_id));

CREATE POLICY "scripts_delete_policy" ON public.scripts
    FOR DELETE USING (public.can_manage_script(auth.uid(), owner_id));

-- 8. VERIFICAÇÃO FINAL
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== HIERARQUIA DE SCRIPTS CORRIGIDA DEFINITIVAMENTE ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Regras implementadas:';
    RAISE NOTICE '✓ Admin: pode ver TODOS os scripts (privados e públicos)';
    RAISE NOTICE '✓ Manager: pode ver seus próprios + dos usuários que criou';
    RAISE NOTICE '✓ User: pode ver apenas seus próprios + públicos do seu criador';
    RAISE NOTICE '';
    RAISE NOTICE 'Scripts privados:';
    RAISE NOTICE '  - Admin: vê todos';
    RAISE NOTICE '  - Manager: vê apenas seus próprios + dos usuários que criou';
    RAISE NOTICE '  - User: vê apenas seus próprios';
    RAISE NOTICE '';
    RAISE NOTICE 'Scripts públicos:';
    RAISE NOTICE '  - Admin: vê todos';
    RAISE NOTICE '  - Manager: vê todos os seus + dos usuários que criou';
    RAISE NOTICE '  - User: vê apenas os do seu criador';
    RAISE NOTICE '';
    RAISE NOTICE 'Sistema de scripts agora segue a hierarquia correta!';
    RAISE NOTICE '';
END $$;
