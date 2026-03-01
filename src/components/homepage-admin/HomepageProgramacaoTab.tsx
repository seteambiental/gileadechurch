import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Clock, Calendar, Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";

const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

interface ProgramacaoItem {
  id: string;
  dia_semana: number;
  horario: string | null;
  titulo: string;
  subtitulo: string | null;
  ordem: number | null;
  ativo: boolean;
}

const HomepageProgramacaoTab = () => {
  const queryClient = useQueryClient();
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ProgramacaoItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [formDia, setFormDia] = useState("0");
  const [formHorario, setFormHorario] = useState("");
  const [formTitulo, setFormTitulo] = useState("");
  const [formSubtitulo, setFormSubtitulo] = useState("");
  const [formOrdem, setFormOrdem] = useState("0");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["homepage-programacao-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_programacao")
        .select("*")
        .order("dia_semana", { ascending: true })
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data as ProgramacaoItem[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        dia_semana: parseInt(formDia),
        horario: formHorario || null,
        titulo: formTitulo.trim(),
        subtitulo: formSubtitulo.trim() || null,
        ordem: parseInt(formOrdem) || 0,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("homepage_programacao")
          .update(payload)
          .eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("homepage_programacao")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-programacao-admin"] });
      queryClient.invalidateQueries({ queryKey: ["homepage-programacao-public"] });
      toast.success(editingItem ? "Card atualizado!" : "Card adicionado!");
      closeForm();
    },
    onError: () => toast.error("Erro ao salvar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("homepage_programacao").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-programacao-admin"] });
      queryClient.invalidateQueries({ queryKey: ["homepage-programacao-public"] });
      toast.success("Card removido!");
      setDeleteId(null);
    },
    onError: () => toast.error("Erro ao remover"),
  });

  const openForm = (item?: ProgramacaoItem) => {
    if (item) {
      setEditingItem(item);
      setFormDia(String(item.dia_semana));
      setFormHorario(item.horario || "");
      setFormTitulo(item.titulo);
      setFormSubtitulo(item.subtitulo || "");
      setFormOrdem(String(item.ordem ?? 0));
    } else {
      setEditingItem(null);
      setFormDia("0");
      setFormHorario("");
      setFormTitulo("");
      setFormSubtitulo("");
      setFormOrdem("0");
    }
    setShowFormDialog(true);
  };

  const closeForm = () => {
    setShowFormDialog(false);
    setEditingItem(null);
  };

  // Agrupar por dia da semana
  const itemsAgrupados = items.reduce((acc, item) => {
    if (!acc[item.dia_semana]) acc[item.dia_semana] = [];
    acc[item.dia_semana].push(item);
    return acc;
  }, {} as Record<number, ProgramacaoItem[]>);

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-heading font-bold">Programação Semanal</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os cards de programação exibidos na homepage
          </p>
        </div>
        <Button onClick={() => openForm()}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Card
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Como funciona
          </CardTitle>
          <CardDescription>
            Os cards cadastrados aqui substituem a programação automática da agenda na homepage.
            Você tem controle total sobre o que aparece. As alterações aqui NÃO afetam a agenda da igreja.
          </CardDescription>
        </CardHeader>
      </Card>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-semibold mb-2">Nenhum card de programação</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Adicione os cards que serão exibidos na programação semanal da homepage
            </p>
            <Button onClick={() => openForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Card
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(itemsAgrupados).map(([dia, cards]) => (
            <Card key={dia}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{diasSemana[parseInt(dia)]}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {cards.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 group"
                  >
                    <div className="flex items-center gap-2 shrink-0">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{item.horario?.slice(0, 5) || "—"}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.titulo}</p>
                      {item.subtitulo && (
                        <p className="text-xs text-muted-foreground truncate">{item.subtitulo}</p>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openForm(item)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => setDeleteId(item.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Card" : "Novo Card de Programação"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Dia da semana</Label>
              <Select value={formDia} onValueChange={setFormDia}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {diasSemana.map((dia, i) => (
                    <SelectItem key={i} value={String(i)}>{dia}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Horário</Label>
              <Input
                type="time"
                value={formHorario}
                onChange={(e) => setFormHorario(e.target.value)}
                placeholder="Ex: 19:00"
              />
            </div>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={formTitulo}
                onChange={(e) => setFormTitulo(e.target.value)}
                placeholder="Ex: Culto de Celebração"
              />
            </div>
            <div className="space-y-2">
              <Label>Subtítulo / Observação (opcional)</Label>
              <Input
                value={formSubtitulo}
                onChange={(e) => setFormSubtitulo(e.target.value)}
                placeholder="Ex: Culto de Ceia neste domingo"
              />
            </div>
            <div className="space-y-2">
              <Label>Ordem de exibição</Label>
              <Input
                type="number"
                value={formOrdem}
                onChange={(e) => setFormOrdem(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancelar</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!formTitulo.trim() || saveMutation.isPending}
            >
              {editingItem ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Quer mesmo excluir esse registro?"
        description="Esta ação não pode ser desfeita."
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
};

export default HomepageProgramacaoTab;