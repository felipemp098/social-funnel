-- =============================================================================
-- SCRIPTS EXAMPLE USAGE - Exemplos Práticos de Uso do Sistema
-- =============================================================================
-- Este arquivo contém exemplos práticos de como usar o sistema de scripts
-- IMPORTANTE: Execute apenas após implementar o sistema principal
-- =============================================================================

-- =============================================================================
-- CENÁRIOS DE EXEMPLO
-- =============================================================================

-- NOTA: Estes exemplos são conceituais pois dependem de dados reais
-- Substitua os UUIDs pelos IDs reais dos usuários do seu sistema

-- =============================================================================
-- CENÁRIO 1: ADMIN CRIANDO SCRIPTS PÚBLICOS
-- =============================================================================

-- Admin cria script público para toda a empresa
/*
SELECT create_script(
    'Script Padrão de Prospecção LinkedIn',
    ARRAY['linkedin', 'prospecção', 'padrão'],
    '# Script de Prospecção LinkedIn

Olá {{nome}},

Vi seu perfil no LinkedIn e fiquei impressionado com sua experiência em {{área}}.

Gostaria de apresentar uma solução que pode ajudar sua empresa a {{benefício}}.

Você teria alguns minutos para uma conversa rápida esta semana?

Atenciosamente,
{{meu_nome}}',
    'public'
);
*/

-- Admin cria script de follow-up público
/*
SELECT create_script(
    'Script Follow-up WhatsApp',
    ARRAY['whatsapp', 'follow-up', 'vendas'],
    'Oi {{nome}}, tudo bem?

Passando para acompanhar nossa conversa de {{data}} sobre {{assunto}}.

Você teve a chance de pensar sobre a proposta que apresentei?

Qual seria o melhor momento para conversarmos novamente?

Abraços!',
    'public'
);
*/

-- =============================================================================
-- CENÁRIO 2: MANAGER CRIANDO SCRIPTS PARA O TIME
-- =============================================================================

-- Manager cria script específico para seu time
/*
SELECT create_script(
    'Script Inicial - Produto XYZ',
    ARRAY['produto-xyz', 'inicial', 'time'],
    'Olá {{nome}},

Sou {{meu_nome}} da equipe de vendas da {{empresa}}.

Estou entrando em contato para apresentar o {{produto}}, uma solução que tem ajudado empresas como a sua a {{resultado}}.

Gostaria de agendar uma breve apresentação de 15 minutos para mostrar como funciona?

Qual seria o melhor horário para você?

Obrigado!',
    'team'
);
*/

-- =============================================================================
-- CENÁRIO 3: USUÁRIO CRIANDO SCRIPTS PRIVADOS
-- =============================================================================

-- Usuário cria script privado personalizado
/*
SELECT create_script(
    'Meu Script Personalizado',
    ARRAY['personalizado', 'teste'],
    'Este é meu script personalizado para {{situação_específica}}.

Conteúdo customizado aqui...',
    'private'
);
*/

-- =============================================================================
-- CENÁRIO 4: BUSCA E FILTROS
-- =============================================================================

-- Buscar todos os scripts públicos
-- SELECT * FROM list_scripts(NULL, NULL, 'public');

-- Buscar scripts do LinkedIn
-- SELECT * FROM list_scripts('linkedin', NULL, NULL);

-- Buscar scripts com tag 'prospecção'
-- SELECT * FROM list_scripts(NULL, 'prospecção', NULL);

-- Buscar scripts do time
-- SELECT * FROM list_scripts(NULL, NULL, 'team');

-- Busca combinada: scripts públicos do LinkedIn sobre prospecção
-- SELECT * FROM list_scripts('linkedin', 'prospecção', 'public');

-- =============================================================================
-- CENÁRIO 5: EDIÇÃO E ATUALIZAÇÃO
-- =============================================================================

-- Atualizar apenas o título de um script
/*
SELECT update_script(
    'uuid-do-script',
    'Novo Título do Script'
);
*/

-- Atualizar tags de um script
/*
SELECT update_script(
    'uuid-do-script',
    NULL, -- título não alterado
    ARRAY['nova-tag', 'atualizada'],
    NULL, -- conteúdo não alterado
    NULL  -- visibilidade não alterada
);
*/

-- Atualizar visibilidade de privado para team
/*
SELECT update_script(
    'uuid-do-script',
    NULL, NULL, NULL, 'team'
);
*/

-- =============================================================================
-- CENÁRIO 6: ESTATÍSTICAS
-- =============================================================================

-- Ver estatísticas gerais
-- SELECT * FROM get_scripts_stats();

-- Exemplo de retorno esperado:
/*
 total_scripts | my_scripts | team_scripts | public_scripts | total_tags
---------------+---------------+--------------+----------------+------------
            25 |           8 |            12 |              5 |         15
*/

-- =============================================================================
-- CENÁRIO 7: WORKFLOW COMPLETO
-- =============================================================================

-- 1. Criar um novo script
/*
WITH new_script AS (
    SELECT create_script(
        'Script de Teste',
        ARRAY['teste', 'exemplo'],
        'Este é um script de teste para demonstrar o sistema.',
        'private'
    ) as script_id
)
SELECT script_id FROM new_script;
*/

-- 2. Obter detalhes do script criado
/*
SELECT * FROM get_script('uuid-retornado-pelo-create');
*/

-- 3. Atualizar o script
/*
SELECT update_script(
    'uuid-do-script',
    'Script de Teste Atualizado',
    ARRAY['teste', 'exemplo', 'atualizado'],
    'Conteúdo atualizado do script de teste.',
    'team'
);
*/

-- 4. Verificar as mudanças
/*
SELECT * FROM get_script('uuid-do-script');
*/

-- 5. Listar scripts do time (deve incluir o atualizado)
/*
SELECT * FROM list_scripts(NULL, NULL, 'team');
*/

-- 6. Deletar o script (se necessário)
/*
SELECT delete_script('uuid-do-script');
*/

-- =============================================================================
-- CENÁRIO 8: TEMPLATES COMUM DE SOCIAL SELLING
-- =============================================================================

-- Script de conexão LinkedIn
/*
SELECT create_script(
    'Conexão LinkedIn - Primeira Abordagem',
    ARRAY['linkedin', 'conexão', 'networking'],
    'Olá {{nome}},

Vi seu perfil e fiquei interessado em conectar com profissionais da área de {{área}}.

Gostaria de expandir minha rede e trocar experiências.

Aceita minha conexão?

Abraços!',
    'public'
);
*/

-- Script de follow-up após conexão
/*
SELECT create_script(
    'Follow-up Pós Conexão LinkedIn',
    ARRAY['linkedin', 'follow-up', 'conexão'],
    'Oi {{nome}},

Obrigado por aceitar minha conexão!

Vi que você trabalha com {{área}} na {{empresa}}. É uma área que me interessa muito.

Gostaria de conhecer melhor seu trabalho. Você teria alguns minutos para uma conversa rápida?

Abraços!',
    'public'
);
*/

-- Script de apresentação de produto
/*
SELECT create_script(
    'Apresentação de Produto/Serviço',
    ARRAY['apresentação', 'produto', 'vendas'],
    'Olá {{nome}},

Como vai? Espero que esteja tudo bem.

Estou entrando em contato porque desenvolvi uma solução que pode ser interessante para sua empresa.

O {{produto}} ajuda empresas como a {{empresa}} a {{benefício_principal}}.

Você teria interesse em conhecer melhor? Posso fazer uma apresentação rápida de 10 minutos.

Qual seria o melhor momento?

Obrigado pela atenção!',
    'public'
);
*/

-- Script de agendamento de reunião
/*
SELECT create_script(
    'Agendamento de Reunião',
    ARRAY['agendamento', 'reunião', 'vendas'],
    'Oi {{nome}},

Tudo bem?

Conforme conversamos, gostaria de agendar nossa reunião para apresentar a proposta.

Tenho disponibilidade nos seguintes horários:
- Segunda-feira às 14h
- Terça-feira às 10h
- Quarta-feira às 16h

Qual funciona melhor para você?

Aguardo seu retorno!',
    'public'
);
*/

-- Script de follow-up pós reunião
/*
SELECT create_script(
    'Follow-up Pós Reunião',
    ARRAY['follow-up', 'reunião', 'vendas'],
    'Oi {{nome}},

Obrigado pelo tempo que dedicou à nossa reunião de {{data}}.

Foi muito bom conhecer melhor as necessidades da {{empresa}}.

Conforme combinado, vou enviar a proposta detalhada até {{prazo}}.

Você tem alguma dúvida sobre o que discutimos?

Estou à disposição para qualquer esclarecimento.

Abraços!',
    'public'
);
*/

-- =============================================================================
-- CENÁRIO 9: VALIDAÇÃO DE PERMISSÕES
-- =============================================================================

-- Teste de permissões (execute com diferentes usuários)
/*
-- Como admin - deve conseguir ver todos
SELECT 'Admin view' as test, COUNT(*) as scripts_visible 
FROM list_scripts();

-- Como manager - deve ver seus + de subordinados + públicos
SELECT 'Manager view' as test, COUNT(*) as scripts_visible 
FROM list_scripts();

-- Como user - deve ver apenas os seus + públicos + do time
SELECT 'User view' as test, COUNT(*) as scripts_visible 
FROM list_scripts();
*/

-- =============================================================================
-- CENÁRIO 10: BUSCA AVANÇADA
-- =============================================================================

-- Buscar scripts que contenham palavras específicas
/*
-- Buscar por "LinkedIn" em título ou conteúdo
SELECT * FROM list_scripts('LinkedIn');

-- Buscar por "follow-up" em título ou conteúdo
SELECT * FROM list_scripts('follow-up');

-- Buscar por "vendas" em título ou conteúdo
SELECT * FROM list_scripts('vendas');
*/

-- Buscar por tags específicas
/*
-- Todos os scripts com tag "linkedin"
SELECT * FROM list_scripts(NULL, 'linkedin');

-- Todos os scripts com tag "whatsapp"
SELECT * FROM list_scripts(NULL, 'whatsapp');

-- Todos os scripts com tag "vendas"
SELECT * FROM list_scripts(NULL, 'vendas');
*/

-- =============================================================================
-- DICAS DE USO
-- =============================================================================

/*
1. USE TAGS CONSCIENTEMENTE:
   - Crie um padrão de tags (ex: plataforma, tipo, estágio)
   - Use tags consistentes para facilitar buscas
   - Exemplos: ['linkedin', 'whatsapp'], ['inicial', 'follow-up'], ['vendas', 'suporte']

2. ORGANIZE POR VISIBILIDADE:
   - private: Scripts pessoais e experimentais
   - team: Scripts que todo o time pode usar
   - public: Scripts padrão da empresa

3. USE VARIÁVEIS NO CONTEÚDO:
   - {{nome}}: Nome do contato
   - {{empresa}}: Nome da empresa
   - {{produto}}: Nome do produto/serviço
   - {{área}}: Área de atuação
   - {{meu_nome}}: Seu nome

4. MONITORE ESTATÍSTICAS:
   - Use get_scripts_stats() para acompanhar o uso
   - Identifique quais scripts são mais populares
   - Otimize baseado nos dados

5. MANTENHA ATUALIZADO:
   - Revise scripts regularmente
   - Atualize com feedback da equipe
   - Teste diferentes abordagens
*/

-- =============================================================================
-- FINALIZAÇÃO
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== EXEMPLOS DE USO CARREGADOS ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Este arquivo contém exemplos conceituais de uso do sistema.';
    RAISE NOTICE 'Para usar os exemplos:';
    RAISE NOTICE '1. Descomente os blocos de código desejados';
    RAISE NOTICE '2. Substitua os UUIDs pelos IDs reais dos usuários';
    RAISE NOTICE '3. Execute no Supabase Dashboard SQL Editor';
    RAISE NOTICE '';
    RAISE NOTICE 'Sistema pronto para uso em produção!';
    RAISE NOTICE '';
END $$;
