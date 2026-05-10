import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageCircle, Users } from "lucide-react";
import { formatPhone } from "@/lib/masks";

interface EventoOption {
  id: string;
  titulo: string;
  data_inicio: string;
}

interface Props {
  eventos: EventoOption[];
  selectedEventoId: string;
  onEventoChange: (id: string) => void;
}

interface ParentInfo {
  nome: string;
  whatsapp: string;
}

interface RowData {
  id: string;
  crianca_nome: string;
  crianca_data_nascimento: string | null;
  crianca_genero: string | null;
  pai: ParentInfo | null;
  mae: ParentInfo | null;
  observacoes: string | null;
  created_at: string;
}

const ApresentacaoCriancasInscricoesPanel = ({ eventos, selectedEventoId, onEventoChange }: Props) => {
  const [msgOpen, setMsgOpen] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["apresentacao-criancas-inscricoes", selectedEventoId],
    queryFn: async (): Promise<RowData[]> => {
      if (!selectedEventoId) return [];
      const { data, error } = await supabase
        .from("apresentacao_criancas_inscricoes")
        .select("*")
        .eq("evento_id", selectedEventoId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const inscricoes = data || [];

      const memberIds = new Set<string>();
      const requestIds = new Set<string>();
      inscricoes.forEach((i: any) => {
        if (i.pai_member_id) memberIds.add(i.pai_member_id);
        if (i.mae_member_id) memberIds.add(i.mae_member_id);
        if (i.pai_request_id) requestIds.add(i.pai_request_id);
        if (i.mae_request_id) requestIds.add(i.mae_request_id);
      });

      const [membersRes, requestsRes] = await Promise.all([
        memberIds.size
          ? supabase.from("members").select("id, full_name, whatsapp").in("id", Array.from(memberIds))
          : Promise.resolve({ data: [], error: null } as any),
        requestIds.size
          ? supabase.from("member_requests").select("id, full_name, whatsapp").in("id", Array.from(requestIds))
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      const memberMap = new Map<string, any>((membersRes.data || []).map((m: any) => [m.id, m]));
      const requestMap = new Map<string, any>((requestsRes.data || []).map((m: any) => [m.id, m]));

      const buildParent = (inscricao: any, kind: "pai" | "mae"): ParentInfo | null => {
        const memberId = inscricao[`${kind}_member_id`];
        const requestId = inscricao[`${kind}_request_id`];
        const fallbackNome = inscricao[`${kind}_nome`];
        if (memberId && memberMap.has(memberId)) {
          const m = memberMap.get(memberId);
          return { nome: m.full_name, whatsapp: m.whatsapp || "" };
        }
        if (requestId && requestMap.has(requestId)) {
          const r = requestMap.get(requestId);
          return { nome: r.full_name, whatsapp: r.whatsapp || "" };
        }
        if (fallbackNome) return { nome: fallbackNome, whatsapp: "" };
        return null;
      };

      return inscricoes.map((i: any) => ({
        id: i.id,
        crianca_nome: i.crianca_nome,
        crianca_data_nascimento: i.crianca_data_nascimento,
        crianca_genero: i.crianca_genero,
        pai: buildParent(i, "pai"),
        mae: buildParent(i, "mae"),
        observacoes: i.observacoes,
        created_at: i.created_at,
      }));
    },
    enabled: !!selectedEventoId,
  });

  const evento = useMemo(() => eventos.find((e) => e.id === selectedEventoId), [eventos, selectedEventoId]);

  const telefonesUnicos = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      [r.pai, r.mae].forEach((p) => {
        const tel = (p?.whatsapp || "").replace(/\D/g, "");
        if (tel.length >= 10) set.add(tel);
      });
    });
    return Array.from(set);
  }, [rows]);

  const abrirEnvio = () => {
    if (!telefonesUnicos.length) {
      toast.error("Nenhum pai/mãe com WhatsApp cadastrado.");
      return;
    }
    setMensagem(
      evento
        ? `Olá! Lembrete da Apresentação de Crianças "${evento.titulo}" no dia ${format(parseLocalDate(evento.data_inicio), "dd/MM", { locale: ptBR })}. Qualquer dúvida, estamos à disposição. Igreja Gileade.`
        : ""
    );
    setMsgOpen(true);
  };

  const enviar = async () => {
    if (!mensagem.trim()) {
      toast.error("Digite a mensagem.");
      return;
    }
    setEnviando(true);
    let ok = 0;
    let fail = 0;
    for (let i = 0; i < telefonesUnicos.length; i++) {
      const telefone = telefonesUnicos[i];
      try {
        const { data, error } = await supabase.functions.invoke("enviar-whatsapp", {
          body: { action: "mensagem_direta", telefone, mensagem },
        });
        if (error || !data?.success) fail++;
        else ok++;
      } catch {
        fail++;
      }
      // Anti-SPAM: 15-30s aleatório entre mensagens (exceto última)
      if (i < telefonesUnicos.length - 1) {
        const delay = Math.floor(Math.random() * 15000) + 15000;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    setEnviando(false);
    setMsgOpen(false);
    toast.success(`${ok} enviada(s). ${fail > 0 ? fail + " falharam." : ""}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-heading font-bold">Inscrições — Apresentação de Crianças</h2>
        <div className="flex flex-wrap gap-2">
          <Select value={selectedEventoId} onValueChange={onEventoChange}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Selecione um evento" />
            </SelectTrigger>
            <SelectContent>
              {eventos.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {format(parseLocalDate(e.data_inicio), "dd/MM", { locale: ptBR })} — {e.titulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedEventoId && rows.length > 0 && (
            <Button onClick={abrirEnvio} className="bg-green-600 hover:bg-green-700 text-white">
              <MessageCircle className="w-4 h-4 mr-2" />
              Enviar WhatsApp aos pais
            </Button>
          )}
        </div>
      </div>

      {!selectedEventoId ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Selecione um evento para visualizar as inscrições.
        </CardContent></Card>
      ) : isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Nenhuma inscrição registrada para este evento.
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground border-b">
              <Users className="w-4 h-4" /> {rows.length} criança(s) inscrita(s)
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Criança</TableHead>
                  <TableHead>Nascimento</TableHead>
                  <TableHead>Pai</TableHead>
                  <TableHead>Mãe</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.crianca_nome}</TableCell>
                    <TableCell>{r.crianca_data_nascimento ? format(parseLocalDate(r.crianca_data_nascimento), "dd/MM/yyyy") : "—"}</TableCell>
                    <TableCell>
                      {r.pai ? (
                        <div className="flex flex-col">
                          <span>{r.pai.nome}</span>
                          {r.pai.whatsapp && <span className="text-xs text-muted-foreground">{formatPhone(r.pai.whatsapp)}</span>}
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      {r.mae ? (
                        <div className="flex flex-col">
                          <span>{r.mae.nome}</span>
                          {r.mae.whatsapp && <span className="text-xs text-muted-foreground">{formatPhone(r.mae.whatsapp)}</span>}
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.observacoes || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={msgOpen} onOpenChange={setMsgOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar WhatsApp aos pais</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Será enviado para {telefonesUnicos.length} contato(s). Intervalo aleatório de 15-30s entre mensagens.
          </p>
          <Textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={6}
            placeholder="Digite a mensagem..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setMsgOpen(false)} disabled={enviando}>Cancelar</Button>
            <Button onClick={enviar} disabled={enviando} className="bg-green-600 hover:bg-green-700 text-white">
              {enviando ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApresentacaoCriancasInscricoesPanel;