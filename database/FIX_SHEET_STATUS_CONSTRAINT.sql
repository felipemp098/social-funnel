-- Execute este script para corrigir a constraint de sheet_status

-- 1. Remover constraint existente
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_sheet_status_check;

-- 2. Adicionar constraint atualizada com linked_complete
ALTER TABLE public.clients 
ADD CONSTRAINT clients_sheet_status_check 
CHECK (sheet_status IN ('not_linked', 'linked_pending', 'linked_warn', 'linked_ok', 'linked_complete'));

-- 3. Atualizar comentário
COMMENT ON COLUMN public.clients.sheet_status IS 'Status da conexão com a planilha: not_linked, linked_pending, linked_warn, linked_ok, linked_complete';

-- 4. Verificar se foi aplicado corretamente
SELECT 'Constraint sheet_status atualizada com sucesso!' as status;
