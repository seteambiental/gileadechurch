import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Search } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pago: "bg-green-100 text-green-800",
  pendente: "bg-yellow-100 text-yellow-800",
  atrasado: "bg-red-100 text-red-800",
};

export function JiuJitsuFinanceiroTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [alunoId, setAlunoId] = useState("");
  const [mesRef, setMesRef] = useState("");
  const [valor, setValor] = useState("");
  const [status, setStatus] = useState("pendente");
  const [dataPagamento, setDataPagamento] = useState("");

  const { data: alunos = [] } = useQuery({
    queryKey: ["jiujitsu_alunos"],
    queryFn: async () => {
      const { data } = await supabase.from("jiujitsu_alunos").select("*").eq("ativo", true).order("nome");
      return (data || []) as any[];
    },
  });

  const { data: pagamentos = [] } = useQuery({
    queryKey: ["jiujitsu_pagamentos"],
    queryFn: async () => {
      const { data } = await supabase.from("jiujitsu_pagamentos").select("*, jiujitsu_alunos(nome)").order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  });

  const filtered = pagamentos.filter((p: any) =>
    p.jiujitsu_alunos?.nome?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    if (!alunoId || !mesRef) {
      toast({ title: "Selecione o aluno e o mês", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("jiujitsu_pagamentos").insert({
      aluno_id: alunoId,
      mes_referencia: mesRef,
      valor: Number(valor) || 0,
      status,
      data_pagamento: dataPagamento || null,
    });
    if (error) {
      toast({ title: "Erro ao registrar pagamento", variant: "destructive" });
    } else {
      toast({ title: "Pagamento registrado!" });
      queryClient.invalidateQueries({ queryKey: ["jiujitsu_pagamentos"] });
      setFormOpen(false);
      setAlunoId(""); setMesRef(""); setValor(""); setStatus("pendente"); setDataPagamento("");
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    const update: any = { status: newStatus };
    if (newStatus === "pago") {
      const now = new Date();
      update.data_pagamento = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    }
    const { error } = await supabase.from("jiujitsu_pagamentos").update(update).eq("id", id);
    if (!error) {
      toast({ title: "Status atualizado!" });
      queryClient.invalidateQueries({ queryKey: ["jiujitsu_pagamentos"] });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por aluno..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Novo Pagamento
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Mês Ref.</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data Pgto.</TableHead>
              <TableHead className="w-32">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum pagamento registrado</TableCell></TableRow>
            ) : (
              filtered.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.jiujitsu_alunos?.nome}</TableCell>
                  <TableCell>{p.mes_referencia}</TableCell>
                  <TableCell>R$ {Number(p.valor).toFixed(2)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>
                      {p.status === "pago" ? "Pago" : p.status === "pendente" ? "Pendente" : "Atrasado"}
                    </span>
                  </TableCell>
                  <TableCell>{p.data_pagamento || "—"}</TableCell>
                  <TableCell>
                    {p.status !== "pago" && (
                      <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(p.id, "pago")}>
                        Marcar Pago
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Pagamento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Aluno</Label>
              <Select value={alunoId} onValueChange={setAlunoId}>
                <SelectTrigger><SelectValue placeholder="Selecione o aluno" /></SelectTrigger>
                <SelectContent>
                  {alunos.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Mês Referência</Label>
                <Input type="month" value={mesRef} onChange={(e) => setMesRef(e.target.value)} />
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" value={valor} onChange={(e) => setValor(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="atrasado">Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data Pagamento</Label>
                <Input type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Registrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
