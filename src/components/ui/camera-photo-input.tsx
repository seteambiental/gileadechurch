import * as React from "react";
import { Camera, Upload, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface CameraPhotoInputProps {
  onPhotoCapture: (file: File | null) => void;
  photoPreview?: string | null;
  className?: string;
  buttonLabel?: string;
  showUploadOption?: boolean;
}

export function CameraPhotoInput({
  onPhotoCapture,
  photoPreview,
  className,
  buttonLabel = "Foto",
  showUploadOption = true,
}: CameraPhotoInputProps) {
  const [isCameraOpen, setIsCameraOpen] = React.useState(false);
  const [stream, setStream] = React.useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [facingMode, setFacingMode] = React.useState<"user" | "environment">("user");
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const startCamera = async (mode: "user" | "environment" = facingMode) => {
    try {
      setCameraError(null);
      
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Erro ao acessar câmera:", err);
      setCameraError("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleOpenCamera = async () => {
    setIsCameraOpen(true);
    await startCamera();
  };

  const handleCloseCamera = () => {
    stopCamera();
    setIsCameraOpen(false);
    setCameraError(null);
  };

  const handleSwitchCamera = async () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);
    await startCamera(newMode);
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Set canvas dimensions to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `photo_${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          onPhotoCapture(file);
          handleCloseCamera();
        }
      },
      "image/jpeg",
      0.9
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onPhotoCapture(file);
    }
  };

  const handleRemovePhoto = () => {
    onPhotoCapture(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleOpenCamera}
        >
          <Camera className="w-4 h-4 mr-2" />
          Tirar Foto
        </Button>

        {showUploadOption && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="photo-file-input"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </>
        )}

        {photoPreview && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemovePhoto}
            className="text-destructive hover:text-destructive"
          >
            <X className="w-4 h-4 mr-1" />
            Remover
          </Button>
        )}
      </div>

      <Dialog open={isCameraOpen} onOpenChange={handleCloseCamera}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Tirar Foto
            </DialogTitle>
          </DialogHeader>
          
          <div className="relative bg-black">
            {cameraError ? (
              <div className="flex items-center justify-center h-64 text-white text-center p-4">
                <p>{cameraError}</p>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto max-h-[60vh]"
                style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
              />
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="flex justify-center gap-4 p-4">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleSwitchCamera}
              disabled={!!cameraError}
              title="Alternar câmera"
            >
              <RotateCcw className="w-5 h-5" />
            </Button>
            
            <Button
              type="button"
              size="lg"
              onClick={handleCapturePhoto}
              disabled={!!cameraError}
              className="w-16 h-16 rounded-full"
            >
              <Camera className="w-8 h-8" />
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleCloseCamera}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
