import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { todayDateStr } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Users, MessageCircle, Loader2, Check, Calendar } from "lucide-react";
import { toast } from "sonner";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ContribuinteFormDialog } from "./ContribuinteFormDialog";
import { formatDateBR } from "@/lib/masks";

interface Contribuinte {
  id: string;
  member_id: string | null;
  nome_manual: string | null;
  valor_mensal: number;
  ativo: boolean;
  data_inicio: string;
  dia_vencimento: number | null;
  observacoes: string | null;
  member?: {
    full_name: string;
    whatsapp: string | null;
  } | null;
}

interface Contribuicao {
  id: string;
  contribuinte_id: string;
  mes_referencia: string;
  valor: number;
  pago: boolean;
  agradecimento_enviado: boolean;
}

export function MissoesContribuintesTab() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContribuinte, setSelectedContribuinte] = useState<Contribuinte | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contribuinteToDelete, setContribuinteToDelete] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const mesAtual = (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`; })(); // YYYY-MM

  const { data: contribuintes, isLoading } = useQuery({
    queryKey: ["missoes-contribuintes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("missoes_mocambique_contribuintes")
        .select(`
          *,
          member:members(full_name, whatsapp)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Contribuinte[];
    },
  });

  // Buscar contribuições do mês atual para saber quais já receberam agradecimento
  const { data: contribuicoesMes } = useQuery({
    queryKey: ["missoes-contribuicoes-mes", mesAtual],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("missoes_mocambique_contribuicoes")
        .select("*")
        .eq("mes_referencia", mesAtual);

      if (error) throw error;
      return data as Contribuicao[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("missoes_mocambique_contribuintes")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missoes-contribuintes"] });
      toast.success("Contribuinte removido com sucesso!");
      setDeleteDialogOpen(false);
    },
    onError: () => {
      toast.error("Erro ao remover contribuinte");
    },
  });

  const registrarContribuicaoMutation = useMutation({
    mutationFn: async ({ contribuinte }: { contribuinte: Contribuinte }) => {
      // 1. Registrar ou atualizar a contribuição do mês
      const { data: existente } = await supabase
        .from("missoes_mocambique_contribuicoes")
        .select("id")
        .eq("contribuinte_id", contribuinte.id)
        .eq("mes_referencia", mesAtual)
        .maybeSingle();

      if (existente) {
        // Atualizar como pago
        await supabase
          .from("missoes_mocambique_contribuicoes")
          .update({ 
            pago: true, 
            data_pagamento: todayDateStr(),
            valor: contribuinte.valor_mensal
          })
          .eq("id", existente.id);
      } else {
        // Inserir nova contribuição
        await supabase
          .from("missoes_mocambique_contribuicoes")
          .insert({
            contribuinte_id: contribuinte.id,
            mes_referencia: mesAtual,
            valor: contribuinte.valor_mensal,
            pago: true,
            data_pagamento: todayDateStr(),
          });
      }

      // 2. Enviar mensagem de agradecimento
      if (contribuinte.member?.whatsapp) {
        const { data, error } = await supabase.functions.invoke('enviar-whatsapp', {
          body: {
            action: 'agradecimento_missoes',
            contribuinteId: contribuinte.id,
            valorMensal: contribuinte.valor_mensal,
            cotacaoMZN: 10.5,
          },
        });
        
        if (error) throw error;
        if (!data.success) throw new Error(data.error);

        // 3. Marcar agradecimento como enviado
        await supabase
          .from("missoes_mocambique_contribuicoes")
          .update({ 
            agradecimento_enviado: true,
            data_agradecimento: new Date().toISOString()
          })
          .eq("contribuinte_id", contribuinte.id)
          .eq("mes_referencia", mesAtual);
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missoes-contribuicoes-mes"] });
      toast.success("Contribuição registrada e agradecimento enviado!");
      setProcessingId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao processar");
      setProcessingId(null);
    },
  });

  const handleRegistrarContribuicao = (contribuinte: Contribuinte) => {
    if (!contribuinte.member?.whatsapp) {
      toast.error("Este contribuinte não tem WhatsApp cadastrado");
      return;
    }
    setProcessingId(contribuinte.id);
    registrarContribuicaoMutation.mutate({ contribuinte });
  };

  const handleEdit = (contribuinte: Contribuinte) => {
    setSelectedContribuinte(contribuinte);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setContribuinteToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleNewContribuinte = () => {
    setSelectedContribuinte(null);
    setDialogOpen(true);
  };

  const getNome = (contribuinte: Contribuinte) => {
    return contribuinte.member?.full_name || contribuinte.nome_manual || "Sem nome";
  };

  const getContribuicaoMes = (contribuinteId: string) => {
    return contribuicoesMes?.find(c => c.contribuinte_id === contribuinteId);
  };

  const totalMensal = contribuintes?.filter(c => c.ativo).reduce((acc, c) => acc + Number(c.valor_mensal), 0) || 0;
  const totalContribuintes = contribuintes?.filter(c => c.ativo).length || 0;
  const totalRecebidoMes = contribuicoesMes?.filter(c => c.pago).reduce((acc, c) => acc + Number(c.valor), 0) || 0;

  if (isLoading) {
    return <div className="text-center py-8">Carregando contribuintes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contribuintes Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalContribuintes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Previsão Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              R$ {totalMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recebido este Mês</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {totalRecebidoMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média por Contribuinte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalContribuintes > 0 ? (totalMensal / totalContribuintes).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "0,00"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Contribuintes</h3>
        <Button onClick={handleNewContribuinte}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Contribuinte
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Valor Mensal</TableHead>
                <TableHead>Dia Venc.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mês Atual</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contribuintes?.map((contribuinte) => {
                const contribuicao = getContribuicaoMes(contribuinte.id);
                const jaRecebeuAgradecimento = contribuicao?.agradecimento_enviado;
                const jaPagouMes = contribuicao?.pago;

                return (
                  <TableRow key={contribuinte.id}>
                    <TableCell className="font-medium">{getNome(contribuinte)}</TableCell>
                    <TableCell>
                      R$ {Number(contribuinte.valor_mensal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      Dia {contribuinte.dia_vencimento || 10}
                    </TableCell>
                    <TableCell>
                      <Badge variant={contribuinte.ativo ? "default" : "secondary"}>
                        {contribuinte.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {jaPagouMes ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <Check className="h-3 w-3 mr-1" />
                          Recebido
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          Pendente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleRegistrarContribuicao(contribuinte)}
                              disabled={
                                processingId === contribuinte.id || 
                                !contribuinte.member?.whatsapp ||
                                jaRecebeuAgradecimento ||
                                !contribuinte.ativo
                              }
                            >
                              {processingId === contribuinte.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : jaRecebeuAgradecimento ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <MessageCircle className="h-4 w-4 text-green-600" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {!contribuinte.member?.whatsapp 
                              ? "WhatsApp não cadastrado"
                              : jaRecebeuAgradecimento
                              ? "Agradecimento já enviado este mês"
                              : "Registrar contribuição e enviar agradecimento"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(contribuinte)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(contribuinte.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!contribuintes || contribuintes.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum contribuinte cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ContribuinteFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contribuinte={selectedContribuinte}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este contribuinte? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => contribuinteToDelete && deleteMutation.mutate(contribuinteToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
