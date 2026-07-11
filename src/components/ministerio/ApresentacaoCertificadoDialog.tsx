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
  const pais = [pai, mae].filter(Boolean).join(" e ");
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
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Certificado de Apresentação</DialogTitle>
        </DialogHeader>

        <div className="flex justify-end mb-4">
          <Button onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" /> Baixar PDF
          </Button>
        </div>

        <div
          ref={certRef}
          className="bg-gradient-to-br from-amber-50 to-orange-50 p-8 rounded-lg border-8 border-double border-amber-600"
          style={{ aspectRatio: "297/210" }}
        >
          <div className="h-full flex flex-col items-center justify-center text-center space-y-5">
            <img src={logoGileade} alt="Gileade" className="w-16 h-16 rounded-full object-cover" crossOrigin="anonymous" />
            <div className="text-amber-800">
              <h1 className="text-4xl font-serif font-bold tracking-wide">CERTIFICADO</h1>
              <p className="text-lg mt-1">de Apresentação de Criança</p>
            </div>

            <div className="w-32 h-1 bg-gradient-to-r from-amber-400 via-amber-600 to-amber-400 rounded-full" />

            <p className="text-lg text-gray-700">A Igreja Gileade apresentou ao Senhor a criança</p>

            <h2 className="text-3xl font-serif font-bold text-amber-900">
              {inscricao.crianca_nome}
            </h2>

            {pais && (
              <p className="text-lg text-gray-700 max-w-2xl">
                filho(a) de <strong>{pais}</strong>
              </p>
            )}

            <p className="text-base text-gray-600 max-w-2xl italic">
              "Deixai vir a mim os pequeninos, e não os impeçais, porque dos tais é o Reino de Deus." — Marcos 10:14
            </p>

            <div className="w-24 h-1 bg-gradient-to-r from-amber-400 via-amber-600 to-amber-400 rounded-full" />

            <div className="pt-2 space-y-6 w-full max-w-lg">
              <p className="text-gray-600">{dataApres}</p>
              <div className="flex justify-center gap-16 pt-2">
                <div className="text-center">
                  <div className="w-40 border-b border-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Liderança</p>
                </div>
                <div className="text-center">
                  <div className="w-40 border-b border-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Pastor</p>
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
