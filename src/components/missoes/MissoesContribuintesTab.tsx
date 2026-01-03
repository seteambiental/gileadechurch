import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Users } from "lucide-react";
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
import { ContribuinteFormDialog } from "./ContribuinteFormDialog";
import { formatDateBR } from "@/lib/masks";

interface Contribuinte {
  id: string;
  member_id: string | null;
  nome_manual: string | null;
  valor_mensal: number;
  ativo: boolean;
  data_inicio: string;
  observacoes: string | null;
  member?: {
    full_name: string;
  } | null;
}

export function MissoesContribuintesTab() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContribuinte, setSelectedContribuinte] = useState<Contribuinte | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contribuinteToDelete, setContribuinteToDelete] = useState<string | null>(null);

  const { data: contribuintes, isLoading } = useQuery({
    queryKey: ["missoes-contribuintes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("missoes_mocambique_contribuintes")
        .select(`
          *,
          member:members(full_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Contribuinte[];
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

  const totalMensal = contribuintes?.filter(c => c.ativo).reduce((acc, c) => acc + Number(c.valor_mensal), 0) || 0;
  const totalContribuintes = contribuintes?.filter(c => c.ativo).length || 0;

  if (isLoading) {
    return <div className="text-center py-8">Carregando contribuintes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contribuintes Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalContribuintes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Arrecadação Mensal Prevista</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {totalMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
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
                <TableHead>Data Início</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contribuintes?.map((contribuinte) => (
                <TableRow key={contribuinte.id}>
                  <TableCell className="font-medium">{getNome(contribuinte)}</TableCell>
                  <TableCell>
                    R$ {Number(contribuinte.valor_mensal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>{formatDateBR(contribuinte.data_inicio)}</TableCell>
                  <TableCell>
                    <Badge variant={contribuinte.ativo ? "default" : "secondary"}>
                      {contribuinte.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(contribuinte)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(contribuinte.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!contribuintes || contribuintes.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
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
