# Backend da Página "Clientes" - Implementação Completa

## 🎯 Visão Geral

Este documento descreve a implementação completa do backend para o gerenciamento de clientes, incluindo todas as funcionalidades especificadas: CRUD completo, vinculação de planilhas Google Sheets, hierarquia de permissões e audit log.

## 📋 Estrutura Implementada

### Tabela `clients` Atualizada

```sql
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  name text NOT NULL,
  segment text,
  temperature text CHECK (temperature IN ('frio', 'morno', 'quente')),
  budget text, -- Faixa de faturamento (ex: "50-100k")
  notes text,
  goals jsonb DEFAULT '{}', -- Metas em formato JSON
  sheet_url text, -- URL da planilha Google Sheets
  sheet_tab text, -- Aba da planilha
  sheet_mapping jsonb, -- Mapeamento de colunas
  sheet_status text CHECK (sheet_status IN ('not_linked', 'linked_pending', 'linked_warn', 'linked_ok')) DEFAULT 'not_linked',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Campos Principais

- **`goals`**: Armazena metas em formato JSON (`{"respostas": 10, "reunioes": 5, "vendas": 2, "faturamento": 30000}`)
- **`temperature`**: Valores em português (`frio`, `morno`, `quente`)
- **`sheet_*`**: Campos para integração com Google Sheets
- **`sheet_status`**: Status da conexão com a planilha

## 🔧 Funções da API Implementadas

### 1. `list_clients()` - Listar Clientes
```sql
SELECT * FROM public.list_clients(
  search_term := 'Cliente', 
  segment_filter := 'Tecnologia',
  temperature_filter := 'quente',
  status_filter := 'linked_pending'
);
```

**Retorna**: Lista de clientes com informações do proprietário, respeitando hierarquia de permissões.

### 2. `get_client()` - Obter Cliente Específico
```sql
SELECT * FROM public.get_client('cliente-uuid-aqui');
```

**Retorna**: Detalhes completos do cliente incluindo informações da planilha vinculada.

### 3. `create_client()` - Criar Cliente
```sql
SELECT * FROM public.create_client(
  client_name := 'Novo Cliente',
  client_segment := 'Educação',
  client_temperature := 'morno',
  client_budget := '100-300k',
  client_notes := 'Observações',
  client_goals := '{"respostas": 20, "reunioes": 10}'::jsonb
);
```

**Validações**: Temperatura válida, permissão de criação, estrutura de goals.

### 4. `update_client()` - Atualizar Cliente
```sql
SELECT * FROM public.update_client(
  client_id := 'cliente-uuid-aqui',
  client_name := 'Nome Atualizado',
  client_temperature := 'quente'
);
```

**Nota**: Atualiza apenas campos fornecidos (não nulos).

### 5. `link_client_sheet()` - Vincular Planilha
```sql
SELECT * FROM public.link_client_sheet(
  client_id := 'cliente-uuid-aqui',
  sheet_url_param := 'https://docs.google.com/spreadsheets/d/...',
  sheet_tab_param := 'Prospecções',
  sheet_mapping_param := '{"Nome": "nome", "Email": "email"}'::jsonb
);
```

**Validações**: URL válida do Google Sheets, permissão de edição.

### 6. `unlink_client_sheet()` - Desvincular Planilha
```sql
SELECT * FROM public.unlink_client_sheet('cliente-uuid-aqui');
```

### 7. `delete_client()` - Deletar Cliente
```sql
SELECT * FROM public.delete_client('cliente-uuid-aqui');
```

### 8. `get_client_segments()` - Listar Segmentos
```sql
SELECT * FROM public.get_client_segments();
```

**Retorna**: Lista de segmentos únicos com contagem para filtros do frontend.

## 🔒 Sistema de Permissões

### Hierarquia Implementada

1. **Admin**: 
   - Vê e gerencia todos os clientes
   - Pode criar clientes para qualquer usuário
   - Acesso completo ao audit log

2. **Manager**: 
   - Vê e gerencia seus próprios clientes
   - Vê e gerencia clientes dos usuários que criou (descendentes)
   - Hierarquia transitiva (se A criou B, e B criou C, A vê C)

3. **User**: 
   - Vê e gerencia apenas seus próprios clientes
   - Não pode criar clientes para outros usuários

### Políticas RLS Aplicadas

```sql
-- Todas as operações respeitam can_manage(auth.uid(), owner_id)
CREATE POLICY clients_select ON public.clients 
FOR SELECT TO authenticated 
USING (public.can_manage(auth.uid(), owner_id));

-- Políticas similares para INSERT, UPDATE, DELETE
```

## 📊 Audit Log Completo

### Tabela `client_audit_log`

Registra automaticamente todas as operações:
- Criação de clientes
- Atualizações (com dados antes/depois)
- Exclusões
- Vinculação/desvinculação de planilhas

```sql
-- Consultar audit log
SELECT 
  action,
  created_at,
  old_data,
  new_data
FROM public.client_audit_log
WHERE client_id = 'cliente-uuid-aqui'
ORDER BY created_at DESC;
```

## ✅ Validações Implementadas

### 1. Temperatura
- Apenas valores válidos: `frio`, `morno`, `quente`
- Constraint no banco + validação nas funções

### 2. Goals (Metas)
```sql
-- Estrutura válida
{"respostas": 10, "reunioes": 5, "vendas": 2, "faturamento": 30000}

-- Todos os campos são opcionais, mas devem ser números se presentes
```

### 3. URL de Planilha Google Sheets
```sql
-- Formato válido
https://docs.google.com/spreadsheets/d/[ID_DA_PLANILHA]
```

### 4. Permissões Hierárquicas
- Função `can_manage()` valida todas as operações
- RLS garante isolamento automático dos dados

## 🚀 Como Executar

### 1. Pré-requisitos
Certifique-se de que os scripts básicos (01-08) já foram executados:
- Tabelas básicas (app_users, etc.)
- Funções de autorização (can_manage, is_admin, etc.)
- Políticas RLS básicas

### 2. Execução Principal
Execute o arquivo principal no Supabase Dashboard:

```sql
-- Copie e cole o conteúdo de EXECUTE_CLIENTS_BACKEND.sql
-- no SQL Editor do Supabase Dashboard
```

### 3. Verificação
```sql
-- Testar se tudo foi criado corretamente
SELECT 'Tabela clients' as item, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') 
            THEN '✅ OK' ELSE '❌ ERRO' END as status
UNION ALL
SELECT 'Função list_clients', 
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'list_clients') 
            THEN '✅ OK' ELSE '❌ ERRO' END
UNION ALL
SELECT 'Audit log', 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_audit_log') 
            THEN '✅ OK' ELSE '❌ ERRO' END;
```

## 🧪 Testes Disponíveis

O arquivo `12_clients_test_scenarios.sql` contém cenários completos de teste:

1. **Teste de Hierarquia**: Verifica se Admin vê tudo, Manager vê descendentes, User vê apenas próprios
2. **Teste de API**: Valida todas as funções CRUD
3. **Teste de Validações**: Confirma que dados inválidos são rejeitados
4. **Teste de Performance**: Verifica comportamento com muitos registros
5. **Teste de Audit Log**: Confirma que todas as ações são registradas

## 📱 Integração com Frontend

### Exemplo de Uso no React/TypeScript

```typescript
// Listar clientes
const { data: clients } = await supabase.rpc('list_clients', {
  search_term: 'Cliente',
  segment_filter: 'Tecnologia',
  temperature_filter: 'quente'
});

// Criar cliente
const { data: newClient } = await supabase.rpc('create_client', {
  client_name: 'Novo Cliente',
  client_segment: 'Educação',
  client_temperature: 'morno',
  client_goals: { respostas: 20, reunioes: 10 }
});

// Vincular planilha
const { data: linked } = await supabase.rpc('link_client_sheet', {
  client_id: clientId,
  sheet_url_param: 'https://docs.google.com/spreadsheets/d/...',
  sheet_tab_param: 'Prospecções',
  sheet_mapping_param: { Nome: 'nome', Email: 'email' }
});
```

## 🔍 Status de Planilha

| Status | Descrição | Ação no Frontend |
|--------|-----------|------------------|
| `not_linked` | Não vinculada | Mostrar botão "Vincular Planilha" |
| `linked_pending` | Aguardando sync | Mostrar "Vinculada (aguardando)" |
| `linked_warn` | Com alertas | Mostrar ícone de aviso |
| `linked_ok` | Funcionando | Mostrar ícone de sucesso |

## 🛡️ Segurança

- **RLS Habilitado**: Todas as tabelas têm Row Level Security
- **Funções SECURITY DEFINER**: Executam com privilégios elevados mas controlados
- **Validações Múltiplas**: No banco + nas funções + constraints
- **Audit Trail**: Todas as ações são rastreadas
- **Hierarquia Transitiva**: Permissões respeitam cadeia de criação

## 📈 Performance

- **Índices Otimizados**: Em owner_id, temperature, segment, sheet_status
- **Queries Eficientes**: JOINs otimizados com app_users
- **RLS Performático**: Usa funções indexadas (can_manage)
- **Audit Log Indexado**: Por client_id, user_id e data

## 🔄 Próximos Passos

1. **Sincronização de Planilhas**: Implementar sync real com Google Sheets API
2. **Notificações**: Alertas quando sheet_status muda
3. **Relatórios**: Dashboards baseados nos dados de goals
4. **Backup**: Estratégia de backup para client_audit_log
5. **Monitoramento**: Métricas de uso das funções da API

---

**Implementação Completa** ✅
- Todas as funcionalidades especificadas implementadas
- Testes abrangentes incluídos
- Documentação completa
- Pronto para uso em produção

