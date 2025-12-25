import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  CalendarIcon, 
  Plus, 
  Save, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Trash2,
  Edit,
  Calendar as CalendarDays
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TurmaConfig {
  id: string;
  turma: string;
  nome_exibicao: string;
  cor_hex: string;
  idade_minima: number;
  idade_maxima: number;
}

interface KidsEscalasTabProps {
  turmasConfig: TurmaConfig[];
}

interface Lider {
  id: string;
  member_id: string;
  funcao: string;
  turma: string;
  member: {
    id: string;
    full_name: string;
    photo_url: string | null;
  };
}

interface Escala {
  id: string;
  data_culto: string;
  tipo_culto: string;
  turma: string;
  lider_id: string | null;
  observacoes: string | null;
  lider?: {
    id: string;
    full_name: string;
  };
  ajudantes?: Array<{
    id: string;
    ajudante_id: string;
    ajudante: {
      id: string;
      full_name: string;
    };
  }>;
}

export const KidsEscalasTab = ({ turmasConfig }: KidsEscalasTabProps) => {
  const queryClient = useQueryClient();
  const [mesAtual, setMesAtual] = useState(new Date());
  const [turmaFiltro, setTurmaFiltro] = useState<string>("todas");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEscala, setEditingEscala] = useState<Escala | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    data_culto: new Date(),
    tipo_culto: "domingo",
    turma: turmasConfig[0]?.turma || "",
    lider_id: "",
    ajudantes_ids: [] as string[],
    observacoes: "",
  });

  const inicioMes = startOfMonth(mesAtual);
  const fimMes = endOfMonth(mesAtual);

  // Buscar líderes do kids
  const { data: lideres } = useQuery({
    queryKey: ["kids-lideres-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kids_lideres")
        .select(`
          id,
          member_id,
          funcao,
          turma,
          member:members!kids_lideres_member_id_fkey(
            id,
            full_name,
            photo_url
          )
        `)
        .eq("ativo", true);

      if (error) throw error;
      return data as unknown as Lider[];
    },
  });

  // Buscar escalas do mês
  const { data: escalas, isLoading } = useQuery({
    queryKey: ["kids-escalas", format(mesAtual, "yyyy-MM")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kids_escalas")
        .select(`
          id,
          data_culto,
          tipo_culto,
          turma,
          lider_id,
          observacoes,
          lider:members!kids_escalas_lider_id_fkey(
            id,
            full_name
          )
        `)
        .gte("data_culto", format(inicioMes, "yyyy-MM-dd"))
        .lte("data_culto", format(fimMes, "yyyy-MM-dd"))
        .order("data_culto", { ascending: true });

      if (error) throw error;

      // Buscar ajudantes para cada escala
      const escalasComAjudantes = await Promise.all(
        (data || []).map(async (escala) => {
          const { data: ajudantesData } = await supabase
            .from("kids_escalas_ajudantes")
            .select(`
              id,
              ajudante_id,
              ajudante:members!kids_escalas_ajudantes_ajudante_id_fkey(
                id,
                full_name
              )
            `)
            .eq("escala_id", escala.id);

          return {
            ...escala,
            ajudantes: ajudantesData || [],
          };
        })
      );

      return escalasComAjudantes as Escala[];
    },
  });

  // Filtrar escalas por turma
  const escalasFiltradas = useMemo(() => {
    if (!escalas) return [];
    if (turmaFiltro === "todas") return escalas;
    return escalas.filter((e) => e.turma === turmaFiltro);
  }, [escalas, turmaFiltro]);

  // Agrupar por data
  const escalasAgrupadas = useMemo(() => {
    const grupos: Record<string, Escala[]> = {};
    escalasFiltradas.forEach((escala) => {
      if (!grupos[escala.data_culto]) {
        grupos[escala.data_culto] = [];
      }
      grupos[escala.data_culto].push(escala);
    });
    return grupos;
  }, [escalasFiltradas]);

  // Líderes disponíveis para a turma selecionada
  const lideresDisponiveis = useMemo(() => {
    if (!lideres) return [];
    return lideres.filter((l) => l.turma === formData.turma);
  }, [lideres, formData.turma]);

  // Mutation para salvar escala
  const saveEscala = useMutation({
    mutationFn: async () => {
      const escalaData = {
        data_culto: format(formData.data_culto, "yyyy-MM-dd"),
        tipo_culto: formData.tipo_culto,
        turma: formData.turma as "laranja" | "amarelo" | "verde" | "azul",
        lider_id: formData.lider_id || null,
        observacoes: formData.observacoes || null,
      };

      let escalaId: string;

      if (editingEscala) {
        // Update
        const { error } = await supabase
          .from("kids_escalas")
          .update(escalaData)
          .eq("id", editingEscala.id);
        if (error) throw error;
        escalaId = editingEscala.id;

        // Deletar ajudantes antigos
        await supabase
          .from("kids_escalas_ajudantes")
          .delete()
          .eq("escala_id", escalaId);
      } else {
        // Insert
        const { data, error } = await supabase
          .from("kids_escalas")
          .insert(escalaData)
          .select("id")
          .single();
        if (error) throw error;
        escalaId = data.id;
      }

      // Inserir ajudantes
      if (formData.ajudantes_ids.length > 0) {
        const ajudantesInsert = formData.ajudantes_ids.map((ajudanteId) => ({
          escala_id: escalaId,
          ajudante_id: ajudanteId,
        }));
        const { error } = await supabase
          .from("kids_escalas_ajudantes")
          .insert(ajudantesInsert);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingEscala ? "Escala atualizada!" : "Escala criada!");
      queryClient.invalidateQueries({ queryKey: ["kids-escalas"] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Mutation para deletar escala
  const deleteEscala = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("kids_escalas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Escala removida!");
      queryClient.invalidateQueries({ queryKey: ["kids-escalas"] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      data_culto: new Date(),
      tipo_culto: "domingo",
      turma: turmasConfig[0]?.turma || "",
      lider_id: "",
      ajudantes_ids: [],
      observacoes: "",
    });
    setEditingEscala(null);
  };

  const openEditDialog = (escala: Escala) => {
    setEditingEscala(escala);
    setFormData({
      data_culto: parseISO(escala.data_culto),
      tipo_culto: escala.tipo_culto,
      turma: escala.turma,
      lider_id: escala.lider_id || "",
      ajudantes_ids: escala.ajudantes?.map((a) => a.ajudante_id) || [],
      observacoes: escala.observacoes || "",
    });
    setDialogOpen(true);
  };

  const getTurmaConfig = (turma: string) => {
    return turmasConfig.find((t) => t.turma === turma);
  };

  const toggleAjudante = (memberId: string) => {
    setFormData((prev) => ({
      ...prev,
      ajudantes_ids: prev.ajudantes_ids.includes(memberId)
        ? prev.ajudantes_ids.filter((id) => id !== memberId)
        : [...prev.ajudantes_ids, memberId],
    }));
  };

  return (
    <div className="space-y-4">
      {/* Filtros e ações */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Escalas do Ministério Kids
            </CardTitle>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Escala
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingEscala ? "Editar Escala" : "Nova Escala"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label>Data do Culto</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "justify-start text-left font-normal",
                              !formData.data_culto && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(formData.data_culto, "dd/MM/yyyy")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.data_culto}
                            onSelect={(date) =>
                              date && setFormData((prev) => ({ ...prev, data_culto: date }))
                            }
                            locale={ptBR}
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label>Tipo de Culto</Label>
                      <Select
                        value={formData.tipo_culto}
                        onValueChange={(v) => setFormData((prev) => ({ ...prev, tipo_culto: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="domingo">Domingo</SelectItem>
                          <SelectItem value="quarta">Quarta</SelectItem>
                          <SelectItem value="especial">Especial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label>Turma</Label>
                    <Select
                      value={formData.turma}
                      onValueChange={(v) =>
                        setFormData((prev) => ({
                          ...prev,
                          turma: v,
                          lider_id: "",
                          ajudantes_ids: [],
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {turmasConfig.map((t) => (
                          <SelectItem key={t.turma} value={t.turma}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: t.cor_hex }}
                              />
                              {t.nome_exibicao}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label>Líder da Turma</Label>
                    <Select
                      value={formData.lider_id}
                      onValueChange={(v) => setFormData((prev) => ({ ...prev, lider_id: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o líder..." />
                      </SelectTrigger>
                      <SelectContent>
                        {lideresDisponiveis
                          .filter((l) => l.funcao === "professor")
                          .map((l) => (
                            <SelectItem key={l.member_id} value={l.member_id}>
                              {l.member?.full_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label>Ajudantes</Label>
                    <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                      {lideresDisponiveis
                        .filter((l) => l.funcao === "ajudante")
                        .map((l) => (
                          <div key={l.member_id} className="flex items-center gap-2">
                            <Checkbox
                              id={l.member_id}
                              checked={formData.ajudantes_ids.includes(l.member_id)}
                              onCheckedChange={() => toggleAjudante(l.member_id)}
                            />
                            <label htmlFor={l.member_id} className="text-sm cursor-pointer">
                              {l.member?.full_name}
                            </label>
                          </div>
                        ))}
                      {lideresDisponiveis.filter((l) => l.funcao === "ajudante").length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          Nenhum ajudante cadastrado para esta turma
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label>Observações</Label>
                    <Textarea
                      value={formData.observacoes}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, observacoes: e.target.value }))
                      }
                      placeholder="Observações sobre a escala..."
                      rows={2}
                    />
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => saveEscala.mutate()}
                    disabled={saveEscala.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveEscala.isPending ? "Salvando..." : "Salvar Escala"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            {/* Navegação do mês */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMesAtual(subMonths(mesAtual, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium min-w-[140px] text-center">
                {format(mesAtual, "MMMM yyyy", { locale: ptBR })}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMesAtual(addMonths(mesAtual, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Filtro de turma */}
            <Select value={turmaFiltro} onValueChange={setTurmaFiltro}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as turmas</SelectItem>
                {turmasConfig.map((t) => (
                  <SelectItem key={t.turma} value={t.turma}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: t.cor_hex }}
                      />
                      {t.nome_exibicao}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard de estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {turmasConfig.map((turma) => {
          const escalasTurma = escalas?.filter((e) => e.turma === turma.turma) || [];
          return (
            <Card key={turma.turma} style={{ borderTopColor: turma.cor_hex, borderTopWidth: 4 }}>
              <CardContent className="pt-4 text-center">
                <p className="text-3xl font-bold" style={{ color: turma.cor_hex }}>
                  {escalasTurma.length}
                </p>
                <p className="text-sm text-muted-foreground">
                  {turma.nome_exibicao}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Lista de escalas */}
      {Object.keys(escalasAgrupadas).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nenhuma escala cadastrada para este mês
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(escalasAgrupadas)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([data, escalasData]) => (
            <Card key={data}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(parseISO(data), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  <Badge variant="outline" className="ml-2">
                    {escalasData[0].tipo_culto}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Turma</TableHead>
                        <TableHead>Líder</TableHead>
                        <TableHead>Ajudantes</TableHead>
                        <TableHead>Observações</TableHead>
                        <TableHead className="w-24">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {escalasData.map((escala) => {
                        const turmaConfig = getTurmaConfig(escala.turma);
                        return (
                          <TableRow key={escala.id}>
                            <TableCell>
                              <Badge
                                style={{
                                  backgroundColor: turmaConfig?.cor_hex,
                                  color: "white",
                                }}
                              >
                                {turmaConfig?.nome_exibicao}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {escala.lider?.full_name || "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {escala.ajudantes?.map((a) => (
                                  <Badge key={a.id} variant="secondary" className="text-xs">
                                    {a.ajudante?.full_name}
                                  </Badge>
                                ))}
                                {(!escala.ajudantes || escala.ajudantes.length === 0) && (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {escala.observacoes || "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditDialog(escala)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => deleteEscala.mutate(escala.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))
      )}
    </div>
  );
};
