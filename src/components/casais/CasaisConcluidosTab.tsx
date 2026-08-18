import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { GraduationCap } from "lucide-react";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { includesNormalized } from "@/lib/text-utils";
import { ExportButton } from "@/components/ui/export-button";

const nomeEsposo = (c: any) => c.membro_masculino?.full_name || c.nome_masculino || "-";
const nomeEsposa = (c: any) => c.membro_feminino?.full_name || c.nome_feminino || "-";

export function CasaisConcluidosTab() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: turmasEncerradas } = useQuery({
    queryKey: ["casais_turmas_encerradas_ids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casais_turmas")
        .select("id")
        .eq("ativo", false);
      if (error) throw error;
      return (data || []).map((t) => t.id);
    },
  });

  const { data: casais, isLoading } = useQuery({
    queryKey: ["casais_inscritos_concluidos", turmasEncerradas],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casais_inscritos")
        .select(`
          *,
          turma:casais_turmas(id, nome),
          membro_masculino:members!casais_inscritos_membro_masculino_id_fkey(full_name, whatsapp),
          membro_feminino:members!casais_inscritos_membro_feminino_id_fkey(full_name, whatsapp)
        `)
        .eq("status", "aprovado")
        .order("data_certificado", { ascending: false });
      if (error) throw error;
      // Arquivo: casais com certificado emitido OU de turmas encerradas
      return (data || []).filter(
        (c: any) => c.certificado_emitido || (c.turma_id && (turmasEncerradas || []).includes(c.turma_id))
      );
    },
    enabled: !!turmasEncerradas,
  });

  const filtered = useMemo(() => {
    if (!casais) return [];
    return casais.filter((c: any) =>
      !searchTerm ||
      includesNormalized(nomeEsposo(c), searchTerm) ||
      includesNormalized(nomeEsposa(c), searchTerm) ||
      includesNormalized(c.turma?.nome || "", searchTerm)
    );
  }, [casais, searchTerm]);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-xl font-heading flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-green-600" />
            Casais Concluídos
          </CardTitle>
          <ExportButton
            data={filtered || []}
            columns={[
              { header: "Esposo", accessor: (r: any) => nomeEsposo(r) },
              { header: "Esposa", accessor: (r: any) => nomeEsposa(r) },
              { header: "Turma", accessor: (r: any) => r.turma?.nome || "-" },
              { header: "Conclusão", accessor: (r: any) => r.data_certificado ? format(parseLocalDate(r.data_certificado), "dd/MM/yyyy") : "-" },
            ]}
            filename="casais-concluidos"
            title="Casais Concluídos"
            sheetName="Concluídos"
          />
        </div>
        <SearchInput placeholder="Buscar casais concluídos..." value={searchTerm} onChange={setSearchTerm} className="mt-4" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Nenhum casal concluído</div>
        ) : (
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Esposo</TableHead>
                  <TableHead>Esposa</TableHead>
                  <TableHead className="hidden md:table-cell">Turma</TableHead>
                  <TableHead className="hidden md:table-cell">Conclusão</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((casal: any) => (
                  <TableRow key={casal.id}>
                    <TableCell>
                      <p className="font-medium">{nomeEsposo(casal)}</p>
                      {(casal.membro_masculino?.whatsapp || casal.whatsapp_masculino) && (
                        <p className="text-xs text-muted-foreground">
                          {casal.membro_masculino?.whatsapp || casal.whatsapp_masculino}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{nomeEsposa(casal)}</p>
                      {(casal.membro_feminino?.whatsapp || casal.whatsapp_feminino) && (
                        <p className="text-xs text-muted-foreground">
                          {casal.membro_feminino?.whatsapp || casal.whatsapp_feminino}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline">{casal.turma?.nome || "-"}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {casal.data_certificado ? format(parseLocalDate(casal.data_certificado), "dd/MM/yyyy") : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-green-600">Concluído</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
