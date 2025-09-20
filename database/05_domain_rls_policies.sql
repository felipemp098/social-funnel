-- =============================================================================
-- FASE 5: POLÍTICAS RLS PARA TABELAS DE DOMÍNIO
-- Aplicação da função can_manage() em todas as tabelas de negócio
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. HABILITAR RLS NAS TABELAS DE DOMÍNIO
-- -----------------------------------------------------------------------------
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 2. POLÍTICAS RLS PARA CLIENTS
-- -----------------------------------------------------------------------------

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS clients_select ON public.clients;
DROP POLICY IF EXISTS clients_insert ON public.clients;
DROP POLICY IF EXISTS clients_update ON public.clients;
DROP POLICY IF EXISTS clients_delete ON public.clients;

-- SELECT: Pode ver clientes que consegue gerenciar
CREATE POLICY clients_select ON public.clients
FOR SELECT 
TO authenticated
USING (public.can_manage(auth.uid(), owner_id));

-- INSERT: Pode criar cliente para si ou para descendente
CREATE POLICY clients_insert ON public.clients
FOR INSERT 
TO authenticated
WITH CHECK (public.can_manage(auth.uid(), owner_id));

-- UPDATE: Pode editar clientes que consegue gerenciar
CREATE POLICY clients_update ON public.clients
FOR UPDATE 
TO authenticated
USING (public.can_manage(auth.uid(), owner_id))
WITH CHECK (public.can_manage(auth.uid(), owner_id));

-- DELETE: Pode deletar clientes que consegue gerenciar
CREATE POLICY clients_delete ON public.clients
FOR DELETE 
TO authenticated
USING (public.can_manage(auth.uid(), owner_id));

-- -----------------------------------------------------------------------------
-- 3. POLÍTICAS RLS PARA PROSPECTS
-- -----------------------------------------------------------------------------

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS prospects_select ON public.prospects;
DROP POLICY IF EXISTS prospects_insert ON public.prospects;
DROP POLICY IF EXISTS prospects_update ON public.prospects;
DROP POLICY IF EXISTS prospects_delete ON public.prospects;

-- SELECT: Pode ver prospects que consegue gerenciar
CREATE POLICY prospects_select ON public.prospects
FOR SELECT 
TO authenticated
USING (public.can_manage(auth.uid(), owner_id));

-- INSERT: Pode criar prospect para si ou para descendente
CREATE POLICY prospects_insert ON public.prospects
FOR INSERT 
TO authenticated
WITH CHECK (
  public.can_manage(auth.uid(), owner_id)
  AND (
    client_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM public.clients c 
      WHERE c.id = client_id 
      AND public.can_manage(auth.uid(), c.owner_id)
    )
  )
);

-- UPDATE: Pode editar prospects que consegue gerenciar
CREATE POLICY prospects_update ON public.prospects
FOR UPDATE 
TO authenticated
USING (public.can_manage(auth.uid(), owner_id))
WITH CHECK (
  public.can_manage(auth.uid(), owner_id)
  AND (
    client_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM public.clients c 
      WHERE c.id = client_id 
      AND public.can_manage(auth.uid(), c.owner_id)
    )
  )
);

-- DELETE: Pode deletar prospects que consegue gerenciar
CREATE POLICY prospects_delete ON public.prospects
FOR DELETE 
TO authenticated
USING (public.can_manage(auth.uid(), owner_id));

-- -----------------------------------------------------------------------------
-- 4. POLÍTICAS RLS PARA GOALS
-- -----------------------------------------------------------------------------

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS goals_select ON public.goals;
DROP POLICY IF EXISTS goals_insert ON public.goals;
DROP POLICY IF EXISTS goals_update ON public.goals;
DROP POLICY IF EXISTS goals_delete ON public.goals;

-- SELECT: Pode ver metas que consegue gerenciar
CREATE POLICY goals_select ON public.goals
FOR SELECT 
TO authenticated
USING (public.can_manage(auth.uid(), owner_id));

-- INSERT: Pode criar meta para si ou para descendente
CREATE POLICY goals_insert ON public.goals
FOR INSERT 
TO authenticated
WITH CHECK (
  public.can_manage(auth.uid(), owner_id)
  AND (
    client_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM public.clients c 
      WHERE c.id = client_id 
      AND public.can_manage(auth.uid(), c.owner_id)
    )
  )
);

-- UPDATE: Pode editar metas que consegue gerenciar
CREATE POLICY goals_update ON public.goals
FOR UPDATE 
TO authenticated
USING (public.can_manage(auth.uid(), owner_id))
WITH CHECK (
  public.can_manage(auth.uid(), owner_id)
  AND (
    client_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM public.clients c 
      WHERE c.id = client_id 
      AND public.can_manage(auth.uid(), c.owner_id)
    )
  )
);

-- DELETE: Pode deletar metas que consegue gerenciar
CREATE POLICY goals_delete ON public.goals
FOR DELETE 
TO authenticated
USING (public.can_manage(auth.uid(), owner_id));

-- -----------------------------------------------------------------------------
-- 5. VIEWS ÚTEIS PARA CONSULTAS OTIMIZADAS
-- -----------------------------------------------------------------------------

-- View com dados agregados de prospects por usuário
CREATE OR REPLACE VIEW public.user_prospect_stats AS
SELECT 
  p.owner_id,
  u.email as owner_email,
  u.role as owner_role,
  COUNT(*) as total_prospects,
  COUNT(*) FILTER (WHERE p.source = 'inbound') as inbound_prospects,
  COUNT(*) FILTER (WHERE p.source = 'outbound') as outbound_prospects,
  COUNT(*) FILTER (WHERE p.status = 'won') as won_prospects,
  COUNT(*) FILTER (WHERE p.status = 'lost') as lost_prospects,
  AVG(p.deal_value) as avg_deal_value,
  SUM(p.deal_value) FILTER (WHERE p.status = 'won') as total_revenue
FROM public.prospects p
JOIN public.app_users u ON p.owner_id = u.id
GROUP BY p.owner_id, u.email, u.role;

-- View com hierarquia de usuários e seus stats
CREATE OR REPLACE VIEW public.user_hierarchy_stats AS
WITH RECURSIVE hierarchy AS (
  -- Usuários raiz (admins e usuários sem criador)
  SELECT 
    u.id, u.email, u.role, u.created_by,
    u.email as path,
    0 as level,
    ARRAY[u.id] as ancestors
  FROM public.app_users u
  WHERE u.created_by IS NULL
  
  UNION ALL
  
  -- Descendentes
  SELECT 
    u.id, u.email, u.role, u.created_by,
    h.path || ' → ' || u.email as path,
    h.level + 1,
    h.ancestors || u.id
  FROM public.app_users u
  JOIN hierarchy h ON u.created_by = h.id
)
SELECT 
  h.*,
  COALESCE(s.total_prospects, 0) as total_prospects,
  COALESCE(s.total_revenue, 0) as total_revenue
FROM hierarchy h
LEFT JOIN public.user_prospect_stats s ON h.id = s.owner_id
ORDER BY h.level, h.email;

-- RLS para as views (herdam das tabelas base)
ALTER VIEW public.user_prospect_stats SET (security_barrier = true);
ALTER VIEW public.user_hierarchy_stats SET (security_barrier = true);

-- =============================================================================
-- FIM DA FASE 5
-- =============================================================================
