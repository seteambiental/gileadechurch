import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, Upload } from "lucide-react";
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
import { format } from "date-fns";

interface Evento {
  id: string;
  titulo: string;
  descricao: string | null;
  data_evento: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  local: string | null;
  tipo_evento: string;
  genero_alvo: string;
  cor: string | null;
  recorrente: boolean;
  tipo_recorrencia: string | null;
  dia_semana: number | null;
  semana_mes: number | null;
  flyer_url: string | null;
  observacoes: string | null;
}

interface EventoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evento?: Evento | null;
  selectedDate?: Date | null;
}

const CORES = [
  { value: "#dc2626", label: "Vermelho" },
  { value: "#2563eb", label: "Azul" },
  { value: "#7c3aed", label: "Roxo" },
  { value: "#16a34a", label: "Verde" },
  { value: "#ea580c", label: "Laranja" },
  { value: "#0891b2", label: "Ciano" },
  { value: "#db2777", label: "Rosa" },
];

const TIPOS_EVENTO = [
  { value: "culto", label: "Culto" },
  { value: "ceia", label: "Santa Ceia" },
  { value: "batismo", label: "Batismo" },
  { value: "impacto", label: "Impacto" },
  { value: "retiro", label: "Retiro" },
  { value: "conferencia", label: "Conferência" },
  { value: "casa_refugio", label: "Casa Refúgio" },
  { value: "evento", label: "Outro Evento" },
];

export const EventoFormDialog = ({
  open,
  onOpenChange,
  evento,
  selectedDate,
}: EventoFormDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    data_evento: "",
    data_fim: "",
    hora_inicio: "",
    hora_fim: "",
    local: "Igreja Gileade",
    tipo_evento: "evento",
    genero_alvo: "todos",
    cor: "#dc2626",
    recorrente: false,
    tipo_recorrencia: "",
    dia_semana: "",
    semana_mes: "",
    observacoes: "",
    idade_minima: "",
    idade_maxima: "",
  });

  useEffect(() => {
    if (open) {
      if (evento) {
        setFormData({
          titulo: evento.titulo || "",
          descricao: evento.descricao || "",
          data_evento: evento.data_evento || "",
          data_fim: (evento as any).data_fim || "",
          hora_inicio: evento.hora_inicio?.substring(0, 5) || "",
          hora_fim: evento.hora_fim?.substring(0, 5) || "",
          local: evento.local || "Igreja Gileade",
          tipo_evento: evento.tipo_evento || "evento",
          genero_alvo: evento.genero_alvo || "todos",
          cor: evento.cor || "#dc2626",
          recorrente: evento.recorrente || false,
          tipo_recorrencia: evento.tipo_recorrencia || "",
          dia_semana: evento.dia_semana?.toString() || "",
          semana_mes: evento.semana_mes?.toString() || "",
          observacoes: evento.observacoes || "",
          idade_minima: "",
          idade_maxima: "",
        });
      } else {
        setFormData({
          titulo: "",
          descricao: "",
          data_evento: selectedDate ? format(selectedDate, "yyyy-MM-dd") : "",
          data_fim: "",
          hora_inicio: "",
          hora_fim: "",
          local: "Igreja Gileade",
          tipo_evento: "evento",
          genero_alvo: "todos",
          cor: "#dc2626",
          recorrente: false,
          tipo_recorrencia: "",
          dia_semana: "",
          semana_mes: "",
          observacoes: "",
          idade_minima: "",
          idade_maxima: "",
        });
      }
    }
  }, [open, evento, selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.titulo.trim()) {
      toast({ variant: "destructive", title: "Título é obrigatório" });
      return;
    }

    if (!formData.data_evento && !formData.recorrente) {
      toast({ variant: "destructive", title: "Data é obrigatória para eventos não recorrentes" });
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        titulo: formData.titulo.trim(),
        descricao: formData.descricao || null,
        data_evento: formData.data_evento || new Date().toISOString().split("T")[0],
        data_fim: formData.data_fim || null,
        hora_inicio: formData.hora_inicio || null,
        hora_fim: formData.hora_fim || null,
        local: formData.local || null,
        tipo_evento: formData.tipo_evento,
        genero_alvo: formData.genero_alvo,
        cor: formData.cor,
        recorrente: formData.recorrente,
        tipo_recorrencia: formData.recorrente ? formData.tipo_recorrencia || null : null,
        dia_semana: formData.recorrente && formData.dia_semana ? parseInt(formData.dia_semana) : null,
        semana_mes: formData.recorrente && formData.semana_mes ? parseInt(formData.semana_mes) : null,
        observacoes: formData.observacoes || null,
        idade_minima: formData.idade_minima ? parseInt(formData.idade_minima) : null,
        idade_maxima: formData.idade_maxima ? parseInt(formData.idade_maxima) : null,
      };

      if (evento) {
        const { error } = await supabase
          .from("agenda_igreja")
          .update(payload)
          .eq("id", evento.id);
        if (error) throw error;
        toast({ title: "Evento atualizado!" });
      } else {
        const { error } = await supabase.from("agenda_igreja").insert(payload);
        if (error) throw error;
        toast({ title: "Evento criado!" });
      }

      queryClient.invalidateQueries({ queryKey: ["agenda-igreja"] });
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!evento) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("agenda_igreja")
        .update({ ativo: false })
        .eq("id", evento.id);
      if (error) throw error;

      toast({ title: "Evento removido!" });
      queryClient.invalidateQueries({ queryKey: ["agenda-igreja"] });
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{evento ? "Editar Evento" : "Novo Evento"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Evento</Label>
                <Select
                  value={formData.tipo_evento}
                  onValueChange={(v) => setFormData({ ...formData, tipo_evento: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_EVENTO.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Cor</Label>
                <Select
                  value={formData.cor}
                  onValueChange={(v) => setFormData({ ...formData, cor: v })}
                >
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: formData.cor }} />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {CORES.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: c.value }} />
                          {c.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="data_evento">Data Início</Label>
                <Input
                  id="data_evento"
                  type="date"
                  value={formData.data_evento}
                  onChange={(e) => setFormData({ ...formData, data_evento: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="data_fim">Data Término</Label>
                <Input
                  id="data_fim"
                  type="date"
                  value={formData.data_fim}
                  onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                  min={formData.data_evento}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hora_inicio">Horário Início</Label>
                <Input
                  id="hora_inicio"
                  type="time"
                  value={formData.hora_inicio}
                  onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="hora_fim">Horário Término</Label>
                <Input
                  id="hora_fim"
                  type="time"
                  value={formData.hora_fim}
                  onChange={(e) => setFormData({ ...formData, hora_fim: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="local">Local</Label>
              <Input
                id="local"
                value={formData.local}
                onChange={(e) => setFormData({ ...formData, local: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Público Alvo</Label>
                <Select
                  value={formData.genero_alvo}
                  onValueChange={(v) => setFormData({ ...formData, genero_alvo: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="feminino">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="observacoes">Observações / Comentários</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={2}
                placeholder="Adicione notas sobre este evento..."
              />
            </div>

            {/* Recorrência */}
            <div className="p-3 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="recorrente"
                  checked={formData.recorrente}
                  onCheckedChange={(c) => setFormData({ ...formData, recorrente: !!c })}
                />
                <Label htmlFor="recorrente" className="cursor-pointer">Evento Recorrente</Label>
              </div>

              {formData.recorrente && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tipo de Recorrência</Label>
                    <Select
                      value={formData.tipo_recorrencia}
                      onValueChange={(v) => setFormData({ ...formData, tipo_recorrencia: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="semanal">Semanal</SelectItem>
                        <SelectItem value="mensal">Mensal</SelectItem>
                        <SelectItem value="semestral">Semestral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Dia da Semana</Label>
                    <Select
                      value={formData.dia_semana}
                      onValueChange={(v) => setFormData({ ...formData, dia_semana: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Domingo</SelectItem>
                        <SelectItem value="1">Segunda</SelectItem>
                        <SelectItem value="2">Terça</SelectItem>
                        <SelectItem value="3">Quarta</SelectItem>
                        <SelectItem value="4">Quinta</SelectItem>
                        <SelectItem value="5">Sexta</SelectItem>
                        <SelectItem value="6">Sábado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(formData.tipo_recorrencia === "mensal" || formData.tipo_recorrencia === "semestral") && (
                    <div>
                      <Label>Semana do Mês</Label>
                      <Select
                        value={formData.semana_mes}
                        onValueChange={(v) => setFormData({ ...formData, semana_mes: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1ª Semana</SelectItem>
                          <SelectItem value="2">2ª Semana</SelectItem>
                          <SelectItem value="3">3ª Semana</SelectItem>
                          <SelectItem value="4">4ª Semana</SelectItem>
                          <SelectItem value="5">Última Semana</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4 border-t">
              {evento && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="text-destructive hover:text-destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              )}
              <div className="flex gap-3 ml-auto">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="secondary" disabled={isLoading}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {evento ? "Salvar" : "Criar"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Evento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{evento?.titulo}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
