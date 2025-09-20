-- Execute este script para corrigir o problema de user_id NULL no audit log

-- 1. Atualizar a função de audit log para lidar com user_id NULL
CREATE OR REPLACE FUNCTION public.log_client_action(
  client_id uuid,
  action text,
  old_data jsonb DEFAULT NULL,
  new_data jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Tentar obter user_id do auth, se não conseguir usar um valor padrão
  current_user_id := auth.uid();
  
  -- Se auth.uid() retornar NULL (requisições externas como n8n), 
  -- tentar extrair do owner_id do cliente ou usar um valor sistema
  IF current_user_id IS NULL THEN
    -- Tentar obter o owner do cliente
    SELECT owner_id INTO current_user_id 
    FROM public.clients 
    WHERE id = client_id;
    
    -- Se ainda for NULL, usar um UUID especial para sistema externo
    IF current_user_id IS NULL THEN
      current_user_id := '00000000-0000-0000-0000-000000000000'::uuid;
    END IF;
  END IF;
  
  INSERT INTO public.client_audit_log (client_id, user_id, action, old_data, new_data)
  VALUES (client_id, current_user_id, action, old_data, new_data);
END;
$$;

-- 2. Atualizar o trigger de audit para ser mais robusto
CREATE OR REPLACE FUNCTION public.client_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_id uuid;
  action_type text;
BEGIN
  -- Determinar o tipo de ação
  IF TG_OP = 'INSERT' THEN
    action_type := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'updated';
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'deleted';
  ELSE
    action_type := 'unknown';
  END IF;
  
  -- Tentar obter user_id do auth
  current_user_id := auth.uid();
  
  -- Se auth.uid() retornar NULL, usar estratégias alternativas
  IF current_user_id IS NULL THEN
    -- Para INSERT/UPDATE, usar o owner_id do registro
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
      current_user_id := NEW.owner_id;
    -- Para DELETE, usar o owner_id do registro antigo
    ELSIF TG_OP = 'DELETE' THEN
      current_user_id := OLD.owner_id;
    END IF;
    
    -- Se ainda for NULL, usar UUID especial para sistema
    IF current_user_id IS NULL THEN
      current_user_id := '00000000-0000-0000-0000-000000000000'::uuid;
    END IF;
  END IF;

  -- Inserir no audit log
  BEGIN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.client_audit_log (client_id, user_id, action, old_data, new_data)
      VALUES (NEW.id, current_user_id, action_type, NULL, to_jsonb(NEW));
      RETURN NEW;
      
    ELSIF TG_OP = 'UPDATE' THEN
      INSERT INTO public.client_audit_log (client_id, user_id, action, old_data, new_data)
      VALUES (NEW.id, current_user_id, action_type, to_jsonb(OLD), to_jsonb(NEW));
      RETURN NEW;
      
    ELSIF TG_OP = 'DELETE' THEN
      INSERT INTO public.client_audit_log (client_id, user_id, action, old_data, new_data)
      VALUES (OLD.id, current_user_id, action_type, to_jsonb(OLD), NULL);
      RETURN OLD;
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Se falhar o audit log, não falhar a operação principal
      RAISE WARNING 'Erro no audit log: % - %', SQLSTATE, SQLERRM;
      
      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      ELSE
        RETURN NEW;
      END IF;
  END;
  
  RETURN NULL;
END;
$$;

-- 3. Criar usuário especial para operações de sistema (opcional)
INSERT INTO public.app_users (
  id, 
  email, 
  role, 
  created_by, 
  first_login
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'system@social-funnel.internal',
  'admin',
  NULL,
  false
) ON CONFLICT (id) DO NOTHING;

-- 4. Comentário
COMMENT ON FUNCTION public.client_audit_trigger IS 'Trigger de audit robusto que lida com user_id NULL (requisições externas)';

-- 5. Verificar se foi aplicado
SELECT 'Audit log corrigido para lidar com requisições externas!' as status;
