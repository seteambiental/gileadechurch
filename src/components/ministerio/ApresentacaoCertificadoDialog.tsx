import { useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/date-utils";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import certBg from "@/assets/certificado-apresentacao-kids-clean.png.asset.json";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inscricao: {
    id: string;
    crianca_nome: string;
    pai_nome: string | null;
    pai_nao_identificado: boolean;
    mae_nome: string | null;
    mae_nao_identificado: boolean;
    crianca_data_nascimento: string | null;
    data_apresentacao: string | null;
  } | null;
}

const ApresentacaoCertificadoDialog = ({ open, onOpenChange, inscricao }: Props) => {
  const certRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  if (!inscricao) return null;

  const pai = inscricao.pai_nao_identificado ? null : inscricao.pai_nome;
  const mae = inscricao.mae_nao_identificado ? null : inscricao.mae_nome;
  const pais = [pai, mae].filter(Boolean).join(" & ") || "Não identificado";
  const nascimento = inscricao.crianca_data_nascimento
    ? format(parseLocalDate(inscricao.crianca_data_nascimento), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : "—";
  const dataObj = inscricao.data_apresentacao
    ? parseLocalDate(inscricao.data_apresentacao)
    : new Date();
  const dataCompleta = format(dataObj, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const handleDownload = async () => {
    if (!certRef.current) return;
    try {
      // Aguarda fontes customizadas carregarem antes de rasterizar
      if ((document as any).fonts?.ready) {
        await (document as any).fonts.ready;
      }
      // Garante que todas as imagens (inclusive o fundo) estejam decodificadas
      const imgs = Array.from(certRef.current.querySelectorAll("img"));
      await Promise.all(
        imgs.map((img) =>
          img.complete && img.naturalWidth > 0
            ? Promise.resolve()
            : new Promise((res) => {
                img.onload = () => res(null);
                img.onerror = () => res(null);
              }),
        ),
      );
      const canvas = await html2canvas(certRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("landscape", "mm", "a4");
      const w = pdf.internal.pageSize.getWidth();
      const h = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, "PNG", 0, 0, w, h);
      pdf.save(`certificado-apresentacao-${inscricao.crianca_nome}.pdf`);

      await (supabase as any)
        .from("apresentacao_criancas")
        .update({ certificado_emitido: true })
        .eq("id", inscricao.id);
      queryClient.invalidateQueries({ queryKey: ["apresentacao-criancas-culto"] });
      toast({ title: "Certificado gerado com sucesso" });
    } catch {
      toast({ title: "Erro ao gerar certificado", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Certificado de Apresentação</DialogTitle>
        </DialogHeader>

        <div className="flex justify-end mb-4">
          <Button onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" /> Baixar PDF
          </Button>
        </div>

        <div className="w-full overflow-x-auto">
          {/* Template base: 1920x1390. Todos os elementos posicionados neste sistema de coordenadas. */}
          <div
            ref={certRef}
            style={{
              width: 1920,
              height: 1390,
              position: "relative",
              fontFamily: "'Coolvetica', system-ui, sans-serif",
              transform: "scale(0.52)",
              transformOrigin: "top left",
              marginBottom: `${1390 * -0.48}px`,
              backgroundColor: "#fff",
            }}
          >
            <img
              src={certBg.url}
              alt=""
              crossOrigin="anonymous"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                pointerEvents: "none",
              }}
            />
            {/* Área de texto — reescrita por cima do template em branco */}
            <div
              style={{
                position: "absolute",
                left: 660,
                right: 90,
                top: 470,
                display: "flex",
                flexDirection: "column",
                color: "#1f2937",
              }}
            >
              {/* Nome da criança em fonte manuscrita */}
              <div
                style={{
                  fontFamily: "'BillionDreams', cursive",
                  fontWeight: 700,
                  fontSize: 84,
                  color: "#3730b8",
                  lineHeight: 1,
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  paddingBottom: 24,
                }}
              >
                {inscricao.crianca_nome}
              </div>

              {/* Linha separadora abaixo do nome */}
              <div
                style={{
                  borderTop: "2px solid #4b5563",
                  marginBottom: 40,
                }}
              />

              {/* Filiação */}
              <div style={{ fontSize: 38, lineHeight: 1.35, marginBottom: 10 }}>
                <span>Filho(a) de </span>
                <span style={{ fontWeight: 700 }}>{pais}</span>
              </div>

              {/* Data de nascimento */}
              <div style={{ fontSize: 38, lineHeight: 1.35, marginBottom: 40 }}>
                <span>Nascido(a) em: </span>
                <span style={{ fontWeight: 700 }}>{nascimento}</span>
              </div>

              {/* Texto de apresentação */}
              <div style={{ fontSize: 34, lineHeight: 1.45 }}>
                Foi apresentado(a) ao Senhor, em nome do Pai, do Filho e do
                Espírito Santo, conforme o mandamento do Senhor Jesus Cristo,
                à luz do relato do Evangelho de Lucas 2:22–40.
              </div>

              {/* Rodapé — data e pastor colados na base */}
              <div style={{ marginTop: 60 }}>
                <div style={{ fontSize: 36, lineHeight: 1.4 }}>
                  Curitiba, <span style={{ fontWeight: 700 }}>{dataCompleta}</span>
                </div>
                <div style={{ fontSize: 36, lineHeight: 1.4, marginTop: 6 }}>
                  Pastor Adalberto Derzette
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApresentacaoCertificadoDialog;
