import { useState, useMemo } from "react";
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
import { Check, X, Search, UserPlus, Loader2 } from "lucide-react";

const TIPOS_INSCRICAO_LABELS: Record<string, string> = {
  membro: "Membro",
  nao_membro: "Não membro",
  familia: "Líderes e Anfitriões",
  equipe: "Equipe",
};

const NovasInscricoesTab = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
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

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
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

      // Create a mirror record in impacto_inscricoes so the referência trigger fires
      const { error: insertError } = await supabase
        .from("impacto_inscricoes")
        .insert({
          evento_id: impactoEventoId,
          nome: inscricao.nome_participante,
          telefone: inscricao.telefone_contato,
          tipo_inscricao: inscricao.tipo_inscricao || "membro",
          genero: generoResolvido,
          valor_inscricao: valorInscricao,
          status_pagamento: "pendente",
          member_id: inscricao.member_id || null,
          aprovado: true,
        });
      if (insertError) throw insertError;

      // Mark the original public record as approved
      const { error } = await supabase
        .from("inscricoes_eventos")
        .update({
          aprovado: true,
          aprovado_em: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: (id) => {
      setApprovingIds((prev) => new Set(prev).add(id));
    },
    onSuccess: (_, id) => {
      setApprovingIds((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
      toast.success("Inscrição aprovada!");
      queryClient.invalidateQueries({ queryKey: ["novas-inscricoes-pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["agenda-inscricoes"] });
      queryClient.invalidateQueries({ queryKey: ["agenda-inscricoes-financeiro"] });
      queryClient.invalidateQueries({ queryKey: ["impacto-inscricoes"] });
      queryClient.invalidateQueries({ queryKey: ["impacto-inscricoes-count"] });
    },
    onError: (_, id) => {
      setApprovingIds((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
      toast.error("Erro ao aprovar inscrição.");
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

        const { error: insertError } = await supabase.from("impacto_inscricoes").insert({
          evento_id: impactoEventoId,
          nome: inscricao.nome_participante,
          telefone: inscricao.telefone_contato,
          tipo_inscricao: inscricao.tipo_inscricao || "membro",
          genero: generoResolvido,
          valor_inscricao: valorInscricao,
          status_pagamento: "pendente",
          member_id: inscricao.member_id || null,
          aprovado: true,
        });
        if (insertError) throw insertError;
      }

      const { error } = await supabase
        .from("inscricoes_eventos")
        .update({
          aprovado: true,
          aprovado_em: new Date().toISOString(),
        })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Todas as inscrições foram aprovadas!");
      queryClient.invalidateQueries({ queryKey: ["novas-inscricoes-pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["agenda-inscricoes"] });
      queryClient.invalidateQueries({ queryKey: ["agenda-inscricoes-financeiro"] });
      queryClient.invalidateQueries({ queryKey: ["impacto-inscricoes"] });
      queryClient.invalidateQueries({ queryKey: ["impacto-inscricoes-count"] });
    },
    onError: () => toast.error("Erro ao aprovar inscrições."),
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("inscricoes_eventos")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inscrição rejeitada e removida.");
      setRejectingId(null);
      queryClient.invalidateQueries({ queryKey: ["novas-inscricoes-pendentes"] });
    },
    onError: () => toast.error("Erro ao rejeitar inscrição."),
  });

  const filtradas = useMemo(() => {
    if (!search.trim()) return novasInscricoes;
    const q = search.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return novasInscricoes.filter((i) =>
      (i.nome_participante || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(q) ||
      (i.evento?.titulo || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(q)
    );
  }, [novasInscricoes, search]);

  const pendentesIds = filtradas.map((i) => i.id);

  if (isLoading) {
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
            Inscrições recebidas pelo link público aguardando aprovação
          </p>
        </div>
        {novasInscricoes.length > 0 && (
          <Button
            onClick={() => approveAllMutation.mutate(pendentesIds)}
            disabled={approveAllMutation.isPending}
            variant="default"
          >
            {approveAllMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Aprovar Todas ({pendentesIds.length})
          </Button>
        )}
      </div>

      {novasInscricoes.length > 0 && (
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

      {novasInscricoes.length === 0 ? (
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
        <Card>
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
                    <div className="font-medium">{inscricao.nome_participante}</div>
                    {inscricao.telefone_contato && (
                      <div className="text-xs text-muted-foreground">{inscricao.telefone_contato}</div>
                    )}
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
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => approveMutation.mutate(inscricao.id)}
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
                        onClick={() => setRejectingId(inscricao.id)}
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
              onClick={() => rejectingId && rejectMutation.mutate(rejectingId)}
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
