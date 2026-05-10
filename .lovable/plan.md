## Objetivo

Quando o evento criado for do tipo **Apresentação de Crianças**, o sistema deve gerar um link de inscrição específico, voltado para o cadastro **dos pais da criança a ser apresentada**. Os pais que ainda não são membros poderão se cadastrar (e ao seu cônjuge), e esses cadastros entrarão como **solicitação de cadastro pendente de aprovação**, mas já ficam disponíveis na lista suspensa para concluir a inscrição da apresentação.

## Fluxo proposto

```text
Admin cria evento "Apresentação de Crianças"
        │
        ▼
Sistema gera link público /inscricao/apresentacao/:eventoId
(além do botão "Compartilhar" já existente)
        │
        ▼
Pretendente abre o link
        │
        ├── Seleciona PAI na lista suspensa (membros + solicitações já feitas)
        │       └── Se não encontrar: clicar em "Cadastrar novo"
        │              ├── Pergunta: "É membro da Igreja Gileade?" (Sim / Não)
        │              ├── Preenche cadastro completo (mesma estrutura de MemberRequestForm)
        │              ├── Opção "Adicionar cônjuge" → abre 2º cadastro com endereço/CR/condomínio compartilhados
        │              └── Salva como solicitação (status pendente) e já fica disponível na lista
        │
        ├── Seleciona MÃE (mesma lógica)
        │
        ├── Dados da CRIANÇA a ser apresentada (nome, data nasc., gênero)
        │
        └── Confirma inscrição da apresentação
```

## Mudanças no código

### 1. `src/components/agenda/EventoFormDialog.tsx`
- Quando `tipo_evento === 'apresentacao_criancas'`:
  - Marcar evento como tendo formulário de inscrição habilitado.
  - Mostrar bloco extra na ficha do evento com link público `/inscricao/apresentacao/:id`, botão **Copiar link** e botão **Compartilhar** (igual ao `CompartilharInscricaoDialog` existente, mas apontando para a rota nova).

### 2. Nova página `src/pages/InscricaoApresentacaoCriancas.tsx`
- Rota pública: `/inscricao/apresentacao/:eventoId` (registrada antes das rotas dinâmicas em `App.tsx`).
- Estrutura de formulário com 3 blocos: **Pai**, **Mãe**, **Criança**.
- Cada bloco de pai/mãe usa um componente reutilizável `<ResponsavelSelect />`:
  - Combo com busca em `members_safe` + em `member_requests` aprovadas e pendentes (apenas `nome`, `id`).
  - Botão "Não encontrei → Cadastrar novo" abre dialog inline.
- Submit cria registro em `inscricoes_eventos` (ou tabela específica `apresentacao_criancas_inscricoes` — ver decisão técnica) referenciando `pai_id`, `mae_id` (member ou request) e dados da criança.

### 3. Cadastro inline do responsável (novo componente)
- `src/components/inscricao-apresentacao/CadastroResponsavelDialog.tsx`
- Reaproveita validações/máscaras de `MemberRequestForm.tsx`.
- Etapas:
  1. Pergunta inicial: "É membro da Igreja Gileade?" (sim/não).
  2. Formulário completo de membro (nome, CPF, data nasc., gênero, WhatsApp, endereço, CR/condomínio, foto, etc.).
  3. Switch **"Adicionar cônjuge"** → abre segundo formulário pré-preenchendo endereço, CR/condomínio, telefone alternativo do casal.
- Ao salvar:
  - Chama edge function `criar-solicitacao-membro` (já existe) para gravar como `member_requests` com status `pendente`.
  - Retorna `id` da solicitação para ser usado imediatamente como `pai_id`/`mae_id` na inscrição da apresentação.

### 4. Backend
- **Não cria nova tabela** se possível: usar `inscricoes_eventos` com colunas existentes + JSONB `dados_extras` para guardar `pai_id`, `mae_id`, `crianca_nome`, `crianca_data_nasc`, `crianca_genero`. Se preferirem rastreabilidade dedicada, criar `apresentacao_criancas_inscricoes` (perguntar antes — ver dúvidas).
- Edge function `criar-solicitacao-membro` precisa aceitar parâmetro opcional `conjuge: {...}` para gravar duas solicitações vinculadas (campo `solicitacao_vinculada_id`).
- Lista suspensa do responsável usa view/RPC pública (`members_safe` + `member_requests` filtradas) — criar RPC `buscar_responsaveis_publico(termo text)` com `security definer` para evitar expor dados sensíveis.

### 5. `src/App.tsx`
- Registrar rota `/inscricao/apresentacao/:eventoId` antes de rotas dinâmicas.

## Pontos a confirmar antes da implementação

1. **Persistência da inscrição da apresentação**: usar a tabela genérica `inscricoes_eventos` com campos extras em JSONB, ou criar tabela dedicada `apresentacao_criancas_inscricoes`?
2. **Aprovação do cadastro pendente**: o cadastro recém-criado deve aparecer na lista suspensa **imediatamente** (mesmo pendente) ou só depois da aprovação? O texto sugere "imediatamente" — confirmar.
3. **Cadastro do cônjuge**: deve ser obrigatório ou opcional? Se a pessoa marcar "casada", o sistema obriga preencher o cônjuge?
4. **Foto**: o cadastro público hoje exige foto. Para esse fluxo expresso vamos manter a foto obrigatória ou deixar opcional (já que o casal pode estar fazendo no celular sem fotos prontas)?

Após confirmar esses pontos, parto para a implementação.