import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ContingenciaVersoesTab() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    versao: "",
    descricao: "",
    commit_hash: "",
    estavel: true,
    rollback_disponivel: true,
    observacoes: "",
  });

  const { data: versoes, isLoading } = useQuery({
    queryKey: ["contingencia-versoes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contingencia_versoes")
        .select("*")
        .order("data_deploy", { ascending: false });
      return data || [];
    },
  });

  const handleSave = async () => {
    if (!form.versao.trim()) { toast.error("Informe a versão"); return; }
    setSaving(true);
    const { error } = await supabase.from("contingencia_versoes").insert({
      versao: form.versao,
      descricao: form.descricao || null,
      commit_hash: form.commit_hash || null,
      estavel: form.estavel,
      rollback_disponivel: form.rollback_disponivel,
      observacoes: form.observacoes || null,
    });
    setSaving(false);
    if (error) { toast.error("Erro ao registrar versão"); return; }
    toast.success("Versão registrada");
    queryClient.invalidateQueries({ queryKey: ["contingencia-versoes"] });
    queryClient.invalidateQueries({ queryKey: ["contingencia-ultima-versao"] });
    setDialogOpen(false);
    setForm({ versao: "", descricao: "", commit_hash: "", estavel: true, rollback_disponivel: true, observacoes: "" });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Versões do Sistema</CardTitle>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Registrar Versão
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Carregando...</p>
        ) : !versoes?.length ? (
          <p className="text-muted-foreground text-center py-8">Nenhuma versão registrada</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Versão</TableHead>
                  <TableHead>Deploy</TableHead>
                  <TableHead>Estável</TableHead>
                  <TableHead>Rollback</TableHead>
                  <TableHead>Commit</TableHead>
                  <TableHead>Descrição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versoes.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-semibold">{v.versao}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(v.data_deploy), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {v.estavel ? <Badge>Estável</Badge> : <Badge variant="outline">Instável</Badge>}
                    </TableCell>
                    <TableCell>
                      {v.rollback_disponivel ? (
                        <Badge variant="secondary">Disponível</Badge>
                      ) : (
                        <Badge variant="outline">Indisponível</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs max-w-[120px] truncate">{v.commit_hash || "-"}</TableCell>
                    <TableCell className="max-w-[250px] truncate">{v.descricao || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Versão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Versão *</Label>
                <Input value={form.versao} onChange={(e) => setForm({ ...form, versao: e.target.value })} placeholder="Ex: 2.5.1" />
              </div>
              <div className="space-y-2">
                <Label>Commit Hash</Label>
                <Input value={form.commit_hash} onChange={(e) => setForm({ ...form, commit_hash: e.target.value })} placeholder="abc123f" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.estavel} onCheckedChange={(v) => setForm({ ...form, estavel: v })} />
                <Label>Estável</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.rollback_disponivel} onCheckedChange={(v) => setForm({ ...form, rollback_disponivel: v })} />
                <Label>Rollback disponível</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
