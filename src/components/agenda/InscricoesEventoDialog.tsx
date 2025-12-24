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
  Filter
} from "lucide-react";
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
}

interface InscricoesEventoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventoId: string;
  eventoTitulo: string;
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
    const matchSearch = i.nome_participante.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === "todos" || i.status_pagamento === filterStatus;
    const matchGenero = filterGenero === "todos" || i.genero === filterGenero;
    const matchMenor = filterMenor === "todos" || 
      (filterMenor === "sim" && i.is_menor) || 
      (filterMenor === "nao" && !i.is_menor);
    return matchSearch && matchStatus && matchGenero && matchMenor;
  });

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

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("inscricoes_eventos")
        .delete()
        .eq("id", deleteId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["inscricoes-evento", eventoId] });
      toast({ title: "Inscrição removida!" });
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
  };

  const hasActiveFilters = searchTerm || filterStatus !== "todos" || filterGenero !== "todos" || filterMenor !== "todos";

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
          <div className="grid grid-cols-3 gap-4 py-2">
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-2xl font-bold">{totalInscritos}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">{confirmados}</p>
              <p className="text-xs text-muted-foreground">Confirmados</p>
            </div>
            <div className="p-3 bg-yellow-500/10 rounded-lg text-center">
              <p className="text-2xl font-bold text-yellow-600">{pendentes}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </div>

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
            </div>
            {hasActiveFilters && (
              <p className="text-xs text-muted-foreground">
                Mostrando {inscricoesFiltradas.length} de {inscricoes.length} inscrições
              </p>
            )}
          </div>

          {/* Export Button */}
          <div className="flex justify-end">
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
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inscricoesFiltradas.map((inscricao) => (
                    <TableRow key={inscricao.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{inscricao.nome_participante}</p>
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
