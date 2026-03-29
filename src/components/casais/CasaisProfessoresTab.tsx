import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MemberSelect } from "@/components/ui/member-select";
import { SearchInput } from "@/components/ui/search-input";
import { Plus, Pencil, Trash2, Loader2, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { includesNormalized } from "@/lib/text-utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ExportButton } from "@/components/ui/export-button";
import { ColumnFilterPopover } from "@/components/ui/column-filter-popover";

const DIAS_SEMANA = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
];

interface ProfessorForm {
  marido_id: string | null;
  esposa_id: string | null;
  turma_id: string | null;
  dia_semana: string;
  horario: string;
  observacoes: string;
}

const emptyForm: ProfessorForm = {
  marido_id: null,
  esposa_id: null,
  turma_id: null,
  dia_semana: "",
  horario: "",
  observacoes: "",
};

export function CasaisProfessoresTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfessorForm>(emptyForm);
  const [deleteProfId, setDeleteProfId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: professores = [], isLoading } = useQuery({
    queryKey: ["casais-professores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casais_professores")
        .select(`
          *,
          marido:members!casais_professores_marido_id_fkey (id, full_name, photo_url),
          esposa:members!casais_professores_esposa_id_fkey (id, full_name, photo_url),
          turma:casais_turmas!casais_professores_turma_id_fkey (id, nome)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: turmas = [] } = useQuery({
    queryKey: ["casais-turmas-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casais_turmas")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: ProfessorForm & { id?: string }) => {
      const { id, ...payload } = data;
      if (id) {
        const { error } = await supabase
          .from("casais_professores")
          .update(payload)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("casais_professores")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["casais-professores"] });
      toast.success(editingId ? "Professor atualizado!" : "Professor cadastrado!");
      handleClose();
    },
    onError: () => toast.error("Erro ao salvar professor."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("casais_professores")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["casais-professores"] });
      toast.success("Professor removido!");
    },
    onError: () => toast.error("Erro ao remover professor."),
  });

  const handleClose = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleEdit = (prof: any) => {
    setEditingId(prof.id);
    setForm({
      marido_id: prof.marido_id,
      esposa_id: prof.esposa_id,
      turma_id: prof.turma_id,
      dia_semana: prof.dia_semana,
      horario: prof.horario,
      observacoes: prof.observacoes || "",
    });
    setIsFormOpen(true);
  };

  const handleSave = () => {
    if (!form.marido_id && !form.esposa_id) {
      toast.error("Informe pelo menos o marido ou a esposa.");
      return;
    }
    if (!form.dia_semana || !form.horario) {
      toast.error("Informe o dia da semana e o horário.");
      return;
    }
    saveMutation.mutate({ ...form, id: editingId || undefined });
  };

  const getDiaLabel = (p: any) => p.dia_semana || "-";
  const getTurmaLabel = (p: any) => p.turma?.nome || "—";
  const getStatusLabel = (p: any) => p.ativo ? "Ativo" : "Inativo";

  const [filterDia, setFilterDia] = useState<Set<string>>(new Set());
  const [filterTurmaP, setFilterTurmaP] = useState<Set<string>>(new Set());
  const [filterStatusP, setFilterStatusP] = useState<Set<string>>(new Set());

  const columnOptions = useMemo(() => {
    const dias = [...new Set(professores.map(getDiaLabel))].sort();
    const turmasOpts = [...new Set(professores.map(getTurmaLabel))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    const status = [...new Set(professores.map(getStatusLabel))].sort();
    return { dias, turmas: turmasOpts, status };
  }, [professores]);

  const filtered = useMemo(() => {
    return professores.filter((p: any) => {
      const nomeMarido = p.marido?.full_name || "";
      const nomeEsposa = p.esposa?.full_name || "";
      const nomeTurma = p.turma?.nome || "";
      if (searchTerm && !includesNormalized(nomeMarido, searchTerm) && !includesNormalized(nomeEsposa, searchTerm) && !includesNormalized(nomeTurma, searchTerm)) return false;
      if (filterDia.size > 0 && filterDia.size < columnOptions.dias.length && !filterDia.has(getDiaLabel(p))) return false;
      if (filterTurmaP.size > 0 && filterTurmaP.size < columnOptions.turmas.length && !filterTurmaP.has(getTurmaLabel(p))) return false;
      if (filterStatusP.size > 0 && filterStatusP.size < columnOptions.status.length && !filterStatusP.has(getStatusLabel(p))) return false;
      return true;
    });
  }, [professores, searchTerm, filterDia, filterTurmaP, filterStatusP, columnOptions]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar professor..."
          className="w-full sm:max-w-xs"
        />
        <div className="flex gap-2">
          <ExportButton
            data={filtered}
            columns={[
              { header: "Marido", accessor: (r: any) => r.marido?.full_name || "—" },
              { header: "Esposa", accessor: (r: any) => r.esposa?.full_name || "—" },
              { header: "Turma", accessor: (r: any) => getTurmaLabel(r) },
              { header: "Dia", accessor: (r: any) => r.dia_semana || "—" },
              { header: "Horário", accessor: (r: any) => r.horario || "—" },
              { header: "Status", accessor: (r: any) => getStatusLabel(r) },
            ]}
            filename="professores-casais"
            title="Professores - Curso de Casais"
            sheetName="Professores"
          />
          <Button onClick={() => setIsFormOpen(true)} className="shrink-0">
            <Plus className="w-4 h-4 mr-1" />
            Novo Professor
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="py-12 text-center text-muted-foreground">
            <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Nenhum professor cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
             <TableHeader>
              <TableRow>
                <TableHead>Marido</TableHead>
                <TableHead>Esposa</TableHead>
                <TableHead className="hidden md:table-cell">
                  <ColumnFilterPopover title="Turma" options={columnOptions.turmas} selected={filterTurmaP} onChange={setFilterTurmaP} />
                </TableHead>
                <TableHead>
                  <ColumnFilterPopover title="Dia / Horário" options={columnOptions.dias} selected={filterDia} onChange={setFilterDia} />
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <ColumnFilterPopover title="Status" options={columnOptions.status} selected={filterStatusP} onChange={setFilterStatusP} />
                </TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((prof: any) => (
                <TableRow key={prof.id}>
                  <TableCell className="font-medium">
                    {prof.marido?.full_name || "—"}
                  </TableCell>
                  <TableCell>{prof.esposa?.full_name || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {prof.turma?.nome || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{prof.dia_semana}</p>
                      <p className="text-muted-foreground">{prof.horario}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant={prof.ativo ? "default" : "secondary"}>
                      {prof.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(prof)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteProfId(prof.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Professor" : "Novo Professor"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Marido</Label>
              <MemberSelect
                value={form.marido_id}
                onChange={(v) => setForm({ ...form, marido_id: v })}
                placeholder="Buscar marido..."
              />
            </div>
            <div>
              <Label>Esposa</Label>
              <MemberSelect
                value={form.esposa_id}
                onChange={(v) => setForm({ ...form, esposa_id: v })}
                placeholder="Buscar esposa..."
              />
            </div>
            <div>
              <Label>Turma (opcional)</Label>
              <Select
                value={form.turma_id || "none"}
                onValueChange={(v) =>
                  setForm({ ...form, turma_id: v === "none" ? null : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar turma..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {turmas.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Dia da Semana</Label>
                <Select
                  value={form.dia_semana}
                  onValueChange={(v) => setForm({ ...form, dia_semana: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DIAS_SEMANA.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Horário</Label>
                <Input
                  type="time"
                  value={form.horario}
                  onChange={(e) =>
                    setForm({ ...form, horario: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={form.observacoes}
                onChange={(e) =>
                  setForm({ ...form, observacoes: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                )}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!deleteProfId}
        onOpenChange={(open) => !open && setDeleteProfId(null)}
        onConfirm={() => { if (deleteProfId) { deleteMutation.mutate(deleteProfId); setDeleteProfId(null); } }}
      />
    </div>
  );
}
