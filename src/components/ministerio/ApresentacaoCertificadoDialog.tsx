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
import logoGileade from "@/assets/logo-gileade.jpeg";
import certBg from "@/assets/certificado-apresentacao-bg.jpg";
import assinaturaPastor from "@/assets/assinatura-pastor.png.asset.json";

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
  const dataApres = inscricao.data_apresentacao
    ? format(parseLocalDate(inscricao.data_apresentacao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const handleDownload = async () => {
    if (!certRef.current) return;
    try {
      const canvas = await html2canvas(certRef.current, { scale: 2, useCORS: true });
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
          <div
            ref={certRef}
            style={{
              width: 1000,
              height: 707,
              backgroundImage: `url(${certBg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              position: "relative",
              fontFamily: "'Segoe UI', system-ui, sans-serif",
            }}
          >
            {/* Logo topo direito */}
            <img
              src={logoGileade}
              alt="Gileade"
              crossOrigin="anonymous"
              style={{ position: "absolute", top: 48, right: 60, width: 90, height: 90, borderRadius: "50%", objectFit: "cover" }}
            />

            {/* Área de texto */}
            <div style={{ position: "absolute", top: 70, left: 355, right: 60 }}>
              <h1
                style={{
                  color: "#3b2ecc",
                  fontWeight: 800,
                  fontSize: 52,
                  lineHeight: 1.05,
                  margin: 0,
                  letterSpacing: "-1px",
                }}
              >
                Certificado de<br />Apresentação
              </h1>

              <div style={{ marginTop: 26, width: "90%" }}>
                <p
                  style={{
                    fontFamily: "'Dancing Script', cursive",
                    fontSize: 46,
                    fontWeight: 700,
                    color: "#1f2937",
                    margin: 0,
                    lineHeight: 1.4,
                    paddingBottom: 8,
                  }}
                >
                  {inscricao.crianca_nome}
                </p>
                <div style={{ height: 2, backgroundColor: "#9ca3af", width: "100%" }} />
              </div>

              <div style={{ marginTop: 22, color: "#374151", fontSize: 19 }}>
                <p style={{ margin: "0 0 6px" }}>
                  Filho(a) de <strong>{pais}</strong>
                </p>
                <p style={{ margin: 0 }}>
                  Nascido(a) em: <strong>{nascimento}</strong>
                </p>
              </div>

              <p style={{ marginTop: 22, color: "#4b5563", fontSize: 18, lineHeight: 1.5, maxWidth: 560 }}>
                Foi apresentado(a) ao Senhor, em nome do Pai, do Filho e do
                Espírito Santo, conforme o mandamento do Senhor Jesus Cristo,
                à luz do relato do Evangelho de Lucas 2:22–40.
              </p>
            </div>

            {/* Local, data e assinatura */}
            <div style={{ position: "absolute", bottom: 60, left: 355, right: 60, color: "#374151", fontSize: 18 }}>
              <img
                src={assinaturaPastor.url}
                alt="Assinatura"
                crossOrigin="anonymous"
                style={{ height: 70, marginBottom: -8, marginLeft: 4 }}
              />
              <p style={{ margin: 0, fontWeight: 600 }}>Pastor Adalberto Derzette</p>
              <p style={{ margin: "2px 0 0", fontSize: 15, color: "#6b7280" }}>Pastor Sênior Gileade Church</p>
              <p style={{ margin: "10px 0 0" }}>Curitiba, dia {dataApres}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApresentacaoCertificadoDialog;
