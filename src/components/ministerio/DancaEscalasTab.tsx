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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Calendar, Users, UserPlus, Send } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DancaEscalasTabProps {
  ministryId: string;
}

interface DancaEquipe {
  id: string;
  nome: string;
  membros: {
    id: string;
    sub_time: string | null;
    member: {
      id: string;
      full_name: string;
    };
  }[];
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
  danca_equipe_id: string | null;
  danca_sub_time: string | null;
  danca_equipe?: {
    id: string;
    nome: string;
  } | null;
  membros: EscalaMembro[];
}

const TIPOS_CULTO = [
  { value: "domingo", label: "Domingo" },
  { value: "quarta", label: "Quarta-feira" },
  { value: "sabado", label: "Sábado" },
  { value: "especial", label: "Evento Especial" },
];

export const DancaEscalasTab = ({ ministryId }: DancaEscalasTabProps) => {
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAddExtraDialog, setShowAddExtraDialog] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [editingEscala, setEditingEscala] = useState<Escala | null>(null);
  const [escalaToDelete, setEscalaToDelete] = useState<string | null>(null);

  // Form state
  const [dataCulto, setDataCulto] = useState<Date | undefined>(undefined);
  const [tipoCulto, setTipoCulto] = useState("domingo");
  const [observacoes, setObservacoes] = useState("");
  const [selectedEquipeId, setSelectedEquipeId] = useState<string>("");
  const [selectedSubTime, setSelectedSubTime] = useState<string>("todos");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [extraMemberIds, setExtraMemberIds] = useState<string[]>([]);
  const [enviarNotificacao, setEnviarNotificacao] = useState(true);

  // Fetch equipes de dança
  const { data: equipes = [] } = useQuery({
    queryKey: ["danca-equipes", ministryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("danca_equipes")
        .select(`
          id,
          nome,
          membros:danca_equipe_membros(
            id,
            sub_time,
            member:members(id, full_name)
          )
        `)
        .eq("ministry_id", ministryId);
      if (error) throw error;
      return data as unknown as DancaEquipe[];
    },
  });

  // Fetch integrantes do ministério (para adicionar extras)
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

  // Fetch escalas do mês
  const { data: escalas = [], isLoading } = useQuery({
    queryKey: ["ministerio-escalas-danca", ministryId, format(currentMonth, "yyyy-MM")],
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
          danca_equipe_id,
          danca_sub_time,
          danca_equipe:danca_equipes(id, nome),
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

  // Todos os membros de todas as equipes de dança (para extras)
  const allDancaMembers = useMemo(() => {
    const membersMap = new Map<
      string,
      { memberId: string; memberName: string; equipeName: string; subTime: string | null }
    >();

    equipes.forEach((equipe) => {
      equipe.membros?.forEach((m) => {
        const key = `${m.member.id}-${equipe.nome}-${m.sub_time || ""}`;
        if (!membersMap.has(key)) {
          membersMap.set(key, {
            memberId: m.member.id,
            memberName: m.member.full_name,
            equipeName: equipe.nome,
            subTime: m.sub_time,
          });
        }
      });
    });

    return Array.from(membersMap.values());
  }, [equipes]);

  // Membros da equipe selecionada (filtrados por sub-time se aplicável)
  const equipeMembros = useMemo(() => {
    if (!selectedEquipeId) return [];
    const equipe = equipes.find((e) => e.id === selectedEquipeId);
    if (!equipe) return [];

    let membros = equipe.membros || [];
    
    if (selectedSubTime && selectedSubTime !== "todos") {
      membros = membros.filter((m) => m.sub_time === selectedSubTime);
    }

    return membros;
  }, [selectedEquipeId, selectedSubTime, equipes]);

  const selectedMemberIdSet = useMemo(() => new Set(selectedMemberIds), [selectedMemberIds]);
  const extraMemberIdSet = useMemo(() => new Set(extraMemberIds), [extraMemberIds]);
  const currentEquipeMemberIdSet = useMemo(
    () => new Set(equipeMembros.map((em) => em.member.id)),
    [equipeMembros],
  );

  // Membros disponíveis para adicionar como extras (apenas de outras equipes)
  const availableExtras = useMemo(() => {
    return allDancaMembers.filter((m) => {
      // Não permitir membros da equipe atual como extras
      if (currentEquipeMemberIdSet.has(m.memberId)) return false;
      // Já está selecionado como membro escalado
      if (selectedMemberIdSet.has(m.memberId)) return false;
      // Já foi adicionado como extra
      if (extraMemberIdSet.has(m.memberId)) return false;
      return true;
    });
  }, [allDancaMembers, currentEquipeMemberIdSet, selectedMemberIdSet, extraMemberIdSet]);

  // Verificar se a equipe selecionada é "Jovens/Adultos" (tem sub-times)
  const selectedEquipe = equipes.find((e) => e.id === selectedEquipeId);
  const hasSubTimes = selectedEquipe?.nome === "Jovens/Adultos";

  // Sub-times disponíveis
  const availableSubTimes = useMemo(() => {
    if (!hasSubTimes || !selectedEquipe) return [];
    const subTimes = new Set<string>();
    selectedEquipe.membros?.forEach((m) => {
      if (m.sub_time) subTimes.add(m.sub_time);
    });
    return Array.from(subTimes).sort();
  }, [hasSubTimes, selectedEquipe]);

  // Agrupar escalas por data
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

  // Selecionar todos os membros da equipe
  const selectAllEquipeMembros = () => {
    setSelectedMemberIds(equipeMembros.map((em) => em.member.id));
  };

  // Mutation para enviar notificação WhatsApp
  const notifyMutation = useMutation({
    mutationFn: async (params: {
      dataCulto: string;
      tipoCulto: string;
      equipeNome: string;
      subTime: string;
      membrosIds: string[];
    }) => {
      const { data, error } = await supabase.functions.invoke("enviar-whatsapp", {
        body: {
          action: "notificar_escala_danca",
          ...params,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Notificações enviadas para ${data.enviados} pessoas`);
    },
    onError: () => {
      toast.error("Erro ao enviar notificações");
    },
  });

  // Mutation para salvar escala
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!dataCulto) throw new Error("Data é obrigatória");

      const uniqueMemberIds = Array.from(new Set([...selectedMemberIds, ...extraMemberIds]));
      const equipeNome = equipes.find((e) => e.id === selectedEquipeId)?.nome || "";

      const escalaData = {
        ministry_id: ministryId,
        data_culto: format(dataCulto, "yyyy-MM-dd"),
        tipo_culto: tipoCulto,
        observacoes: observacoes || null,
        danca_equipe_id: selectedEquipeId || null,
        danca_sub_time: selectedSubTime !== "todos" ? selectedSubTime : null,
      };

      let escalaId: string;

      if (editingEscala) {
        const { error: updateError } = await supabase
          .from("ministerio_escalas")
          .update(escalaData)
          .eq("id", editingEscala.id);
        if (updateError) throw updateError;

        await supabase.from("ministerio_escala_membros").delete().eq("escala_id", editingEscala.id);
        escalaId = editingEscala.id;

        if (uniqueMemberIds.length > 0) {
          const integranteIds = (
            await Promise.all(uniqueMemberIds.map((memberId) => getOrCreateIntegrante(memberId)))
          ).filter(Boolean) as string[];

          const membrosData = integranteIds.map((intId) => ({
            escala_id: editingEscala.id,
            integrante_id: intId,
          }));
          const { error: membrosError } = await supabase.from("ministerio_escala_membros").insert(membrosData);
          if (membrosError) throw membrosError;

          // Enviar notificação se ativado e não estiver editando
          if (enviarNotificacao && !editingEscala && integranteIds.length > 0) {
            await notifyMutation.mutateAsync({
              dataCulto: format(dataCulto, "yyyy-MM-dd"),
              tipoCulto,
              equipeNome,
              subTime: selectedSubTime,
              membrosIds: integranteIds,
            });
          }
        }
      } else {
        const { data: newEscala, error: insertError } = await supabase
          .from("ministerio_escalas")
          .insert(escalaData)
          .select("id")
          .single();
        if (insertError) throw insertError;
        escalaId = newEscala.id;

        if (uniqueMemberIds.length > 0) {
          const integranteIds = (
            await Promise.all(uniqueMemberIds.map((memberId) => getOrCreateIntegrante(memberId)))
          ).filter(Boolean) as string[];

          const membrosData = integranteIds.map((intId) => ({
            escala_id: newEscala.id,
            integrante_id: intId,
          }));
          const { error: membrosError } = await supabase.from("ministerio_escala_membros").insert(membrosData);
          if (membrosError) throw membrosError;

          // Enviar notificação se ativado e não estiver editando
          if (enviarNotificacao && !editingEscala && integranteIds.length > 0) {
            await notifyMutation.mutateAsync({
              dataCulto: format(dataCulto, "yyyy-MM-dd"),
              tipoCulto,
              equipeNome,
              subTime: selectedSubTime,
              membrosIds: integranteIds,
            });
          }
        }
      }

      return escalaId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministerio-escalas-danca", ministryId] });
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
      queryClient.invalidateQueries({ queryKey: ["ministerio-escalas-danca", ministryId] });
      toast.success("Escala removida!");
      setEscalaToDelete(null);
      setShowDeleteDialog(false);
    },
    onError: () => toast.error("Erro ao remover escala"),
  });

  const resetForm = () => {
    setShowDialog(false);
    setEditingEscala(null);
    setDataCulto(undefined);
    setTipoCulto("domingo");
    setObservacoes("");
    setSelectedEquipeId("");
    setSelectedSubTime("todos");
    setSelectedMemberIds([]);
    setExtraMemberIds([]);
    setEnviarNotificacao(true);
  };

  const handleEdit = (escala: Escala) => {
    setEditingEscala(escala);
    setDataCulto(parseISO(escala.data_culto));
    setTipoCulto(escala.tipo_culto);
    setObservacoes(escala.observacoes || "");
    setSelectedEquipeId(escala.danca_equipe_id || "");
    setSelectedSubTime(escala.danca_sub_time || "todos");
    setSelectedMemberIds(escala.membros.map((m) => m.integrante.member.id));
    setExtraMemberIds([]);
    setEnviarNotificacao(false);
    setShowDialog(true);
  };

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId],
    );
  };

  // Garante que existe um integrante para o memberId (necessário para salvar em ministerio_escala_membros)
  const getOrCreateIntegrante = async (memberId: string): Promise<string | null> => {
    const existingIntegrante = integrantes.find((i) => i.member.id === memberId);
    if (existingIntegrante) return existingIntegrante.id;

    // Garantir ao menos 1 função cadastrada no ministério
    const { data: funcoes, error: funcoesError } = await supabase
      .from("ministerio_funcoes")
      .select("id")
      .eq("ministry_id", ministryId)
      .limit(1);
    if (funcoesError) throw funcoesError;

    let funcaoId = funcoes?.[0]?.id ?? null;
    if (!funcaoId) {
      const { data: novaFuncao, error: funcaoError } = await supabase
        .from("ministerio_funcoes")
        .insert({ ministry_id: ministryId, nome: "Dançarino(a)" })
        .select("id")
        .single();
      if (funcaoError) throw funcaoError;
      funcaoId = novaFuncao.id;
    }

    const { data: novoIntegrante, error: integranteError } = await supabase
      .from("ministerio_integrantes")
      .insert({ ministry_id: ministryId, member_id: memberId, funcao_id: funcaoId, ativo: true })
      .select("id")
      .single();
    if (integranteError) throw integranteError;

    // Atualizar cache de integrantes
    queryClient.invalidateQueries({ queryKey: ["ministerio-integrantes", ministryId] });

    return novoIntegrante.id;
  };

  const addExtraMember = (memberId: string) => {
    setExtraMemberIds((prev) => (prev.includes(memberId) ? prev : [...prev, memberId]));
    setShowAddExtraDialog(false);
  };

  const removeExtraMember = (memberId: string) => {
    setExtraMemberIds((prev) => prev.filter((id) => id !== memberId));
  };

  // Formatar nome da equipe para exibição
  const formatEquipeNome = (escala: Escala) => {
    if (!escala.danca_equipe) return null;
    const nome = escala.danca_equipe.nome;
    if (escala.danca_sub_time) {
      return `${nome} - ${escala.danca_sub_time}`;
    }
    return nome;
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

      {equipes.length === 0 && (
        <Card className="bg-muted/30">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Adicione equipes na aba "Equipes" antes de criar escalas
            </p>
          </CardContent>
        </Card>
      )}

      {/* Lista de escalas */}
      {isLoading ? (
        <p className="text-center text-muted-foreground">Carregando...</p>
      ) : Object.keys(escalasByDate).length === 0 && equipes.length > 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Nenhuma escala neste mês</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(escalasByDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, dateEscalas]) => (
              <Card key={date} className="bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    {format(parseISO(date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dateEscalas.map((escala) => {
                    const equipeNome = formatEquipeNome(escala);
                    return (
                      <div key={escala.id} className="bg-muted/30 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline">
                              {TIPOS_CULTO.find((t) => t.value === escala.tipo_culto)?.label || escala.tipo_culto}
                            </Badge>
                            {equipeNome && (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {equipeNome}
                              </Badge>
                            )}
                          </div>
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
                    );
                  })}
                </CardContent>
              </Card>
            ))}
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
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
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
                  <CalendarComponent 
                    mode="single" 
                    selected={dataCulto} 
                    onSelect={(date) => {
                      setDataCulto(date);
                      setCalendarOpen(false);
                    }} 
                    initialFocus 
                    className="pointer-events-auto"
                  />
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
              <Label>Equipe</Label>
              <Select 
                value={selectedEquipeId} 
                onValueChange={(value) => {
                  setSelectedEquipeId(value);
                  setSelectedSubTime("todos");
                  setSelectedMemberIds([]);
                  setExtraMemberIds([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma equipe" />
                </SelectTrigger>
                <SelectContent>
                  {equipes.map((equipe) => (
                    <SelectItem key={equipe.id} value={equipe.id}>
                      {equipe.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Seleção de sub-time (apenas para Jovens/Adultos) */}
            {hasSubTimes && availableSubTimes.length > 0 && (
              <div className="space-y-2">
                <Label>Sub-Time</Label>
                <Select value={selectedSubTime} onValueChange={setSelectedSubTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os sub-times</SelectItem>
                    {availableSubTimes.map((subTime) => (
                      <SelectItem key={subTime} value={subTime}>
                        {subTime}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Membros Escalados</Label>
              {!selectedEquipeId ? (
                <div className="border rounded-lg p-4 text-center bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    Selecione uma equipe para ver os membros
                  </p>
                </div>
              ) : equipeMembros.length === 0 ? (
                <div className="border rounded-lg p-4 text-center bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    Nenhum membro nesta equipe{hasSubTimes && selectedSubTime !== "todos" ? ` (${selectedSubTime})` : ""}
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-1">
                  {equipeMembros.map((em) => (
                    <div key={em.id} className="flex items-center gap-2 py-1">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm">{em.member.full_name}</span>
                      {em.sub_time && (
                        <Badge variant="outline" className="text-xs">
                          {em.sub_time}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Membros extras adicionados */}
            {extraMemberIds.length > 0 && (
              <div className="space-y-2">
                <Label>Membros Extras</Label>
                <div className="border rounded-lg p-3 space-y-2">
                  {extraMemberIds.map((memberId) => {
                    const memberName =
                      allDancaMembers.find((m) => m.memberId === memberId)?.memberName || "Membro";
                    return (
                      <div key={memberId} className="flex items-center justify-between">
                        <span className="text-sm">{memberName}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => removeExtraMember(memberId)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Botão para adicionar pessoas extras */}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowAddExtraDialog(true)}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Incluir pessoa extra
            </Button>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações opcionais..."
                rows={2}
              />
            </div>

            {/* Opção de enviar notificação (apenas para nova escala) */}
            {!editingEscala && (
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Enviar notificação WhatsApp</span>
                </div>
                <Switch
                  checked={enviarNotificacao}
                  onCheckedChange={setEnviarNotificacao}
                />
              </div>
            )}
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

      {/* Dialog para adicionar pessoa extra */}
      <Dialog open={showAddExtraDialog} onOpenChange={setShowAddExtraDialog}>
        <DialogContent className="max-w-md max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Incluir Pessoa Extra</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Selecione um membro de outra equipe</Label>
            <div className="border rounded-lg p-3 max-h-64 overflow-y-auto space-y-2">
              {availableExtras.map((member, idx) => (
                  <Button
                    key={`${member.memberId}-${member.equipeName}-${member.subTime || ''}-${idx}`}
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => addExtraMember(member.memberId)}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    {member.memberName}
                    <Badge variant="outline" className="ml-2 text-xs">
                      {member.equipeName}{member.subTime ? ` - ${member.subTime}` : ''}
                    </Badge>
                  </Button>
                ))}
              {availableExtras.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Todos os membros das equipes já foram selecionados
                </p>
              )}
            </div>
          </div>
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
    </div>
  );
};
