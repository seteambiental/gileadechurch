import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Plus, MoreHorizontal, Pencil, Trash2, Award, Heart } from "lucide-react";
import { format } from "date-fns";
import { includesNormalized } from "@/lib/text-utils";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { CasalFormDialog } from "./CasalFormDialog";
import { CertificadoDialog } from "./CertificadoDialog";

export function CasaisCasaisTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [turmaFilter, setTurmaFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>("");
  const [isCertificadoOpen, setIsCertificadoOpen] = useState(false);
  const [selectedCasal, setSelectedCasal] = useState<any>(null);
  const [selectedTurma, setSelectedTurma] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: turmas } = useQuery({
    queryKey: ["casais_turmas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casais_turmas")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: casais, isLoading } = useQuery({
    queryKey: ["casais_inscritos_all", turmaFilter],
    queryFn: async () => {
      let query = supabase
        .from("casais_inscritos")
        .select(`
          *,
          turma:casais_turmas(id, nome),
          membro_masculino:members!casais_inscritos_membro_masculino_id_fkey(full_name, whatsapp),
          membro_feminino:members!casais_inscritos_membro_feminino_id_fkey(full_name, whatsapp)
        `)
        .order("created_at", { ascending: false });

      if (turmaFilter !== "all") {
        query = query.eq("turma_id", turmaFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja remover este casal?")) return;
    
    const { error } = await supabase.from("casais_inscritos").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao remover casal", variant: "destructive" });
    } else {
      toast({ title: "Casal removido" });
      queryClient.invalidateQueries({ queryKey: ["casais_inscritos_all"] });
      queryClient.invalidateQueries({ queryKey: ["casais_inscritos_count"] });
    }
  };

  const handleAddCasal = (turmaId: string) => {
    setSelectedTurmaId(turmaId);
    setIsFormOpen(true);
  };

  const handleEmitirCertificado = (casal: any) => {
    setSelectedCasal(casal);
    setSelectedTurma(casal.turma);
    setIsCertificadoOpen(true);
  };

  const filteredCasais = casais?.filter((c) => {
    const nomeM = c.membro_masculino?.full_name || c.nome_masculino || "";
    const nomeF = c.membro_feminino?.full_name || c.nome_feminino || "";
    return includesNormalized(nomeM, searchTerm) || includesNormalized(nomeF, searchTerm);
  });

  const turmasAtivas = turmas?.filter((t) => !!t?.id && !!t?.ativo) || [];

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-xl font-heading flex items-center gap-2">
            <Heart className="w-5 h-5 text-destructive" />
            Casais Inscritos
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={turmasAtivas.length === 0}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Casal
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {turmasAtivas.length === 0 ? (
                <DropdownMenuItem disabled>Nenhuma turma ativa</DropdownMenuItem>
              ) : (
                turmasAtivas.map((t) => (
                  <DropdownMenuItem key={t.id} onClick={() => handleAddCasal(t.id)}>
                    {t.nome}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <SearchInput
            placeholder="Buscar casais..."
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
                <SelectItem key={t.id} value={t.id}>
                  {t.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : filteredCasais?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {turmas?.length === 0 ? (
              <p>Cadastre uma turma primeiro para adicionar casais</p>
            ) : (
              <p>Nenhum casal inscrito</p>
            )}
          </div>
        ) : (
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Esposo</TableHead>
                  <TableHead>Esposa</TableHead>
                  <TableHead className="hidden md:table-cell">Turma</TableHead>
                  <TableHead className="hidden md:table-cell">Casamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCasais?.map((casal) => (
                  <TableRow key={casal.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{casal.membro_masculino?.full_name || casal.nome_masculino || "-"}</p>
                        {(casal.membro_masculino?.whatsapp || casal.whatsapp_masculino) && (
                          <p className="text-xs text-muted-foreground">
                            {casal.membro_masculino?.whatsapp || casal.whatsapp_masculino}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{casal.membro_feminino?.full_name || casal.nome_feminino || "-"}</p>
                        {(casal.membro_feminino?.whatsapp || casal.whatsapp_feminino) && (
                          <p className="text-xs text-muted-foreground">
                            {casal.membro_feminino?.whatsapp || casal.whatsapp_feminino}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline">{casal.turma?.nome || "-"}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {casal.data_casamento ? 
                        format(new Date(casal.data_casamento + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR }) : 
                        casal.tempo_casamento || "-"
                      }
                    </TableCell>
                    <TableCell>
                      {casal.certificado_emitido ? (
                        <Badge variant="default" className="bg-green-600">Concluído</Badge>
                      ) : (
                        <Badge variant="secondary">{casal.status || "Ativo"}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEmitirCertificado(casal)}>
                            <Award className="w-4 h-4 mr-2" />
                            Emitir Certificado
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(casal.id)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Summary cards */}
        {casais && casais.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <Card className="bg-muted/30">
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{casais.length}</p>
                <p className="text-xs text-muted-foreground">Total de Casais</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{casais.filter(c => c.certificado_emitido).length}</p>
                <p className="text-xs text-muted-foreground">Certificados Emitidos</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{turmas?.filter(t => t.ativo).length || 0}</p>
                <p className="text-xs text-muted-foreground">Turmas Ativas</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{casais.filter(c => !c.certificado_emitido).length}</p>
                <p className="text-xs text-muted-foreground">Em Andamento</p>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>

      {selectedTurmaId && (
        <CasalFormDialog
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) setSelectedTurmaId("");
          }}
          turmaId={selectedTurmaId}
        />
      )}

      <CertificadoDialog
        open={isCertificadoOpen}
        onOpenChange={setIsCertificadoOpen}
        casal={selectedCasal}
        turma={selectedTurma}
      />
    </Card>
  );
}
