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
import { Download, Printer, Loader2 } from "lucide-react";
import { toast } from "sonner";

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

export const CarteirinhaDialog = ({
  open,
  onOpenChange,
  crianca,
  turma,
}: CarteirinhaDialogProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [localNumero, setLocalNumero] = useState<number | null>(null);

  // Reset localNumero when crianca changes
  useEffect(() => {
    setLocalNumero(crianca?.kidsNumero || null);
  }, [crianca?.id, crianca?.kidsNumero]);

  // Mutation to generate and save kids number
  const generateNumeroMutation = useMutation({
    mutationFn: async () => {
      if (!crianca) throw new Error("No crianca");
      
      // Get next number using RPC function
      const { data: nextNum, error: rpcError } = await supabase
        .rpc("get_next_kids_numero");
      
      if (rpcError) throw rpcError;
      
      // Save to the correct table
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

  const handlePrint = () => {
    const printContent = cardRef.current?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Carteirinha - ${crianca.nome}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
            body {
              font-family: 'Poppins', sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: #f5f5f5;
            }
            .card {
              width: 350px;
              background: white;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, ${turma.cor_hex}, ${adjustColor(turma.cor_hex, -20)});
              color: white;
              padding: 20px;
              text-align: center;
            }
            .header h1 {
              font-size: 20px;
              font-weight: 700;
              margin: 0;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            .header .turma-badge {
              display: inline-block;
              background: rgba(255,255,255,0.25);
              padding: 4px 16px;
              border-radius: 20px;
              margin-top: 8px;
              font-size: 14px;
              font-weight: 600;
            }
            .content {
              padding: 24px;
            }
            .photo-container {
              display: flex;
              justify-content: center;
              margin-bottom: 20px;
            }
            .photo {
              width: 100px;
              height: 100px;
              border-radius: 50%;
              border: 4px solid ${turma.cor_hex};
              object-fit: cover;
              background: #e5e7eb;
            }
            .photo-placeholder {
              width: 100px;
              height: 100px;
              border-radius: 50%;
              border: 4px solid ${turma.cor_hex};
              background: linear-gradient(135deg, ${turma.cor_hex}20, ${turma.cor_hex}40);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 40px;
              font-weight: 700;
              color: ${turma.cor_hex};
            }
            .info-row {
              display: flex;
              margin-bottom: 12px;
              align-items: flex-start;
            }
            .info-label {
              font-size: 11px;
              color: #6b7280;
              text-transform: uppercase;
              font-weight: 600;
              width: 100px;
              flex-shrink: 0;
            }
            .info-value {
              font-size: 14px;
              color: #1f2937;
              font-weight: 500;
            }
            .numero-container {
              background: linear-gradient(135deg, ${turma.cor_hex}15, ${turma.cor_hex}25);
              padding: 16px;
              border-radius: 12px;
              text-align: center;
              margin-top: 16px;
            }
            .numero-label {
              font-size: 11px;
              color: #6b7280;
              text-transform: uppercase;
              font-weight: 600;
            }
            .numero-value {
              font-size: 32px;
              font-weight: 700;
              color: ${turma.cor_hex};
              margin-top: 4px;
            }
            @media print {
              body { background: white; }
              .card { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownload = async () => {
    const printContent = cardRef.current?.innerHTML;
    if (!printContent) return;

    // Create a blob with HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Carteirinha - ${crianca.nome}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
            body {
              font-family: 'Poppins', sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: #f5f5f5;
            }
            .card {
              width: 350px;
              background: white;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, ${turma.cor_hex}, ${adjustColor(turma.cor_hex, -20)});
              color: white;
              padding: 20px;
              text-align: center;
            }
            .header h1 {
              font-size: 20px;
              font-weight: 700;
              margin: 0;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            .header .turma-badge {
              display: inline-block;
              background: rgba(255,255,255,0.25);
              padding: 4px 16px;
              border-radius: 20px;
              margin-top: 8px;
              font-size: 14px;
              font-weight: 600;
            }
            .content {
              padding: 24px;
            }
            .photo-container {
              display: flex;
              justify-content: center;
              margin-bottom: 20px;
            }
            .photo {
              width: 100px;
              height: 100px;
              border-radius: 50%;
              border: 4px solid ${turma.cor_hex};
              object-fit: cover;
              background: #e5e7eb;
            }
            .photo-placeholder {
              width: 100px;
              height: 100px;
              border-radius: 50%;
              border: 4px solid ${turma.cor_hex};
              background: linear-gradient(135deg, ${turma.cor_hex}20, ${turma.cor_hex}40);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 40px;
              font-weight: 700;
              color: ${turma.cor_hex};
            }
            .info-row {
              display: flex;
              margin-bottom: 12px;
              align-items: flex-start;
            }
            .info-label {
              font-size: 11px;
              color: #6b7280;
              text-transform: uppercase;
              font-weight: 600;
              width: 100px;
              flex-shrink: 0;
            }
            .info-value {
              font-size: 14px;
              color: #1f2937;
              font-weight: 500;
            }
            .numero-container {
              background: linear-gradient(135deg, ${turma.cor_hex}15, ${turma.cor_hex}25);
              padding: 16px;
              border-radius: 12px;
              text-align: center;
              margin-top: 16px;
            }
            .numero-label {
              font-size: 11px;
              color: #6b7280;
              text-transform: uppercase;
              font-weight: 600;
            }
            .numero-value {
              font-size: 32px;
              font-weight: 700;
              color: ${turma.cor_hex};
              margin-top: 4px;
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `carteirinha-${crianca.nome.toLowerCase().replace(/\s+/g, "-")}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Carteirinha - {crianca.nome}</DialogTitle>
        </DialogHeader>

        <div
          ref={cardRef}
          className="card"
          style={{
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
          }}
        >
          {/* Header */}
          <div
            className="header"
            style={{
              background: `linear-gradient(135deg, ${turma.cor_hex}, ${adjustColor(turma.cor_hex, -20)})`,
              color: "white",
              padding: "20px",
              textAlign: "center",
            }}
          >
            <h1
              style={{
                fontSize: "20px",
                fontWeight: 700,
                margin: 0,
                textTransform: "uppercase",
                letterSpacing: "2px",
              }}
            >
              Pequenos Gileaditas
            </h1>
            <div
              className="turma-badge"
              style={{
                display: "inline-block",
                background: "rgba(255,255,255,0.25)",
                padding: "4px 16px",
                borderRadius: "20px",
                marginTop: "8px",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              PG {turma.nome_exibicao}
            </div>
          </div>

          {/* Content */}
          <div className="content" style={{ padding: "24px", background: "white" }}>
            {/* Photo */}
            <div
              className="photo-container"
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "20px",
              }}
            >
              {crianca.foto ? (
                <img
                  src={crianca.foto}
                  alt={crianca.nome}
                  className="photo"
                  style={{
                    width: "100px",
                    height: "100px",
                    borderRadius: "50%",
                    border: `4px solid ${turma.cor_hex}`,
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  className="photo-placeholder"
                  style={{
                    width: "100px",
                    height: "100px",
                    borderRadius: "50%",
                    border: `4px solid ${turma.cor_hex}`,
                    background: `linear-gradient(135deg, ${turma.cor_hex}20, ${turma.cor_hex}40)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "40px",
                    fontWeight: 700,
                    color: turma.cor_hex,
                  }}
                >
                  {crianca.nome.charAt(0)}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="info-row" style={{ display: "flex", marginBottom: "12px" }}>
              <span
                className="info-label"
                style={{
                  fontSize: "11px",
                  color: "#6b7280",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  width: "100px",
                  flexShrink: 0,
                }}
              >
                Nome
              </span>
              <span
                className="info-value"
                style={{ fontSize: "14px", color: "#1f2937", fontWeight: 500 }}
              >
                {crianca.nome}
              </span>
            </div>

            <div className="info-row" style={{ display: "flex", marginBottom: "12px" }}>
              <span
                className="info-label"
                style={{
                  fontSize: "11px",
                  color: "#6b7280",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  width: "100px",
                  flexShrink: 0,
                }}
              >
                Responsável
              </span>
              <span
                className="info-value"
                style={{ fontSize: "14px", color: "#1f2937", fontWeight: 500 }}
              >
                {crianca.responsavelNome || "-"}
              </span>
            </div>

            <div className="info-row" style={{ display: "flex", marginBottom: "12px" }}>
              <span
                className="info-label"
                style={{
                  fontSize: "11px",
                  color: "#6b7280",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  width: "100px",
                  flexShrink: 0,
                }}
              >
                WhatsApp
              </span>
              <span
                className="info-value"
                style={{ fontSize: "14px", color: "#1f2937", fontWeight: 500 }}
              >
                {formatWhatsapp(crianca.responsavelWhatsapp)}
              </span>
            </div>

            {/* Número */}
            <div
              className="numero-container"
              style={{
                background: `linear-gradient(135deg, ${turma.cor_hex}15, ${turma.cor_hex}25)`,
                padding: "16px",
                borderRadius: "12px",
                textAlign: "center",
                marginTop: "16px",
              }}
            >
              <div
                className="numero-label"
                style={{
                  fontSize: "11px",
                  color: "#6b7280",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Nº Identificação
              </div>
              <div
                className="numero-value"
                style={{
                  fontSize: "32px",
                  fontWeight: 700,
                  color: turma.cor_hex,
                  marginTop: "4px",
                }}
              >
                {displayNumero?.toString().padStart(4, "0") || "----"}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 mt-4">
          {!displayNumero && (
            <Button 
              onClick={() => generateNumeroMutation.mutate()}
              disabled={generateNumeroMutation.isPending}
              className="w-full"
              style={{ backgroundColor: turma.cor_hex }}
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
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleDownload} disabled={!displayNumero}>
              <Download className="h-4 w-4 mr-2" />
              Baixar
            </Button>
            <Button onClick={handlePrint} disabled={!displayNumero}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Helper function to adjust color brightness
function adjustColor(hex: string, amount: number): string {
  const clamp = (num: number) => Math.min(255, Math.max(0, num));

  let color = hex.replace("#", "");
  if (color.length === 3) {
    color = color
      .split("")
      .map((c) => c + c)
      .join("");
  }

  const r = clamp(parseInt(color.slice(0, 2), 16) + amount);
  const g = clamp(parseInt(color.slice(2, 4), 16) + amount);
  const b = clamp(parseInt(color.slice(4, 6), 16) + amount);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
