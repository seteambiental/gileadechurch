## Objetivo

Toda mensagem enviada pelo app passa a pedir a confirmação de recebimento ("Pode confirmar o recebimento desta mensagem? Responda **OK** ou 👍"). Quando a pessoa responde, o app captura essa resposta automaticamente e marca o envio como **Confirmado pelo destinatário**, dando certeza de que ela recebeu.

## Como vai funcionar

```text
App envia mensagem  ─►  ...texto da mensagem...
                         "🙏 Pode confirmar o recebimento? Responda OK ou 👍"

Pessoa responde "OK"/👍  ─►  WhatsApp ─► webhook do app
                                          │
                                          ▼
                         encontra o último envio para aquele número
                         (ainda não confirmado) e marca "Confirmado em <data>"
```

## Etapas

### 1. Banco de dados (migração)
Adicionar à tabela `comunicacao_envios`:
- `confirmacao_solicitada` (sim/não) — marca que a mensagem pediu confirmação
- `confirmado_em` (data/hora) — preenchido quando a pessoa responde
- `confirmacao_resposta` (texto) — guarda o que ela respondeu (ex.: "ok", "👍")

Adicionar a `whatsapp_config` um interruptor `pedir_confirmacao` (liga/desliga o recurso globalmente, ligado por padrão).

### 2. Envio (função `processar-fila-whatsapp`)
- Acrescentar automaticamente o rodapé de confirmação ao final de cada mensagem enviada (quando o interruptor estiver ligado).
- Ao registrar o envio em `comunicacao_envios`, marcar `confirmacao_solicitada = sim`.

### 3. Recebimento da resposta (função `wasender-webhook`)
- No evento `messages.received`, normalizar o número do remetente (mesmo padrão E.164 usado no envio).
- Localizar o envio mais recente para aquele número que pediu confirmação e ainda não foi confirmado (janela de ~7 dias).
- Gravar `confirmado_em = agora` e `confirmacao_resposta = texto recebido`.
- Qualquer resposta conta como confirmação de leitura (não exige texto exato), mas o conteúdo fica registrado.

### 4. Painel de auditoria (`ComunicacaoAuditoriaPage`)
- Nova coluna/etiqueta **"Confirmado"**: ✅ com data quando a pessoa respondeu, ou ⏳ "Aguardando confirmação".
- Filtro para ver rapidamente quem ainda **não confirmou** o recebimento.

## Observações
- Funciona para todas as mensagens automáticas enviadas pela fila (inscrições, eventos, etc.). Para o caso da JULLYA já enviado, valeria reenviar para testar.
- A correspondência é por número de telefone + tempo; se a pessoa responder muito depois (>7 dias) ou de outro número, não casa automaticamente — nesse caso fica no log de mensagens recebidas.
