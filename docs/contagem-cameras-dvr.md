# Contagem automática de pessoas com câmeras (DVR Intelbras)

Guia para automatizar a contagem de cultos usando as câmeras que já existem na
igreja (ligadas a um DVR Intelbras), **sem expor o DVR à internet**.

## Visão geral do fluxo (recomendado e seguro)

```
Câmera → DVR Intelbras (rede local)
          │  RTSP (somente dentro da rede)
          ▼
   PC local / Mini-PC / Raspberry Pi
   (roda visão computacional: YOLO + contagem de linha)
          │  HTTPS  (envia só o número: entrada/saída)
          ▼
   Endpoint do sistema  →  Painel de Contagem em tempo real
```

O DVR **nunca** é exposto à internet. O PC local lê o vídeo dentro da rede e
manda apenas o evento de "entrada" ou "saída" para o sistema.

## 1. Descobrir a URL RTSP do DVR Intelbras

A maioria dos DVRs Intelbras (linha MHDX) usa este formato:

```
rtsp://USUARIO:SENHA@IP_DO_DVR:554/cam/realmonitor?channel=N&subtype=1
```

- `USUARIO` / `SENHA`: login do DVR (crie um usuário só para isso).
- `IP_DO_DVR`: IP do DVR na rede local (ex.: `192.168.0.10`).
- `channel=N`: número do canal/câmera (ex.: a câmera da porta principal).
- `subtype=1`: stream secundário (resolução menor, ideal para detecção).

Teste a URL no VLC: **Mídia → Abrir Fluxo de Rede** e cole o endereço.

## 2. Pegar o endpoint da sessão de contagem

No sistema, abra **Contagem de Cultos**, inicie uma sessão e clique no botão
**"Câmera"** — ele copia uma URL como esta:

```
https://SEU-PROJETO.supabase.co/functions/v1/contagem-culto?token=XXXX&tipo=entrada
```

Guarde o `token` — é ele que liga o script à sessão certa.

## 3. Script de contagem (PC local)

Veja `docs/contagem-camera-exemplo.py`. Ele lê o RTSP do DVR, detecta pessoas
com YOLO, conta quando alguém cruza uma linha virtual e chama o endpoint
`contagem-culto` com `tipo=entrada` ou `tipo=saida`.

### Instalação no PC local

```bash
pip install ultralytics opencv-python requests
```

### Execução

```bash
python contagem-camera-exemplo.py
```

Ajuste no topo do script: `RTSP_URL`, `ENDPOINT_BASE`, `TOKEN` e a posição da
linha de contagem (`LINHA_Y`).

## 4. Acesso remoto (se necessário)

Se precisar acessar de fora da igreja, use **VPN** (ex.: WireGuard no roteador).
**Nunca** abra a porta do DVR direto na internet — DVRs são um dos alvos mais
atacados.

## Alternativa sem custo (manual)

Enquanto não automatiza, use o DVR só para ver a porta e clique nos botões
**+1 / −1** de Entradas e Saídas na tela de Contagem de Cultos. Já funciona hoje.
