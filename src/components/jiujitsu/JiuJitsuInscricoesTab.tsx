import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { differenceInYears } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import { ExportButton } from "@/components/ui/export-button";
import { ColumnFilterPopover } from "@/components/ui/column-filter-popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, CheckCircle, XCircle } from "lucide-react";
import { InscricaoJiuJitsuFormDialog } from "./InscricaoJiuJitsuFormDialog";
import { AprovarInscricaoDialog } from "./AprovarInscricaoDialog";
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

const calcularIdade = (dataNascimento: string | null): number | null => {
  if (!dataNascimento) return null;
  try {
    return differenceInYears(new Date(), parseLocalDate(dataNascimento));
  } catch {
    return null;
  }
};

const sugerirTurma = (idade: number | null): string => {
  if (idade === null) return "—";
  if (idade >= 6 && idade <= 9) return "Kids (6-9)";
  if (idade >= 10 && idade <= 13) return "Juvenil (10-13)";
  if (idade >= 14) return "Adulto (14+)";
  return "Abaixo da idade mínima";
};

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pendente: { label: "Pendente", variant: "secondary" },
  aprovada: { label: "Aprovada", variant: "default" },
  rejeitada: { label: "Rejeitada", variant: "destructive" },
};

export function JiuJitsuInscricoesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pendente");
  const [formOpen, setFormOpen] = useState(false);
  const [aprovandoInscricao, setAprovandoInscricao] = useState<any>(null);
  const [rejeitandoInscricao, setRejeitandoInscricao] = useState<any>(null);

  // Column filters
  const [tipoFilter, setTipoFilter] = useState<Set<string>>(new Set());

  const { data: inscricoes = [], isLoading } = useQuery({
    queryKey: ["jiujitsu_inscricoes", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("jiujitsu_inscricoes")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "todas") {
        query = query.eq("status", statusFilter);
      }

      const { data } = await query;
      return (data || []) as any[];
    },
  });

  const tipoOptions = useMemo(() => [...new Set(inscricoes.map((i: any) => i.tipo === "membro" ? "Membro" : "Visitante"))], [inscricoes]);

  useMemo(() => {
    if (tipoFilter.size === 0 && tipoOptions.length > 0) setTipoFilter(new Set(tipoOptions));
  }, [tipoOptions]);

  const filtered = useMemo(() => {
    return inscricoes.filter((i: any) => {
      if (search && !i.nome?.toLowerCase().includes(search.toLowerCase())) return false;
      const tipoLabel = i.tipo === "membro" ? "Membro" : "Visitante";
      if (tipoFilter.size > 0 && tipoFilter.size < tipoOptions.length && !tipoFilter.has(tipoLabel)) return false;
      return true;
    });
  }, [inscricoes, search, tipoFilter, tipoOptions.length]);

  const handleRejeitar = async () => {
    if (!rejeitandoInscricao) return;
    const { error } = await supabase
      .from("jiujitsu_inscricoes")
      .update({ status: "rejeitada" })
      .eq("id", rejeitandoInscricao.id);

    if (!error) {
      toast({ title: "Inscrição rejeitada" });
      queryClient.invalidateQueries({ queryKey: ["jiujitsu_inscricoes"] });
    } else {
      toast({ title: "Erro ao rejeitar", variant: "destructive" });
    }
    setRejeitandoInscricao(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <SearchInput
            placeholder="Buscar inscrição..."
            value={search}
            onChange={setSearch}
            className="w-full sm:w-64"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="aprovada">Aprovadas</SelectItem>
              <SelectItem value="rejeitada">Rejeitadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <ExportButton
            data={filtered}
            columns={[
              { header: "Nome", accessor: "nome" },
              { header: "Idade", accessor: (r: any) => { const i = calcularIdade(r.data_nascimento); return i !== null ? `${i} anos` : "—"; } },
              { header: "Turma Sugerida", accessor: (r: any) => sugerirTurma(calcularIdade(r.data_nascimento)) },
              { header: "Tipo", accessor: (r: any) => r.tipo === "membro" ? "Membro" : "Visitante" },
              { header: "WhatsApp", accessor: (r: any) => r.whatsapp || "—" },
              { header: "Data", accessor: (r: any) => new Date(r.created_at).toLocaleDateString("pt-BR") },
              { header: "Status", accessor: (r: any) => STATUS_MAP[r.status]?.label || r.status },
            ]}
            filename="jiujitsu-inscricoes"
            title="Inscrições - Jiu-Jitsu"
            sheetName="Inscrições"
          />
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nova Inscrição
          </Button>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Idade</TableHead>
              <TableHead>Turma Sugerida</TableHead>
              <TableHead>
                <ColumnFilterPopover title="Tipo" options={tipoOptions} selected={tipoFilter} onChange={setTipoFilter} />
              </TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma inscrição encontrada</TableCell>
              </TableRow>
            ) : (
              filtered.map((insc: any) => {
                const st = STATUS_MAP[insc.status] || STATUS_MAP.pendente;
                return (
                  <TableRow key={insc.id}>
                    <TableCell className="font-medium">{insc.nome}</TableCell>
                    <TableCell>
                      <Badge variant={insc.tipo === "membro" ? "default" : "secondary"}>
                        {insc.tipo === "membro" ? "Membro" : "Visitante"}
                      </Badge>
                    </TableCell>
                    <TableCell>{insc.whatsapp || "—"}</TableCell>
                    <TableCell>{new Date(insc.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {insc.status === "pendente" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setAprovandoInscricao(insc)}>
                              <CheckCircle className="h-4 w-4 mr-2" /> Aprovar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setRejeitandoInscricao(insc)}>
                              <XCircle className="h-4 w-4 mr-2" /> Rejeitar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <InscricaoJiuJitsuFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <AprovarInscricaoDialog open={!!aprovandoInscricao} onOpenChange={(o) => !o && setAprovandoInscricao(null)} inscricao={aprovandoInscricao} />

      <AlertDialog open={!!rejeitandoInscricao} onOpenChange={(o) => !o && setRejeitandoInscricao(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar inscrição?</AlertDialogTitle>
            <AlertDialogDescription>
              A inscrição de {rejeitandoInscricao?.nome} será rejeitada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRejeitar}>Rejeitar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
