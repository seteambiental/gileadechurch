import { useRef } from "react";
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
import { useToast } from "@/hooks/use-toast";
import certBg from "@/assets/certificado-batismo-clean.jpg.asset.json";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inscricao: {
    id: string;
    nome: string;
    data_batismo: string | null;
  } | null;
}

// Template base: 1600 x 1140 (proporção original do JPG). Todas as
// coordenadas abaixo referem-se a esse sistema.
const BatismoCertificadoDialog = ({ open, onOpenChange, inscricao }: Props) => {
  const certRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  if (!inscricao) return null;

  const dataObj = inscricao.data_batismo
    ? parseLocalDate(inscricao.data_batismo)
    : new Date();
  const dataCompleta = `Curitiba, ${format(dataObj, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`;

  const handleDownload = async () => {
    if (!certRef.current) return;
    try {
      if ((document as any).fonts?.ready) {
        await (document as any).fonts.ready;
      }
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
      pdf.save(`certificado-batismo-${inscricao.nome}.pdf`);
      toast({ title: "Certificado gerado com sucesso" });
    } catch {
      toast({ title: "Erro ao gerar certificado", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Certificado de Batismo</DialogTitle>
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
              width: 1600,
              height: 1140,
              position: "relative",
              fontFamily: "'Coolvetica', system-ui, sans-serif",
              transform: "scale(0.62)",
              transformOrigin: "top left",
              marginBottom: `${1140 * -0.38}px`,
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

            {/* Nome do batizando — sobre a linha central */}
            <div
              style={{
                position: "absolute",
                left: 290,
                right: 270,
                top: 470,
                textAlign: "center",
                fontFamily: "'PinyonScript', cursive",
                fontWeight: 400,
                fontSize: 64,
                color: "#000000",
                lineHeight: 1.6,
                paddingBottom: 24,
                whiteSpace: "nowrap",
              }}
            >
              {inscricao.nome}
            </div>

            {/* Título do pastor — substitui "Pastor Presidente" no rodapé */}
            <div
              style={{
                position: "absolute",
                left: 300,
                right: 300,
                top: 980,
                textAlign: "center",
                fontFamily: "'PinyonScript', cursive",
                fontWeight: 400,
                fontSize: 40,
                color: "#000000",
                lineHeight: 1,
                whiteSpace: "nowrap",
                backgroundColor: "#ffffff",
                padding: "4px 16px",
              }}
            >
              PASTOR SENIOR GILEADE CHURCH
            </div>

            {/* Data — canto direito, sobre a linha "Data" */}
            <div
              style={{
                position: "absolute",
                left: 880,
                right: 200,
                top: 935,
                textAlign: "center",
                fontFamily: "'PinyonScript', cursive",
                fontWeight: 400,
                fontSize: 36,
                color: "#000000",
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
            >
              {dataCompleta}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BatismoCertificadoDialog;