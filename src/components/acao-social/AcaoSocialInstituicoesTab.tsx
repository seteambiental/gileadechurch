import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2, Pencil, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { InstituicaoFormDialog } from "./InstituicaoFormDialog";
import { InstituicaoDetalhesDialog } from "./InstituicaoDetalhesDialog";
import { includesNormalized } from "@/lib/text-utils";

const tiposInstituicao: Record<string, string> = {
  idosos: "Idosos",
  criancas: "Crianças",
  comunidade_terapeutica: "Comunidade Terapêutica",
  abrigo: "Abrigo",
  ong: "ONG",
  outros: "Outros",
};

export function AcaoSocialInstituicoesTab() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [selectedInstituicao, setSelectedInstituicao] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: instituicoes, isLoading } = useQuery({
    queryKey: ["acao_social_instituicoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("acao_social_instituicoes")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("acao_social_instituicoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["acao_social_instituicoes"] });
      toast.success("Instituição removida com sucesso");
    },
    onError: () => {
      toast.error("Erro ao remover instituição");
    },
  });

  const filteredInstituicoes = instituicoes?.filter((i) =>
    includesNormalized(i.nome, search)
  );

  const handleEdit = (instituicao: any) => {
    setSelectedInstituicao(instituicao);
    setDialogOpen(true);
  };

  const handleView = (instituicao: any) => {
    setSelectedInstituicao(instituicao);
    setDetalhesOpen(true);
  };

  const handleNew = () => {
    setSelectedInstituicao(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <SearchInput
          placeholder="Buscar instituição..."
          value={search}
          onChange={setSearch}
          className="flex-1 max-w-sm"
        />
        <Button onClick={handleNew} className="bg-destructive hover:bg-destructive/90">
          <Plus className="w-4 h-4 mr-2" />
          Nova Instituição
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Instituições Cadastradas ({filteredInstituicoes?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : filteredInstituicoes?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma instituição cadastrada</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden md:table-cell">CNPJ</TableHead>
                    <TableHead className="hidden md:table-cell">Tipo</TableHead>
                    <TableHead className="hidden lg:table-cell">Atendidos</TableHead>
                    <TableHead className="hidden lg:table-cell">Tipo de Ajuda</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInstituicoes?.map((instituicao) => (
                    <TableRow key={instituicao.id}>
                      <TableCell className="font-medium">{instituicao.nome}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {instituicao.cnpj || "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline">
                          {tiposInstituicao[instituicao.tipo_instituicao] || instituicao.tipo_instituicao}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {instituicao.quantidade_atendidos || 0}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {instituicao.tipo_ajuda || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={instituicao.ativo ? "default" : "secondary"}>
                          {instituicao.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="ghost" onClick={() => handleView(instituicao)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(instituicao)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (confirm("Tem certeza que deseja remover esta instituição?")) {
                                deleteMutation.mutate(instituicao.id);
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

      <InstituicaoFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        instituicao={selectedInstituicao}
      />

      <InstituicaoDetalhesDialog
        open={detalhesOpen}
        onOpenChange={setDetalhesOpen}
        instituicao={selectedInstituicao}
      />
    </div>
  );
}
