import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Calendar, Users, Home } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface MinisterioEscalasTabProps {
  ministryId: string;
}

interface Integrante {
  id: string;
  member: {
    id: string;
    full_name: string;
  };
  funcao: {
    id: string;
    nome: string;
  };
}

interface EscalaMembro {
  id: string;
  integrante_id: string;
  integrante: Integrante;
}

interface Escala {
  id: string;
  data_culto: string;
  tipo_culto: string;
  observacoes: string | null;
  membros: EscalaMembro[];
}

interface EscalaServicoAprovada {
  id: string;
  data_culto: string;
  tipo_culto: string;
  tipo_escala: string;
  observacoes: string | null;
  member?: { id: string; full_name: string } | null;
  casa_refugio?: { id: string; name: string } | null;
  membros: { id: string; member: { id: string; full_name: string } }[];
}

const TIPOS_CULTO = [
  { value: "domingo", label: "Domingo" },
  { value: "quarta", label: "Quarta-feira" },
  { value: "sabado", label: "Sábado" },
  { value: "especial", label: "Evento Especial" },
];

const TIPOS_CULTO_SERVICO: Record<string, string> = {
  celebracao: "Culto de Celebração",
  ceia: "Culto de Ceia",
  quarta: "Quarta com Propósito",
};

export const MinisterioEscalasTab = ({ ministryId }: MinisterioEscalasTabProps) => {
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteServicoDialog, setShowDeleteServicoDialog] = useState(false);
  const [editingEscala, setEditingEscala] = useState<Escala | null>(null);
  const [escalaToDelete, setEscalaToDelete] = useState<string | null>(null);
  const [escalaServicoToDelete, setEscalaServicoToDelete] = useState<string | null>(null);
  const [editServicoDialogId, setEditServicoDialogId] = useState<string | null>(null);
  const [editServicoStatus, setEditServicoStatus] = useState<string>("");

  // Form state
  const [dataCulto, setDataCulto] = useState<Date | undefined>(undefined);
  const [tipoCulto, setTipoCulto] = useState("domingo");
  const [observacoes, setObservacoes] = useState("");
  const [selectedIntegrantes, setSelectedIntegrantes] = useState<string[]>([]);

  // Fetch integrantes do ministério
  const { data: integrantes = [] } = useQuery({
    queryKey: ["ministerio-integrantes", ministryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ministerio_integrantes")
        .select(`
          id,
          member:members(id, full_name),
          funcao:ministerio_funcoes(id, nome)
        `)
        .eq("ministry_id", ministryId)
        .eq("ativo", true);
      if (error) throw error;
      return data as unknown as Integrante[];
    },
  });

  // Fetch escalas do mês (escalas manuais do ministério)
  const { data: escalas = [], isLoading } = useQuery({
    queryKey: ["ministerio-escalas", ministryId, format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("ministerio_escalas")
        .select(`
          id,
          data_culto,
          tipo_culto,
          observacoes,
          membros:ministerio_escala_membros(
            id,
            integrante_id,
            integrante:ministerio_integrantes(
              id,
              member:members(id, full_name),
              funcao:ministerio_funcoes(id, nome)
            )
          )
        `)
        .eq("ministry_id", ministryId)
        .gte("data_culto", start)
        .lte("data_culto", end)
        .order("data_culto");
      if (error) throw error;
      return data as unknown as Escala[];
    },
  });

  // Fetch escalas de serviço aprovadas (candidaturas aprovadas)
  const { data: escalasServico = [] } = useQuery({
    queryKey: ["ministerio-escalas-servico", ministryId, format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("escalas_servico")
        .select(`
          id,
          data_culto,
          tipo_culto,
          tipo_escala,
          observacoes,
          member:members!escalas_servico_member_id_fkey(id, full_name),
          casa_refugio:casas_refugio!escalas_servico_casa_refugio_id_fkey(id, name),
          membros:escala_servico_membros(
            id,
            member:members(id, full_name)
          )
        `)
        .eq("ministry_id", ministryId)
        .eq("status", "aprovado")
        .gte("data_culto", start)
        .lte("data_culto", end)
        .order("data_culto");
      if (error) throw error;
      return data as unknown as EscalaServicoAprovada[];
    },
  });

  // Agrupar escalas manuais por data
  const escalasByDate = useMemo(() => {
    const grouped: Record<string, Escala[]> = {};
    escalas.forEach((escala) => {
      if (!grouped[escala.data_culto]) {
        grouped[escala.data_culto] = [];
      }
      grouped[escala.data_culto].push(escala);
    });
    return grouped;
  }, [escalas]);

  // Agrupar escalas de serviço por data
  const escalasServicoByDate = useMemo(() => {
    const grouped: Record<string, EscalaServicoAprovada[]> = {};
    escalasServico.forEach((escala) => {
      if (!grouped[escala.data_culto]) {
        grouped[escala.data_culto] = [];
      }
      grouped[escala.data_culto].push(escala);
    });
    return grouped;
  }, [escalasServico]);

  // Todas as datas únicas combinadas
  const allDates = useMemo(() => {
    const dates = new Set([
      ...Object.keys(escalasByDate),
      ...Object.keys(escalasServicoByDate),
    ]);
    return Array.from(dates).sort();
  }, [escalasByDate, escalasServicoByDate]);

  // Mutation para salvar escala
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!dataCulto) throw new Error("Data é obrigatória");

      const escalaData = {
        ministry_id: ministryId,
        data_culto: format(dataCulto, "yyyy-MM-dd"),
        tipo_culto: tipoCulto,
        observacoes: observacoes || null,
      };

      if (editingEscala) {
        // Update escala
        const { error: updateError } = await supabase
          .from("ministerio_escalas")
          .update(escalaData)
          .eq("id", editingEscala.id);
        if (updateError) throw updateError;

        // Delete old membros
        await supabase.from("ministerio_escala_membros").delete().eq("escala_id", editingEscala.id);

        // Insert new membros
        if (selectedIntegrantes.length > 0) {
          const membrosData = selectedIntegrantes.map((intId) => ({
            escala_id: editingEscala.id,
            integrante_id: intId,
          }));
          const { error: membrosError } = await supabase.from("ministerio_escala_membros").insert(membrosData);
          if (membrosError) throw membrosError;
        }
      } else {
        // Insert new escala
        const { data: newEscala, error: insertError } = await supabase
          .from("ministerio_escalas")
          .insert(escalaData)
          .select("id")
          .single();
        if (insertError) throw insertError;

        // Insert membros
        if (selectedIntegrantes.length > 0) {
          const membrosData = selectedIntegrantes.map((intId) => ({
            escala_id: newEscala.id,
            integrante_id: intId,
          }));
          const { error: membrosError } = await supabase.from("ministerio_escala_membros").insert(membrosData);
          if (membrosError) throw membrosError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministerio-escalas", ministryId] });
      toast.success(editingEscala ? "Escala atualizada!" : "Escala criada!");
      resetForm();
    },
    onError: () => toast.error("Erro ao salvar escala"),
  });

  // Mutation para deletar escala
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ministerio_escalas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministerio-escalas", ministryId] });
      toast.success("Escala removida!");
      setEscalaToDelete(null);
      setShowDeleteDialog(false);
    },
    onError: () => toast.error("Erro ao remover escala"),
  });

  // Mutation para deletar escala de serviço
  const deleteServicoMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("escala_servico_membros").delete().eq("escala_id", id);
      const { error } = await supabase.from("escalas_servico").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministerio-escalas-servico", ministryId] });
      toast.success("Escala de serviço removida!");
      setEscalaServicoToDelete(null);
      setShowDeleteServicoDialog(false);
    },
    onError: () => toast.error("Erro ao remover escala de serviço"),
  });

  // Mutation para editar status de escala de serviço
  const editServicoMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("escalas_servico").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministerio-escalas-servico", ministryId] });
      queryClient.invalidateQueries({ queryKey: ["escalas-servico", ministryId] });
      toast.success("Escala atualizada!");
      setEditServicoDialogId(null);
    },
    onError: () => toast.error("Erro ao atualizar escala"),
  });

  const resetForm = () => {
    setShowDialog(false);
    setEditingEscala(null);
    setDataCulto(undefined);
    setTipoCulto("domingo");
    setObservacoes("");
    setSelectedIntegrantes([]);
  };

  const handleEdit = (escala: Escala) => {
    setEditingEscala(escala);
    setDataCulto(parseLocalDate(escala.data_culto));
    setTipoCulto(escala.tipo_culto);
    setObservacoes(escala.observacoes || "");
    setSelectedIntegrantes(escala.membros.map((m) => m.integrante_id));
    setShowDialog(true);
  };

  const toggleIntegrante = (id: string) => {
    setSelectedIntegrantes((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-4">
      {/* Header com navegação de mês */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-medium min-w-32 text-center capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Button size="sm" onClick={() => setShowDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Escala
        </Button>
      </div>

      {integrantes.length === 0 && (
        <Card className="bg-muted/30">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Adicione integrantes na aba "Equipe" antes de criar escalas
            </p>
          </CardContent>
        </Card>
      )}

      {/* Lista de escalas */}
      {isLoading ? (
        <p className="text-center text-muted-foreground">Carregando...</p>
      ) : allDates.length === 0 && integrantes.length > 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Nenhuma escala neste mês</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {allDates.map((date) => {
            const dateEscalas = escalasByDate[date] || [];
            const dateServicoEscalas = escalasServicoByDate[date] || [];

            return (
              <Card key={date} className="bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    {format(parseLocalDate(date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Escalas de serviço aprovadas (candidaturas) */}
                  {dateServicoEscalas.map((escala) => (
                    <div key={`servico-${escala.id}`} className="bg-muted/30 rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-sm">
                            {TIPOS_CULTO_SERVICO[escala.tipo_culto] || escala.tipo_culto}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {format(parseLocalDate(date), "dd/MM/yyyy")}
                            {escala.casa_refugio && (
                              <span className="ml-2 inline-flex items-center gap-1">
                                <Home className="w-3 h-3" />
                                CR {escala.casa_refugio.name}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setEditServicoDialogId(escala.id);
                              setEditServicoStatus("aprovado");
                            }}
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setEscalaServicoToDelete(escala.id);
                              setShowDeleteServicoDialog(true);
                            }}
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      {escala.membros.length > 0 ? (
                        <div className="space-y-0.5">
                          {escala.membros.map((m, idx) => (
                            <p key={m.id} className="text-sm">
                              {idx + 1}. {m.member?.full_name}
                            </p>
                          ))}
                        </div>
                      ) : escala.tipo_escala === "individual" && escala.member ? (
                        <p className="text-sm">1. {escala.member.full_name}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhum membro escalado</p>
                      )}
                    </div>
                  ))}

                  {/* Escalas manuais do ministério */}
                  {dateEscalas.map((escala) => (
                    <div key={escala.id} className="bg-muted/30 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">
                          {TIPOS_CULTO.find((t) => t.value === escala.tipo_culto)?.label || escala.tipo_culto}
                        </Badge>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(escala)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => {
                              setEscalaToDelete(escala.id);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {escala.membros.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {escala.membros.map((m) => (
                            <div key={m.id} className="flex items-center gap-1 text-sm bg-background rounded px-2 py-1">
                              <Users className="w-3 h-3 text-muted-foreground" />
                              <span>{m.integrante?.member?.full_name}</span>
                              <Badge variant="secondary" className="text-xs ml-1">
                                {m.integrante?.funcao?.nome}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhum membro escalado</p>
                      )}

                      {escala.observacoes && (
                        <p className="text-xs text-muted-foreground mt-2 italic">{escala.observacoes}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog para criar/editar escala */}
      <Dialog open={showDialog} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEscala ? "Editar Escala" : "Nova Escala"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Data do Culto</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !dataCulto && "text-muted-foreground")}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {dataCulto ? format(dataCulto, "dd/MM/yyyy") : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent mode="single" selected={dataCulto} onSelect={setDataCulto} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Culto</Label>
              <Select value={tipoCulto} onValueChange={setTipoCulto}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_CULTO.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Membros Escalados</Label>
              {integrantes.length === 0 ? (
                <div className="border rounded-lg p-4 text-center bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    Nenhum integrante cadastrado neste ministério.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Adicione integrantes na aba "Equipe" primeiro.
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                  {integrantes.map((int) => (
                    <div key={int.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={int.id}
                        checked={selectedIntegrantes.includes(int.id)}
                        onCheckedChange={() => toggleIntegrante(int.id)}
                      />
                      <label htmlFor={int.id} className="text-sm flex-1 cursor-pointer">
                        {int.member?.full_name}
                        <Badge variant="outline" className="ml-2 text-xs">
                          {int.funcao?.nome}
                        </Badge>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações opcionais..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!dataCulto || saveMutation.isPending}>
              {editingEscala ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog Deletar Escala */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover escala?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => escalaToDelete && deleteMutation.mutate(escalaToDelete)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog excluir escala de serviço */}
      <AlertDialog open={showDeleteServicoDialog} onOpenChange={(o) => { if (!o) { setShowDeleteServicoDialog(false); setEscalaServicoToDelete(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quer mesmo excluir esse registro?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. A escala e membros vinculados serão removidos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => escalaServicoToDelete && deleteServicoMutation.mutate(escalaServicoToDelete)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog editar status de escala de serviço */}
      <AlertDialog open={!!editServicoDialogId} onOpenChange={(o) => !o && setEditServicoDialogId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Editar status da escala</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Altere o status desta escala:</p>
                <Select value={editServicoStatus} onValueChange={setEditServicoStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="rejeitado">Rejeitado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => editServicoDialogId && editServicoMutation.mutate({ id: editServicoDialogId, status: editServicoStatus })}
            >
              Salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
