import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Archive, Eye, Users } from "lucide-react";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { ptBR } from "date-fns/locale";
import { includesNormalized } from "@/lib/text-utils";
import { TurmaDetalhesDialog } from "./TurmaDetalhesDialog";
import { ExportButton } from "@/components/ui/export-button";

export function CasaisTurmasEncerradasTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTurma, setSelectedTurma] = useState<any>(null);
  const [isDetalhesOpen, setIsDetalhesOpen] = useState(false);

  const { data: turmas, isLoading } = useQuery({
    queryKey: ["casais_turmas_encerradas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casais_turmas")
        .select("*")
        .eq("ativo", false)
        .order("data_fim", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: inscritosCount } = useQuery({
    queryKey: ["casais_inscritos_count_encerradas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("casais_inscritos").select("turma_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((i: any) => { if (i.turma_id) counts[i.turma_id] = (counts[i.turma_id] || 0) + 1; });
      return counts;
    },
  });

  const filtered = useMemo(() => {
    if (!turmas) return [];
    return turmas.filter((t: any) => includesNormalized(t.nome, searchTerm));
  }, [turmas, searchTerm]);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-xl font-heading flex items-center gap-2">
            <Archive className="w-5 h-5 text-muted-foreground" />
            Turmas Encerradas
          </CardTitle>
          <ExportButton
            data={filtered || []}
            columns={[
              { header: "Nome", accessor: "nome" },
              { header: "Data Início", accessor: (r: any) => r.data_inicio ? format(parseLocalDate(r.data_inicio), "dd/MM/yyyy") : "-" },
              { header: "Data Fim", accessor: (r: any) => r.data_fim ? format(parseLocalDate(r.data_fim), "dd/MM/yyyy") : "-" },
              { header: "Casais", accessor: (r: any) => inscritosCount?.[r.id] || 0 },
            ]}
            filename="turmas-encerradas-casais"
            title="Turmas Encerradas"
            sheetName="Encerradas"
          />
        </div>
        <SearchInput placeholder="Buscar turmas..." value={searchTerm} onChange={setSearchTerm} className="mt-4" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Nenhuma turma encerrada</div>
        ) : (
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">Período</TableHead>
                  <TableHead className="hidden md:table-cell">Casais</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((turma: any) => (
                  <TableRow key={turma.id}>
                    <TableCell className="font-medium">
                      <p>{turma.nome}</p>
                      {turma.horario && <p className="text-xs text-muted-foreground">{turma.horario}</p>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {turma.data_inicio ? (
                        <span className="text-sm">
                          {format(parseLocalDate(turma.data_inicio), "dd/MM/yyyy", { locale: ptBR })}
                          {turma.data_fim && ` - ${format(parseLocalDate(turma.data_fim), "dd/MM/yyyy", { locale: ptBR })}`}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>{inscritosCount?.[turma.id] || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">Encerrada</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedTurma(turma); setIsDetalhesOpen(true); }}>
                        <Eye className="w-4 h-4 mr-1" /> Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <TurmaDetalhesDialog open={isDetalhesOpen} onOpenChange={setIsDetalhesOpen} turma={selectedTurma} />
    </Card>
  );
}