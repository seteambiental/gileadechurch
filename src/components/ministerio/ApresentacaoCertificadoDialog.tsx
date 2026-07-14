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
import certBg from "@/assets/certificado-apresentacao-kids-bg.png.asset.json";

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
  const dataDia = format(dataObj, "dd", { locale: ptBR });
  const dataMes = format(dataObj, "MMMM", { locale: ptBR });
  const dataAno = format(dataObj, "yyyy", { locale: ptBR });

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
            {/* Nome da criança - fonte BillionDreams, sobre a linha */}
            <div
              style={{
                position: "absolute",
                left: 640,
                right: 100,
                top: 470,
                height: 150,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'BillionDreams', cursive",
                fontSize: 110,
                color: "#3730b8",
                lineHeight: 1,
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              {inscricao.crianca_nome}
            </div>

            {/* Nome dos pais - após "Filho(a) de " */}
            <div
              style={{
                position: "absolute",
                left: 836,
                top: 630,
                fontFamily: "'Coolvetica', sans-serif",
                fontSize: 44,
                color: "#1f2937",
                whiteSpace: "nowrap",
                lineHeight: 1,
              }}
            >
              {pais}
            </div>

            {/* Data de nascimento - após "Nascido(a) em: " */}
            <div
              style={{
                position: "absolute",
                left: 926,
                top: 674,
                fontFamily: "'Coolvetica', sans-serif",
                fontSize: 44,
                color: "#1f2937",
                whiteSpace: "nowrap",
                lineHeight: 1,
              }}
            >
              {nascimento}
            </div>

            {/* Dia da apresentação (preenche o 1º espaço em branco de "Curitiba, dia __ de __ de 2026") */}
            <div
              style={{
                position: "absolute",
                left: 843,
                top: 1095,
                fontFamily: "'Coolvetica', sans-serif",
                fontSize: 36,
                color: "#1f2937",
                whiteSpace: "nowrap",
                lineHeight: 1,
              }}
            >
              {dataDia}
            </div>

            {/* Mês da apresentação (preenche o 2º espaço em branco) */}
            <div
              style={{
                position: "absolute",
                left: 971,
                top: 1095,
                fontFamily: "'Coolvetica', sans-serif",
                fontSize: 36,
                color: "#1f2937",
                whiteSpace: "nowrap",
                lineHeight: 1,
              }}
            >
              {dataMes}
            </div>
            {/* dataAno referenciado para futura evolução do template */}
            <span style={{ display: "none" }}>{dataAno}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApresentacaoCertificadoDialog;
