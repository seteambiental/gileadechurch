import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, MoreHorizontal, Pencil, Trash2, FileText, Video, Link as LinkIcon, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { includesNormalized } from "@/lib/text-utils";
import { MaterialFormDialog } from "./MaterialFormDialog";
import { ExportButton } from "@/components/ui/export-button";
import { ColumnFilterPopover } from "@/components/ui/column-filter-popover";

const tipoIcons: Record<string, any> = {
  documento: FileText,
  video: Video,
  link: LinkIcon,
};

export function CasaisMateriaisTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [turmaFilter, setTurmaFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: turmas } = useQuery({
    queryKey: ["casais_turmas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casais_turmas")
        .select("id, nome")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: materiais, isLoading } = useQuery({
    queryKey: ["casais_materiais", turmaFilter],
    queryFn: async () => {
      let query = supabase
        .from("casais_materiais")
        .select(`
          *,
          turma:turma_id(nome)
        `)
        .order("ordem");

      if (turmaFilter !== "all") {
        query = query.eq("turma_id", turmaFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("casais_materiais").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Erro ao excluir material", variant: "destructive" });
    } else {
      toast({ title: "Material excluído" });
      queryClient.invalidateQueries({ queryKey: ["casais_materiais"] });
    }
    setDeleteId(null);
  };

  const [filterTipo, setFilterTipo] = useState<Set<string>>(new Set());

  const getTipoLabel = (m: any) => m.tipo || "documento";
  const getTurmaLabel = (m: any) => m.turma?.nome || "Geral";

  const columnOptions = useMemo(() => {
    if (!materiais) return { tipos: [], turmas: [] };
    const tipos = [...new Set(materiais.map(getTipoLabel))].sort();
    const turmasOpts = [...new Set(materiais.map(getTurmaLabel))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    return { tipos, turmas: turmasOpts };
  }, [materiais]);

  const filteredMateriais = useMemo(() => {
    if (!materiais) return [];
    return materiais.filter((m) => {
      if (!includesNormalized(m.titulo, searchTerm)) return false;
      if (filterTipo.size > 0 && filterTipo.size < columnOptions.tipos.length && !filterTipo.has(getTipoLabel(m))) return false;
      return true;
    });
  }, [materiais, searchTerm, filterTipo, columnOptions]);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-xl font-heading">Materiais do Curso</CardTitle>
          <div className="flex gap-2">
            <ExportButton
              data={filteredMateriais || []}
              columns={[
                { header: "Título", accessor: "titulo" },
                { header: "Turma", accessor: (r: any) => getTurmaLabel(r) },
                { header: "Tipo", accessor: (r: any) => getTipoLabel(r) },
                { header: "Descrição", accessor: (r: any) => r.descricao || "-" },
              ]}
              filename="materiais-casais"
              title="Materiais - Curso de Casais"
              sheetName="Materiais"
            />
            <Button onClick={() => { setSelectedMaterial(null); setIsFormOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Material
            </Button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <SearchInput
            placeholder="Buscar materiais..."
            value={searchTerm}
            onChange={setSearchTerm}
            className="flex-1"
          />
          <Select value={turmaFilter} onValueChange={setTurmaFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrar por turma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as turmas</SelectItem>
              {turmas?.filter((t) => !!t?.id).map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : filteredMateriais?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum material cadastrado
          </div>
        ) : (
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Título</TableHead>
                  <TableHead className="hidden md:table-cell">Turma</TableHead>
                  <TableHead className="hidden md:table-cell">
                    <ColumnFilterPopover title="Tipo" options={columnOptions.tipos} selected={filterTipo} onChange={setFilterTipo} />
                  </TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMateriais?.map((material) => {
                  const IconComponent = tipoIcons[material.tipo] || FileText;
                  return (
                    <TableRow key={material.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <IconComponent className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{material.titulo}</p>
                            {material.descricao && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{material.descricao}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {material.turma?.nome || "Geral"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline">{material.tipo}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {material.url && (
                              <DropdownMenuItem onClick={() => window.open(material.url, "_blank")}>
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Abrir
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => { setSelectedMaterial(material); setIsFormOpen(true); }}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteId(material.id)} className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <MaterialFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        material={selectedMaterial}
        turmas={turmas || []}
      />
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </Card>
  );
}
