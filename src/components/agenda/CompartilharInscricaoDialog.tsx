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
import { Copy, Check, ExternalLink, Calendar, MapPin, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CompartilharInscricaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evento: {
    id: string;
    titulo: string;
    data_evento: string;
    hora_inicio?: string | null;
    local?: string | null;
    flyer_url?: string | null;
    cor?: string | null;
  };
}

export const CompartilharInscricaoDialog = ({
  open,
  onOpenChange,
  evento,
}: CompartilharInscricaoDialogProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const baseUrl = window.location.origin;
  const linkInscricao = `${baseUrl}/inscricao/${evento.id}`;
  const linkTotem = `${baseUrl}/inscricao/${evento.id}?fullscreen=true`;

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

  const handleOpenTotem = () => {
    // Open in new window with fullscreen parameter
    const popup = window.open(linkTotem, '_blank', 'fullscreen=yes');
    if (popup) {
      popup.focus();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Compartilhar Inscrição</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Event Info */}
          <div className="text-center space-y-2">
            <h3 className="font-heading font-bold text-lg">{evento.titulo}</h3>
            <div className="flex flex-wrap justify-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(parseISO(evento.data_evento), "dd 'de' MMMM", { locale: ptBR })}
              </span>
              {evento.hora_inicio && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {evento.hora_inicio.substring(0, 5)}
                </span>
              )}
              {evento.local && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {evento.local}
                </span>
              )}
            </div>
          </div>

          {/* Flyer Preview */}
          {evento.flyer_url && (
            <div className="rounded-lg overflow-hidden border border-border">
              <img
                src={evento.flyer_url}
                alt={evento.titulo}
                className="w-full h-48 object-cover"
              />
            </div>
          )}

          {/* QR Code */}
          <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-xl">
            <QRCodeSVG
              value={linkInscricao}
              size={180}
              level="H"
              includeMargin={false}
              fgColor={evento.cor || "#dc2626"}
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
              onClick={handleOpenTotem}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir Totem
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
