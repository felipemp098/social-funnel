-- Execute este script para corrigir a ambiguidade de colunas na função delete_client

CREATE OR REPLACE FUNCTION public.delete_client(client_id uuid)
RETURNS TABLE(id uuid, name text, deleted_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  client_record record;
BEGIN
  -- Buscar informações do cliente antes de deletar (qualificando as referências)
  SELECT c.id, c.name INTO client_record 
  FROM public.clients c 
  WHERE c.id = delete_client.client_id;
  
  -- Verificar se cliente existe e temos permissão (RLS)
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente não encontrado ou sem permissão' USING ERRCODE = 'no_data_found';
  END IF;
  
  -- Deletar cliente (CASCADE vai remover relacionamentos)
  DELETE FROM public.clients 
  WHERE public.clients.id = delete_client.client_id;
  
  -- Retornar informações do cliente deletado
  RETURN QUERY
  SELECT 
    client_record.id,
    client_record.name,
    now() as deleted_at;
END;
$$;
