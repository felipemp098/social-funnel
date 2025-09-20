-- =============================================================================
-- CORREÇÃO DO LOOP INFINITO APÓS ATUALIZAÇÕES
-- Problema: Triggers causando loops entre auth.users e profiles
-- =============================================================================

-- EXECUTE ESTE SCRIPT NO SUPABASE DASHBOARD - SQL EDITOR

-- -----------------------------------------------------------------------------
-- OPÇÃO 1: REMOVER O TRIGGER PROBLEMÁTICO (RECOMENDADO)
-- -----------------------------------------------------------------------------

-- Remover o trigger que está causando o loop
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP FUNCTION IF EXISTS public.sync_user_profile();

-- Confirmar remoção
SELECT 'Trigger problemático removido' as status;

-- -----------------------------------------------------------------------------
-- OPÇÃO 2: CRIAR VERSÃO MELHORADA DO TRIGGER (ALTERNATIVA)
-- -----------------------------------------------------------------------------

-- Se você quiser manter sincronização, use esta versão que evita loops:
/*
CREATE OR REPLACE FUNCTION public.sync_user_profile_safe()
RETURNS trigger AS $$
BEGIN
  -- Só atualizar se realmente mudou E não estamos em um loop
  IF (old.raw_user_meta_data IS DISTINCT FROM new.raw_user_meta_data) 
     AND (old.updated_at IS DISTINCT FROM new.updated_at) THEN
    
    -- Usar ON CONFLICT para evitar problemas de concorrência
    INSERT INTO public.profiles (id, full_name, phone, updated_at)
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'full_name', new.email),
      new.raw_user_meta_data->>'phone',
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      phone = COALESCE(EXCLUDED.phone, profiles.phone),
      updated_at = EXCLUDED.updated_at
    WHERE profiles.updated_at < EXCLUDED.updated_at; -- Só atualizar se mais recente
    
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar o trigger seguro
CREATE TRIGGER on_auth_user_updated_safe
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_profile_safe();
*/

-- -----------------------------------------------------------------------------
-- VERIFICAÇÃO
-- -----------------------------------------------------------------------------

-- Verificar se os triggers foram removidos
SELECT 
  trigger_name, 
  event_manipulation, 
  action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%user%' 
  AND event_object_table = 'users'
  AND trigger_schema = 'auth';

SELECT '✅ Correção aplicada! Teste a atualização de perfil agora.' as resultado;
