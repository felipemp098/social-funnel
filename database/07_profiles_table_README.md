# Migração: Tabela Profiles

## Descrição
Esta migração cria a tabela `profiles` que complementa os dados dos usuários armazenados no `auth.users`. A tabela armazena informações adicionais do perfil como nome completo, telefone, avatar e preferências.

## Funcionalidades Implementadas

### 1. Tabela Profiles
- **Estrutura**: Dados complementares dos usuários
- **Relacionamento**: 1:1 com `auth.users`
- **Validações**: Formato de telefone e tamanho do nome
- **Campos**:
  - `id`: UUID (FK para auth.users)
  - `full_name`: Nome completo (2-80 caracteres)
  - `phone`: Telefone em formato brasileiro ou E.164
  - `avatar_url`: URL da foto do perfil
  - `bio`: Biografia do usuário
  - `preferences`: Preferências em JSON
  - `created_at/updated_at`: Timestamps automáticos

### 2. RLS (Row Level Security)
- **Usuários**: Podem ver e editar apenas seu próprio perfil
- **Admins**: Podem ver todos os perfis
- **Managers**: Podem ver perfis de usuários em sua hierarquia

### 3. Triggers Automáticos
- **Criação automática**: Perfil criado quando usuário é registrado
- **Sincronização**: Dados sincronizados entre auth.users e profiles
- **Updated_at**: Atualizado automaticamente em mudanças

### 4. View Combinada
- **user_profiles**: Combina dados de app_users e profiles
- **Campos computados**: display_name, effective_avatar
- **RLS habilitado**: Herda permissões das tabelas base

## Como Aplicar

### ⚠️ Se você recebeu erro de dependências

Se ao executar a migração você recebeu um erro como:
```
ERROR: cannot drop function handle_new_user() because other objects depend on it
DETAIL: trigger on_auth_user_created on table auth.users depends on function handle_new_user()
```

**Use o arquivo seguro**: `07_profiles_table_safe.sql` em vez do arquivo principal.

### Opção 1: Via Supabase Dashboard
1. Acesse o Supabase Dashboard
2. Vá para SQL Editor
3. **Se houve erro**: Cole o conteúdo do arquivo `07_profiles_table_safe.sql`
4. **Se não houve erro**: Cole o conteúdo do arquivo `07_profiles_table.sql`
5. Execute a query

### Opção 2: Via CLI (se configurado)
```bash
# Se houve erro, use o arquivo seguro primeiro
supabase db reset --linked
# Depois aplique todas as migrações novamente
supabase db push
```

### Opção 3: Via MCP (se disponível)
```bash
# Se houve erro, use o arquivo seguro
mcp_supabase_apply_migration --name "profiles_table_safe" --query "$(cat database/07_profiles_table_safe.sql)"

# Ou o arquivo principal se não houve erro
mcp_supabase_apply_migration --name "profiles_table" --query "$(cat database/07_profiles_table.sql)"
```

### Diferença entre os arquivos:
- **`07_profiles_table.sql`**: Versão principal otimizada
- **`07_profiles_table_safe.sql`**: Versão que remove dependências primeiro, mais segura para ambientes existentes

## Validações Implementadas

### Formato de Telefone
- **Brasileiro**: `(11) 99999-9999`
- **E.164**: `+55 11999999999`

### Nome Completo
- **Mínimo**: 2 caracteres
- **Máximo**: 80 caracteres
- **Obrigatório**: Após trimming

## Integração com o Frontend

### Componente PerfilTab
O componente foi atualizado para:
1. **Carregar dados** da tabela profiles
2. **Criar perfil** automaticamente se não existir
3. **Salvar alterações** na tabela profiles
4. **Manter compatibilidade** com auth.users metadata

### Sincronização Automática
- Dados são mantidos sincronizados entre auth.users e profiles
- Frontend prioriza dados da tabela profiles
- Fallback para auth.users metadata quando necessário

## Estrutura Final

```sql
-- Tabela principal
public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  phone text,
  avatar_url text,
  bio text,
  preferences jsonb,
  created_at timestamptz,
  updated_at timestamptz
)

-- View combinada
public.user_profiles (
  -- Dados do app_users
  id, email, role, created_by,
  user_created_at, user_updated_at,
  
  -- Dados do profiles
  full_name, phone, avatar_url, bio, preferences,
  profile_created_at, profile_updated_at,
  
  -- Campos computados
  display_name, effective_avatar
)
```

## Verificação Pós-Migração

Após aplicar a migração, verifique:

1. **Tabela criada**: `SELECT * FROM profiles LIMIT 1;`
2. **RLS ativo**: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'profiles';`
3. **Triggers funcionando**: Criar um usuário teste
4. **View disponível**: `SELECT * FROM user_profiles LIMIT 1;`

## Rollback (se necessário)

Para reverter a migração:
```sql
DROP VIEW IF EXISTS public.user_profiles;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.sync_user_profile();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.profiles;
```

⚠️ **Atenção**: O rollback irá apagar todos os dados de perfil armazenados.
