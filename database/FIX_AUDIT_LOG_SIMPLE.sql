-- Execute este script para corrigir o problema de user_id NULL no audit log

-- 1. Atualizar o trigger de audit para ser mais robusto (sem criar usuário sistema)
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
  
  -- Se auth.uid() retornar NULL (requisições externas como n8n), 
  -- usar o owner_id do registro como fallback
  IF current_user_id IS NULL THEN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
      current_user_id := NEW.owner_id;
    ELSIF TG_OP = 'DELETE' THEN
      current_user_id := OLD.owner_id;
    END IF;
  END IF;

  -- Se ainda for NULL, pular o audit log (melhor que falhar a operação)
  IF current_user_id IS NULL THEN
    RAISE WARNING 'Audit log pulado: user_id não disponível para operação % na tabela clients', action_type;
    
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
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
      RAISE WARNING 'Erro no audit log (operação continua): % - %', SQLSTATE, SQLERRM;
      
      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      ELSE
        RETURN NEW;
      END IF;
  END;
  
  RETURN NULL;
END;
$$;

-- 2. Atualizar a função log_client_action também
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
  -- Tentar obter user_id do auth
  current_user_id := auth.uid();
  
  -- Se auth.uid() retornar NULL, usar owner_id do cliente
  IF current_user_id IS NULL THEN
    SELECT owner_id INTO current_user_id 
    FROM public.clients 
    WHERE id = client_id;
  END IF;
  
  -- Se ainda for NULL, pular o audit log
  IF current_user_id IS NULL THEN
    RAISE WARNING 'Audit log pulado: não foi possível determinar user_id para client_id %', client_id;
    RETURN;
  END IF;
  
  -- Inserir no audit log
  INSERT INTO public.client_audit_log (client_id, user_id, action, old_data, new_data)
  VALUES (client_id, current_user_id, action, old_data, new_data);
END;
$$;

-- 3. Comentários atualizados
COMMENT ON FUNCTION public.client_audit_trigger IS 'Trigger de audit que lida com user_id NULL usando owner_id como fallback';
COMMENT ON FUNCTION public.log_client_action IS 'Função de audit que lida com user_id NULL usando owner_id como fallback';

-- 4. Verificar se foi aplicado
SELECT 'Audit log corrigido para lidar com user_id NULL!' as status;
