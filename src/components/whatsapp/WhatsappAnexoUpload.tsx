import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Paperclip, X, Loader2, FileText, Image as ImageIcon, FileVideo } from "lucide-react";
import { toast } from "sonner";

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.gif,.xls,.xlsx,.doc,.docx,.mp4,.mov,.webm";
const MAX_BYTES = 16 * 1024 * 1024; // 16 MB (limite seguro do WhatsApp para documentos)

export interface WhatsappAnexo {
  url: string;
  fileName: string;
  type: "image" | "video" | "document";
}

function detectType(name: string): WhatsappAnexo["type"] {
  const n = name.toLowerCase();
  if (/\.(jpe?g|png|webp|gif|bmp)$/.test(n)) return "image";
  if (/\.(mp4|mov|avi|mkv|webm|3gp)$/.test(n)) return "video";
  return "document";
}

interface Props {
  value: WhatsappAnexo | null;
  onChange: (anexo: WhatsappAnexo | null) => void;
  disabled?: boolean;
}

export default function WhatsappAnexoUpload({ value, onChange, disabled }: Props) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error(`Arquivo grande demais (máx ${Math.round(MAX_BYTES / 1024 / 1024)} MB)`);
      return;
    }
    setUploading(true);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safe}`;
      const { error } = await supabase.storage.from("whatsapp-anexos").upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("whatsapp-anexos").getPublicUrl(path);
      onChange({
        url: data.publicUrl,
        fileName: file.name,
        type: detectType(file.name),
      });
    } catch (err: any) {
      toast.error(err?.message || "Falha ao enviar arquivo");
    } finally {
      setUploading(false);
    }
  };

  const Icon = value?.type === "image" ? ImageIcon : value?.type === "video" ? FileVideo : FileText;

  return (
    <div className="space-y-2">
      <Label className="text-xs">Anexo (opcional)</Label>
      {value ? (
        <div className="flex items-center gap-2 border rounded-md p-2 bg-muted/30">
          {value.type === "image" ? (
            <img src={value.url} alt={value.fileName} className="w-12 h-12 rounded object-cover" />
          ) : (
            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
              <Icon className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{value.fileName}</p>
            <p className="text-xs text-muted-foreground capitalize">{value.type}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
            disabled={disabled || uploading}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <label className="flex items-center gap-2 cursor-pointer border border-dashed rounded-md p-3 hover:bg-muted/40 text-sm text-muted-foreground">
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Paperclip className="w-4 h-4" />
          )}
          <span>
            {uploading ? "Enviando..." : "Anexar imagem, vídeo, PDF, DOC, DOCX, XLS ou XLSX"}
          </span>
          <input
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={handleFile}
            disabled={disabled || uploading}
          />
        </label>
      )}
      <p className="text-[10px] text-muted-foreground">
        A mensagem digitada acompanha o arquivo como legenda. Limite {Math.round(MAX_BYTES / 1024 / 1024)} MB.
      </p>
    </div>
  );
}