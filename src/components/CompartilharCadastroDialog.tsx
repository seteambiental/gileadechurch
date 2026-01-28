import { useState, useRef } from "react";
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
import { Copy, Check, Share2, Download, ExternalLink } from "lucide-react";
import html2canvas from "html2canvas";
import heroImage from "@/assets/hero-grapes.jpg";

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
        backgroundColor: null,
        scale: 2,
        useCORS: true,
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

  const handleOpenLink = () => {
    window.open(linkCadastro, "_blank");
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
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-center">Compartilhar Cadastro</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-4">
          {/* Card para Download - com imagem de fundo */}
          <div
            ref={cardRef}
            className="relative rounded-xl overflow-hidden"
            style={{ minHeight: 420 }}
          >
            {/* Background Image */}
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${heroImage})` }}
            />
            {/* Overlay escuro */}
            <div className="absolute inset-0 bg-primary/80" />
            
            {/* Content */}
            <div className="relative z-10 p-6 space-y-4">
              {/* Header */}
              <div className="text-center space-y-2">
                <h3 className="font-heading font-bold text-2xl text-primary-foreground">
                  Gileade Church
                </h3>
                <p className="text-sm text-primary-foreground/80">
                  Um Lugar de Cura e Restauração
                </p>
              </div>

              {/* QR Code */}
              <div className="flex justify-center py-4">
                <div className="p-4 bg-white rounded-xl shadow-lg">
                  <QRCodeSVG
                    value={linkCadastro}
                    size={140}
                    level="H"
                    includeMargin={false}
                    fgColor="#dc2626"
                  />
                </div>
              </div>

              {/* Call to Action */}
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold text-primary-foreground">
                  Faça parte da nossa família!
                </p>
                <p className="text-sm text-primary-foreground/80">
                  Escaneie o QR Code ou clique no link abaixo
                </p>
              </div>

              {/* Link Display - Clicável */}
              <button
                onClick={handleOpenLink}
                className="w-full p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-center hover:bg-white/20 transition-colors group"
              >
                <p className="text-xs text-primary-foreground/70 mb-1">Acesse:</p>
                <p className="text-sm font-medium text-secondary break-all group-hover:underline flex items-center justify-center gap-2">
                  {linkCadastro}
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </p>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenLink}
              className="gap-1"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="gap-1"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copiar
                </>
              )}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleDownloadImage}
              className="gap-1"
            >
              <Download className="w-4 h-4" />
              Baixar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
