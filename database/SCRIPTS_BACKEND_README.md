# Sistema de Scripts - Backend Completo

## 🎯 Visão Geral

Sistema robusto e escalável para gerenciar scripts de social selling com controle de acesso hierárquico e diferentes níveis de visibilidade.

## 📊 Estrutura de Dados

### Tabela `scripts`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | `uuid` (PK) | Identificador único do script |
| `owner_id` | `uuid` (FK) | Referência para `app_users.id` - quem criou o script |
| `title` | `text` | Nome/título do script |
| `tags` | `text[]` | Array de tags para categorização |
| `content` | `text` | Conteúdo do script (suporta Markdown) |
| `visibility` | `script_visibility` | Nível de visibilidade: `private`, `team`, `public` |
| `created_at` | `timestamptz` | Data de criação (automática) |
| `updated_at` | `timestamptz` | Última atualização (automática) |

### Enum `script_visibility`

- **`private`**: Apenas o dono e seus ancestrais podem ver/editar
- **`team`**: Todo o time do criador pode ver, mas apenas o dono/ancestrais podem editar
- **`public`**: Todos os usuários podem ver, mas apenas o dono/admin podem editar

## 🔐 Sistema de Permissões

### Hierarquia de Acesso

```
Admin
├── Manager A
│   ├── User 1
│   └── User 2
└── Manager B
    ├── User 3
    └── User 4
```

### Regras de Permissão

1. **Admin**: Acesso total a todos os scripts
2. **Manager**: Pode ver/gerenciar seus scripts + scripts de usuários que criou
3. **User**: Pode ver/gerenciar apenas seus próprios scripts
4. **Hierarquia Transitiva**: Se A criou B e B criou C, então A pode gerenciar scripts de C

### Matriz de Visibilidade

| Visibilidade | Leitura | Escrita | Quem pode ver |
|-------------|---------|---------|---------------|
| `private` | Dono + Ancestrais | Dono + Ancestrais | Hierarquia limitada |
| `team` | Todo o time | Dono + Ancestrais | Time do criador |
| `public` | Todos | Dono + Admin | Todos os usuários |

## 🚀 API Endpoints

### 1. Listar Scripts

```sql
SELECT * FROM list_scripts(
    search_term TEXT DEFAULT NULL,      -- Busca em título e conteúdo
    tag_filter TEXT DEFAULT NULL,       -- Filtrar por tag específica
    visibility_filter script_visibility DEFAULT NULL, -- Filtrar por visibilidade
    limit_count INTEGER DEFAULT 50,     -- Limite de resultados
    offset_count INTEGER DEFAULT 0      -- Offset para paginação
);
```

**Exemplo:**
```sql
-- Buscar scripts do LinkedIn que são públicos
SELECT * FROM list_scripts('linkedin', 'prospecção', 'public', 10, 0);
```

### 2. Obter Script Específico

```sql
SELECT * FROM get_script(script_id UUID);
```

**Exemplo:**
```sql
SELECT * FROM get_script('123e4567-e89b-12d3-a456-426614174000');
```

### 3. Criar Script

```sql
SELECT create_script(
    script_title TEXT,                          -- Título obrigatório
    script_tags TEXT[] DEFAULT '{}',            -- Array de tags
    script_content TEXT DEFAULT '',             -- Conteúdo do script
    script_visibility script_visibility DEFAULT 'private' -- Visibilidade
) RETURNS UUID;
```

**Exemplo:**
```sql
SELECT create_script(
    'Script Prospecção LinkedIn',
    ARRAY['linkedin', 'prospecção', 'inicial'],
    'Olá {{nome}}, vi seu perfil no LinkedIn...',
    'team'
);
```

### 4. Atualizar Script

```sql
SELECT update_script(
    script_id UUID,
    script_title TEXT DEFAULT NULL,             -- Novo título (opcional)
    script_tags TEXT[] DEFAULT NULL,            -- Novas tags (opcional)
    script_content TEXT DEFAULT NULL,           -- Novo conteúdo (opcional)
    script_visibility script_visibility DEFAULT NULL -- Nova visibilidade (opcional)
) RETURNS BOOLEAN;
```

**Exemplo:**
```sql
SELECT update_script(
    '123e4567-e89b-12d3-a456-426614174000',
    'Script Atualizado',
    ARRAY['linkedin', 'follow-up'],
    'Conteúdo atualizado...',
    'public'
);
```

### 5. Deletar Script

```sql
SELECT delete_script(script_id UUID) RETURNS BOOLEAN;
```

**Exemplo:**
```sql
SELECT delete_script('123e4567-e89b-12d3-a456-426614174000');
```

### 6. Estatísticas

```sql
SELECT * FROM get_scripts_stats();
```

**Retorna:**
- `total_scripts`: Total de scripts visíveis para o usuário
- `my_scripts`: Scripts próprios do usuário
- `team_scripts`: Scripts do time visíveis
- `public_scripts`: Scripts públicos
- `total_tags`: Número total de tags únicas

## 🛡️ Segurança (RLS)

### Políticas Implementadas

1. **SELECT**: Usuários veem apenas scripts que têm permissão (baseado em hierarquia + visibilidade)
2. **INSERT**: Usuários podem criar apenas scripts para si mesmos (`owner_id = auth.uid()`)
3. **UPDATE**: Usuários podem atualizar apenas scripts que podem gerenciar
4. **DELETE**: Usuários podem deletar apenas scripts que podem gerenciar

### Funções de Segurança

- `can_manage_script(manager_id, owner_id)`: Verifica se um usuário pode gerenciar scripts de outro
- `can_view_script(viewer_id, owner_id, visibility)`: Verifica se um usuário pode visualizar um script

## ⚡ Performance

### Índices Criados

- `idx_scripts_owner_id`: Busca por dono do script
- `idx_scripts_visibility`: Filtro por visibilidade
- `idx_scripts_created_at`: Ordenação por data de criação
- `idx_scripts_updated_at`: Ordenação por última atualização
- `idx_scripts_tags`: Busca por tags (GIN index)
- `idx_scripts_search`: Busca de texto completo (título + conteúdo)

### Otimizações

- Triggers automáticos para `updated_at`
- Busca de texto otimizada com PostgreSQL FTS
- Índices GIN para arrays de tags
- Constraints para validação de dados

## 🔧 Validações

### Validações Automáticas

1. **Título**: Não pode ser vazio ou apenas espaços
2. **Tags**: Array válido (pode ser vazio)
3. **Conteúdo**: Não pode ser NULL
4. **Visibilidade**: Deve ser um valor válido do enum
5. **Owner**: Sempre definido como `auth.uid()` na criação

### Tratamento de Erros

- **400**: Dados inválidos (título vazio, etc.)
- **403**: Sem permissão para acessar/editar/deletar
- **404**: Script não encontrado
- **500**: Erro interno do servidor

## 📝 Exemplos de Uso

### Cenário 1: Manager criando script para o time

```sql
-- Manager cria script público
SELECT create_script(
    'Script Padrão de Follow-up',
    ARRAY['whatsapp', 'follow-up', 'padrão'],
    'Olá {{nome}}, estou passando para acompanhar...',
    'team'
);
```

### Cenário 2: Usuário buscando scripts do LinkedIn

```sql
-- Buscar todos os scripts públicos do LinkedIn
SELECT * FROM list_scripts('linkedin', NULL, 'public');
```

### Cenário 3: Admin acessando estatísticas

```sql
-- Ver estatísticas gerais
SELECT * FROM get_scripts_stats();
```

## 🧪 Testes

### Arquivo de Validação

Execute `18_scripts_validation.sql` para:
- Validar estrutura da tabela
- Verificar políticas RLS
- Testar funções auxiliares
- Validar índices e performance
- Executar cenários de teste

### Cenários Testados

1. ✅ Criação de scripts com dados válidos
2. ✅ Validação de título vazio
3. ✅ Controle de acesso hierárquico
4. ✅ Filtros de busca e visibilidade
5. ✅ Permissões de edição/exclusão
6. ✅ Performance com índices

## 🚀 Instalação

### 1. Executar Scripts

```bash
# No Supabase Dashboard SQL Editor, execute na ordem:
1. 17_scripts_backend.sql    # Estrutura principal
2. 18_scripts_validation.sql # Validações e testes
```

### 2. Verificar Instalação

```sql
-- Verificar se tudo foi criado
SELECT * FROM test_scripts_scenarios();
```

### 3. Testar Funcionalidade

```sql
-- Teste básico (substitua por ID real de usuário)
SELECT create_script('Teste', ARRAY['teste'], 'Conteúdo de teste');
```

## 📋 Checklist de Implementação

- [x] Tabela `scripts` criada
- [x] Enum `script_visibility` implementado
- [x] Políticas RLS configuradas
- [x] Funções API implementadas
- [x] Validações de dados
- [x] Índices de performance
- [x] Triggers automáticos
- [x] Funções de segurança
- [x] Sistema de hierarquia
- [x] Testes de validação
- [x] Documentação completa

## 🔄 Próximos Passos

1. **Integração Frontend**: Implementar hooks React para consumir as APIs
2. **Interface de Usuário**: Criar componentes para CRUD de scripts
3. **Busca Avançada**: Implementar filtros combinados
4. **Templates**: Sistema de templates pré-definidos
5. **Analytics**: Métricas de uso dos scripts
6. **Import/Export**: Funcionalidade de backup/restore

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs do Supabase
2. Execute os testes de validação
3. Consulte a documentação das funções
4. Verifique as políticas RLS

---

**Sistema implementado com foco em escalabilidade, segurança e facilidade de manutenção.**
