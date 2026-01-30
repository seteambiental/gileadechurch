import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Search,
  Filter,
  Clock,
  UserPlus,
  MessageSquare,
  Edit2
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";

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
  cartao_credito: "Cartão de Crédito",
  cartao_debito: "Cartão de Débito",
};

const statusPagamentoLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pendente: { label: "Pendente", variant: "secondary" },
  confirmado: { label: "Confirmado", variant: "default" },
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
  const [filterGenero, setFilterGenero] = useState<string>("todos");
  const [filterMenor, setFilterMenor] = useState<string>("todos");
  const [filterListaEspera, setFilterListaEspera] = useState<string>("todos");

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

  // Filtered inscriptions
  const inscricoesFiltradas = inscricoes.filter((i) => {
    const matchSearch = includesNormalized(i.nome_participante, searchTerm);
    const matchStatus = filterStatus === "todos" || i.status_pagamento === filterStatus;
    const matchGenero = filterGenero === "todos" || i.genero === filterGenero;
    const matchMenor = filterMenor === "todos" || 
      (filterMenor === "sim" && i.is_menor) || 
      (filterMenor === "nao" && !i.is_menor);
    const matchListaEspera = filterListaEspera === "todos" || 
      (filterListaEspera === "sim" && i.lista_espera) || 
      (filterListaEspera === "nao" && !i.lista_espera);
    return matchSearch && matchStatus && matchGenero && matchMenor && matchListaEspera;
  });

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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inscricoes-evento", eventoId] });
      toast({ title: "Status atualizado!" });
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

  const [editingObservacoes, setEditingObservacoes] = useState<{ id: string; value: string } | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("inscricoes_eventos")
        .delete()
        .eq("id", deleteId);
      if (error) throw error;

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
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleExportExcel = () => {
    if (inscricoesFiltradas.length === 0) {
      toast({ variant: "destructive", title: "Nenhuma inscrição para exportar" });
      return;
    }

    const dataExport = inscricoesFiltradas.map((i, idx) => ({
      "#": idx + 1,
      "Nome": i.nome_participante,
      "Gênero": i.genero === "masculino" ? "M" : i.genero === "feminino" ? "F" : "-",
      "Telefone": i.telefone_contato,
      "Tel. Emergência": i.telefone_emergencia || "-",
      "Menor": i.is_menor ? "Sim" : "Não",
      "Responsável": i.nome_responsavel || "-",
      "Tel. Responsável": i.telefone_responsavel || "-",
      "Beliche": i.preferencia_beliche === "cima" ? "Cima" : i.preferencia_beliche === "baixo" ? "Baixo" : "Indiferente",
      "Alergia": i.tem_alergia_alimentar ? i.descricao_alergia : "Não",
      "Medicamento": i.toma_medicamento ? i.descricao_medicamento : "Não",
      "Pagamento": formaPagamentoLabels[i.forma_pagamento] || i.forma_pagamento,
      "Status": statusPagamentoLabels[i.status_pagamento]?.label || i.status_pagamento,
      "Data Inscrição": format(parseISO(i.created_at), "dd/MM/yyyy HH:mm"),
    }));

    const ws = XLSX.utils.json_to_sheet(dataExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inscrições");
    XLSX.writeFile(wb, `inscricoes-${eventoTitulo.replace(/\s+/g, "-").toLowerCase()}.xlsx`);
    toast({ title: "Relatório exportado!" });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterStatus("todos");
    setFilterGenero("todos");
    setFilterMenor("todos");
    setFilterListaEspera("todos");
  };

  const hasActiveFilters = searchTerm || filterStatus !== "todos" || filterGenero !== "todos" || filterMenor !== "todos" || filterListaEspera !== "todos";

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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
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
              <Select value={filterGenero} onValueChange={setFilterGenero}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Gênero" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos gêneros</SelectItem>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterMenor} onValueChange={setFilterMenor}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Menores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="sim">Menores de idade</SelectItem>
                  <SelectItem value="nao">Maiores de idade</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterListaEspera} onValueChange={setFilterListaEspera}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Lista Espera" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="sim">Lista de espera</SelectItem>
                  <SelectItem value="nao">Inscritos</SelectItem>
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
              onClick={() => window.open(`/inscricao/${eventoId}`, '_blank')}
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
                    <TableHead>Contato</TableHead>
                    <TableHead>Info</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inscricoesFiltradas.map((inscricao) => (
                    <TableRow key={inscricao.id}>
                      <TableCell>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{inscricao.nome_participante}</p>
                            {inscricao.lista_espera && (
                              <Badge variant="outline" className="text-xs text-orange-500 border-orange-300">
                                <Clock className="w-3 h-3 mr-1" />
                                Espera
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {inscricao.genero === "masculino" ? "Masculino" : inscricao.genero === "feminino" ? "Feminino" : "-"}
                            {inscricao.is_menor && (
                              <span className="ml-2 text-orange-500">• Menor</span>
                            )}
                          </p>
                          {inscricao.is_menor && inscricao.nome_responsavel && (
                            <p className="text-xs text-muted-foreground">
                              Resp: {inscricao.nome_responsavel}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {inscricao.telefone_contato}
                          </p>
                          {inscricao.telefone_emergencia && (
                            <p className="text-xs text-muted-foreground">
                              Emerg: {inscricao.telefone_emergencia}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {inscricao.preferencia_beliche && inscricao.preferencia_beliche !== "indiferente" && (
                            <Badge variant="outline" className="text-xs">
                              Beliche: {inscricao.preferencia_beliche}
                            </Badge>
                          )}
                          {inscricao.tem_alergia_alimentar && (
                            <Badge variant="outline" className="text-xs text-red-500 border-red-200">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Alergia
                            </Badge>
                          )}
                          {inscricao.toma_medicamento && (
                            <Badge variant="outline" className="text-xs text-blue-500 border-blue-200">
                              <Pill className="w-3 h-3 mr-1" />
                              Medicamento
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <CreditCard className="w-3 h-3" />
                          {formaPagamentoLabels[inscricao.forma_pagamento] || inscricao.forma_pagamento}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={inscricao.status_pagamento}
                          onValueChange={(value) => updateStatusMutation.mutate({ id: inscricao.id, status: value })}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <Badge variant={statusPagamentoLabels[inscricao.status_pagamento]?.variant || "secondary"}>
                              {statusPagamentoLabels[inscricao.status_pagamento]?.label || inscricao.status_pagamento}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendente">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                                Pendente
                              </span>
                            </SelectItem>
                            <SelectItem value="confirmado">
                              <span className="flex items-center gap-2">
                                <Check className="w-3 h-3 text-green-500" />
                                Confirmado
                              </span>
                            </SelectItem>
                            <SelectItem value="cancelado">
                              <span className="flex items-center gap-2">
                                <X className="w-3 h-3 text-red-500" />
                                Cancelado
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {editingObservacoes?.id === inscricao.id ? (
                          <div className="space-y-2 min-w-[200px]">
                            <Textarea
                              value={editingObservacoes.value}
                              onChange={(e) => setEditingObservacoes({ ...editingObservacoes, value: e.target.value })}
                              className="text-xs h-16"
                              placeholder="Adicionar observação..."
                            />
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                className="h-6 text-xs"
                                onClick={() => updateObservacoesMutation.mutate({ 
                                  id: inscricao.id, 
                                  observacoes: editingObservacoes.value 
                                })}
                                disabled={updateObservacoesMutation.isPending}
                              >
                                {updateObservacoesMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Salvar"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-xs"
                                onClick={() => setEditingObservacoes(null)}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div 
                            className="flex items-start gap-1 cursor-pointer hover:bg-muted/50 p-1 rounded min-w-[150px]"
                            onClick={() => setEditingObservacoes({ id: inscricao.id, value: inscricao.observacoes || "" })}
                          >
                            {inscricao.observacoes ? (
                              <p className="text-xs text-muted-foreground line-clamp-2">{inscricao.observacoes}</p>
                            ) : (
                              <span className="text-xs text-muted-foreground/50 flex items-center gap-1">
                                <Edit2 className="w-3 h-3" />
                                Adicionar nota
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(inscricao.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
