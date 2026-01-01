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
import { Download, Printer } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface CertificadoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  casal: any;
  turma: any;
}

export function CertificadoDialog({ open, onOpenChange, casal, turma }: CertificadoDialogProps) {
  const certificadoRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  if (!casal || !turma) return null;

  const nomeEsposo = casal.membro_masculino?.full_name || casal.nome_masculino || "";
  const nomeEsposa = casal.membro_feminino?.full_name || casal.nome_feminino || "";
  const dataAtual = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const handleDownload = async () => {
    if (!certificadoRef.current) return;

    try {
      const canvas = await html2canvas(certificadoRef.current, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("landscape", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`certificado-${nomeEsposo}-${nomeEsposa}.pdf`);

      // Marcar certificado como emitido
      await supabase
        .from("casais_inscritos")
        .update({ certificado_emitido: true, data_certificado: new Date().toISOString().split("T")[0] })
        .eq("id", casal.id);

      queryClient.invalidateQueries({ queryKey: ["casais_inscritos"] });
      toast({ title: "Certificado baixado com sucesso" });
    } catch (error) {
      toast({ title: "Erro ao gerar certificado", variant: "destructive" });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Certificado de Conclusão</DialogTitle>
        </DialogHeader>

        <div className="flex justify-end gap-2 mb-4">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          <Button onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Baixar PDF
          </Button>
        </div>

        <div
          ref={certificadoRef}
          className="bg-gradient-to-br from-amber-50 to-orange-50 p-8 rounded-lg border-8 border-double border-amber-600"
          style={{ aspectRatio: "297/210" }}
        >
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
            <div className="text-amber-800">
              <h1 className="text-4xl font-serif font-bold tracking-wide">CERTIFICADO</h1>
              <p className="text-lg mt-1">de Conclusão</p>
            </div>

            <div className="w-32 h-1 bg-gradient-to-r from-amber-400 via-amber-600 to-amber-400 rounded-full" />

            <p className="text-lg text-gray-700">
              Certificamos que o casal
            </p>

            <div className="space-y-2">
              <h2 className="text-3xl font-serif font-bold text-amber-900">
                {nomeEsposo}
              </h2>
              <p className="text-xl text-amber-700">&</p>
              <h2 className="text-3xl font-serif font-bold text-amber-900">
                {nomeEsposa}
              </h2>
            </div>

            <p className="text-lg text-gray-700 max-w-xl">
              concluiu com êxito o <strong>Curso de Casais</strong> - {turma.nome}
              {turma.data_inicio && turma.data_fim && (
                <span className="block mt-1">
                  realizado de {format(new Date(turma.data_inicio + "T00:00:00"), "dd/MM/yyyy")} a{" "}
                  {format(new Date(turma.data_fim + "T00:00:00"), "dd/MM/yyyy")}
                </span>
              )}
            </p>

            <div className="w-24 h-1 bg-gradient-to-r from-amber-400 via-amber-600 to-amber-400 rounded-full" />

            <div className="pt-4 space-y-6 w-full max-w-lg">
              <p className="text-gray-600">{dataAtual}</p>
              
              <div className="flex justify-center gap-16 pt-4">
                <div className="text-center">
                  <div className="w-40 border-b border-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Liderança do Ministério</p>
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
}
