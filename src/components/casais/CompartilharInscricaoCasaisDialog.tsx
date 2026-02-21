import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, ExternalLink, HeartHandshake } from "lucide-react";

interface CompartilharInscricaoCasaisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CompartilharInscricaoCasaisDialog = ({
  open,
  onOpenChange,
}: CompartilharInscricaoCasaisDialogProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const baseUrl = window.location.origin;
  const linkInscricao = `${baseUrl}/inscricao-casais`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(linkInscricao).then(() => {
      setCopied(true);
      toast({
        title: "Link copiado!",
        description: "O link de inscrição foi copiado para a área de transferência.",
      });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleOpenLink = () => {
    window.open(linkInscricao, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Compartilhar Ficha de Inscrição</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <HeartHandshake className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-heading font-bold text-lg">Ministério de Casais</h3>
            <p className="text-sm text-muted-foreground">
              Compartilhe este link para que casais possam preencher a ficha de inscrição online.
            </p>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-xl">
            <QRCodeSVG
              value={linkInscricao}
              size={180}
              level="H"
              includeMargin={false}
              fgColor="#be185d"
            />
            <p className="text-xs text-muted-foreground text-center">
              Escaneie para acessar o formulário de inscrição
            </p>
          </div>

          {/* Link */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Link de inscrição:</p>
            <p className="text-sm font-mono break-all">{linkInscricao}</p>
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
              onClick={handleOpenLink}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
