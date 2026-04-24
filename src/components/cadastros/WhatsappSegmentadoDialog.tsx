import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send } from "lucide-react";
import {
  dispararEnvioSegmentado,
  type SegmentoEnvio,
} from "@/lib/whatsapp-notifications";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SEGMENTOS: { value: SegmentoEnvio; label: string; help?: string }[] = [
  { value: "todos_membros", label: "Todos os membros" },
  { value: "lideres_ministerio", label: "Líderes de Ministério" },
  { value: "lideres_casa_refugio", label: "Líderes de Casa Refúgio" },
  { value: "supervisores_casa_refugio", label: "Supervisores de Casa Refúgio" },
  { value: "sindicos_condominio", label: "Síndicos de Condomínio" },
  { value: "pastores", label: "Pastores" },
  { value: "integrantes_ministerio", label: "Integrantes de Ministério (escolha o ministério abaixo)" },
];

export default function WhatsappSegmentadoDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [segmentos, setSegmentos] = useState<SegmentoEnvio[]>([]);
  const [ministerioId, setMinisterioId] = useState<string>("");
  const [mensagem, setMensagem] = useState("Olá {nome}! 👋\n\nPaz do Senhor!");
  const [enviando, setEnviando] = useState(false);

  const { data: ministerios = [] } = useQuery({
    queryKey: ["ministerios-segmentado"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ministries")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  function toggleSegmento(seg: SegmentoEnvio) {
    setSegmentos((prev) =>
      prev.includes(seg) ? prev.filter((s) => s !== seg) : [...prev, seg]
    );
  }

  async function handleEnviar() {
    if (segmentos.length === 0) {
      toast({ variant: "destructive", title: "Selecione ao menos um segmento" });
      return;
    }
    if (!mensagem.trim()) {
      toast({ variant: "destructive", title: "Digite uma mensagem" });
      return;
    }
    if (segmentos.includes("integrantes_ministerio") && !ministerioId) {
      toast({ variant: "destructive", title: "Selecione um ministério para enviar aos integrantes" });
      return;
    }
    setEnviando(true);
    try {
      const { data, error } = await dispararEnvioSegmentado({
        mensagem,
        segmentos,
        ministerioId: segmentos.includes("integrantes_ministerio") ? ministerioId : null,
      });
      if (error) throw error;
      toast({
        title: "Envio iniciado",
        description: data?.message || `Enviando mensagens (5–15s entre cada uma).`,
      });
      onOpenChange(false);
      setSegmentos([]);
      setMensagem("Olá {nome}! 👋\n\nPaz do Senhor!");
      setMinisterioId("");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar",
        description: err?.message || "Erro desconhecido",
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => (!enviando ? onOpenChange(v) : null)}>
      <AlertDialogContent className="bg-card border-border max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-green-600" />
            Mensagem WhatsApp segmentada
          </AlertDialogTitle>
          <AlertDialogDescription>
            Selecione um ou mais segmentos. Use {"{nome}"} para personalizar com o primeiro nome.
            Envio espaçado de 5–15 segundos entre mensagens.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-auto rounded-md border p-3">
            {SEGMENTOS.map((s) => (
              <label
                key={s.value}
                className="flex items-start gap-2 cursor-pointer text-sm"
              >
                <Checkbox
                  checked={segmentos.includes(s.value)}
                  onCheckedChange={() => toggleSegmento(s.value)}
                />
                <span>{s.label}</span>
              </label>
            ))}
          </div>

          {segmentos.includes("integrantes_ministerio") && (
            <div className="space-y-2">
              <Label>Ministério</Label>
              <Select value={ministerioId} onValueChange={setMinisterioId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ministério" />
                </SelectTrigger>
                <SelectContent>
                  {ministerios.map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea
              placeholder="Digite a mensagem... Use {nome} para personalizar"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              rows={6}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={enviando}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={enviando || segmentos.length === 0 || !mensagem.trim()}
            className="bg-green-600 text-white hover:bg-green-700"
            onClick={(e) => {
              e.preventDefault();
              handleEnviar();
            }}
          >
            {enviando ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Enviar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}