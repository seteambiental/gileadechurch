"""
Exemplo de contagem de pessoas a partir de uma câmera/DVR (RTSP) enviando
eventos de entrada/saída para o sistema da igreja.

Rode em um PC/Mini-PC/Raspberry Pi DENTRO da rede da igreja.
O DVR nunca é exposto à internet: só o número de pessoas sai pela porta HTTPS.

Dependências:
    pip install ultralytics opencv-python requests
"""

import time
import cv2
import requests
from ultralytics import YOLO

# ----------------------- CONFIGURAÇÃO -----------------------
# URL RTSP do DVR Intelbras (use o stream secundário: subtype=1)
RTSP_URL = "rtsp://usuario:senha@192.168.0.10:554/cam/realmonitor?channel=1&subtype=1"

# Endpoint do sistema (copie no botão "Câmera" da tela de Contagem de Cultos)
ENDPOINT_BASE = "https://SEU-PROJETO.supabase.co/functions/v1/contagem-culto"
TOKEN = "COLE_O_TOKEN_DA_SESSAO_AQUI"

# Posição da linha virtual (em pixels, no eixo vertical). Quem cruza de cima
# para baixo = entrada; de baixo para cima = saída. Ajuste para sua câmera.
LINHA_Y = 300

# Modelo YOLO leve (baixa automaticamente na primeira execução)
MODELO = "yolov8n.pt"
CLASSE_PESSOA = 0  # COCO: 0 = person
# ------------------------------------------------------------


def enviar_evento(tipo: str):
    """Envia 'entrada' ou 'saida' para o sistema."""
    try:
        r = requests.get(
            ENDPOINT_BASE,
            params={"token": TOKEN, "tipo": tipo},
            timeout=5,
        )
        print(f"[{tipo}] -> {r.status_code} {r.text[:120]}")
    except Exception as e:
        print(f"Falha ao enviar {tipo}: {e}")


def main():
    model = YOLO(MODELO)
    cap = cv2.VideoCapture(RTSP_URL)
    if not cap.isOpened():
        print("Não foi possível abrir o RTSP. Confira URL/usuário/senha/IP.")
        return

    # Guarda a última posição Y conhecida de cada pessoa rastreada
    ultima_pos = {}

    print("Contagem iniciada. Ctrl+C para parar.")
    while True:
        ok, frame = cap.read()
        if not ok:
            print("Frame perdido, tentando reconectar...")
            time.sleep(1)
            cap.open(RTSP_URL)
            continue

        # track() mantém IDs estáveis entre frames
        resultados = model.track(
            frame, persist=True, classes=[CLASSE_PESSOA], verbose=False
        )

        if resultados and resultados[0].boxes.id is not None:
            boxes = resultados[0].boxes
            ids = boxes.id.int().tolist()
            xyxy = boxes.xyxy.tolist()

            for pid, box in zip(ids, xyxy):
                cy = (box[1] + box[3]) / 2  # centro vertical da pessoa
                anterior = ultima_pos.get(pid)
                if anterior is not None:
                    if anterior < LINHA_Y <= cy:
                        enviar_evento("entrada")
                    elif anterior > LINHA_Y >= cy:
                        enviar_evento("saida")
                ultima_pos[pid] = cy

    cap.release()


if __name__ == "__main__":
    main()