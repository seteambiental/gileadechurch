import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, HandHeart, Trash2, Package, DollarSign, Scale } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { ptBR } from "date-fns/locale";
import { AjudaFormDialog } from "./AjudaFormDialog";
import { ExportButton } from "@/components/ui/export-button";
import { includesNormalized } from "@/lib/text-utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function AcaoSocialAjudasTab() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteAjudaId, setDeleteAjudaId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: ajudas, isLoading } = useQuery({
    queryKey: ["acao_social_ajudas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("acao_social_ajudas")
        .select(`
          *,
          familia:acao_social_familias(nome_familia),
          instituicao:acao_social_instituicoes(nome),
          registrado:members!acao_social_ajudas_registrado_por_fkey(full_name)
        `)
        .order("data_ajuda", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("acao_social_ajudas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["acao_social_ajudas"] });
      toast.success("Registro removido com sucesso");
    },
    onError: () => {
      toast.error("Erro ao remover registro");
    },
  });

  const filteredAjudas = ajudas?.filter((a) => {
    const beneficiario = a.familia?.nome_familia || a.instituicao?.nome || "";
    return includesNormalized(beneficiario, search) ||
      includesNormalized(a.tipo_ajuda, search);
  });

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const formatDate = (date: string) => {
    return format(parseLocalDate(date), "dd/MM/yyyy", { locale: ptBR });
  };

  // Calculate totals
  const totals = {
    valor: ajudas?.reduce((acc, a) => acc + (a.valor || 0), 0) || 0,
    kilos: ajudas?.reduce((acc, a) => acc + (a.quantidade_kilos || 0), 0) || 0,
    cestas: ajudas?.reduce((acc, a) => acc + (a.quantidade_cestas || 0), 0) || 0,
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total em Valor</p>
                <p className="text-xl font-bold">{formatCurrency(totals.valor)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Scale className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total em Kilos</p>
                <p className="text-xl font-bold">{totals.kilos.toFixed(1)} kg</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <Package className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Cestas</p>
                <p className="text-xl font-bold">{totals.cestas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <SearchInput
          placeholder="Buscar ajuda..."
          value={search}
          onChange={setSearch}
          className="flex-1 max-w-sm"
        />
        <div className="flex gap-2">
          <ExportButton
            data={filteredAjudas || []}
            columns={[
              { header: "Data", accessor: (r) => formatDate(r.data_ajuda) },
              { header: "Beneficiário", accessor: (r) => r.familia?.nome_familia || r.instituicao?.nome || "-" },
              { header: "Tipo", accessor: (r) => r.familia ? "Família" : "Instituição" },
              { header: "Tipo de Ajuda", accessor: "tipo_ajuda" },
              { header: "Valor", accessor: (r) => formatCurrency(r.valor) },
              { header: "Kilos", accessor: (r) => r.quantidade_kilos ? `${r.quantidade_kilos} kg` : "-" },
              { header: "Cestas", accessor: (r) => r.quantidade_cestas || "-" },
            ]}
            filename="ajudas-acao-social"
            title="Histórico de Ajudas - Ação Social"
            sheetName="Ajudas"
          />
          <Button onClick={() => setDialogOpen(true)} className="bg-destructive hover:bg-destructive/90">
            <Plus className="w-4 h-4 mr-2" />
            Registrar Ajuda
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HandHeart className="w-5 h-5" />
            Histórico de Ajudas ({filteredAjudas?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : filteredAjudas?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma ajuda registrada</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Beneficiário</TableHead>
                    <TableHead>Tipo de Ajuda</TableHead>
                    <TableHead className="hidden md:table-cell">Valor</TableHead>
                    <TableHead className="hidden md:table-cell">Qtd. Kilos</TableHead>
                    <TableHead className="hidden lg:table-cell">Cestas</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAjudas?.map((ajuda) => (
                    <TableRow key={ajuda.id}>
                      <TableCell>{formatDate(ajuda.data_ajuda)}</TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {ajuda.familia ? "Família" : "Instituição"}
                          </Badge>
                          {ajuda.familia?.nome_familia || ajuda.instituicao?.nome}
                        </div>
                      </TableCell>
                      <TableCell>{ajuda.tipo_ajuda}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {formatCurrency(ajuda.valor)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {ajuda.quantidade_kilos ? `${ajuda.quantidade_kilos} kg` : "-"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {ajuda.quantidade_cestas || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteAjudaId(ajuda.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AjudaFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
      <ConfirmDialog
        open={!!deleteAjudaId}
        onOpenChange={(open) => !open && setDeleteAjudaId(null)}
        onConfirm={() => { if (deleteAjudaId) { deleteMutation.mutate(deleteAjudaId); setDeleteAjudaId(null); } }}
      />
    </div>
  );
}
