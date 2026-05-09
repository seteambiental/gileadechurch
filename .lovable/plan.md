## Mensagens automáticas para Contato de Emergência

Criar uma rotina completa para envio de mensagens via WhatsApp aos **contatos de emergência** dos participantes de eventos (Impacto e Agenda com inscrição), com configuração por evento, envios automáticos recorrentes, envio manual e novas colunas/filtros nos relatórios.

---

### 1. Banco de dados (migration)

Nova tabela `evento_emergencia_config` (1 registro por evento):
- `evento_id` (uuid, único) — referência ao evento (Impacto ou Agenda)
- `evento_tipo` (text: `impacto` | `agenda`)
- `mensagem_inicial` (text) — enviada na confirmação da inscrição
- `mensagem_recorrente` (text) — enviada periodicamente
- `enviar_recorrente` (bool) — liga/desliga
- `frequencia_dias` (int) — intervalo entre envios (ex: 7)
- `data_inicio_recorrencia` (date) — quando começar os envios automáticos
- `ativo` (bool, default true)
- RLS: leitura/escrita por admin, pastor_geral, pastor_auxiliar e líderes de ministério

Nova tabela `emergencia_envios_log`:
- `inscricao_id`, `evento_id`, `evento_tipo`
- `tipo_envio` (`inicial` | `recorrente` | `manual`)
- `telefone_destino`, `nome_contato_emergencia`, `nome_participante`
- `mensagem_enviada` (text)
- `status` (`enviado` | `falhou`), `erro` (text nullable)
- `enviado_em` (timestamp)
- `enviado_por` (uuid → members, nullable para automático)
- RLS: leitura por admin/pastores; escrita via edge function (service role)

Os campos de contato de emergência já existem em `impacto_inscricoes` e `inscricoes_eventos` (`telefone_emergencia`, `nome_responsavel`/`nome_emergencia`). Vou usar os existentes.

---

### 2. Painel de Configurações — nova aba "Contato de Emergência"

Localização: `WhatsappConfiguracaoPage.tsx` (ou criar nova subpágina dentro de Configurações).

UI:
- Select de evento (lista eventos futuros e em andamento de `impacto_eventos` + `agenda_igreja` com inscrição aberta)
- Textarea **Mensagem inicial** (com placeholders: `{NOME}`, `{NOME_COMPLETO}`, `{EVENTO}`, `{NOME_EMERGENCIA}`, `{DATA_EVENTO}`)
- Switch **Enviar mensagens recorrentes**
- Textarea **Mensagem recorrente**
- Input numérico **Frequência (dias)**
- Date picker **Início da recorrência**
- Botão Salvar (upsert por evento_id)
- Lista os eventos já configurados abaixo, com edit/delete

---

### 3. Edge Functions

**`enviar-emergencia-evento`** (nova):
- Body: `{ tipo: 'inicial'|'manual', inscricaoId?, eventoId, eventoTipo, mensagemOverride? }`
- Busca inscrição, telefone de emergência, monta mensagem (substitui placeholders), enfileira via `whatsapp-queue` ou envia direto via `enviar-whatsapp`, registra em `emergencia_envios_log`.
- Para `manual` sem `inscricaoId`: envia para TODAS as inscrições aprovadas/pagas do evento, respeitando delay aleatório 15-30s entre cada uma (memória anti-SPAM).

**`processar-emergencia-recorrente`** (nova, agendada via pg_cron diário às 9h):
- Itera sobre `evento_emergencia_config` com `enviar_recorrente = true` e `ativo = true`.
- Filtra eventos cuja data ainda não passou.
- Verifica se hoje cai no intervalo configurado (último envio + frequência_dias).
- Para cada inscrição confirmada, dispara mensagem recorrente respeitando delay.
- Atualiza log.

**Ganchos de "envio inicial"**:
- Em `ImpactoInscricoesTab` (aprovação) e `JiuJitsuInscricoesTab` ao confirmar/aprovar inscrição → chamar `enviar-emergencia-evento` com `tipo: 'inicial'` (best-effort, igual `dispararMensagemInscricaoRecebida`).
- Adicionar helper em `src/lib/whatsapp-notifications.ts`: `dispararMensagemEmergenciaInicial`.

---

### 4. Aba de Inscrições — Botão de envio manual

Em `ImpactoInscricoesTab.tsx` (e equivalente Agenda):
- Novo botão no header: **"Enviar p/ Contato Emergência"** (ícone Phone + WhatsApp).
- Abre dialog `EnvioEmergenciaDialog`:
  - Radio: **Todos os participantes** | **Selecionar participante**
  - Se "Selecionar": `MemberSearchSelect`-like baseado nas inscrições do evento (mostra nome + nome_emergencia + telefone_emergencia)
  - Preview da mensagem (preenchida com placeholders do primeiro participante)
  - Aviso: "Envios serão espaçados em 15-30s para evitar bloqueio."
  - Botão **Enviar**
- Mostra contador de envios realizados após processamento.

---

### 5. Relatórios — nova coluna

Em `ImpactoInscricoesTab` (relatório), `EventosFinalizadosTab`, `ImpactoFinanceiroTab`:
- Adicionar colunas: **Contato Emergência (nome)** e **Telefone Emergência**.
- Incluir nas exportações Excel (`ExportButton`).
- Adicionar `ColumnFilterPopover` por nome do contato e busca (`SearchInput` já filtra nome do participante; estender para também buscar `telefone_emergencia` e `nome_emergencia`).

---

### 6. Cron job

Inserir via `supabase--insert`:
```sql
select cron.schedule(
  'emergencia-recorrente-diaria',
  '0 12 * * *', -- 09:00 BRT
  $$ select net.http_post(
       url:='https://jwjmseeyjemfwgyizumk.supabase.co/functions/v1/processar-emergencia-recorrente',
       headers:='{"Content-Type":"application/json","apikey":"<anon>"}'::jsonb,
       body:='{}'::jsonb
     ); $$
);
```

---

### Arquivos criados

- `supabase/migrations/<timestamp>_emergencia_contato.sql`
- `supabase/functions/enviar-emergencia-evento/index.ts`
- `supabase/functions/processar-emergencia-recorrente/index.ts`
- `src/components/configuracoes/EmergenciaConfigTab.tsx`
- `src/components/impacto/EnvioEmergenciaDialog.tsx`

### Arquivos editados

- `src/lib/whatsapp-notifications.ts` (helper)
- `src/components/impacto/ImpactoInscricoesTab.tsx` (botão + colunas + filtros + gancho aprovação)
- `src/components/impacto/EventosFinalizadosTab.tsx` (colunas)
- `src/components/impacto/ImpactoFinanceiroTab.tsx` (colunas)
- `src/pages/WhatsappConfiguracaoPage.tsx` (nova aba "Contato Emergência")

---

### Observações

- Eventos encerrados (`data_evento < hoje` para Agenda; `data_fim < hoje` para Impacto) NUNCA recebem envios automáticos nem manuais — bloqueado em UI e na edge function.
- Todos os envios respeitam o **delay aleatório 15-30s** já estabelecido na memória do projeto.
- Substituição de placeholders reusa o utilitário `preencherTemplate` já existente em `enviar-whatsapp` (estendido com `{NOME_EMERGENCIA}`).
- Logs detalhados (conteúdo original × final) seguem o padrão recém-implementado em `processar-fila-whatsapp`.