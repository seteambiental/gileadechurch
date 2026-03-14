import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aluno: any;
}

const FAIXA_BG: Record<string, string> = {
  Branca: "bg-white text-gray-900 border-gray-300",
  Azul: "bg-blue-600 text-white border-blue-800",
  Roxa: "bg-purple-700 text-white border-purple-900",
  Marrom: "bg-amber-800 text-white border-amber-950",
  Preta: "bg-gray-950 text-white border-gray-700",
};

export function CarteirinhaDialog({ open, onOpenChange, aluno }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  if (!aluno) return null;

  const handleDownload = async () => {
    if (!ref.current) return;
    const canvas = await html2canvas(ref.current, { scale: 3 });
    const link = document.createElement("a");
    link.download = `carteirinha-${aluno.nome}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const grausDisplay = aluno.graus > 0
    ? Array.from({ length: aluno.graus }, () => "●").join(" ")
    : "Sem graus";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Carteirinha Digital</DialogTitle>
        </DialogHeader>

        <div className="flex justify-end mb-3">
          <Button size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" /> Baixar
          </Button>
        </div>

        <div
          ref={ref}
          className="rounded-xl overflow-hidden shadow-2xl border"
          style={{ aspectRatio: "85.6/53.98" }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-3 flex items-center justify-between">
            <div>
              <p className="text-amber-400 text-xs font-bold uppercase tracking-widest">Ministério de Jiu-Jitsu</p>
              <p className="text-slate-400 text-[10px]">Igreja Gileade</p>
            </div>
            <span className="text-2xl">🥋</span>
          </div>

          {/* Body */}
          <div className="bg-white px-5 py-4 flex gap-4">
            {/* Photo placeholder */}
            <div className="w-20 h-24 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
              {aluno.foto_url ? (
                <img src={aluno.foto_url} alt={aluno.nome} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <span className="text-3xl text-slate-300">👤</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 text-sm leading-tight truncate">{aluno.nome}</h3>
              {aluno.tipo_sanguineo && (
                <p className="text-[10px] text-slate-500 mt-0.5">Tipo Sanguíneo: {aluno.tipo_sanguineo}</p>
              )}

              <div className="mt-2 flex items-center gap-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${FAIXA_BG[aluno.faixa] || FAIXA_BG.Branca}`}>
                  {aluno.faixa}
                </span>
                <span className="text-xs text-slate-500">{grausDisplay}</span>
              </div>

              <p className="text-[10px] text-slate-400 mt-2">
                {aluno.tipo === "membro" ? "Membro da Igreja" : "Visitante"}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-slate-50 px-5 py-2 border-t flex items-center justify-between">
            <p className="text-[9px] text-slate-400">ID: {aluno.id?.slice(0, 8).toUpperCase()}</p>
            <div className="w-12 h-12 bg-slate-200 rounded flex items-center justify-center">
              <span className="text-[8px] text-slate-400">QR</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
