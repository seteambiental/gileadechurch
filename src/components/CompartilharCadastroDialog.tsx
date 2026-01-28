import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, Share2, Download } from "lucide-react";
import html2canvas from "html2canvas";
import { useRef } from "react";

interface CompartilharCadastroDialogProps {
  trigger?: React.ReactNode;
}

export const CompartilharCadastroDialog = ({
  trigger,
}: CompartilharCadastroDialogProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const baseUrl = window.location.origin;
  const linkCadastro = `${baseUrl}/#cadastro`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(linkCadastro).then(() => {
      setCopied(true);
      toast({
        title: "Link copiado!",
        description: "O link de cadastro foi copiado para a área de transferência.",
      });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });
      
      const link = document.createElement("a");
      link.download = "cadastro-gileade-church.png";
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast({
        title: "Imagem baixada!",
        description: "A imagem foi salva com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao baixar",
        description: "Não foi possível gerar a imagem.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Share2 className="w-4 h-4" />
            Compartilhar Cadastro
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Compartilhar Cadastro</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Card para Download */}
          <div
            ref={cardRef}
            className="p-6 bg-white rounded-xl space-y-4"
          >
            {/* Header */}
            <div className="text-center space-y-2">
              <h3 className="font-heading font-bold text-xl text-gray-900">
                Gileade Church
              </h3>
              <p className="text-sm text-gray-600">
                Um Lugar de Cura e Restauração
              </p>
            </div>

            {/* QR Code */}
            <div className="flex justify-center py-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <QRCodeSVG
                  value={linkCadastro}
                  size={160}
                  level="H"
                  includeMargin={false}
                  fgColor="#dc2626"
                />
              </div>
            </div>

            {/* Call to Action */}
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold text-gray-900">
                Faça parte da nossa família!
              </p>
              <p className="text-sm text-gray-600">
                Escaneie o QR Code ou acesse o link abaixo para se cadastrar
              </p>
            </div>

            {/* Link Display */}
            <div className="p-3 bg-gray-100 rounded-lg text-center">
              <p className="text-xs text-gray-500 mb-1">Link de cadastro:</p>
              <p className="text-sm font-mono text-red-600 break-all">
                {linkCadastro}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCopyLink}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Link
                </>
              )}
            </Button>
            <Button
              variant="default"
              className="flex-1"
              onClick={handleDownloadImage}
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar Imagem
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
