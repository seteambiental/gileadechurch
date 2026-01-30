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
import { includesNormalized } from "@/lib/text-utils";

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

  const { data: membrosData } = useQuery({
    queryKey: ["acao_social_familia_membros_summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("acao_social_familia_membros")
        .select("familia_id, genero, data_nascimento");
      if (error) throw error;
      
      const summary: Record<string, { total: number; masculino: number; feminino: number; idades: number[] }> = {};
      data.forEach((m) => {
        if (!summary[m.familia_id]) {
          summary[m.familia_id] = { total: 0, masculino: 0, feminino: 0, idades: [] };
        }
        summary[m.familia_id].total++;
        if (m.genero === "Masculino") summary[m.familia_id].masculino++;
        if (m.genero === "Feminino") summary[m.familia_id].feminino++;
        if (m.data_nascimento) {
          const idade = Math.floor((new Date().getTime() - new Date(m.data_nascimento + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24 * 365.25));
          summary[m.familia_id].idades.push(idade);
        }
      });
      return summary;
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
    includesNormalized(f.nome_familia, search)
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
                        <div className="space-y-1">
                          <Badge variant="secondary">
                            {membrosData?.[familia.id]?.total || 0} membros
                          </Badge>
                          {membrosData?.[familia.id] && (
                            <div className="flex gap-2 text-xs text-muted-foreground">
                              {membrosData[familia.id].masculino > 0 && (
                                <span>{membrosData[familia.id].masculino}M</span>
                              )}
                              {membrosData[familia.id].feminino > 0 && (
                                <span>{membrosData[familia.id].feminino}F</span>
                              )}
                              {membrosData[familia.id].idades.length > 0 && (
                                <span className="text-muted-foreground/70">
                                  ({Math.min(...membrosData[familia.id].idades)}-{Math.max(...membrosData[familia.id].idades)} anos)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
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
