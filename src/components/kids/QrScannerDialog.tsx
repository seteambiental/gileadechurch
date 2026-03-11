import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, X, RotateCcw } from "lucide-react";

interface QrScannerDialogProps {
  open: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
}

export function QrScannerDialog({ open, onClose, onScan }: QrScannerDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const startScanner = async (mode: "environment" | "user") => {
    if (!containerRef.current) return;

    try {
      setError(null);
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: mode },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          onScan(decodedText);
          stopScanner();
        },
        () => {} // ignore scan failures
      );
    } catch (err: any) {
      console.error("QR scanner error:", err);
      setError("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (_) {}
      scannerRef.current = null;
    }
  };

  useEffect(() => {
    if (open) {
      // Small delay to ensure DOM is ready
      setTimeout(() => startScanner(facingMode), 300);
    }
    return () => {
      stopScanner();
    };
  }, [open]);

  const handleSwitchCamera = async () => {
    await stopScanner();
    const newMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newMode);
    setTimeout(() => startScanner(newMode), 300);
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Escanear Etiqueta
          </DialogTitle>
        </DialogHeader>

        <div className="relative bg-black min-h-[300px]">
          {error ? (
            <div className="flex items-center justify-center h-64 text-white text-center p-4">
              <p>{error}</p>
            </div>
          ) : (
            <div id="qr-reader" ref={containerRef} className="w-full" />
          )}
        </div>

        <div className="flex justify-center gap-4 p-4">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleSwitchCamera}
            disabled={!!error}
            title="Alternar câmera"
          >
            <RotateCcw className="w-5 h-5" />
          </Button>
          <Button type="button" variant="outline" onClick={handleClose}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
