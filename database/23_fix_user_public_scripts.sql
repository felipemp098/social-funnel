-- =============================================================================
-- FIX USER PUBLIC SCRIPTS - Correção da Visibilidade de Scripts Públicos
-- =============================================================================
-- Este arquivo corrige a lógica para que usuários possam ver scripts públicos
-- do seu criador (manager/admin)
-- =============================================================================

-- 1. CORRIGIR FUNÇÃO can_view_script
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

-- 2. VERIFICAÇÃO FINAL
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== CORREÇÃO DE SCRIPTS PÚBLICOS APLICADA ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Correção aplicada:';
    RAISE NOTICE '✓ USER agora pode ver scripts públicos do seu criador';
    RAISE NOTICE '✓ Lógica corrigida: script_owner_id = user_creator_id';
    RAISE NOTICE '';
    RAISE NOTICE 'Cenário de teste:';
    RAISE NOTICE '- Manager criou script público';
    RAISE NOTICE '- User (criado pelo Manager) pode ver o script';
    RAISE NOTICE '';
    RAISE NOTICE 'Sistema corrigido!';
    RAISE NOTICE '';
END $$;
