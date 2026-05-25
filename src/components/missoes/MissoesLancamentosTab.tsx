import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, User, Building2, UserPlus, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/masks";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { toast } from "sonner";
import { LancamentoFormDialog } from "./LancamentoFormDialog";

interface Props {
  mesRef: string;
  cotacao: number;
}

export function MissoesLancamentosTab({ mesRef, cotacao }: Props) {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [filtros, setFiltros] = useState({ data: "", origem: "", nome: "", forma: "", valor: "" });

  const { data: lancamentos = [], isLoading } = useQuery({
    queryKey: ["mm-lancamentos", mesRef],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("missoes_mocambique_lancamentos")
        .select("*, member:members(full_name), condominio:condominios(name)")
        .eq("mes_referencia", mesRef)
        .order("data_lancamento", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("missoes_mocambique_lancamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mm-lancamentos"] });
      toast.success("Lançamento removido!");
    },
  });

  const totalMembros = lancamentos.filter((l: any) => l.origem === "membro").reduce((s: number, l: any) => s + Number(l.valor || 0), 0);
  const totalCond = lancamentos.filter((l: any) => l.origem === "condominio").reduce((s: number, l: any) => s + Number(l.valor || 0), 0);
  const totalManual = lancamentos.filter((l: any) => l.origem === "manual").reduce((s: number, l: any) => s + Number(l.valor || 0), 0);
  const total = totalMembros + totalCond + totalManual;

  const getNome = (l: any) =>
    l.member?.full_name ||
    (l.condominio?.name ? `Condomínio: ${l.condominio.name}` : null) ||
    l.nome_manual ||
    "—";

  const lancamentosFiltrados = (lancamentos as any[]).filter((l) => {
    const f = filtros;
    if (f.data && !format(parseLocalDate(l.data_lancamento), "dd/MM/yyyy").includes(f.data)) return false;
    if (f.origem && !String(l.origem || "").toLowerCase().includes(f.origem.toLowerCase())) return false;
    if (f.nome && !getNome(l).toLowerCase().includes(f.nome.toLowerCase())) return false;
    if (f.forma && !String(l.forma_pagamento || "").toLowerCase().includes(f.forma.toLowerCase())) return false;
    if (f.valor && !String(l.valor || "").includes(f.valor.replace(",", "."))) return false;
    return true;
  });
  const algumFiltro = Object.values(filtros).some(Boolean);

  const iconeOrigem = (o: string) =>
    o === "membro" ? <User className="w-3 h-3" /> :
    o === "condominio" ? <Building2 className="w-3 h-3" /> :
    <UserPlus className="w-3 h-3" />;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Membros</CardTitle></CardHeader>
          <CardContent className="text-xl font-bold text-blue-600">{formatCurrency(totalMembros)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Condomínios</CardTitle></CardHeader>
          <CardContent className="text-xl font-bold text-purple-600">{formatCurrency(totalCond)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Manuais</CardTitle></CardHeader>
          <CardContent className="text-xl font-bold text-orange-600">{formatCurrency(totalManual)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total do Mês</CardTitle></CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-600">{formatCurrency(total)}</div>
            <div className="text-xs text-muted-foreground">MZN {(total * (cotacao || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Lançamentos do mês</h3>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Lançar Contribuição
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Forma</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
              <TableRow className="bg-muted/30">
                <TableHead className="py-1"><Input value={filtros.data} onChange={(e) => setFiltros({ ...filtros, data: e.target.value })} placeholder="dd/mm" className="h-7 text-xs" /></TableHead>
                <TableHead className="py-1"><Input value={filtros.origem} onChange={(e) => setFiltros({ ...filtros, origem: e.target.value })} placeholder="Filtrar" className="h-7 text-xs" /></TableHead>
                <TableHead className="py-1"><Input value={filtros.nome} onChange={(e) => setFiltros({ ...filtros, nome: e.target.value })} placeholder="Filtrar" className="h-7 text-xs" /></TableHead>
                <TableHead className="py-1"><Input value={filtros.forma} onChange={(e) => setFiltros({ ...filtros, forma: e.target.value })} placeholder="Filtrar" className="h-7 text-xs" /></TableHead>
                <TableHead className="py-1"><Input value={filtros.valor} onChange={(e) => setFiltros({ ...filtros, valor: e.target.value })} placeholder="Filtrar" className="h-7 text-xs" /></TableHead>
                <TableHead className="py-1">
                  {algumFiltro && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFiltros({ data: "", origem: "", nome: "", forma: "", valor: "" })}>
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-6">Carregando...</TableCell></TableRow>
              ) : lancamentosFiltrados.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{algumFiltro ? "Nenhum lançamento para os filtros aplicados." : "Nenhum lançamento neste mês."}</TableCell></TableRow>
              ) : lancamentosFiltrados.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell>{format(parseLocalDate(l.data_lancamento), "dd/MM/yyyy")}</TableCell>
                  <TableCell><Badge variant="outline" className="gap-1">{iconeOrigem(l.origem)}{l.origem}</Badge></TableCell>
                  <TableCell className="font-medium">{getNome(l)}</TableCell>
                  <TableCell>{l.forma_pagamento || "—"}</TableCell>
                  <TableCell className="text-right font-semibold text-green-600">{formatCurrency(Number(l.valor || 0))}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(l); setDialogOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(l.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <LancamentoFormDialog open={dialogOpen} onOpenChange={setDialogOpen} mesRef={mesRef} lancamento={editing} />
    </div>
  );
}