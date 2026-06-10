import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { includesNormalized } from "@/lib/text-utils";
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
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Users, 
  Phone, 
  AlertTriangle, 
  Pill, 
  CreditCard,
  Check,
  X,
  Trash2,
  FileDown,
  
  Filter,
  Clock,
  UserPlus,
  MessageSquare,
  Edit2
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { Checkbox } from "@/components/ui/checkbox";
import { ptBR } from "date-fns/locale";
import ExcelJS from "exceljs";

interface Inscricao {
  id: string;
  evento_id: string;
  member_id: string | null;
  novo_convertido_id: string | null;
  nome_participante: string;
  genero: string | null;
  telefone_contato: string;
  telefone_emergencia: string | null;
  is_menor: boolean;
  nome_responsavel: string | null;
  telefone_responsavel: string | null;
  preferencia_beliche: string | null;
  tem_alergia_alimentar: boolean;
  descricao_alergia: string | null;
  toma_medicamento: boolean;
  descricao_medicamento: string | null;
  forma_pagamento: string;
  status_pagamento: string;
  observacoes: string | null;
  created_at: string;
  lista_espera: boolean;
}

interface InscricoesEventoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventoId: string;
  eventoTitulo: string;
  eventoLocal?: string | null;
  eventoData?: string;
  limiteVagas?: number | null;
}

const formaPagamentoLabels: Record<string, string> = {
  pix: "PIX",
  credito: "Crédito",
  debito: "Débito",
  dinheiro: "Dinheiro",
  misto: "Multi (Misto)",
  cartao_credito: "Crédito",
  cartao_debito: "Débito",
};

const tipoInscricaoLabels: Record<string, string> = {
  membro: "Membro",
  nao_membro: "Não Membro",
  familia: "Líderes e Anfitriões",
  equipe: "Equipe",
};

const statusPagamentoLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pendente: { label: "A pagar", variant: "secondary" },
  confirmado: { label: "Pago", variant: "default" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};

export const InscricoesEventoDialog = ({
  open,
  onOpenChange,
  eventoId,
  eventoTitulo,
  eventoLocal,
  eventoData,
  limiteVagas,
}: InscricoesEventoDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterCondominio, setFilterCondominio] = useState<string>("todos");
  const [filterCasaRefugio, setFilterCasaRefugio] = useState<string>("todos");

  const { data: inscricoes = [], isLoading } = useQuery({
    queryKey: ["inscricoes-evento", eventoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscricoes_eventos")
        .select("*")
        .eq("evento_id", eventoId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Inscricao[];
    },
    enabled: open && !!eventoId,
  });

  // Fetch event config for valores_por_tipo
  const { data: eventoConfig } = useQuery({
    queryKey: ["evento-config", eventoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_igreja")
        .select("tem_custo, valor_custo, valores_por_tipo, tipo_evento")
        .eq("id", eventoId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!eventoId,
  });

  const inscricaoPath = eventoConfig?.tipo_evento === "apresentacao_criancas"
    ? `/inscricao/apresentacao/${eventoId}`
    : `/inscricao/${eventoId}`;

  // Fetch member casa_refugio data for all member_ids
  const memberIds = inscricoes.filter(i => i.member_id).map(i => i.member_id!);
  
  const { data: memberCasasRefugio = [] } = useQuery({
    queryKey: ["member-casas-refugio-inscricoes", eventoId, memberIds],
    queryFn: async () => {
      if (memberIds.length === 0) return [];
      // First get member casa_refugio_ids
      const { data: membersData, error: mErr } = await supabase
        .from("members")
        .select("id, casa_refugio_id")
        .in("id", memberIds)
        .not("casa_refugio_id", "is", null);
      if (mErr) throw mErr;
      if (!membersData || membersData.length === 0) return [];
      
      // Then get casas_refugio details
      const crIds = [...new Set(membersData.map(m => m.casa_refugio_id).filter(Boolean))] as string[];
      const { data: crsData, error: crErr } = await supabase
        .from("casas_refugio")
        .select("id, name, condominio")
        .in("id", crIds);
      if (crErr) throw crErr;
      
      const crMap = new Map((crsData || []).map(cr => [cr.id, cr]));
      return membersData.map(m => ({
        id: m.id,
        casa_refugio_id: m.casa_refugio_id,
        casas_refugio: crMap.get(m.casa_refugio_id!) || null,
      }));
    },
    enabled: memberIds.length > 0,
  });

  const { data: memberFunctions = [] } = useQuery({
    queryKey: ["member-functions-inscricoes", eventoId, memberIds],
    queryFn: async () => {
      if (memberIds.length === 0) return [];
      const { data, error } = await supabase
        .from("member_functions")
        .select("member_id, function_type, subfuncao")
        .in("member_id", memberIds);
      if (error) throw error;
      return data;
    },
    enabled: memberIds.length > 0,
  });

  const getMemberCasaRefugio = (memberId: string | null) => {
    if (!memberId) return null;
    return memberCasasRefugio.find(m => m.id === memberId)?.casas_refugio || null;
  };

  const funcaoLabels: Record<string, string> = {
    pastor_geral: "Pastor Geral",
    pastor_auxiliar: "Pastor Auxiliar",
    sindico_condominio: "Síndico",
    supervisor_condominio: "Supervisor Condomínio",
    supervisor_casa_refugio: "Supervisor CR",
    lider_casa_refugio: "Líder CR",
    lider_ministerio: "Líder Ministério",
    integrante_ministerio: "Integrante Ministério",
  };

  const getFuncaoLabel = (memberId: string | null) => {
    if (!memberId) return "-";
    const funcs = memberFunctions.filter(f => f.member_id === memberId);
    if (funcs.length === 0) return "-";
    // Deduplicate by function_type
    const uniqueTypes = [...new Set(funcs.map(f => f.function_type))];
    return uniqueTypes.map(ft => funcaoLabels[ft] || ft).join(", ");
  };

  // Filtered and sorted inscriptions
  const inscricoesFiltradas = inscricoes
    .filter((i) => {
      const matchSearch = includesNormalized(i.nome_participante, searchTerm);
      const matchStatus = filterStatus === "todos" || i.status_pagamento === filterStatus;
      const crData = getMemberCasaRefugio(i.member_id);
      const matchCondominio = filterCondominio === "todos" || (crData?.condominio || "") === filterCondominio;
      const matchCR = filterCasaRefugio === "todos" || (crData?.name || "") === filterCasaRefugio;
      return matchSearch && matchStatus && matchCondominio && matchCR;
    })
    .sort((a, b) => a.nome_participante.localeCompare(b.nome_participante, "pt-BR"));

  // Contagens
  const inscricoesConfirmadas = inscricoes.filter(i => !i.lista_espera && i.status_pagamento !== "cancelado");
  const inscricoesListaEspera = inscricoes.filter(i => i.lista_espera);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("inscricoes_eventos")
        .update({ status_pagamento: status })
        .eq("id", id);
      if (error) throw error;
      return { id, status };
    },
    onSuccess: async ({ id, status }) => {
      queryClient.invalidateQueries({ queryKey: ["inscricoes-evento", eventoId] });
      toast({ title: "Status atualizado!" });

      // Ao confirmar, dispara mensagem de agradecimento + link do grupo de WhatsApp (se configurado)
      if (status === "confirmado") {
        try {
          const { data: eventoFull } = await supabase
            .from("agenda_igreja")
            .select("titulo, data_evento, hora_inicio, local, link_grupo_whatsapp")
            .eq("id", eventoId)
            .maybeSingle();

          await supabase.functions.invoke("enviar-whatsapp", {
            body: {
              action: "confirmacao_inscricao",
              inscricaoId: id,
              evento: {
                titulo: eventoFull?.titulo ?? eventoTitulo,
                data_evento: eventoFull?.data_evento ?? eventoData,
                hora_inicio: eventoFull?.hora_inicio ?? null,
                local: eventoFull?.local ?? eventoLocal,
                link_grupo_whatsapp: eventoFull?.link_grupo_whatsapp ?? null,
              },
            },
          });
          toast({ title: "Confirmação enviada por WhatsApp!" });
        } catch (err) {
          console.error("Erro ao enviar confirmação por WhatsApp:", err);
          toast({
            variant: "destructive",
            title: "Status atualizado, mas falha ao enviar WhatsApp",
            description: (err as Error)?.message || "Verifique a configuração da Evolution API.",
          });
        }
      }
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    },
  });

  const updateFormaPagamentoMutation = useMutation({
    mutationFn: async ({ id, forma }: { id: string; forma: string }) => {
      const { error } = await supabase
        .from("inscricoes_eventos")
        .update({ forma_pagamento: forma })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inscricoes-evento", eventoId] });
      toast({ title: "Forma de pagamento atualizada!" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    },
  });

  const updateTipoInscricaoMutation = useMutation({
    mutationFn: async ({ id, tipo }: { id: string; tipo: string }) => {
      // Get the value for this tipo from event config
      const vpt = eventoConfig?.valores_por_tipo as Record<string, string> | null;
      const hasVpt = vpt && Object.keys(vpt).length > 0;
      const valorTipo = hasVpt ? vpt[tipo] : null;
      const valorFinal = valorTipo ? parseFloat(valorTipo) : (eventoConfig?.valor_custo || null);
      
      const { error } = await supabase
        .from("inscricoes_eventos")
        .update({ 
          tipo_inscricao: tipo,
          valor_inscricao: valorFinal 
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inscricoes-evento", eventoId] });
      toast({ title: "Tipo de inscrição atualizado!" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    },
  });

  const updateObservacoesMutation = useMutation({
    mutationFn: async ({ id, observacoes }: { id: string; observacoes: string }) => {
      const { error } = await supabase
        .from("inscricoes_eventos")
        .update({ observacoes })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inscricoes-evento", eventoId] });
      toast({ title: "Observações salvas!" });
      setEditingObservacoes(null);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    },
  });

  const toggleFlagMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: "converteu" | "reconciliou"; value: boolean }) => {
      const { error } = await supabase
        .from("inscricoes_eventos")
        .update({ [field]: value } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, field, value }) => {
      const key = ["inscricoes-evento", eventoId];
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<any[]>(key);
      if (prev) {
        queryClient.setQueryData(key, prev.map((i: any) => (i.id === id ? { ...i, [field]: value } : i)));
      }
      return { prev };
    },
    onError: (error: any, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["inscricoes-evento", eventoId], ctx.prev);
      toast({ variant: "destructive", title: "Erro", description: error.message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["inscricoes-evento", eventoId] });
    },
  });

  const [editingObservacoes, setEditingObservacoes] = useState<{ id: string; value: string } | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      // Find the inscription to get member_id/nome for cross-table cleanup
      const deletedInscricao = inscricoes.find(i => i.id === deleteId);

      const { error } = await supabase
        .from("inscricoes_eventos")
        .delete()
        .eq("id", deleteId);
      if (error) throw error;

      // Also delete counterpart in impacto_inscricoes
      if (eventoId) {
        if (deletedInscricao?.member_id) {
          await supabase.from("impacto_inscricoes").delete().eq("evento_id", eventoId).eq("member_id", deletedInscricao.member_id);
        }
        if (deletedInscricao?.nome_participante) {
          const nomeNorm = deletedInscricao.nome_participante.trim();
          if (nomeNorm) {
            await supabase.from("impacto_inscricoes").delete().eq("evento_id", eventoId).ilike("nome", `%${nomeNorm}%`);
          }
        }
      }

      // Verificar se há alguém na lista de espera para notificar
      if (limiteVagas) {
        const inscricoesAtivas = inscricoes.filter(i => i.id !== deleteId && !i.lista_espera && i.status_pagamento !== "cancelado");
        const listaEspera = inscricoes.filter(i => i.lista_espera).sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        if (inscricoesAtivas.length < limiteVagas && listaEspera.length > 0) {
          const proximoDaLista = listaEspera[0];
          
          // Mover da lista de espera para inscrição confirmada
          await supabase
            .from("inscricoes_eventos")
            .update({ lista_espera: false })
            .eq("id", proximoDaLista.id);
          
          // Enviar notificação por WhatsApp
          try {
            await supabase.functions.invoke('enviar-whatsapp', {
              body: {
                action: 'notificar_vaga_liberada',
                inscricaoId: proximoDaLista.id,
                evento: {
                  titulo: eventoTitulo,
                  data_evento: eventoData,
                  local: eventoLocal,
                },
              },
            });
            toast({ title: "Inscrição removida e próximo da lista notificado!" });
          } catch (whatsappError) {
            console.error('Erro ao enviar WhatsApp:', whatsappError);
            toast({ title: "Inscrição removida! Próximo da lista foi promovido." });
          }
        } else {
          toast({ title: "Inscrição removida!" });
        }
      } else {
        toast({ title: "Inscrição removida!" });
      }
      
      queryClient.invalidateQueries({ queryKey: ["inscricoes-evento", eventoId] });
      queryClient.invalidateQueries({ queryKey: ["impacto-inscricoes", eventoId] });
      queryClient.invalidateQueries({ queryKey: ["impacto-inscricoes-count"] });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleExportExcel = async () => {
    if (inscricoesFiltradas.length === 0) {
      toast({ variant: "destructive", title: "Nenhuma inscrição para exportar" });
      return;
    }

    const dataExport = inscricoesFiltradas.map((i, idx) => ({
      "#": idx + 1,
      "Nome": i.nome_participante,
      "Condomínio": getMemberCasaRefugio(i.member_id)?.condominio || "-",
      "Casa Refúgio": getMemberCasaRefugio(i.member_id)?.name || "-",
      "Função": getFuncaoLabel(i.member_id),
      "Telefone": i.telefone_contato,
      "Forma Pagamento": formaPagamentoLabels[i.forma_pagamento] || i.forma_pagamento || "-",
      "Situação": statusPagamentoLabels[i.status_pagamento]?.label || i.status_pagamento,
      "Data Inscrição": format(new Date(i.created_at), "dd/MM/yyyy HH:mm"),
    }));

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("Inscrições");
    if (dataExport.length > 0) {
      const headers = Object.keys(dataExport[0]);
      ws.addRow(headers);
      ws.getRow(1).font = { bold: true };
      dataExport.forEach((row) => ws.addRow(headers.map((h) => row[h as keyof typeof row])));
      headers.forEach((h, i) => {
        const col = ws.getColumn(i + 1);
        let maxLen = h.length;
        dataExport.forEach((row) => { const v = String(row[h as keyof typeof row] || ""); if (v.length > maxLen) maxLen = v.length; });
        col.width = Math.min(50, maxLen + 2);
      });
    }
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inscricoes-${eventoTitulo.replace(/\s+/g, "-").toLowerCase()}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Relatório exportado!" });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterStatus("todos");
    setFilterCondominio("todos");
    setFilterCasaRefugio("todos");
  };

  const hasActiveFilters = searchTerm || filterStatus !== "todos" || filterCondominio !== "todos" || filterCasaRefugio !== "todos";

  const totalInscritos = inscricoes.length;
  const confirmados = inscricoes.filter(i => i.status_pagamento === "confirmado").length;
  const pendentes = inscricoes.filter(i => i.status_pagamento === "pendente").length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Inscrições: {eventoTitulo}
            </DialogTitle>
          </DialogHeader>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 py-2">
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-2xl font-bold">{inscricoesConfirmadas.length}</p>
              <p className="text-xs text-muted-foreground">Inscritos</p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">{confirmados}</p>
              <p className="text-xs text-muted-foreground">Pagos</p>
            </div>
            <div className="p-3 bg-yellow-500/10 rounded-lg text-center">
              <p className="text-2xl font-bold text-yellow-600">{pendentes}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
            <div className="p-3 bg-orange-500/10 rounded-lg text-center">
              <p className="text-2xl font-bold text-orange-600">{inscricoesListaEspera.length}</p>
              <p className="text-xs text-muted-foreground">Lista Espera</p>
            </div>
          </div>
          {limiteVagas && (
            <div className="text-xs text-muted-foreground text-center pb-2">
              {inscricoesConfirmadas.length} de {limiteVagas} vagas preenchidas
            </div>
          )}

          {/* Filters */}
          <div className="space-y-3 border-b pb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros</span>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs">
                  Limpar filtros
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SearchInput
                placeholder="Buscar por nome..."
                value={searchTerm}
                onChange={setSearchTerm}
                className="h-9"
              />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCondominio} onValueChange={(v) => { setFilterCondominio(v); setFilterCasaRefugio("todos"); }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Condomínio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos condomínios</SelectItem>
                  {[...new Set(memberCasasRefugio.map(m => m.casas_refugio?.condominio).filter(Boolean))].sort().map(cond => (
                    <SelectItem key={cond} value={cond!}>{cond}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterCasaRefugio} onValueChange={setFilterCasaRefugio}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Casa Refúgio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas CRs</SelectItem>
                  {[...new Set(memberCasasRefugio
                    .filter(m => filterCondominio === "todos" || m.casas_refugio?.condominio === filterCondominio)
                    .map(m => m.casas_refugio?.name)
                    .filter(Boolean)
                  )].sort().map(cr => (
                    <SelectItem key={cr} value={cr!}>{cr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {hasActiveFilters && (
              <p className="text-xs text-muted-foreground">
                Mostrando {inscricoesFiltradas.length} de {inscricoes.length} inscrições
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between gap-2">
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => window.open(inscricaoPath, '_blank')}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Nova Inscrição
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={inscricoesFiltradas.length === 0}>
              <FileDown className="w-4 h-4 mr-2" />
              Exportar Excel
            </Button>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : inscricoesFiltradas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{hasActiveFilters ? "Nenhuma inscrição encontrada com os filtros aplicados" : "Nenhuma inscrição recebida"}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                   <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Condomínio</TableHead>
                    <TableHead>Casa Refúgio</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="text-center">Convertido</TableHead>
                    <TableHead className="text-center">Reconciliado</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inscricoesFiltradas.map((inscricao) => (
                    <TableRow key={inscricao.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{inscricao.nome_participante}</p>
                          {inscricao.lista_espera && (
                            <Badge variant="outline" className="text-xs text-orange-500 border-orange-300 mt-1">
                              <Clock className="w-3 h-3 mr-1" />
                              Espera
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{getMemberCasaRefugio(inscricao.member_id)?.condominio || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{getMemberCasaRefugio(inscricao.member_id)?.name || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{getFuncaoLabel(inscricao.member_id)}</span>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{inscricao.telefone_contato}</p>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={(inscricao as any).tipo_inscricao || "membro"}
                          onValueChange={(value) => updateTipoInscricaoMutation.mutate({ id: inscricao.id, tipo: value })}
                        >
                          <SelectTrigger className="w-28 h-8">
                            <SelectValue>
                              {tipoInscricaoLabels[(inscricao as any).tipo_inscricao || "membro"]}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="membro">Membro</SelectItem>
                            <SelectItem value="nao_membro">Não Membro</SelectItem>
                            <SelectItem value="familia">Líderes e Anfitriões</SelectItem>
                            <SelectItem value="equipe">Equipe</SelectItem>
                          </SelectContent>
                        </Select>
                        {(inscricao as any).valor_inscricao && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            R$ {Number((inscricao as any).valor_inscricao).toFixed(2)}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={inscricao.forma_pagamento || "none"}
                          onValueChange={(value) => updateFormaPagamentoMutation.mutate({ id: inscricao.id, forma: value === "none" ? "" : value })}
                        >
                          <SelectTrigger className="w-28 h-8">
                            <SelectValue placeholder="Selecione">
                              {formaPagamentoLabels[inscricao.forma_pagamento] || inscricao.forma_pagamento || "-"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pix">PIX</SelectItem>
                            <SelectItem value="credito">Crédito</SelectItem>
                            <SelectItem value="debito">Débito</SelectItem>
                            <SelectItem value="dinheiro">Dinheiro</SelectItem>
                            <SelectItem value="misto">Multi (Misto)</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={inscricao.status_pagamento}
                          onValueChange={(value) => updateStatusMutation.mutate({ id: inscricao.id, status: value })}
                        >
                          <SelectTrigger className="w-28 h-8">
                            <Badge variant={statusPagamentoLabels[inscricao.status_pagamento]?.variant || "secondary"}>
                              {statusPagamentoLabels[inscricao.status_pagamento]?.label || inscricao.status_pagamento}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendente">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                                A pagar
                              </span>
                            </SelectItem>
                            <SelectItem value="confirmado">
                              <span className="flex items-center gap-2">
                                <Check className="w-3 h-3 text-green-500" />
                                Pago
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={!!(inscricao as any).converteu}
                          onCheckedChange={(v) =>
                            toggleFlagMutation.mutate({ id: inscricao.id, field: "converteu", value: !!v })
                          }
                          aria-label="Convertido"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={!!(inscricao as any).reconciliou}
                          onCheckedChange={(v) =>
                            toggleFlagMutation.mutate({ id: inscricao.id, field: "reconciliou", value: !!v })
                          }
                          aria-label="Reconciliado"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => window.open(`${inscricaoPath}?edit=${inscricao.id}`, '_blank')}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(inscricao.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover inscrição?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A inscrição será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
