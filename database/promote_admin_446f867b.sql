-- =============================================================================
-- SCRIPT PARA PROMOVER USUÁRIO A ADMINISTRADOR
-- ID do usuário: 446f867b-cd8c-480e-9d68-f1af89a4c8c4
-- =============================================================================

-- Este script promove o usuário especificado para administrador do sistema,
-- dando-lhe acesso completo a todas as funcionalidades e dados.
-- 
-- ATUALIZAÇÃO: Agora também garante a criação do perfil na tabela 'profiles'
-- que pode não ter sido criado automaticamente pelos triggers.

DO $$
DECLARE
    target_user_id uuid := '446f867b-cd8c-480e-9d68-f1af89a4c8c4';
    user_email text;
    user_exists boolean := false;
BEGIN
    -- 1. Verificar se o usuário existe na tabela auth.users
    SELECT au.email, true 
    INTO user_email, user_exists
    FROM auth.users au 
    WHERE au.id = target_user_id;
    
    -- Se o usuário não existe no auth.users, não podemos prosseguir
    IF NOT user_exists THEN
        RAISE EXCEPTION 'ERRO: Usuário com ID % não encontrado na tabela auth.users. 
        O usuário precisa primeiro se registrar no sistema através da interface web.', target_user_id;
    END IF;
    
    RAISE NOTICE 'Usuário encontrado: % (ID: %)', user_email, target_user_id;
    
    -- 2. Inserir ou atualizar o usuário na tabela app_users como admin
    INSERT INTO public.app_users (id, email, role, created_by)
    VALUES (
        target_user_id,
        user_email,
        'admin',
        NULL  -- Admin não tem criador
    )
    ON CONFLICT (id) DO UPDATE SET
        role = 'admin',
        updated_at = now();
    
    RAISE NOTICE 'Usuário % promovido a ADMINISTRADOR com sucesso!', user_email;
    
    -- 3. Garantir que existe um perfil na tabela profiles
    INSERT INTO public.profiles (id, full_name, created_at, updated_at)
    VALUES (
        target_user_id,
        user_email, -- Nome inicial será o email, pode ser alterado depois
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        updated_at = now();
    
    RAISE NOTICE 'Perfil criado/atualizado para o usuário %', user_email;
    
    -- 4. Verificar se a promoção foi bem-sucedida
    IF public.is_admin(target_user_id) THEN
        RAISE NOTICE 'CONFIRMADO: Usuário % agora tem privilégios de administrador.', user_email;
        RAISE NOTICE 'Permissões do administrador:';
        RAISE NOTICE '- Acesso completo a todos os dados do sistema';
        RAISE NOTICE '- Pode criar, editar e excluir usuários';
        RAISE NOTICE '- Pode alterar papéis de outros usuários';
        RAISE NOTICE '- Pode gerenciar todos os clientes e prospects';
        RAISE NOTICE '- Acesso a todas as configurações do sistema';
    ELSE
        RAISE EXCEPTION 'ERRO: Falha na verificação de privilégios de administrador';
    END IF;
    
    -- 5. Exibir informações do usuário promovido
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'RESUMO DA PROMOÇÃO:';
    RAISE NOTICE 'ID: %', target_user_id;
    RAISE NOTICE 'Email: %', user_email;
    RAISE NOTICE 'Papel: ADMIN';
    RAISE NOTICE 'Data da promoção: %', now();
    RAISE NOTICE '==========================================';
    
END $$;

-- =============================================================================
-- VERIFICAÇÕES ADICIONAIS
-- =============================================================================

-- Consulta para verificar o status completo do usuário após a execução
SELECT 
    au.id,
    au.email,
    app_u.role,
    app_u.created_by,
    app_u.created_at as app_user_created_at,
    app_u.updated_at as app_user_updated_at,
    p.full_name,
    p.created_at as profile_created_at,
    p.updated_at as profile_updated_at,
    public.is_admin(au.id) as is_admin_confirmed,
    CASE 
        WHEN app_u.id IS NOT NULL THEN 'SIM' 
        ELSE 'NÃO' 
    END as tem_app_user,
    CASE 
        WHEN p.id IS NOT NULL THEN 'SIM' 
        ELSE 'NÃO' 
    END as tem_profile
FROM auth.users au
LEFT JOIN public.app_users app_u ON au.id = app_u.id
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.id = '446f867b-cd8c-480e-9d68-f1af89a4c8c4';

-- Consulta para verificar todas as funções de autorização
SELECT 
    'is_admin' as function_name,
    public.is_admin('446f867b-cd8c-480e-9d68-f1af89a4c8c4') as result
UNION ALL
SELECT 
    'can_manage (self)',
    public.can_manage('446f867b-cd8c-480e-9d68-f1af89a4c8c4', '446f867b-cd8c-480e-9d68-f1af89a4c8c4')
UNION ALL
SELECT 
    'hierarchy_path',
    public.get_user_hierarchy_path('446f867b-cd8c-480e-9d68-f1af89a4c8c4') IS NOT NULL;

-- =============================================================================
-- INSTRUÇÕES DE USO
-- =============================================================================

/*
COMO USAR ESTE SCRIPT:

1. PRÉ-REQUISITO: O usuário com ID 446f867b-cd8c-480e-9d68-f1af89a4c8c4 
   DEVE estar registrado no sistema (tabela auth.users).
   Se não estiver, peça para o usuário se registrar primeiro via interface web.

2. Execute este script completo no seu cliente SQL (psql, pgAdmin, etc.)

3. O script irá:
   - Verificar se o usuário existe
   - Promovê-lo a administrador
   - Confirmar as permissões
   - Exibir um relatório de status

4. Após a execução, o usuário terá acesso completo ao sistema com as seguintes permissões:
   - Criar, editar e excluir usuários
   - Alterar papéis de usuários
   - Acessar todos os dados de clientes e prospects
   - Gerenciar configurações do sistema
   - Visualizar relatórios e métricas de todos os usuários
   
5. O script também garante que existam registros em AMBAS as tabelas necessárias:
   - public.app_users (dados de hierarquia e papel)
   - public.profiles (dados do perfil do usuário)

6. As políticas RLS (Row Level Security) automaticamente reconhecerão
   o novo status de admin e permitirão acesso total aos dados.

IMPORTANTE: 
- Este script é idempotente (pode ser executado múltiplas vezes sem problemas)
- Mantenha um log de quem foi promovido a admin para auditoria
- Considere implementar um processo de aprovação para futuras promoções
*/
