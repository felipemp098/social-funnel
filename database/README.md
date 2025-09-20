# 🗄️ Scripts SQL - Hierarquia de Acesso com RLS

Este diretório contém todos os scripts SQL necessários para implementar o sistema de hierarquia de acesso com Row-Level Security no Supabase.

## 📋 Ordem de Execução

Execute os scripts **na ordem exata** listada abaixo:

### 1. `01_foundation.sql` - Fundação do Banco
- ✅ Criação do enum `user_role`
- ✅ Tabela `app_users` com hierarquia
- ✅ Triggers de segurança e validação
- ✅ Índices para performance
- ✅ Habilitação do RLS

### 2. `02_authorization_functions.sql` - Funções de Autorização
- ✅ `is_admin(uuid)` - Verifica se é admin
- ✅ `is_ancestor(uuid, uuid)` - Hierarquia transitiva
- ✅ `can_manage(uuid, uuid)` - Função principal de autorização
- ✅ Funções auxiliares para consultas e validações

### 3. `03_rls_policies.sql` - Políticas RLS para app_users
- ✅ Políticas de SELECT, INSERT, UPDATE, DELETE
- ✅ Triggers de sincronização com `auth.users`
- ✅ Regras específicas por papel (admin/manager/user)

### 4. `04_domain_tables.sql` - Tabelas de Domínio
- ✅ Tabela `clients` (clientes)
- ✅ Tabela `prospects` (prospecções)
- ✅ Tabela `goals` (metas)
- ✅ Todas com `owner_id` e triggers

### 5. `05_domain_rls_policies.sql` - Políticas RLS para Domínio
- ✅ RLS para `clients`, `prospects`, `goals`
- ✅ Aplicação da função `can_manage()`
- ✅ Views otimizadas para consultas

### 6. `06_seed_data.sql` - Dados Iniciais
- ✅ Função para promover primeiro admin
- ✅ Dados de exemplo para desenvolvimento
- ✅ Scripts de criação de usuários de teste

## 🚀 Como Executar

### Passo 1: Acessar o Supabase
1. Acesse [supabase.com](https://supabase.com)
2. Entre no seu projeto: `uxkcwvzfdmxzmzeymchm`
3. Vá em **SQL Editor**

### Passo 2: Executar Scripts
1. Copie e cole cada script **na ordem**
2. Execute um por vez
3. Aguarde a confirmação de sucesso antes do próximo

### Passo 3: Criar Primeiro Admin
Após executar todos os scripts:

```sql
-- 1. Primeiro, registre-se na aplicação web normalmente
-- 2. Encontre seu UUID:
SELECT id, email FROM auth.users WHERE email = 'seu@email.com';

-- 3. Use a função para se promover a admin:
SELECT public.promote_to_admin('seu@email.com');
```

### Passo 4: Dados de Exemplo (Opcional)
Para criar dados de teste:

```sql
SELECT public.create_sample_data();
```

## 🔍 Verificação da Instalação

Execute estas queries para verificar se tudo está funcionando:

```sql
-- 1. Verificar estrutura das tabelas
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('app_users', 'clients', 'prospects', 'goals')
ORDER BY table_name, ordinal_position;

-- 2. Verificar funções criadas
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%admin%' OR routine_name LIKE '%ancestor%' OR routine_name LIKE '%manage%';

-- 3. Verificar políticas RLS
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';

-- 4. Testar hierarquia (se tiver dados)
SELECT * FROM public.user_hierarchy_stats;
```

## 🎯 Cenários de Teste

Após a instalação, teste estes cenários:

### Admin
- ✅ Vê todos os usuários
- ✅ Cria managers e users
- ✅ Altera papéis
- ✅ Vê todos os dados

### Manager
- ✅ Vê apenas sua subárvore
- ✅ Cria apenas users
- ✅ Gerencia dados seus e dos descendentes
- ❌ Não altera papéis

### User
- ✅ Vê apenas próprios dados
- ❌ Não cria usuários
- ❌ Não vê dados de outros

## 🆘 Troubleshooting

### Erro: "relation already exists"
- Normal se executar script novamente
- Use `DROP TABLE IF EXISTS` se necessário

### Erro: "permission denied"
- Verifique se está executando como proprietário do projeto
- Confirme que RLS não está bloqueando

### Erro: "function does not exist"
- Execute os scripts na ordem correta
- Funções dependem umas das outras

### Dados não aparecem
- Verifique se o usuário tem papel correto
- Teste com `SELECT public.can_manage(auth.uid(), owner_id)`

## 📚 Documentação Adicional

- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Recursive Queries](https://www.postgresql.org/docs/current/queries-with.html)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth)

## 🔄 Próximos Passos

Após executar todos os scripts:

1. **Atualizar tipos TypeScript** (`supabase gen types typescript`)
2. **Integrar com frontend React**
3. **Criar componentes de gestão de usuários**
4. **Implementar testes automatizados**
5. **Configurar monitoring e logs**
