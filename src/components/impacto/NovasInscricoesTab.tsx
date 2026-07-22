import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Check, X, Search, UserPlus, Loader2, Heart } from "lucide-react";
import { dispararMensagemInscricaoRecebida } from "@/lib/whatsapp-notifications";

const TIPOS_INSCRICAO_LABELS: Record<string, string> = {
  membro: "Membro",
  nao_membro: "Não membro",
  familia: "Líderes e Anfitriões",
  equipe: "Equipe",
  ministrador: "Ministrador",
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message || "Erro desconhecido");
  }
  return "Tente novamente ou verifique a inscrição.";
};

const NovasInscricoesTab = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectingSource, setRejectingSource] = useState<"evento" | "casais">("evento");
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());

  const { data: novasInscricoes = [], isLoading } = useQuery({
    queryKey: ["novas-inscricoes-pendentes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscricoes_eventos")
        .select(`
          id,
          nome_participante,
          telefone_contato,
          telefone_emergencia,
          nome_responsavel,
          telefone_responsavel,
          tipo_inscricao,
          valor_inscricao,
          genero,
          created_at,
          evento_id,
          member_id,
          evento:agenda_igreja(id, titulo, data_evento, data_fim, valores_por_tipo),
          member:members(id, photo_url)
        `)
        .eq("aprovado", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Pending Casais inscriptions — merged into the same "Novas" panel
  const { data: novasCasais = [], isLoading: isLoadingCasais } = useQuery({
    queryKey: ["novas-casais-pendentes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casais_inscritos")
        .select(`
          id,
          nome_masculino,
          nome_feminino,
          whatsapp_masculino,
          whatsapp_feminino,
          status,
          created_at,
          membro_masculino:members!casais_inscritos_membro_masculino_id_fkey(full_name, photo_url),
          membro_feminino:members!casais_inscritos_membro_feminino_id_fkey(full_name, photo_url)
        `)
        .or("status.eq.pendente,status.is.null")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Unified list — evento inscriptions + casais inscriptions, tagged by source
  const inscricoesUnificadas = useMemo(() => {
    const eventos = (novasInscricoes || []).map((i: any) => ({ ...i, _source: "evento" as const }));
    const casais = (novasCasais || []).map((c: any) => {
      const esposo = c.membro_masculino?.full_name || c.nome_masculino || "";
      const esposa = c.membro_feminino?.full_name || c.nome_feminino || "";
      return {
        id: c.id,
        _source: "casais" as const,
        nome_participante: [esposo, esposa].filter(Boolean).join(" & ") || "Casal",
        telefone_contato: c.whatsapp_masculino || c.whatsapp_feminino || null,
        tipo_inscricao: "casal",
        created_at: c.created_at,
        evento: { titulo: "Curso de Casais", data_evento: null, data_fim: null },
        member: c.membro_masculino?.photo_url ? { photo_url: c.membro_masculino.photo_url } : null,
      };
    });
    return [...eventos, ...casais].sort((a: any, b: any) =>
      (b.created_at || "").localeCompare(a.created_at || "")
    );
  }, [novasInscricoes, novasCasais]);

  useEffect(() => {
    if (!isLoading && !isLoadingCasais) {
      queryClient.setQueryData(
        ["inscricoes-eventos-pending-count"],
        novasInscricoes.length + novasCasais.length
      );
    }
  }, [isLoading, isLoadingCasais, novasInscricoes.length, novasCasais.length, queryClient]);

  const approveMutation = useMutation({
    mutationFn: async ({ id, source }: { id: string; source: "evento" | "casais" }) => {
      // Casais approval: just mark as approved. Turma is assigned later in Casais/Inscrições.
      if (source === "casais") {
        const { error } = await supabase
          .from("casais_inscritos")
          .update({ status: "aprovado" })
          .eq("id", id);
        if (error) throw error;
        return;
      }

      // Find the inscription to migrate
      const inscricao = novasInscricoes.find((i) => i.id === id);
      if (!inscricao) throw new Error("Inscrição não encontrada");

      // Resolve valor_inscricao from the record or from event's valores_por_tipo
      let valorInscricao = inscricao.valor_inscricao;
      if (valorInscricao == null && inscricao.evento?.valores_por_tipo) {
        const tipo = inscricao.tipo_inscricao || "membro";
        valorInscricao = (inscricao.evento.valores_por_tipo as Record<string, number>)[tipo] ?? null;
      }

      // Find or create the corresponding impacto_evento for this agenda event
      let impactoEventoId: string;

      const agendaTitulo = inscricao.evento?.titulo;
      const agendaData = inscricao.evento?.data_evento;
      const agendaDataFim = inscricao.evento?.data_fim;

      // First try to find by agenda event ID (same ID shared between tables)
      const agendaEventId = inscricao.evento_id;
      const { data: matchById } = await supabase
        .from("impacto_eventos")
        .select("id")
        .eq("id", agendaEventId)
        .maybeSingle();

      if (matchById) {
        impactoEventoId = matchById.id;
      } else {
        // Create a new impacto_evento using the agenda event ID to keep them linked
        const { data: newEvento, error: createError } = await supabase
          .from("impacto_eventos")
          .insert({
            id: agendaEventId,
            titulo: agendaTitulo || "Evento",
            data_inicio: agendaData || new Date().toISOString().split("T")[0],
            data_fim: agendaDataFim || agendaData || null,
            tipo: "geral",
            ativo: true,
            tem_custo: !!(inscricao.evento?.valores_por_tipo),
            valores_por_tipo: inscricao.evento?.valores_por_tipo || null,
          } as any)
          .select("id")
          .single();
        if (createError) throw createError;
        impactoEventoId = newEvento.id;
      }

      // Resolve gender: use inscription's genero, or fall back to member's genero
      let generoResolvido = inscricao.genero || null;
      if (!generoResolvido && inscricao.member_id) {
        const { data: memberData } = await supabase
          .from("members")
          .select("genero")
          .eq("id", inscricao.member_id)
          .maybeSingle();
        if (memberData?.genero) {
          const g = memberData.genero.toLowerCase();
          generoResolvido = g === "masculino" ? "M" : g === "feminino" ? "F" : memberData.genero;
        }
      }

      // The mirror record in impacto_inscricoes will be created automatically
      // by the sync_inscricao_evento_to_impacto trigger when we mark aprovado=true.
      // Manually inserting here causes duplicate key violations.

      // Mark the original public record as approved (trigger handles the mirror)
      const { error } = await supabase
        .from("inscricoes_eventos")
        .update({
          aprovado: true,
          aprovado_em: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;

      // Best-effort: enrich the mirror record with extra fields the trigger doesn't set
      try {
        await supabase
          .from("impacto_inscricoes")
          .update({
            genero: generoResolvido,
            valor_inscricao: valorInscricao,
            telefone_emergencia: inscricao.telefone_emergencia || null,
            nome_responsavel: inscricao.nome_responsavel || null,
            telefone_responsavel: inscricao.telefone_responsavel || null,
          })
          .eq("evento_id", impactoEventoId)
          .eq("member_id", inscricao.member_id || "00000000-0000-0000-0000-000000000000");
      } catch (e) {
        console.warn("[novasInscricoes] enrich mirror falhou:", e);
      }

      // Best-effort: enviar mensagem de CONFIRMAÇÃO (com link do grupo WhatsApp)
      try {
        const { data: eventoFull } = await supabase
          .from("agenda_igreja")
          .select("titulo, data_evento, hora_inicio, local, link_grupo_whatsapp")
          .eq("id", inscricao.evento_id)
          .maybeSingle();

        await supabase.functions.invoke("enviar-whatsapp", {
          body: {
            action: "confirmacao_inscricao",
            inscricaoId: id,
            evento: {
              titulo: eventoFull?.titulo ?? inscricao.evento?.titulo ?? null,
              data_evento: eventoFull?.data_evento ?? inscricao.evento?.data_evento ?? null,
              hora_inicio: eventoFull?.hora_inicio ?? null,
              local: eventoFull?.local ?? null,
              link_grupo_whatsapp: eventoFull?.link_grupo_whatsapp ?? null,
            },
          },
        });
      } catch (waErr) {
        console.warn("[novasInscricoes] confirmação whatsapp falhou:", waErr);
      }
    },
    onMutate: ({ id }) => {
      setApprovingIds((prev) => new Set(prev).add(id));
    },
    onSuccess: (_, { id }) => {
      setApprovingIds((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
      toast.success("Inscrição aprovada!");
      queryClient.invalidateQueries({ queryKey: ["novas-inscricoes-pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["novas-casais-pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["casais_inscricoes_pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["pending-casais-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["inscricoes-eventos-pending-count"] });
      queryClient.invalidateQueries({ queryKey: ["agenda-inscricoes"] });
      queryClient.invalidateQueries({ queryKey: ["agenda-inscricoes-financeiro"] });
      queryClient.invalidateQueries({ queryKey: ["impacto-inscricoes"] });
      queryClient.invalidateQueries({ queryKey: ["impacto-inscricoes-count"] });
    },
    onError: (error, { id }) => {
      console.error("[novasInscricoes] erro ao aprovar inscrição:", error);
      setApprovingIds((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
      toast.error("Erro ao aprovar inscrição.", { description: getErrorMessage(error) });
    },
  });

  const approveAllMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      // For each inscription, create a mirror record in impacto_inscricoes
      const toApprove = novasInscricoes.filter((i) => ids.includes(i.id));

      for (const inscricao of toApprove) {
        let valorInscricao = inscricao.valor_inscricao;
        if (valorInscricao == null && inscricao.evento?.valores_por_tipo) {
          const tipo = inscricao.tipo_inscricao || "membro";
          valorInscricao = (inscricao.evento.valores_por_tipo as Record<string, number>)[tipo] ?? null;
        }

        // Find or create impacto_evento
        const agendaTitulo = inscricao.evento?.titulo;
        const agendaData = inscricao.evento?.data_evento;
        const agendaDataFim = inscricao.evento?.data_fim;

        // First try to find by agenda event ID (same ID shared between tables)
        const agendaEventId = inscricao.evento_id;
        const { data: matchById } = await supabase
          .from("impacto_eventos")
          .select("id")
          .eq("id", agendaEventId)
          .maybeSingle();

        let impactoEventoId: string;
        if (matchById) {
          impactoEventoId = matchById.id;
        } else {
          const { data: newEvento, error: createError } = await supabase
            .from("impacto_eventos")
            .insert({
              id: agendaEventId,
              titulo: agendaTitulo || "Evento",
              data_inicio: agendaData || new Date().toISOString().split("T")[0],
              data_fim: agendaDataFim || agendaData || null,
              tipo: "geral",
              ativo: true,
              tem_custo: !!(inscricao.evento?.valores_por_tipo),
              valores_por_tipo: inscricao.evento?.valores_por_tipo || null,
            } as any)
            .select("id")
            .single();
          if (createError) throw createError;
          impactoEventoId = newEvento.id;
        }

        // Resolve gender fallback from member
        let generoResolvido = inscricao.genero || null;
        if (!generoResolvido && inscricao.member_id) {
          const { data: memberData } = await supabase
            .from("members")
            .select("genero")
            .eq("id", inscricao.member_id)
            .maybeSingle();
          if (memberData?.genero) {
            const g = memberData.genero.toLowerCase();
            generoResolvido = g === "masculino" ? "M" : g === "feminino" ? "F" : memberData.genero;
          }
        }

        // Mirror is created by the trigger; just persist context for post-update enrichment
        (inscricao as any).__impactoEventoId = impactoEventoId;
        (inscricao as any).__generoResolvido = generoResolvido;
        (inscricao as any).__valorInscricao = valorInscricao;
      }

      const { error } = await supabase
        .from("inscricoes_eventos")
        .update({
          aprovado: true,
          aprovado_em: new Date().toISOString(),
        })
        .in("id", ids);
      if (error) throw error;

      // Enrich mirror records (best-effort)
      for (const inscricao of toApprove) {
        const impactoEventoId = (inscricao as any).__impactoEventoId;
        if (!impactoEventoId) continue;
        try {
          await supabase
            .from("impacto_inscricoes")
            .update({
              genero: (inscricao as any).__generoResolvido,
              valor_inscricao: (inscricao as any).__valorInscricao,
              telefone_emergencia: inscricao.telefone_emergencia || null,
              nome_responsavel: inscricao.nome_responsavel || null,
              telefone_responsavel: inscricao.telefone_responsavel || null,
            })
            .eq("evento_id", impactoEventoId)
            .eq("member_id", inscricao.member_id || "00000000-0000-0000-0000-000000000000");
        } catch (e) {
          console.warn("[novasInscricoes/lote] enrich mirror falhou:", e);
        }
      }

      // Best-effort: confirmação com link do grupo para cada inscrição aprovada em lote
      for (const inscricao of toApprove) {
        try {
          const { data: eventoFull } = await supabase
            .from("agenda_igreja")
            .select("titulo, data_evento, hora_inicio, local, link_grupo_whatsapp")
            .eq("id", inscricao.evento_id)
            .maybeSingle();

          await supabase.functions.invoke("enviar-whatsapp", {
            body: {
              action: "confirmacao_inscricao",
              inscricaoId: inscricao.id,
              evento: {
                titulo: eventoFull?.titulo ?? inscricao.evento?.titulo ?? null,
                data_evento: eventoFull?.data_evento ?? inscricao.evento?.data_evento ?? null,
                hora_inicio: eventoFull?.hora_inicio ?? null,
                local: eventoFull?.local ?? null,
                link_grupo_whatsapp: eventoFull?.link_grupo_whatsapp ?? null,
              },
            },
          });
        } catch (waErr) {
          console.warn("[novasInscricoes/lote] confirmação whatsapp falhou:", waErr);
        }
      }
    },
    onSuccess: () => {
      toast.success("Todas as inscrições foram aprovadas!");
      queryClient.invalidateQueries({ queryKey: ["novas-inscricoes-pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["inscricoes-eventos-pending-count"] });
      queryClient.invalidateQueries({ queryKey: ["agenda-inscricoes"] });
      queryClient.invalidateQueries({ queryKey: ["agenda-inscricoes-financeiro"] });
      queryClient.invalidateQueries({ queryKey: ["impacto-inscricoes"] });
      queryClient.invalidateQueries({ queryKey: ["impacto-inscricoes-count"] });
    },
    onError: (error) => {
      console.error("[novasInscricoes/lote] erro ao aprovar inscrições:", error);
      toast.error("Erro ao aprovar inscrições.", { description: getErrorMessage(error) });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, source }: { id: string; source: "evento" | "casais" }) => {
      const table = source === "casais" ? "casais_inscritos" : "inscricoes_eventos";
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inscrição rejeitada e removida.");
      setRejectingId(null);
      queryClient.invalidateQueries({ queryKey: ["novas-inscricoes-pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["novas-casais-pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["casais_inscricoes_pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["pending-casais-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["inscricoes-eventos-pending-count"] });
    },
    onError: () => toast.error("Erro ao rejeitar inscrição."),
  });

  const filtradas = useMemo(() => {
    if (!search.trim()) return inscricoesUnificadas;
    const q = search.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return inscricoesUnificadas.filter((i: any) =>
      (i.nome_participante || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(q) ||
      (i.evento?.titulo || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(q)
    );
  }, [inscricoesUnificadas, search]);

  // "Aprovar todas" só se aplica às inscrições de eventos (fluxo original)
  const pendentesIdsEvento = filtradas.filter((i: any) => i._source === "evento").map((i: any) => i.id);

  if (isLoading || isLoadingCasais) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-heading font-bold">Novas Inscrições</h2>
          <p className="text-sm text-muted-foreground">
            Inscrições de eventos e do Curso de Casais aguardando aprovação
          </p>
        </div>
        {pendentesIdsEvento.length > 0 && (
          <Button
            onClick={() => approveAllMutation.mutate(pendentesIdsEvento)}
            disabled={approveAllMutation.isPending}
            variant="default"
          >
            {approveAllMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Aprovar Todas Eventos ({pendentesIdsEvento.length})
          </Button>
        )}
      </div>

      {inscricoesUnificadas.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou evento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {inscricoesUnificadas.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <UserPlus className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">Nenhuma inscrição pendente</p>
            <p className="text-sm text-muted-foreground mt-1">
              Novas inscrições pelo link público aparecerão aqui para aprovação
            </p>
          </CardContent>
        </Card>
      ) : filtradas.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum resultado para a busca.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {filtradas.map((inscricao) => (
              <Card key={inscricao.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      {inscricao.member?.photo_url ? (
                        <AvatarImage src={inscricao.member.photo_url} alt={inscricao.nome_participante} />
                      ) : null}
                      <AvatarFallback className="text-xs">{(inscricao.nome_participante || "?")[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div>
                        <div className="font-medium leading-tight text-foreground">{inscricao.nome_participante}</div>
                        {inscricao.telefone_contato && (
                          <div className="text-xs text-muted-foreground mt-1">{inscricao.telefone_contato}</div>
                        )}
                      </div>
                      <div className="text-sm leading-snug">
                        <div className="font-medium">{inscricao.evento?.titulo || "—"}</div>
                        {inscricao.evento?.data_evento && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(parseLocalDate(inscricao.evento.data_evento), "dd/MM/yyyy", { locale: ptBR })}
                            {inscricao.evento.data_fim && inscricao.evento.data_fim !== inscricao.evento.data_evento
                              ? ` → ${format(parseLocalDate(inscricao.evento.data_fim), "dd/MM/yyyy", { locale: ptBR })}`
                              : ""}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <Badge variant="outline">
                          {TIPOS_INSCRICAO_LABELS[inscricao.tipo_inscricao || "membro"] || inscricao.tipo_inscricao}
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => approveMutation.mutate({ id: inscricao.id, source: inscricao._source })}
                            disabled={approvingIds.has(inscricao.id)}
                            title="Aprovar inscrição"
                            aria-label="Aprovar inscrição"
                          >
                            {approvingIds.has(inscricao.id) ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => { setRejectingId(inscricao.id); setRejectingSource(inscricao._source); }}
                            title="Rejeitar inscrição"
                            aria-label="Rejeitar inscrição"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="hidden md:block overflow-hidden">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Recebido em</TableHead>
                <TableHead className="w-[120px] text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.map((inscricao) => (
                <TableRow key={inscricao.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {inscricao.member?.photo_url ? (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={inscricao.member.photo_url} alt={inscricao.nome_participante} />
                          <AvatarFallback className="text-xs">{(inscricao.nome_participante || "?")[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                      ) : (
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">{(inscricao.nome_participante || "?")[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                      )}
                      <div>
                        <div className="font-medium">{inscricao.nome_participante}</div>
                        {inscricao.telefone_contato && (
                          <div className="text-xs text-muted-foreground">{inscricao.telefone_contato}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{inscricao.evento?.titulo || "—"}</div>
                    {inscricao.evento?.data_evento && (
                      <div className="text-xs text-muted-foreground">
                        {format(parseLocalDate(inscricao.evento.data_evento), "dd/MM/yyyy", { locale: ptBR })}
                        {inscricao.evento.data_fim && inscricao.evento.data_fim !== inscricao.evento.data_evento
                          ? ` → ${format(parseLocalDate(inscricao.evento.data_fim), "dd/MM/yyyy", { locale: ptBR })}`
                          : ""}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {TIPOS_INSCRICAO_LABELS[inscricao.tipo_inscricao || "membro"] || inscricao.tipo_inscricao}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(inscricao.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => approveMutation.mutate({ id: inscricao.id, source: inscricao._source })}
                        disabled={approvingIds.has(inscricao.id)}
                        title="Aprovar inscrição"
                      >
                        {approvingIds.has(inscricao.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => { setRejectingId(inscricao.id); setRejectingSource(inscricao._source); }}
                        title="Rejeitar inscrição"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </Card>
        </>
      )}

      <AlertDialog open={!!rejectingId} onOpenChange={(o) => !o && setRejectingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar inscrição?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta inscrição será removida permanentemente. O participante não será incluído no evento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => rejectingId && rejectMutation.mutate({ id: rejectingId, source: rejectingSource })}
            >
              Rejeitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NovasInscricoesTab;
