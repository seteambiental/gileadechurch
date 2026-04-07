import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  label: string;
  placeholder?: string;
  confirmLabel: string;
  confirmVariant?: "default" | "destructive";
  isPending?: boolean;
  initialText?: string;
  onConfirm: (texto: string) => void;
}

const SistemaRespostaDialog = ({
  open,
  onOpenChange,
  title,
  label,
  placeholder,
  confirmLabel,
  confirmVariant = "default",
  isPending,
  initialText,
  onConfirm,
}: Props) => {
  const [texto, setTexto] = useState(initialText || "");

  useEffect(() => {
    if (open) {
      setTexto(initialText || "");
    }
  }, [open, initialText]);

  const handleConfirm = () => {
    onConfirm(texto);
    setTexto("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setTexto(""); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>{label}</Label>
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={placeholder || "Escreva aqui..."}
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button variant={confirmVariant} onClick={handleConfirm} disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SistemaRespostaDialog;
