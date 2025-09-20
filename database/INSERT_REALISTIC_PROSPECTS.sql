-- =============================================================================
-- INSERIR PROSPECTS REALISTAS COM VARIAÇÃO DE DATAS E FUNIL LÓGICO
-- Dados seguem a lógica: Prospecções > Respostas > Agendamentos > Vendas
-- =============================================================================

-- Limpar dados existentes (opcional - descomente se necessário)
-- DELETE FROM public.prospects WHERE owner_id = '446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid;

-- Inserir prospects com dados realistas e variados
INSERT INTO public.prospects (
  owner_id,
  contact_name,
  contact_email,
  contact_phone,
  company,
  position,
  source,
  status,
  temperature,
  segment,
  deal_value,
  date_prospect,
  date_scheduling,
  date_call,
  status_scheduling,
  reply,
  confirm_call,
  selling,
  payment,
  negotiations,
  closer,
  notes
) VALUES 
  -- SETEMBRO 2025 - VARIAÇÃO REALISTA DE DADOS
  
  -- Dia 01/09 - 8 prospecções (início do mês, volume alto)
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Carlos Silva', 'carlos@techcorp.com', '(11) 99999-1001', 'TechCorp Ltda', 'CEO', 'inbound', 'won', 'hot', 'Tecnologia', 45000, '2025-09-01', '2025-09-02 14:00:00', '2025-09-02 14:00:00', 'realizada', 'Muito interessado', 'confirmado', 'Proposta aceita', 'À vista com desconto', 'Fechado', 'Felipe', 'Cliente excelente'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Ana Costa', 'ana@inovaedu.com', '(11) 99999-1002', 'InovaEdu', 'Diretora', 'outbound', 'meeting_done', 'warm', 'Educação', 25000, '2025-09-01', '2025-09-03 10:00:00', '2025-09-03 10:00:00', 'realizada', 'Precisa avaliar', 'confirmado', 'Em negociação', '3x sem juros', 'Aguardando', 'Maria', 'Potencial alto'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Roberto Mendes', 'roberto@saúdepro.com', '(11) 99999-1003', 'SaúdePro', 'Gerente', 'inbound', 'responded', 'cold', 'Saúde', 15000, '2025-09-01', NULL, NULL, NULL, 'Vou analisar', NULL, NULL, NULL, NULL, 'João', 'Resposta fria'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Lucia Santos', 'lucia@consultafin.com', '(11) 99999-1004', 'ConsultaFin', 'Sócia', 'outbound', 'meeting_scheduled', 'hot', 'Finanças', 35000, '2025-09-01', '2025-09-05 16:00:00', NULL, 'agendada', 'Muito interessada', 'confirmado', NULL, NULL, NULL, 'Pedro', 'Reunião agendada'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Fernando Lima', 'fernando@autotech.com', '(11) 99999-1005', 'AutoTech', 'Diretor', 'inbound', 'contacted', 'warm', 'Tecnologia', 20000, '2025-09-01', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Ana', 'Primeiro contato'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Mariana Oliveira', 'mariana@educare.com', '(11) 99999-1006', 'EduCare', 'Coordenadora', 'outbound', 'new', 'cold', 'Educação', 10000, '2025-09-01', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Carlos', 'Prospect novo'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'José Almeida', 'jose@medtech.com', '(11) 99999-1007', 'MedTech', 'CTO', 'inbound', 'follow_up', 'warm', 'Saúde', 30000, '2025-09-01', NULL, NULL, NULL, 'Preciso de mais info', 'reagendar', NULL, NULL, NULL, 'Lucia', 'Follow-up necessário'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Patricia Rocha', 'patricia@financorp.com', '(11) 99999-1008', 'FinanCorp', 'Gerente', 'outbound', 'lost', 'cold', 'Finanças', 18000, '2025-09-01', NULL, NULL, NULL, 'Não temos interesse', NULL, NULL, NULL, NULL, 'Rafael', 'Perdeu interesse'),

  -- Dia 02/09 - 6 prospecções
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Ricardo Ferreira', 'ricardo@innovatech.com', '(11) 99999-2001', 'InnovaTech', 'CEO', 'inbound', 'won', 'hot', 'Tecnologia', 55000, '2025-09-02', '2025-09-04 15:00:00', '2025-09-04 15:00:00', 'realizada', 'Excelente proposta', 'confirmado', 'Fechado', 'Parcelado 6x', 'Concluído', 'Felipe', 'Venda rápida'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Camila Torres', 'camila@edumax.com', '(11) 99999-2002', 'EduMax', 'Diretora', 'outbound', 'meeting_done', 'warm', 'Educação', 22000, '2025-09-02', '2025-09-05 11:00:00', '2025-09-05 11:00:00', 'realizada', 'Interessante', 'confirmado', 'Proposta enviada', 'À vista', 'Em análise', 'Maria', 'Reunião produtiva'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Bruno Nascimento', 'bruno@healthsys.com', '(11) 99999-2003', 'HealthSys', 'Gerente', 'inbound', 'responded', 'warm', 'Saúde', 28000, '2025-09-02', NULL, NULL, NULL, 'Vamos avaliar', NULL, NULL, NULL, NULL, 'João', 'Resposta positiva'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Daniela Campos', 'daniela@fintech.com', '(11) 99999-2004', 'FinTech Solutions', 'CTO', 'outbound', 'contacted', 'cold', 'Finanças', 12000, '2025-09-02', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Pedro', 'Contato inicial'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Gabriel Souza', 'gabriel@automate.com', '(11) 99999-2005', 'Automate Pro', 'Diretor', 'inbound', 'new', 'hot', 'Tecnologia', 40000, '2025-09-02', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Ana', 'Prospect quente'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Isabela Martins', 'isabela@learnfast.com', '(11) 99999-2006', 'LearnFast', 'Fundadora', 'outbound', 'follow_up', 'warm', 'Educação', 16000, '2025-09-02', NULL, NULL, NULL, 'Interessada mas ocupada', 'reagendar', NULL, NULL, NULL, 'Carlos', 'Reagendar contato'),

  -- Dia 03/09 - 4 prospecções (terça-feira, volume médio)
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Leonardo Pereira', 'leonardo@medpro.com', '(11) 99999-3001', 'MedPro', 'CEO', 'inbound', 'meeting_scheduled', 'hot', 'Saúde', 50000, '2025-09-03', '2025-09-06 14:00:00', NULL, 'agendada', 'Muito interessado', 'confirmado', NULL, NULL, NULL, 'Lucia', 'Grande potencial'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Vanessa Lima', 'vanessa@banktech.com', '(11) 99999-3002', 'BankTech', 'Diretora', 'outbound', 'responded', 'warm', 'Finanças', 33000, '2025-09-03', NULL, NULL, NULL, 'Proposta interessante', NULL, NULL, NULL, NULL, 'Rafael', 'Resposta positiva'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Thiago Santos', 'thiago@smartedu.com', '(11) 99999-3003', 'SmartEdu', 'CTO', 'inbound', 'contacted', 'cold', 'Educação', 14000, '2025-09-03', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Maria', 'Primeiro contato'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Renata Costa', 'renata@techhealth.com', '(11) 99999-3004', 'TechHealth', 'Gerente', 'outbound', 'lost', 'cold', 'Saúde', 8000, '2025-09-03', NULL, NULL, NULL, 'Sem orçamento', NULL, NULL, NULL, NULL, 'João', 'Sem budget'),

  -- Dia 04/09 - 7 prospecções (quarta-feira, volume alto)
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Alexandre Rodrigues', 'alexandre@innovafin.com', '(11) 99999-4001', 'InnovaFin', 'CEO', 'inbound', 'won', 'hot', 'Finanças', 65000, '2025-09-04', '2025-09-06 10:00:00', '2025-09-06 10:00:00', 'realizada', 'Perfeito para nós', 'confirmado', 'Contrato assinado', '12x sem juros', 'Fechado', 'Felipe', 'Excelente venda'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Juliana Moreira', 'juliana@edutech.com', '(11) 99999-4002', 'EduTech', 'Diretora', 'outbound', 'meeting_done', 'hot', 'Educação', 38000, '2025-09-04', '2025-09-07 16:00:00', '2025-09-07 16:00:00', 'realizada', 'Muito boa apresentação', 'confirmado', 'Proposta em análise', 'À vista', 'Negociando', 'Ana', 'Ótima reunião'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Marcos Oliveira', 'marcos@healthtech.com', '(11) 99999-4003', 'HealthTech', 'CTO', 'inbound', 'meeting_scheduled', 'warm', 'Saúde', 42000, '2025-09-04', '2025-09-08 11:00:00', NULL, 'agendada', 'Vamos conversar', 'confirmado', NULL, NULL, NULL, 'Carlos', 'Reunião agendada'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Carla Fernandes', 'carla@autofinance.com', '(11) 99999-4004', 'AutoFinance', 'Gerente', 'outbound', 'responded', 'warm', 'Finanças', 26000, '2025-09-04', NULL, NULL, NULL, 'Interessante solução', NULL, NULL, NULL, NULL, 'Pedro', 'Resposta encorajadora'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Diego Silva', 'diego@techsmart.com', '(11) 99999-4005', 'TechSmart', 'Diretor', 'inbound', 'follow_up', 'cold', 'Tecnologia', 19000, '2025-09-04', NULL, NULL, NULL, 'Preciso pensar', 'reagendar', NULL, NULL, NULL, 'Lucia', 'Precisa follow-up'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Fernanda Alves', 'fernanda@educare.com', '(11) 99999-4006', 'EduCare Plus', 'Coordenadora', 'outbound', 'contacted', 'warm', 'Educação', 21000, '2025-09-04', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Maria', 'Contato realizado'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Gustavo Mendes', 'gustavo@medsoft.com', '(11) 99999-4007', 'MedSoft', 'CEO', 'inbound', 'new', 'hot', 'Saúde', 48000, '2025-09-04', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'João', 'Novo prospect'),

  -- Dia 05/09 - 3 prospecções (quinta-feira, volume baixo)
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Helena Castro', 'helena@finpro.com', '(11) 99999-5001', 'FinPro', 'Diretora', 'inbound', 'meeting_done', 'warm', 'Finanças', 31000, '2025-09-05', '2025-09-08 15:00:00', '2025-09-08 15:00:00', 'realizada', 'Boa proposta', 'confirmado', 'Analisando', 'Parcelado', 'Em análise', 'Rafael', 'Reunião positiva'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Igor Barbosa', 'igor@smartlearn.com', '(11) 99999-5002', 'SmartLearn', 'Fundador', 'outbound', 'responded', 'hot', 'Educação', 27000, '2025-09-05', NULL, NULL, NULL, 'Gostei da apresentação', NULL, NULL, NULL, NULL, 'Ana', 'Resposta muito boa'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Karina Rocha', 'karina@healthsys.com', '(11) 99999-5003', 'HealthSys Pro', 'Gerente', 'inbound', 'contacted', 'cold', 'Saúde', 13000, '2025-09-05', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Carlos', 'Contato inicial'),

  -- Continuando com mais dias variados...
  -- Dia 06/09 - 5 prospecções (sexta-feira)
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Lucas Andrade', 'lucas@techfin.com', '(11) 99999-6001', 'TechFin', 'CEO', 'inbound', 'won', 'hot', 'Finanças', 72000, '2025-09-06', '2025-09-09 09:00:00', '2025-09-09 09:00:00', 'realizada', 'Solução perfeita', 'confirmado', 'Fechado', 'À vista', 'Concluído', 'Felipe', 'Grande venda'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Monica Santos', 'monica@edufuture.com', '(11) 99999-6002', 'EduFuture', 'Diretora', 'outbound', 'meeting_scheduled', 'warm', 'Educação', 24000, '2025-09-06', '2025-09-10 14:00:00', NULL, 'agendada', 'Vamos conversar', 'confirmado', NULL, NULL, NULL, 'Maria', 'Agendamento realizado'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Nelson Lima', 'nelson@medsolutions.com', '(11) 99999-6003', 'MedSolutions', 'CTO', 'inbound', 'responded', 'warm', 'Saúde', 36000, '2025-09-06', NULL, NULL, NULL, 'Interessante proposta', NULL, NULL, NULL, NULL, 'Lucia', 'Boa resposta'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Olivia Pereira', 'olivia@autobank.com', '(11) 99999-6004', 'AutoBank', 'Gerente', 'outbound', 'follow_up', 'cold', 'Finanças', 17000, '2025-09-06', NULL, NULL, NULL, 'Preciso de mais tempo', 'reagendar', NULL, NULL, NULL, 'Pedro', 'Follow-up marcado'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Paulo Martins', 'paulo@innovatech.com', '(11) 99999-6005', 'InovaTech Solutions', 'Diretor', 'inbound', 'lost', 'cold', 'Tecnologia', 11000, '2025-09-06', NULL, NULL, NULL, 'Não é o momento', NULL, NULL, NULL, NULL, 'João', 'Timing ruim'),

  -- Pulando para dias mais recentes...
  -- Dia 15/09 - 9 prospecções (meio do mês, volume alto)
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Rodrigo Silva', 'rodrigo@megafinance.com', '(11) 99999-1501', 'MegaFinance', 'CEO', 'inbound', 'won', 'hot', 'Finanças', 85000, '2025-09-15', '2025-09-17 10:00:00', '2025-09-17 10:00:00', 'realizada', 'Excelente solução', 'confirmado', 'Contrato fechado', '18x', 'Finalizado', 'Felipe', 'Maior venda do mês'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Sandra Costa', 'sandra@edumaster.com', '(11) 99999-1502', 'EduMaster', 'Diretora', 'outbound', 'meeting_done', 'hot', 'Educação', 41000, '2025-09-15', '2025-09-18 11:00:00', '2025-09-18 11:00:00', 'realizada', 'Muito interessante', 'confirmado', 'Proposta enviada', 'Parcelado', 'Aguardando', 'Ana', 'Reunião excelente'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Tiago Oliveira', 'tiago@healthpro.com', '(11) 99999-1503', 'HealthPro', 'CTO', 'inbound', 'meeting_scheduled', 'warm', 'Saúde', 52000, '2025-09-15', '2025-09-20 15:00:00', NULL, 'agendada', 'Vamos avaliar', 'confirmado', NULL, NULL, NULL, 'Carlos', 'Reunião importante'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Ursula Fernandes', 'ursula@techbank.com', '(11) 99999-1504', 'TechBank', 'Gerente', 'outbound', 'responded', 'warm', 'Finanças', 29000, '2025-09-15', NULL, NULL, NULL, 'Gostei da proposta', NULL, NULL, NULL, NULL, 'Rafael', 'Resposta positiva'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Victor Santos', 'victor@smarttech.com', '(11) 99999-1505', 'SmartTech', 'Diretor', 'inbound', 'responded', 'hot', 'Tecnologia', 47000, '2025-09-15', NULL, NULL, NULL, 'Muito interessante', NULL, NULL, NULL, NULL, 'Lucia', 'Resposta quente'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Wanda Lima', 'wanda@eduplus.com', '(11) 99999-1506', 'EduPlus', 'Coordenadora', 'outbound', 'contacted', 'warm', 'Educação', 18000, '2025-09-15', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Maria', 'Contato estabelecido'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Xavier Rocha', 'xavier@medtech.com', '(11) 99999-1507', 'MedTech Advanced', 'CEO', 'inbound', 'follow_up', 'cold', 'Saúde', 23000, '2025-09-15', NULL, NULL, NULL, 'Preciso consultar equipe', 'reagendar', NULL, NULL, NULL, 'João', 'Decisão em grupo'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Yara Almeida', 'yara@financetech.com', '(11) 99999-1508', 'FinanceTech', 'CTO', 'outbound', 'contacted', 'cold', 'Finanças', 15000, '2025-09-15', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Pedro', 'Primeiro contato'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Zeca Martins', 'zeca@autolearn.com', '(11) 99999-1509', 'AutoLearn', 'Fundador', 'inbound', 'new', 'hot', 'Educação', 35000, '2025-09-15', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Ana', 'Prospect promissor'),

  -- Dia 20/09 - 2 prospecções (hoje, volume baixo)
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Alberto Souza', 'alberto@futuretech.com', '(11) 99999-2001', 'FutureTech', 'CEO', 'inbound', 'responded', 'hot', 'Tecnologia', 62000, '2025-09-20', NULL, NULL, NULL, 'Vamos agendar uma reunião', NULL, NULL, NULL, NULL, 'Felipe', 'Muito promissor'),
  ('446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid, 'Beatriz Costa', 'beatriz@healthfuture.com', '(11) 99999-2002', 'HealthFuture', 'Diretora', 'outbound', 'contacted', 'warm', 'Saúde', 34000, '2025-09-20', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Carlos', 'Contato de hoje');

-- Verificar os dados inseridos
SELECT 
  date_prospect,
  COUNT(*) as total_prospeccoes,
  COUNT(CASE WHEN status IN ('responded', 'meeting_scheduled', 'meeting_done', 'won', 'follow_up') THEN 1 END) as respostas,
  COUNT(CASE WHEN status IN ('meeting_scheduled', 'meeting_done', 'won') THEN 1 END) as agendamentos,
  COUNT(CASE WHEN status = 'won' THEN 1 END) as vendas,
  ROUND(AVG(deal_value), 0) as ticket_medio
FROM public.prospects 
WHERE owner_id = '446f867b-cd8c-480e-9d68-f1af89a4c8c4'::uuid
AND date_prospect BETWEEN '2025-09-01' AND '2025-09-20'
GROUP BY date_prospect
ORDER BY date_prospect DESC;
