-- =============================================================================
-- MIGRAÇÃO: Adicionar campo first_login à tabela app_users
-- Data: 2025-09-20
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ADICIONAR CAMPO first_login
-- -----------------------------------------------------------------------------

-- Adicionar coluna first_login à tabela app_users
ALTER TABLE public.app_users 
ADD COLUMN IF NOT EXISTS first_login boolean DEFAULT true;

-- Comentário para documentação
COMMENT ON COLUMN public.app_users.first_login IS 'Indica se é o primeiro login do usuário (para definir senha)';

-- -----------------------------------------------------------------------------
-- 2. ATUALIZAR USUÁRIOS EXISTENTES
-- -----------------------------------------------------------------------------

-- Para usuários que já existem, definir first_login como false
-- (assumindo que já passaram pelo setup inicial)
UPDATE public.app_users 
SET first_login = false 
WHERE first_login IS NULL OR first_login = true;

-- Para admins criados manualmente, garantir que first_login seja false
UPDATE public.app_users 
SET first_login = false 
WHERE role = 'admin' AND created_by IS NULL;

-- -----------------------------------------------------------------------------
-- 3. FUNÇÃO PARA GERENCIAR first_login AUTOMATICAMENTE
-- -----------------------------------------------------------------------------

-- Trigger para definir first_login baseado no contexto
CREATE OR REPLACE FUNCTION public.handle_first_login_flag()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Se é INSERT e não foi especificado first_login
  IF TG_OP = 'INSERT' AND NEW.first_login IS NULL THEN
    -- Admin criado sem created_by = não é primeiro login
    IF NEW.role = 'admin' AND NEW.created_by IS NULL THEN
      NEW.first_login = false;
    -- Usuários criados por outros = primeiro login
    ELSE
      NEW.first_login = true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Aplicar trigger
DROP TRIGGER IF EXISTS handle_first_login_flag ON public.app_users;
CREATE TRIGGER handle_first_login_flag
  BEFORE INSERT ON public.app_users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_first_login_flag();

-- -----------------------------------------------------------------------------
-- 4. FUNÇÃO PARA MARCAR PRIMEIRO LOGIN COMO CONCLUÍDO
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.complete_first_login(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atualizar first_login para false
  UPDATE public.app_users
  SET 
    first_login = false,
    updated_at = now()
  WHERE id = user_id;
  
  -- Verificar se a atualização foi bem-sucedida
  IF FOUND THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Comentário para documentação
COMMENT ON FUNCTION public.complete_first_login IS 'Marca o primeiro login como concluído para um usuário';

-- =============================================================================
-- FIM DA MIGRAÇÃO
-- =============================================================================
