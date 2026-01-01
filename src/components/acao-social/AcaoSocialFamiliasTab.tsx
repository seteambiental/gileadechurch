import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, Pencil, Trash2, Eye, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { FamiliaFormDialog } from "./FamiliaFormDialog";
import { FamiliaDetalhesDialog } from "./FamiliaDetalhesDialog";

export function AcaoSocialFamiliasTab() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [selectedFamilia, setSelectedFamilia] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: familias, isLoading } = useQuery({
    queryKey: ["acao_social_familias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("acao_social_familias")
        .select(`
          *,
          casa_refugio:casas_refugio(name),
          lider:members!acao_social_familias_lider_responsavel_id_fkey(full_name)
        `)
        .order("nome_familia");
      if (error) throw error;
      return data;
    },
  });

  const { data: membrosCount } = useQuery({
    queryKey: ["acao_social_familia_membros_count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("acao_social_familia_membros")
        .select("familia_id");
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach((m) => {
        counts[m.familia_id] = (counts[m.familia_id] || 0) + 1;
      });
      return counts;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("acao_social_familias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["acao_social_familias"] });
      toast.success("Família removida com sucesso");
    },
    onError: () => {
      toast.error("Erro ao remover família");
    },
  });

  const filteredFamilias = familias?.filter((f) =>
    f.nome_familia.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (familia: any) => {
    setSelectedFamilia(familia);
    setDialogOpen(true);
  };

  const handleView = (familia: any) => {
    setSelectedFamilia(familia);
    setDetalhesOpen(true);
  };

  const handleNew = () => {
    setSelectedFamilia(null);
    setDialogOpen(true);
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar família..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleNew} className="bg-destructive hover:bg-destructive/90">
          <Plus className="w-4 h-4 mr-2" />
          Nova Família
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Famílias Cadastradas ({filteredFamilias?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : filteredFamilias?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma família cadastrada</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome da Família</TableHead>
                    <TableHead className="hidden md:table-cell">Membros</TableHead>
                    <TableHead className="hidden md:table-cell">Renda Total</TableHead>
                    <TableHead className="hidden lg:table-cell">Casa Refúgio</TableHead>
                    <TableHead className="hidden lg:table-cell">Tipo de Ajuda</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFamilias?.map((familia) => (
                    <TableRow key={familia.id}>
                      <TableCell className="font-medium">{familia.nome_familia}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="secondary">
                          {membrosCount?.[familia.id] || 0} membros
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {formatCurrency(familia.renda_total)}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {familia.casa_refugio?.name || "-"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {familia.tipo_ajuda || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={familia.ativo ? "default" : "secondary"}>
                          {familia.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="ghost" onClick={() => handleView(familia)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(familia)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (confirm("Tem certeza que deseja remover esta família?")) {
                                deleteMutation.mutate(familia.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <FamiliaFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        familia={selectedFamilia}
      />

      <FamiliaDetalhesDialog
        open={detalhesOpen}
        onOpenChange={setDetalhesOpen}
        familia={selectedFamilia}
      />
    </div>
  );
}
