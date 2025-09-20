-- =============================================================================
-- FASE 4: TABELAS DE DOMÍNIO
-- Clientes, prospects e outras entidades com owner_id
-- =============================================================================

-- Habilitar extensão necessária para GIST com UUID
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- -----------------------------------------------------------------------------
-- 1. TABELA CLIENTS (Clientes do usuário)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  name text NOT NULL,
  segment text,
  revenue_range text, -- Faixa de faturamento
  temperature text CHECK (temperature IN ('hot', 'warm', 'cold')),
  notes text,
  active_prospects integer DEFAULT 0,
  conversion_rate decimal(5,2) DEFAULT 0.0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Comentários para documentação
COMMENT ON TABLE public.clients IS 'Clientes gerenciados pelos usuários';
COMMENT ON COLUMN public.clients.owner_id IS 'Usuário proprietário do cliente';
COMMENT ON COLUMN public.clients.temperature IS 'Temperatura do lead: hot, warm, cold';
COMMENT ON COLUMN public.clients.conversion_rate IS 'Taxa de conversão em porcentagem';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_clients_owner_id ON public.clients(owner_id);
CREATE INDEX IF NOT EXISTS idx_clients_temperature ON public.clients(temperature);
CREATE INDEX IF NOT EXISTS idx_clients_segment ON public.clients(segment);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 2. TABELA PROSPECTS (Prospecções individuais)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prospects (
  id bigserial PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  contact_name text NOT NULL,
  contact_email text,
  contact_phone text,
  company text,
  position text,
  source text CHECK (source IN ('inbound', 'outbound')),
  status text CHECK (status IN ('new', 'contacted', 'responded', 'meeting_scheduled', 'meeting_done', 'proposal_sent', 'won', 'lost', 'follow_up')) DEFAULT 'new',
  temperature text CHECK (temperature IN ('hot', 'warm', 'cold')) DEFAULT 'warm',
  notes text,
  last_contact_date timestamptz,
  next_follow_up timestamptz,
  deal_value decimal(12,2),
  probability integer CHECK (probability >= 0 AND probability <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Comentários para documentação
COMMENT ON TABLE public.prospects IS 'Prospecções individuais por usuário';
COMMENT ON COLUMN public.prospects.owner_id IS 'Usuário proprietário da prospecção';
COMMENT ON COLUMN public.prospects.client_id IS 'Cliente associado (opcional)';
COMMENT ON COLUMN public.prospects.source IS 'Origem: inbound ou outbound';
COMMENT ON COLUMN public.prospects.status IS 'Status atual da prospecção';
COMMENT ON COLUMN public.prospects.probability IS 'Probabilidade de fechamento (0-100%)';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_prospects_owner_id ON public.prospects(owner_id);
CREATE INDEX IF NOT EXISTS idx_prospects_client_id ON public.prospects(client_id);
CREATE INDEX IF NOT EXISTS idx_prospects_source ON public.prospects(source);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON public.prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_next_follow_up ON public.prospects(next_follow_up);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_prospects_updated_at ON public.prospects;
CREATE TRIGGER update_prospects_updated_at
  BEFORE UPDATE ON public.prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 3. TABELA GOALS (Metas por usuário e cliente)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  target_responses integer DEFAULT 0,
  target_meetings integer DEFAULT 0,
  target_sales integer DEFAULT 0,
  target_revenue decimal(12,2) DEFAULT 0,
  actual_responses integer DEFAULT 0,
  actual_meetings integer DEFAULT 0,
  actual_sales integer DEFAULT 0,
  actual_revenue decimal(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Garantir que não haja períodos sobrepostos para o mesmo owner/client
  CONSTRAINT goals_no_overlap EXCLUDE USING gist (
    owner_id WITH =,
    COALESCE(client_id, '00000000-0000-0000-0000-000000000000'::uuid) WITH =,
    daterange(period_start, period_end, '[]') WITH &&
  )
);

-- Comentários para documentação
COMMENT ON TABLE public.goals IS 'Metas por usuário e período';
COMMENT ON COLUMN public.goals.client_id IS 'Cliente específico (NULL = meta geral do usuário)';
COMMENT ON CONSTRAINT goals_no_overlap ON public.goals IS 'Previne sobreposição de períodos para mesmo owner/client';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_goals_owner_id ON public.goals(owner_id);
CREATE INDEX IF NOT EXISTS idx_goals_client_id ON public.goals(client_id);
CREATE INDEX IF NOT EXISTS idx_goals_period ON public.goals(period_start, period_end);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_goals_updated_at ON public.goals;
CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- FIM DA FASE 4
-- =============================================================================
