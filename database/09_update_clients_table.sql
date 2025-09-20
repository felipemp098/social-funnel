-- =============================================================================
-- MIGRAÇÃO: Atualização da tabela clients para suporte a planilhas e metas
-- Data: 2025-09-20
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ATUALIZAR TABELA CLIENTS COM NOVOS CAMPOS
-- -----------------------------------------------------------------------------

-- Adicionar novos campos necessários
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS budget text,
ADD COLUMN IF NOT EXISTS goals jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS sheet_url text,
ADD COLUMN IF NOT EXISTS sheet_tab text,
ADD COLUMN IF NOT EXISTS sheet_mapping jsonb,
ADD COLUMN IF NOT EXISTS sheet_status text CHECK (sheet_status IN ('not_linked', 'linked_pending', 'linked_warn', 'linked_ok')) DEFAULT 'not_linked';

-- Atualizar constraint de temperature para usar valores em português
ALTER TABLE public.clients 
DROP CONSTRAINT IF EXISTS clients_temperature_check;

ALTER TABLE public.clients 
ADD CONSTRAINT clients_temperature_check 
CHECK (temperature IN ('frio', 'morno', 'quente'));

-- Renomear revenue_range para budget para consistência
ALTER TABLE public.clients 
RENAME COLUMN revenue_range TO budget_old;

-- Migrar dados existentes se houver
UPDATE public.clients 
SET budget = budget_old 
WHERE budget IS NULL AND budget_old IS NOT NULL;

-- Remover coluna antiga após migração
ALTER TABLE public.clients 
DROP COLUMN IF EXISTS budget_old;

-- Remover colunas que não são mais necessárias na nova especificação
ALTER TABLE public.clients 
DROP COLUMN IF EXISTS active_prospects,
DROP COLUMN IF EXISTS conversion_rate;

-- -----------------------------------------------------------------------------
-- 2. ATUALIZAR COMENTÁRIOS E DOCUMENTAÇÃO
-- -----------------------------------------------------------------------------

COMMENT ON COLUMN public.clients.budget IS 'Faixa de faturamento (ex: "50-100k")';
COMMENT ON COLUMN public.clients.goals IS 'Metas em formato JSON (respostas, reuniões, vendas, faturamento)';
COMMENT ON COLUMN public.clients.sheet_url IS 'URL da planilha Google Sheets vinculada';
COMMENT ON COLUMN public.clients.sheet_tab IS 'Nome da aba da planilha vinculada';
COMMENT ON COLUMN public.clients.sheet_mapping IS 'Mapeamento de colunas da planilha em formato JSON';
COMMENT ON COLUMN public.clients.sheet_status IS 'Status da conexão com a planilha';
COMMENT ON COLUMN public.clients.temperature IS 'Temperatura do lead: frio, morno, quente';

-- -----------------------------------------------------------------------------
-- 3. ADICIONAR ÍNDICES PARA PERFORMANCE
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_clients_sheet_status ON public.clients(sheet_status);
CREATE INDEX IF NOT EXISTS idx_clients_temperature_new ON public.clients(temperature);

-- -----------------------------------------------------------------------------
-- 4. FUNÇÃO PARA VALIDAR ESTRUTURA DE GOALS
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_client_goals(goals_data jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Se goals é null ou vazio, é válido
  IF goals_data IS NULL OR goals_data = '{}'::jsonb THEN
    RETURN true;
  END IF;
  
  -- Verificar se contém apenas campos válidos e tipos corretos
  IF NOT (
    (goals_data ? 'respostas' AND jsonb_typeof(goals_data->'respostas') = 'number') OR NOT (goals_data ? 'respostas')
  ) THEN
    RETURN false;
  END IF;
  
  IF NOT (
    (goals_data ? 'reunioes' AND jsonb_typeof(goals_data->'reunioes') = 'number') OR NOT (goals_data ? 'reunioes')
  ) THEN
    RETURN false;
  END IF;
  
  IF NOT (
    (goals_data ? 'vendas' AND jsonb_typeof(goals_data->'vendas') = 'number') OR NOT (goals_data ? 'vendas')
  ) THEN
    RETURN false;
  END IF;
  
  IF NOT (
    (goals_data ? 'faturamento' AND jsonb_typeof(goals_data->'faturamento') = 'number') OR NOT (goals_data ? 'faturamento')
  ) THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Adicionar constraint para validar estrutura de goals
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'clients_goals_valid') THEN
    ALTER TABLE public.clients ADD CONSTRAINT clients_goals_valid CHECK (public.validate_client_goals(goals));
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. FUNÇÃO PARA VALIDAR URL DE PLANILHA GOOGLE SHEETS
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_google_sheets_url(url text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Se URL é null, é válido (planilha não vinculada)
  IF url IS NULL THEN
    RETURN true;
  END IF;
  
  -- Verificar se é uma URL do Google Sheets
  RETURN url ~ '^https://docs\.google\.com/spreadsheets/d/[a-zA-Z0-9_-]+';
END;
$$;

-- Adicionar constraint para validar URL da planilha
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'clients_sheet_url_valid') THEN
    ALTER TABLE public.clients ADD CONSTRAINT clients_sheet_url_valid CHECK (public.validate_google_sheets_url(sheet_url));
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. TRIGGER PARA ATUALIZAR SHEET_STATUS AUTOMATICAMENTE
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_client_sheet_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Se sheet_url foi removida, definir status como not_linked
  IF NEW.sheet_url IS NULL THEN
    NEW.sheet_status = 'not_linked';
    NEW.sheet_tab = NULL;
    NEW.sheet_mapping = NULL;
  -- Se sheet_url foi adicionada/alterada, definir como linked_pending
  ELSIF OLD.sheet_url IS DISTINCT FROM NEW.sheet_url THEN
    NEW.sheet_status = 'linked_pending';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Aplicar trigger
DROP TRIGGER IF EXISTS update_client_sheet_status ON public.clients;
CREATE TRIGGER update_client_sheet_status
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_client_sheet_status();

-- =============================================================================
-- FIM DA MIGRAÇÃO
-- =============================================================================
