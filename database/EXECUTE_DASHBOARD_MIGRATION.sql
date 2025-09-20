-- =============================================================================
-- INSTRUÇÕES PARA APLICAR A MIGRAÇÃO DO DASHBOARD
-- Execute este script no Supabase Dashboard SQL Editor
-- =============================================================================

-- IMPORTANTE: Execute o arquivo 24_prospects_dashboard_enhancement.sql primeiro
-- Este arquivo contém:
-- 1. Adição de campos necessários na tabela prospects
-- 2. Funções SQL para cálculo de métricas
-- 3. Índices para performance

-- Para executar:
-- 1. Copie todo o conteúdo do arquivo 24_prospects_dashboard_enhancement.sql
-- 2. Cole no SQL Editor do Supabase Dashboard
-- 3. Execute o script

-- Após a execução, verifique se as funções foram criadas:
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_dashboard_metrics', 'get_dashboard_drilldown', 'is_no_show', 'has_response', 'is_follow_up');

-- Verifique se os novos campos foram adicionados:
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'prospects' 
AND column_name IN ('segment', 'date_prospect', 'date_scheduling', 'status_scheduling', 'reply', 'closer')
ORDER BY ordinal_position;

-- Teste básico das funções (opcional):
-- SELECT public.get_dashboard_metrics(auth.uid());

-- =============================================================================
-- DADOS DE EXEMPLO PARA TESTE (OPCIONAL)
-- =============================================================================

-- Caso queira adicionar alguns dados de exemplo para testar o dashboard:
/*
INSERT INTO public.prospects (
  owner_id,
  contact_name,
  contact_email,
  company,
  source,
  status,
  temperature,
  segment,
  deal_value,
  date_prospect,
  notes
) VALUES 
  (auth.uid(), 'João Silva', 'joao@empresa.com', 'Empresa Tech', 'inbound', 'responded', 'hot', 'Tecnologia', 15000, CURRENT_DATE, 'Lead qualificado'),
  (auth.uid(), 'Maria Santos', 'maria@startup.com', 'Startup Inovadora', 'outbound', 'meeting_scheduled', 'warm', 'Tecnologia', 25000, CURRENT_DATE - 1, 'Reunião agendada para próxima semana'),
  (auth.uid(), 'Pedro Costa', 'pedro@consultoria.com', 'Consultoria ABC', 'inbound', 'won', 'hot', 'Consultoria', 50000, CURRENT_DATE - 2, 'Venda fechada!'),
  (auth.uid(), 'Ana Oliveira', 'ana@saude.com', 'Clínica Saúde', 'outbound', 'follow_up', 'cold', 'Saúde', 8000, CURRENT_DATE - 3, 'Aguardando retorno');
*/
