import { useRef, useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";

interface CarteirinhaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  crianca: {
    id: string;
    nome: string;
    foto: string | null;
    kidsNumero: number | null;
    responsavelNome: string | null;
    responsavelWhatsapp: string | null;
    tipo: "membro" | "novo_convertido";
  } | null;
  turma: {
    nome_exibicao: string;
    cor_hex: string;
  };
}

const CARD_WIDTH = 340;
const CARD_HEIGHT = 214;

const adjustColor = (hex: string, percent: number) => {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return `#${(
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  )
    .toString(16)
    .slice(1)}`;
};

export const CarteirinhaDialog = ({
  open,
  onOpenChange,
  crianca,
  turma,
}: CarteirinhaDialogProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [localNumero, setLocalNumero] = useState<number | null>(null);

  useEffect(() => {
    setLocalNumero(crianca?.kidsNumero || null);
  }, [crianca?.id, crianca?.kidsNumero]);

  const generateNumeroMutation = useMutation({
    mutationFn: async () => {
      if (!crianca) throw new Error("No crianca");
      
      const { data: nextNum, error: rpcError } = await supabase.rpc("get_next_kids_numero");
      if (rpcError) throw rpcError;
      
      if (crianca.tipo === "novo_convertido") {
        const { error } = await supabase
          .from("novos_convertidos")
          .update({ kids_numero: nextNum })
          .eq("id", crianca.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("members")
          .update({ kids_numero: nextNum })
          .eq("id", crianca.id);
        if (error) throw error;
      }
      
      return nextNum;
    },
    onSuccess: (numero) => {
      setLocalNumero(numero);
      queryClient.invalidateQueries({ queryKey: ["novos-convertidos-kids"] });
      queryClient.invalidateQueries({ queryKey: ["members-kids"] });
      toast.success("Número gerado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao gerar número:", error);
      toast.error("Erro ao gerar número");
    },
  });

  if (!crianca) return null;

  const displayNumero = localNumero || crianca.kidsNumero;

  const formatWhatsapp = (phone: string | null) => {
    if (!phone) return "-";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const qrCodeData = JSON.stringify({
    id: crianca.id,
    numero: displayNumero,
    nome: crianca.nome,
    turma: turma.nome_exibicao,
  });

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const corDark = adjustColor(turma.cor_hex, -30);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Carteirinha - ${crianca.nome}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Poppins', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f5f5; }
            .card { width: ${CARD_WIDTH}px; height: ${CARD_HEIGHT}px; background: linear-gradient(135deg, ${turma.cor_hex}, ${corDark}); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.2); display: flex; flex-direction: column; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; padding: 12px 16px 8px; }
            .logo-text { color: white; }
            .logo-text h1 { font-size: 14px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 2px; }
            .logo-text .turma-badge { font-size: 10px; background: rgba(255,255,255,0.25); padding: 2px 10px; border-radius: 10px; font-weight: 600; }
            .numero-badge { background: white; color: ${turma.cor_hex}; padding: 4px 10px; border-radius: 8px; font-size: 16px; font-weight: 700; }
            .content { display: flex; flex: 1; padding: 0 16px 12px; gap: 12px; }
            .photo-section { display: flex; flex-direction: column; align-items: center; gap: 6px; }
            .photo { width: 70px; height: 70px; border-radius: 10px; border: 3px solid white; object-fit: cover; background: white; }
            .photo-placeholder { width: 70px; height: 70px; border-radius: 10px; border: 3px solid white; background: rgba(255,255,255,0.3); display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700; color: white; }
            .qr-container { background: white; padding: 4px; border-radius: 6px; }
            .info-section { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 6px; }
            .info-row { display: flex; flex-direction: column; }
            .info-label { font-size: 8px; color: rgba(255,255,255,0.7); text-transform: uppercase; font-weight: 600; }
            .info-value { font-size: 11px; color: white; font-weight: 600; }
            .info-value.nome { font-size: 14px; font-weight: 700; }
            .footer { background: rgba(0,0,0,0.15); padding: 6px 16px; display: flex; justify-content: space-between; }
            .footer-text { font-size: 8px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 1px; }
            @media print { body { background: white; } }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="logo-text">
                <h1>Pequenos Gileaditas</h1>
                <span class="turma-badge">PG ${turma.nome_exibicao}</span>
              </div>
              ${displayNumero ? `<div class="numero-badge">#${String(displayNumero).padStart(4, "0")}</div>` : ""}
            </div>
            <div class="content">
              <div class="photo-section">
                ${crianca.foto 
                  ? `<img src="${crianca.foto}" class="photo" />`
                  : `<div class="photo-placeholder">${crianca.nome.charAt(0)}</div>`
                }
                <div class="qr-container">
                  <svg width="48" height="48"><rect fill="#eee" width="48" height="48"/><text x="24" y="28" text-anchor="middle" font-size="8">QR</text></svg>
                </div>
              </div>
              <div class="info-section">
                <div class="info-row"><span class="info-label">Nome</span><span class="info-value nome">${crianca.nome}</span></div>
                <div class="info-row"><span class="info-label">Responsável</span><span class="info-value">${crianca.responsavelNome || "-"}</span></div>
                <div class="info-row"><span class="info-label">WhatsApp</span><span class="info-value">${formatWhatsapp(crianca.responsavelWhatsapp)}</span></div>
              </div>
            </div>
            <div class="footer">
              <span class="footer-text">Igreja Gileade</span>
              <span class="footer-text">Ministério Infantil</span>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownloadPNG = async () => {
    if (!cardRef.current) return;

    try {
      toast.loading("Gerando imagem...");
      
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      });

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `carteirinha-${crianca.nome.toLowerCase().replace(/\s+/g, "-")}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.dismiss();
      toast.success("Carteirinha baixada!");
    } catch (err) {
      toast.dismiss();
      toast.error("Erro ao gerar imagem");
      console.error(err);
    }
  };

  const corDark = adjustColor(turma.cor_hex, -30);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Carteirinha - {crianca.nome}</DialogTitle>
        </DialogHeader>

        <div
          ref={cardRef}
          className="mx-auto rounded-2xl overflow-hidden shadow-xl"
          style={{
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            background: `linear-gradient(135deg, ${turma.cor_hex}, ${corDark})`,
          }}
        >
          <div className="flex justify-between items-start p-3 pb-2">
            <div className="text-white">
              <h1 className="text-sm font-bold tracking-wide uppercase mb-0.5">
                Pequenos Gileaditas
              </h1>
              <span
                className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.25)" }}
              >
                PG {turma.nome_exibicao}
              </span>
            </div>
            {displayNumero && (
              <div
                className="font-bold text-base px-2.5 py-1 rounded-lg"
                style={{ background: "white", color: turma.cor_hex }}
              >
                #{String(displayNumero).padStart(4, "0")}
              </div>
            )}
          </div>

          <div className="flex gap-3 px-4 pb-3">
            <div className="flex flex-col items-center gap-1.5">
              {crianca.foto ? (
                <img
                  src={crianca.foto}
                  alt={crianca.nome}
                  className="w-[70px] h-[70px] rounded-xl border-[3px] border-white object-cover"
                />
              ) : (
                <div
                  className="w-[70px] h-[70px] rounded-xl border-[3px] border-white flex items-center justify-center text-3xl font-bold text-white"
                  style={{ background: "rgba(255,255,255,0.3)" }}
                >
                  {crianca.nome.charAt(0)}
                </div>
              )}
              <div className="bg-white p-1 rounded-md">
                <QRCodeSVG value={qrCodeData} size={48} level="L" />
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-1.5">
              <div>
                <span className="text-[8px] text-white/70 uppercase font-semibold tracking-wide block">
                  Nome
                </span>
                <span className="text-sm font-bold text-white">{crianca.nome}</span>
              </div>
              <div>
                <span className="text-[8px] text-white/70 uppercase font-semibold tracking-wide block">
                  Responsável
                </span>
                <span className="text-[11px] font-semibold text-white">
                  {crianca.responsavelNome || "-"}
                </span>
              </div>
              <div>
                <span className="text-[8px] text-white/70 uppercase font-semibold tracking-wide block">
                  WhatsApp
                </span>
                <span className="text-[11px] font-semibold text-white">
                  {formatWhatsapp(crianca.responsavelWhatsapp)}
                </span>
              </div>
            </div>
          </div>

          <div
            className="flex justify-between items-center px-4 py-1.5"
            style={{ background: "rgba(0,0,0,0.15)" }}
          >
            <span className="text-[8px] text-white/80 uppercase tracking-wider">
              Igreja Gileade
            </span>
            <span className="text-[8px] text-white/80 uppercase tracking-wider">
              Ministério Infantil
            </span>
          </div>
        </div>

        {!displayNumero && (
          <Button
            onClick={() => generateNumeroMutation.mutate()}
            disabled={generateNumeroMutation.isPending}
            className="w-full"
            style={{ background: turma.cor_hex }}
          >
            {generateNumeroMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              "Gerar Número de Identificação"
            )}
          </Button>
        )}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleDownloadPNG}>
            <ImageIcon className="h-4 w-4 mr-2" />
            Baixar PNG
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
