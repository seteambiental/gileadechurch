import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, CheckCircle, XCircle, Trash2 } from "lucide-react";
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

  const filtered = inscricoes.filter((i: any) =>
    i.nome?.toLowerCase().includes(search.toLowerCase())
  );

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
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar inscrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
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
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nova Inscrição
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
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

      <AprovarInscricaoDialog
        open={!!aprovandoInscricao}
        onOpenChange={(o) => !o && setAprovandoInscricao(null)}
        inscricao={aprovandoInscricao}
      />

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
