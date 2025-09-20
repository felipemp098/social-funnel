-- =============================================================================
-- FASE 2: FUNÇÕES DE AUTORIZAÇÃO
-- Sistema de hierarquia transitiva com RLS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. FUNÇÃO: is_admin(uuid) → boolean
-- Verifica se um usuário tem papel de administrador
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.id = uid AND au.role = 'admin'
  );
$$;

-- Comentário para documentação
COMMENT ON FUNCTION public.is_admin(uuid) IS 'Verifica se o usuário tem papel de administrador';

-- -----------------------------------------------------------------------------
-- 2. FUNÇÃO: is_ancestor(uuid, uuid) → boolean
-- Verifica se 'ancestor' é ancestral (em qualquer nível) de 'descendant'
-- Usa recursão via CTE para percorrer a cadeia created_by
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_ancestor(ancestor uuid, descendant uuid)
RETURNS boolean 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
AS $$
  WITH RECURSIVE chain AS (
    -- Caso base: começar com o descendant
    SELECT au.id, au.created_by
    FROM public.app_users au
    WHERE au.id = descendant
    
    UNION ALL
    
    -- Caso recursivo: subir na hierarquia
    SELECT parent.id, parent.created_by
    FROM public.app_users parent
    JOIN chain c ON c.created_by = parent.id
  )
  SELECT EXISTS (
    SELECT 1 FROM chain
    WHERE id = ancestor AND ancestor <> descendant
  );
$$;

-- Comentário para documentação
COMMENT ON FUNCTION public.is_ancestor(uuid, uuid) IS 'Verifica se o primeiro usuário é ancestral do segundo na hierarquia (transitivo)';

-- -----------------------------------------------------------------------------
-- 3. FUNÇÃO: can_manage(uuid, uuid) → boolean
-- Verifica se 'actor' pode gerenciar recursos de 'owner'
-- Regras: admin ∨ self ∨ ancestor
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_manage(actor uuid, owner uuid)
RETURNS boolean 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
AS $$
  SELECT
    public.is_admin(actor)
    OR actor = owner
    OR public.is_ancestor(actor, owner);
$$;

-- Comentário para documentação
COMMENT ON FUNCTION public.can_manage(uuid, uuid) IS 'Verifica se o actor pode gerenciar recursos do owner (admin, self ou ancestral)';

-- -----------------------------------------------------------------------------
-- 4. FUNÇÃO: get_user_descendants(uuid) → TABLE
-- Retorna todos os descendentes diretos e indiretos de um usuário
-- Útil para queries de listagem
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_descendants(user_id uuid)
RETURNS TABLE(id uuid, email text, role public.user_role, created_by uuid, level integer) 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
AS $$
  WITH RECURSIVE descendants AS (
    -- Caso base: usuários criados diretamente pelo user_id
    SELECT au.id, au.email, au.role, au.created_by, 1 as level
    FROM public.app_users au
    WHERE au.created_by = user_id
    
    UNION ALL
    
    -- Caso recursivo: descendentes dos descendentes
    SELECT au.id, au.email, au.role, au.created_by, d.level + 1
    FROM public.app_users au
    JOIN descendants d ON au.created_by = d.id
  )
  SELECT * FROM descendants;
$$;

-- Comentário para documentação
COMMENT ON FUNCTION public.get_user_descendants(uuid) IS 'Retorna todos os descendentes de um usuário com nível hierárquico';

-- -----------------------------------------------------------------------------
-- 5. FUNÇÃO: get_user_hierarchy_path(uuid) → TEXT
-- Retorna o caminho hierárquico de um usuário (para debug/audit)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_hierarchy_path(user_id uuid)
RETURNS text 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
AS $$
  WITH RECURSIVE hierarchy AS (
    -- Caso base: o próprio usuário
    SELECT au.id, au.email, au.created_by, au.email as path, 0 as level
    FROM public.app_users au
    WHERE au.id = user_id
    
    UNION ALL
    
    -- Caso recursivo: subir na hierarquia
    SELECT parent.id, parent.email, parent.created_by, 
           parent.email || ' → ' || h.path as path, h.level + 1
    FROM public.app_users parent
    JOIN hierarchy h ON h.created_by = parent.id
  )
  SELECT path FROM hierarchy ORDER BY level DESC LIMIT 1;
$$;

-- Comentário para documentação
COMMENT ON FUNCTION public.get_user_hierarchy_path(uuid) IS 'Retorna o caminho hierárquico completo de um usuário';

-- -----------------------------------------------------------------------------
-- 6. FUNÇÃO: validate_user_creation(uuid, public.user_role, uuid) → boolean
-- Valida se um usuário pode criar outro usuário com determinado papel
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_user_creation(
  creator_id uuid, 
  new_role public.user_role, 
  new_created_by uuid
)
RETURNS boolean 
LANGUAGE plpgsql 
STABLE 
SECURITY DEFINER
AS $$
DECLARE
  creator_role public.user_role;
BEGIN
  -- Buscar papel do criador
  SELECT role INTO creator_role 
  FROM public.app_users 
  WHERE id = creator_id;
  
  -- Se não encontrou o criador, não pode criar
  IF creator_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Admin pode criar qualquer papel
  IF creator_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Manager pode criar apenas 'user' com created_by = ele mesmo
  IF creator_role = 'manager' THEN
    RETURN new_role = 'user' AND new_created_by = creator_id;
  END IF;
  
  -- User não pode criar ninguém
  RETURN false;
END $$;

-- Comentário para documentação
COMMENT ON FUNCTION public.validate_user_creation(uuid, public.user_role, uuid) IS 'Valida regras de criação de usuários conforme hierarquia';

-- =============================================================================
-- FIM DA FASE 2
-- =============================================================================
