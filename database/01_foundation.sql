-- =============================================================================
-- FASE 1: FUNDAÇÃO DO BANCO DE DADOS
-- Hierarquia de Acesso com Row-Level Security
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CRIAÇÃO DO ENUM PARA PAPÉIS DE USUÁRIO
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'user');
EXCEPTION 
  WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 2. TABELA APP_USERS (Espelha auth.users + metadados de hierarquia)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role public.user_role NOT NULL DEFAULT 'user',
  created_by uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Comentários para documentação
COMMENT ON TABLE public.app_users IS 'Metadados de perfil e hierarquia de usuários';
COMMENT ON COLUMN public.app_users.id IS 'Referência direta ao auth.users.id';
COMMENT ON COLUMN public.app_users.created_by IS 'UUID do usuário que criou este usuário (hierarquia)';
COMMENT ON COLUMN public.app_users.role IS 'Papel do usuário: admin, manager ou user';

-- -----------------------------------------------------------------------------
-- 3. TRIGGER PARA ATUALIZAR updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_app_users_updated_at ON public.app_users;
CREATE TRIGGER update_app_users_updated_at
  BEFORE UPDATE ON public.app_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 4. TRIGGER PARA GARANTIR IMUTABILIDADE DO created_by
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_created_by_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'created_by é imutável após criação';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_prevent_created_by_update ON public.app_users;
CREATE TRIGGER trg_prevent_created_by_update
  BEFORE UPDATE ON public.app_users
  FOR EACH ROW 
  EXECUTE FUNCTION public.prevent_created_by_update();

-- -----------------------------------------------------------------------------
-- 5. TRIGGER PARA PREVENIR ALTERAÇÃO DE ROLE POR NÃO-ADMINS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_role_change_by_non_admin()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Permite alteração se for INSERT
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- Permite alteração se o role não mudou
  IF NEW.role = OLD.role THEN
    RETURN NEW;
  END IF;
  
  -- Verifica se o usuário atual é admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar papéis de usuário';
  END IF;
  
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_prevent_role_change_by_non_admin ON public.app_users;
CREATE TRIGGER trg_prevent_role_change_by_non_admin
  BEFORE INSERT OR UPDATE ON public.app_users
  FOR EACH ROW 
  EXECUTE FUNCTION public.prevent_role_change_by_non_admin();

-- -----------------------------------------------------------------------------
-- 6. ÍNDICES PARA PERFORMANCE
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_app_users_created_by ON public.app_users(created_by);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON public.app_users(role);
CREATE INDEX IF NOT EXISTS idx_app_users_email ON public.app_users(email);

-- -----------------------------------------------------------------------------
-- 7. HABILITAR ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS app_users_select ON public.app_users;
DROP POLICY IF EXISTS app_users_insert_admin ON public.app_users;
DROP POLICY IF EXISTS app_users_insert_manager ON public.app_users;
DROP POLICY IF EXISTS app_users_update_self ON public.app_users;
DROP POLICY IF EXISTS app_users_update_admin ON public.app_users;
DROP POLICY IF EXISTS app_users_delete_admin ON public.app_users;

-- Nota: As políticas RLS serão criadas após as funções de autorização
-- Veja o arquivo 02_authorization_functions.sql

-- =============================================================================
-- FIM DA FASE 1
-- =============================================================================
