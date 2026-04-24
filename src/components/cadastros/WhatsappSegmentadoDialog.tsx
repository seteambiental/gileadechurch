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
import WhatsappMensagemPreview from "./WhatsappMensagemPreview";

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

  // Busca amostra de destinatários para a pré-visualização (até 50)
  const { data: amostraDestinatarios = [] } = useQuery({
    queryKey: [
      "whatsapp-segmentado-amostra",
      segmentos.slice().sort().join(","),
      segmentos.includes("integrantes_ministerio") ? ministerioId : "",
    ],
    enabled:
      open &&
      segmentos.length > 0 &&
      (!segmentos.includes("integrantes_ministerio") || !!ministerioId),
    queryFn: async () => {
      const memberIds = new Set<string>();

      const coletarPorFuncao = async (funcoes: string[], filtroMinisterio?: string) => {
        let q = supabase
          .from("member_functions")
          .select("member_id")
          .in("function_type", funcoes as any);
        if (filtroMinisterio) q = q.eq("ministry_id", filtroMinisterio);
        const { data } = await q;
        for (const r of data || []) {
          if (r.member_id) memberIds.add(r.member_id as string);
        }
      };

      if (segmentos.includes("todos_membros")) {
        const { data } = await supabase
          .from("members")
          .select("id")
          .not("whatsapp", "is", null)
          .or("excluido.is.null,excluido.eq.false")
          .limit(50);
        for (const r of data || []) memberIds.add(r.id);
      }
      if (segmentos.includes("lideres_ministerio")) await coletarPorFuncao(["lider_ministerio"]);
      if (segmentos.includes("lideres_casa_refugio"))
        await coletarPorFuncao(["lider_casa_refugio", "secretario_casa_refugio"]);
      if (segmentos.includes("supervisores_casa_refugio"))
        await coletarPorFuncao(["supervisor_casa_refugio"]);
      if (segmentos.includes("sindicos_condominio"))
        await coletarPorFuncao(["sindico_condominio"]);
      if (segmentos.includes("pastores")) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id")
          .in("role", ["pastor_geral", "pastor_auxiliar"] as any);
        const userIds = (roles || []).map((r: any) => r.user_id).filter(Boolean);
        if (userIds.length > 0) {
          const { data: ms } = await supabase
            .from("members")
            .select("id")
            .in("user_id", userIds);
          for (const m of ms || []) memberIds.add(m.id);
        }
      }
      if (segmentos.includes("integrantes_ministerio") && ministerioId) {
        const { data } = await supabase
          .from("ministerio_integrantes")
          .select("member_id")
          .eq("ministry_id", ministerioId)
          .eq("ativo", true);
        for (const r of data || []) {
          if (r.member_id) memberIds.add(r.member_id as string);
        }
      }

      if (memberIds.size === 0) return [];

      const ids = Array.from(memberIds).slice(0, 50);
      const { data: dest } = await supabase
        .from("members")
        .select("id, full_name, whatsapp")
        .in("id", ids)
        .not("whatsapp", "is", null);
      return dest || [];
    },
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

          <WhatsappMensagemPreview
            mensagem={mensagem}
            membros={amostraDestinatarios.map((m: any) => ({
              full_name: m.full_name,
              whatsapp: m.whatsapp,
            }))}
          />
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