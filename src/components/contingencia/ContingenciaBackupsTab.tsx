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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ContingenciaBackupsTab() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tipo: "database",
    status: "sucesso",
    localizacao: "",
    hash_integridade: "",
    observacoes: "",
    tamanho_bytes: "",
  });

  const { data: backups, isLoading } = useQuery({
    queryKey: ["contingencia-backups"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contingencia_backups")
        .select("*")
        .order("data_inicio", { ascending: false });
      return data || [];
    },
  });

  const handleSave = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const { error } = await supabase.from("contingencia_backups").insert({
      tipo: form.tipo,
      status: form.status,
      data_inicio: now,
      data_fim: form.status !== "em_andamento" ? now : null,
      localizacao: form.localizacao || null,
      hash_integridade: form.hash_integridade || null,
      observacoes: form.observacoes || null,
      tamanho_bytes: form.tamanho_bytes ? parseInt(form.tamanho_bytes) : null,
    });
    setSaving(false);
    if (error) {
      toast.error("Erro ao registrar backup");
      return;
    }
    toast.success("Backup registrado com sucesso");
    queryClient.invalidateQueries({ queryKey: ["contingencia-backups"] });
    queryClient.invalidateQueries({ queryKey: ["contingencia-ultimo-backup"] });
    queryClient.invalidateQueries({ queryKey: ["contingencia-stats-backups"] });
    setDialogOpen(false);
    setForm({ tipo: "database", status: "sucesso", localizacao: "", hash_integridade: "", observacoes: "", tamanho_bytes: "" });
  };

  const statusIcon = (status: string) => {
    if (status === "sucesso") return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === "falha") return <XCircle className="h-4 w-4 text-red-500" />;
    if (status === "em_andamento") return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(2)} GB`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Backups Registrados</CardTitle>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Registrar Backup
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Carregando...</p>
        ) : !backups?.length ? (
          <p className="text-muted-foreground text-center py-8">Nenhum backup registrado</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Integridade</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(b.data_inicio), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{b.tipo}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {statusIcon(b.status)}
                        <span className="capitalize">{b.status}</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatBytes(b.tamanho_bytes)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{b.localizacao || "-"}</TableCell>
                    <TableCell className="max-w-[120px] truncate font-mono text-xs">{b.hash_integridade || "-"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{b.observacoes || "-"}</TableCell>
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
            <DialogTitle>Registrar Backup</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="database">Database</SelectItem>
                    <SelectItem value="storage">Storage</SelectItem>
                    <SelectItem value="code">Código</SelectItem>
                    <SelectItem value="full">Completo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sucesso">Sucesso</SelectItem>
                    <SelectItem value="falha">Falha</SelectItem>
                    <SelectItem value="em_andamento">Em andamento</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tamanho (bytes)</Label>
              <Input type="number" value={form.tamanho_bytes} onChange={(e) => setForm({ ...form, tamanho_bytes: e.target.value })} placeholder="Ex: 1048576" />
            </div>
            <div className="space-y-2">
              <Label>Localização</Label>
              <Input value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} placeholder="Ex: s3://bucket/backup-2026-03-14.sql" />
            </div>
            <div className="space-y-2">
              <Label>Hash de Integridade</Label>
              <Input value={form.hash_integridade} onChange={(e) => setForm({ ...form, hash_integridade: e.target.value })} placeholder="SHA-256" />
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
