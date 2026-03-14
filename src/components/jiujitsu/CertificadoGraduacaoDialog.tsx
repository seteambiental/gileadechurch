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
import { parseLocalDate } from "@/lib/date-utils";
import { ptBR } from "date-fns/locale";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graduacao: any;
}

export function CertificadoGraduacaoDialog({ open, onOpenChange, graduacao }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  if (!graduacao) return null;

  const nomeAluno = graduacao.jiujitsu_alunos?.nome || "";
  const dataFormatada = graduacao.data_graduacao
    ? format(parseLocalDate(graduacao.data_graduacao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : "";

  const handleDownload = async () => {
    if (!ref.current) return;
    const canvas = await html2canvas(ref.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("landscape", "mm", "a4");
    const w = pdf.internal.pageSize.getWidth();
    const h = pdf.internal.pageSize.getHeight();
    pdf.addImage(imgData, "PNG", 0, 0, w, h);
    pdf.save(`certificado-graduacao-${nomeAluno}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Certificado de Graduação</DialogTitle>
        </DialogHeader>

        <div className="flex justify-end mb-4">
          <Button onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" /> Baixar PDF
          </Button>
        </div>

        <div
          ref={ref}
          className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-lg border-4 border-double border-amber-500"
          style={{ aspectRatio: "297/210" }}
        >
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 text-white">
            <p className="text-sm uppercase tracking-[0.3em] text-amber-400">Ministério de Jiu-Jitsu</p>

            <div>
              <h1 className="text-4xl font-serif font-bold tracking-wide">CERTIFICADO</h1>
              <p className="text-lg mt-1 text-slate-300">de Graduação</p>
            </div>

            <div className="w-32 h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 rounded-full" />

            <p className="text-lg text-slate-300">
              Certificamos que
            </p>

            <h2 className="text-3xl font-serif font-bold text-amber-100">
              {nomeAluno}
            </h2>

            <p className="text-lg text-slate-300 max-w-xl">
              foi graduado(a) da faixa <strong className="text-white">{graduacao.faixa_anterior}</strong> para a faixa{" "}
              <strong className="text-amber-400">{graduacao.faixa_nova}</strong>
              {graduacao.graus > 0 && <span> com <strong className="text-amber-400">{graduacao.graus} grau(s)</strong></span>}
            </p>

            <div className="w-24 h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 rounded-full" />

            <div className="pt-4 space-y-6 w-full max-w-lg">
              <p className="text-slate-400">{dataFormatada}</p>

              <div className="flex justify-center gap-16 pt-4">
                {graduacao.professor && (
                  <div className="text-center">
                    <div className="w-40 border-b border-amber-500/50 mb-2" />
                    <p className="text-sm text-slate-400">{graduacao.professor}</p>
                    <p className="text-xs text-slate-500">Professor</p>
                  </div>
                )}
                <div className="text-center">
                  <div className="w-40 border-b border-amber-500/50 mb-2" />
                  <p className="text-sm text-slate-400">Pastor</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
