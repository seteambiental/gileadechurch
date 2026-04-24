import { useMemo } from "react";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PreviewMember {
  full_name: string;
  whatsapp?: string | null;
}

interface Props {
  mensagem: string;
  membros: PreviewMember[];
  /** Quantos exemplos mostrar (default 3) */
  amostras?: number;
}

function aplicarVariaveis(template: string, m: PreviewMember) {
  const primeiroNome = (m.full_name || "").trim().split(/\s+/)[0] || "";
  return template
    .replace(/\{nome\}/gi, primeiroNome)
    .replace(/\{nome_completo\}/gi, m.full_name || "")
    .replace(/\{whatsapp\}/gi, m.whatsapp || "");
}

function formatPhonePreview(p?: string | null) {
  if (!p) return "—";
  const digits = p.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return p;
}

export default function WhatsappMensagemPreview({ mensagem, membros, amostras = 3 }: Props) {
  const exemplos = useMemo(
    () => membros.filter((m) => m.whatsapp).slice(0, amostras),
    [membros, amostras]
  );

  const total = membros.filter((m) => m.whatsapp).length;

  if (!mensagem.trim()) {
    return (
      <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
        Digite uma mensagem para visualizar a pré-visualização.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Eye className="w-4 h-4 text-green-600" />
          Pré-visualização
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {total} destinatário{total === 1 ? "" : "s"}
        </Badge>
      </div>

      {exemplos.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          Nenhum membro com WhatsApp para mostrar exemplo.
        </div>
      ) : (
        <div className="space-y-2 max-h-56 overflow-auto pr-1">
          {exemplos.map((m, i) => {
            const preview = aplicarVariaveis(mensagem, m);
            return (
              <div
                key={i}
                className="rounded-lg border border-border bg-muted/30 p-2.5 text-xs"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-medium truncate">{m.full_name}</span>
                  <span className="text-muted-foreground ml-2 shrink-0">
                    {formatPhonePreview(m.whatsapp)}
                  </span>
                </div>
                <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200/50 dark:border-green-900/50 p-2 whitespace-pre-wrap text-foreground/90 font-normal leading-relaxed">
                  {preview}
                </div>
              </div>
            );
          })}
          {total > exemplos.length && (
            <p className="text-[11px] text-muted-foreground text-center">
              + {total - exemplos.length} outro{total - exemplos.length === 1 ? "" : "s"} destinatário{total - exemplos.length === 1 ? "" : "s"}…
            </p>
          )}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Variáveis suportadas: <code className="text-foreground">{"{nome}"}</code>,{" "}
        <code className="text-foreground">{"{nome_completo}"}</code>,{" "}
        <code className="text-foreground">{"{whatsapp}"}</code>.
      </p>
    </div>
  );
}