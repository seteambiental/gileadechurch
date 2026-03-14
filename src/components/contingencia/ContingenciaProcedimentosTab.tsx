import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Loader2, ChevronDown, Edit, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const CATEGORIAS = [
  { value: "backup", label: "Backup" },
  { value: "restore", label: "Restauração" },
  { value: "rollback", label: "Rollback" },
  { value: "comunicacao", label: "Comunicação" },
  { value: "validacao", label: "Validação" },
  { value: "acionamento", label: "Acionamento" },
];

export default function ContingenciaProcedimentosTab() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    titulo: "",
    categoria: "backup",
    conteudo: "",
    ordem: "0",
  });

  const { data: procedimentos, isLoading } = useQuery({
    queryKey: ["contingencia-procedimentos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contingencia_procedimentos")
        .select("*")
        .eq("ativo", true)
        .order("categoria")
        .order("ordem");
      return data || [];
    },
  });

  const openEdit = (proc: any) => {
    setEditId(proc.id);
    setForm({
      titulo: proc.titulo,
      categoria: proc.categoria,
      conteudo: proc.conteudo,
      ordem: String(proc.ordem || 0),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.titulo.trim() || !form.conteudo.trim()) {
      toast.error("Preencha título e conteúdo");
      return;
    }
    setSaving(true);
    const payload = {
      titulo: form.titulo,
      categoria: form.categoria,
      conteudo: form.conteudo,
      ordem: parseInt(form.ordem) || 0,
    };

    const { error } = editId
      ? await supabase.from("contingencia_procedimentos").update(payload).eq("id", editId)
      : await supabase.from("contingencia_procedimentos").insert(payload);

    setSaving(false);
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success(editId ? "Procedimento atualizado" : "Procedimento criado");
    queryClient.invalidateQueries({ queryKey: ["contingencia-procedimentos"] });
    setDialogOpen(false);
    setEditId(null);
    setForm({ titulo: "", categoria: "backup", conteudo: "", ordem: "0" });
  };

  const grouped = CATEGORIAS.map((cat) => ({
    ...cat,
    items: procedimentos?.filter((p) => p.categoria === cat.value) || [],
  })).filter((g) => g.items.length > 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Procedimentos Operacionais</CardTitle>
        <Button size="sm" onClick={() => { setEditId(null); setForm({ titulo: "", categoria: "backup", conteudo: "", ordem: "0" }); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Novo Procedimento
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Carregando...</p>
        ) : !grouped.length ? (
          <p className="text-muted-foreground text-center py-8">Nenhum procedimento cadastrado</p>
        ) : (
          <div className="space-y-3">
            {grouped.map((group) => (
              <div key={group.value}>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  {group.label}
                </h3>
                <div className="space-y-2 ml-6">
                  {group.items.map((proc) => (
                    <Collapsible key={proc.id}>
                      <div className="border rounded-lg">
                        <CollapsibleTrigger className="w-full flex items-center justify-between p-3 hover:bg-muted/50">
                          <span className="font-medium text-sm">{proc.titulo}</span>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => { e.stopPropagation(); openEdit(proc); }}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-3 pb-3 border-t pt-2">
                            <div className="text-sm whitespace-pre-wrap">{proc.conteudo}</div>
                            <p className="text-xs text-muted-foreground mt-2">
                              Atualizado: {format(new Date(proc.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar" : "Novo"} Procedimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Conteúdo *</Label>
              <Textarea
                value={form.conteudo}
                onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
                className="min-h-[200px]"
                placeholder="Descreva o procedimento passo a passo..."
              />
            </div>
            <div className="space-y-2">
              <Label>Ordem</Label>
              <Input type="number" value={form.ordem} onChange={(e) => setForm({ ...form, ordem: e.target.value })} />
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
