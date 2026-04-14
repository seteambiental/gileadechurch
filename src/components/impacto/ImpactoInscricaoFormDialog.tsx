import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/masks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2 } from "lucide-react";
import { formatNameField } from "@/lib/text-utils";

const TIPOS_INSCRICAO_LABELS: Record<string, string> = {
  membro: "Membro",
  nao_membro: "Não membro",
  familia: "Líderes e Anfitriões",
  equipe: "Equipe (apoio/serviço)",
};

const TIPOS_INSCRICAO_PADRAO = ["membro", "nao_membro", "familia", "equipe"] as const;

const FORMAS_PAGAMENTO = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "cartao_debito", label: "Cartão de Débito" },
  { value: "transferencia", label: "Transferência" },
  { value: "boleto", label: "Boleto" },
  { value: "vale", label: "Vale" },
];

interface Pagamento {
  tipo: string;
  valor: string;
}

interface PrevisaoPagamento {
  data: string;
  valor: string;
}

interface ImpactoInscricaoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventoId: string;
  inscricao?: any;
}

const ImpactoInscricaoFormDialog = ({ open, onOpenChange, eventoId, inscricao }: ImpactoInscricaoFormDialogProps) => {
  const queryClient = useQueryClient();
  const isEditing = !!inscricao;

  const [isManual, setIsManual] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [genero, setGenero] = useState("");
  const [telefoneEmergencia, setTelefoneEmergencia] = useState("");
  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [telefoneResponsavel, setTelefoneResponsavel] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [statusPagamento, setStatusPagamento] = useState("pendente");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [valorPago, setValorPago] = useState("0");
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [usarMisto, setUsarMisto] = useState(false);
  const [tipoInscricao, setTipoInscricao] = useState("membro");
  const [valorInscricao, setValorInscricao] = useState("");
  const [previsoes, setPrevisoes] = useState<PrevisaoPagamento[]>([]);

  const { data: evento } = useQuery({
    queryKey: ["impacto-evento", eventoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impacto_eventos")
        .select("tipos_inscricao, tem_custo, valor_inscricao, valores_por_tipo")
        .eq("id", eventoId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!eventoId,
  });

  const tiposPermitidos = Array.from(new Set([...(evento?.tipos_inscricao || []), ...TIPOS_INSCRICAO_PADRAO]));

  const { data: members } = useQuery({
    queryKey: ["members-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, whatsapp, email, genero, casa_refugio_id")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: casasRefugio = [] } = useQuery({
    queryKey: ["casas-refugio-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casas_refugio")
        .select("id, name");
      if (error) throw error;
      return data;
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (open && inscricao) {
      setIsManual(!inscricao.member_id);
      setMemberId(inscricao.member_id || "");
      // For member-based inscriptions, pull full data from the member's profile
      const memberData = inscricao.member_id ? members?.find((m) => m.id === inscricao.member_id) : null;
      setNome(inscricao.nome || memberData?.full_name || "");
      setTelefone(inscricao.telefone || memberData?.whatsapp || "");
      setEmail(inscricao.email || memberData?.email || "");
      setGenero(inscricao.genero || memberData?.genero || "");
      setTelefoneEmergencia(inscricao.telefone_emergencia || "");
      setObservacoes(inscricao.observacoes || "");
      const editTipo = inscricao.tipo_inscricao || "membro";
      setTipoInscricao(editTipo);
      setStatusPagamento(inscricao.status_pagamento || "pendente");
      setFormaPagamento(inscricao.forma_pagamento || "");
      setValorPago(inscricao.valor_pago?.toString() || "0");
      // Use inscription value, or fall back to event config for the type
      let editValor = inscricao.valor_inscricao?.toString() || "";
      if ((!editValor || editValor === "0") && evento?.tem_custo) {
        const vpt = evento?.valores_por_tipo as Record<string, string> | null;
        const hasVpt = vpt && Object.keys(vpt).length > 0;
        const valorTipo = hasVpt ? vpt[editTipo] : null;
        const valorBase = evento?.valor_inscricao;
        const valorFinal = valorTipo ? parseFloat(valorTipo) : (valorBase || null);
        editValor = valorFinal && valorFinal > 0 ? valorFinal.toString() : "";
      }
      setValorInscricao(editValor);
      const existingPagamentos = inscricao.pagamentos as Pagamento[] | null;
      if (existingPagamentos && existingPagamentos.length > 0) {
        setPagamentos(existingPagamentos.map((p: any) => ({ tipo: p.tipo, valor: p.valor?.toString() || "" })));
        setUsarMisto(true);
      } else {
        setPagamentos([]);
        setUsarMisto(false);
      }
      const existingPrevisoes = inscricao.previsoes_pagamento as PrevisaoPagamento[] | null;
      if (existingPrevisoes && existingPrevisoes.length > 0) {
        setPrevisoes(existingPrevisoes.map((p: any) => ({ data: p.data || "", valor: p.valor?.toString() || "" })));
      } else {
        setPrevisoes([]);
      }
    } else if (open && !inscricao) {
      setIsManual(false);
      setMemberId("");
      setNome("");
      setTelefone("");
      setEmail("");
      setGenero("");
      setTelefoneEmergencia("");
      setObservacoes("");
      const defaultTipo = tiposPermitidos[0] || "membro";
      setTipoInscricao(defaultTipo);
      setStatusPagamento("pendente");
      setFormaPagamento("");
      setValorPago("0");
      setPagamentos([]);
      setUsarMisto(false);
      setPrevisoes([]);
      // Auto-fill valor based on event config for default type
      if (evento?.tem_custo) {
        const vpt = evento?.valores_por_tipo as Record<string, string> | null;
        const hasVpt = vpt && Object.keys(vpt).length > 0;
        const valorTipo = hasVpt ? vpt[defaultTipo] : null;
        const valorBase = evento?.valor_inscricao;
        const valorFinal = valorTipo ? parseFloat(valorTipo) : (valorBase || null);
        setValorInscricao(valorFinal && valorFinal > 0 ? valorFinal.toString() : "");
      } else {
        setValorInscricao("");
      }
    }
  }, [open, inscricao, evento, members]);

  const selectedMember = members?.find((m) => m.id === memberId);
  const casaRefugio = selectedMember?.casa_refugio_id
    ? casasRefugio.find((c) => c.id === selectedMember.casa_refugio_id)
    : null;

  const addPagamento = () => {
    setPagamentos([...pagamentos, { tipo: "", valor: "" }]);
  };

  const removePagamento = (index: number) => {
    setPagamentos(pagamentos.filter((_, i) => i !== index));
  };

  const updatePagamento = (index: number, field: keyof Pagamento, value: string) => {
    const updated = [...pagamentos];
    updated[index] = { ...updated[index], [field]: value };
    setPagamentos(updated);
  };

  const totalPagamentos = pagamentos.reduce((sum, p) => sum + (parseFloat(p.valor) || 0), 0);

  // Auto-update payment status based on amounts
  const autoUpdateStatus = (totalPaid: number) => {
    const inscricaoVal = parseFloat(valorInscricao) || 0;
    if (inscricaoVal <= 0) return;
    if (totalPaid >= inscricaoVal) {
      setStatusPagamento("pago");
    } else if (totalPaid > 0) {
      setStatusPagamento("parcial");
    } else {
      setStatusPagamento("pendente");
    }
  };

  // Watch valorPago changes (non-misto)
  useEffect(() => {
    if (!usarMisto && parseFloat(valorInscricao) > 0) {
      autoUpdateStatus(parseFloat(valorPago) || 0);
    }
  }, [valorPago, valorInscricao, usarMisto]);

  // Watch pagamentos changes (misto)
  useEffect(() => {
    if (usarMisto && parseFloat(valorInscricao) > 0) {
      autoUpdateStatus(totalPagamentos);
    }
  }, [totalPagamentos, valorInscricao, usarMisto]);

  const mutation = useMutation({
    mutationFn: async () => {
      let finalNome = nome;
      let finalTelefone = telefone;
      let finalEmail = email;
      let finalGenero = genero;

      if (!isManual && memberId) {
        const member = members?.find((m) => m.id === memberId);
        if (member) {
          finalNome = member.full_name;
          finalTelefone = finalTelefone || member.whatsapp || "";
          finalEmail = finalEmail || member.email || "";
          finalGenero = finalGenero || member.genero || "";
        }
      } else if (isManual && finalNome) {
        finalNome = formatNameField(finalNome);
      }

      if (!finalNome) throw new Error("Nome é obrigatório");

      // Build pagamentos JSON
      const pagamentosJson = usarMisto
        ? pagamentos.filter((p) => p.tipo && p.valor).map((p) => ({ tipo: p.tipo, valor: parseFloat(p.valor) || 0 }))
        : [];

      const totalPago = usarMisto
        ? pagamentosJson.reduce((s, p) => s + p.valor, 0)
        : parseFloat(valorPago) || 0;

      const payload = {
        evento_id: eventoId,
        member_id: isManual ? null : memberId || null,
        nome: finalNome,
        telefone: finalTelefone || null,
        email: finalEmail || null,
        genero: finalGenero || null,
        observacoes: observacoes || null,
        telefone_emergencia: telefoneEmergencia || null,
        tipo_inscricao: tipoInscricao || "membro",
        valor_inscricao: parseFloat(valorInscricao) || null,
        status_pagamento: statusPagamento,
        forma_pagamento: usarMisto ? "misto" : (formaPagamento || null),
        valor_pago: totalPago || null,
        pagamentos: pagamentosJson.length > 0 ? pagamentosJson : null,
        previsoes_pagamento: previsoes.filter((p) => p.data && p.valor).length > 0
          ? previsoes.filter((p) => p.data && p.valor).map((p) => ({ data: p.data, valor: parseFloat(p.valor) || 0 }))
          : null,
      };

      if (isEditing) {
        const isAgendaSource = inscricao?.source === "agenda_inscricao";

        if (isAgendaSource) {
          // This inscricao exists only in inscricoes_eventos (public link).
          // We upsert it into impacto_inscricoes so payment data is persisted properly.
          const { data: existing } = await supabase
            .from("impacto_inscricoes")
            .select("id")
            .eq("evento_id", eventoId)
            .eq("nome", finalNome)
            .maybeSingle();

          if (existing) {
            const { error } = await supabase
              .from("impacto_inscricoes")
              .update(payload)
              .eq("id", existing.id);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from("impacto_inscricoes")
              .insert({ ...payload, member_id: inscricao.member_id || null, aprovado: true });
            if (error) throw error;
          }

          // Also update the inscricoes_eventos record so data stays in sync
          const agendaUpdate: Record<string, any> = {
            tipo_inscricao: payload.tipo_inscricao,
            status_pagamento: payload.status_pagamento,
            nome_participante: payload.nome,
          };
          if (payload.telefone) agendaUpdate.telefone_contato = payload.telefone;
          if (payload.genero) agendaUpdate.genero = payload.genero;
          
          await supabase
            .from("inscricoes_eventos")
            .update(agendaUpdate)
            .eq("id", inscricao.id);
        } else {
          const { error } = await supabase
            .from("impacto_inscricoes")
            .update(payload)
            .eq("id", inscricao.id);
          if (error) throw error;
        }
      } else {
        // Check for duplicate before inserting
        let duplicateQuery = supabase
          .from("impacto_inscricoes")
          .select("id, nome")
          .eq("evento_id", eventoId);

        if (!isManual && memberId) {
          // Check by member_id
          const { data: existingMember } = await duplicateQuery.eq("member_id", memberId).maybeSingle();
          if (existingMember) {
            throw new Error(`${existingMember.nome} já está inscrito neste evento`);
          }
          // Also check in inscricoes_eventos (public link)
          const { data: existingPublic } = await supabase
            .from("inscricoes_eventos")
            .select("id")
            .eq("evento_id", eventoId)
            .eq("member_id", memberId)
            .maybeSingle();
          if (existingPublic) {
            const member = members?.find((m) => m.id === memberId);
            throw new Error(`${member?.full_name || "Este membro"} já está inscrito neste evento`);
          }
        } else if (isManual && finalNome) {
          // Check by normalized name in impacto_inscricoes
          const { data: allInscricoes } = await supabase
            .from("impacto_inscricoes")
            .select("id, nome")
            .eq("evento_id", eventoId);
          const normalizedNew = finalNome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
          const duplicate = (allInscricoes || []).find(
            (i) => (i.nome || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() === normalizedNew
          );
          if (duplicate) {
            throw new Error(`${duplicate.nome} já está inscrito neste evento`);
          }
          // Also check in inscricoes_eventos
          const { data: allPublic } = await supabase
            .from("inscricoes_eventos")
            .select("id, nome_participante")
            .eq("evento_id", eventoId);
          const duplicatePublic = (allPublic || []).find(
            (i) => (i.nome_participante || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() === normalizedNew
          );
          if (duplicatePublic) {
            throw new Error(`${duplicatePublic.nome_participante} já está inscrito neste evento`);
          }
        }

        const { error } = await supabase.from("impacto_inscricoes").insert({ ...payload, aprovado: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? "Inscrição atualizada!" : "Inscrição realizada!");
      queryClient.invalidateQueries({ queryKey: ["impacto-inscricoes", eventoId] });
      queryClient.invalidateQueries({ queryKey: ["impacto-inscricoes-financeiro", eventoId] });
      queryClient.invalidateQueries({ queryKey: ["impacto-inscricoes-count"] });
      queryClient.invalidateQueries({ queryKey: ["agenda-inscricoes", eventoId] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao salvar inscrição");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManual && !memberId) {
      toast.error("Selecione um membro ou marque para adicionar manualmente");
      return;
    }
    if (isManual && !nome) {
      toast.error("Digite o nome do participante");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Inscrição" : "Nova Inscrição"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEditing && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_manual"
                checked={isManual}
                onCheckedChange={(v) => setIsManual(!!v)}
              />
              <Label htmlFor="is_manual" className="cursor-pointer">
                Adicionar manualmente (não é membro)
              </Label>
            </div>
          )}

          {(isManual || isEditing) ? (
            <>
              {/* When editing a member inscription, show member reference */}
              {isEditing && !isManual && memberId && (
                <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                  <p className="text-xs text-muted-foreground">Membro vinculado</p>
                  <p className="text-sm font-medium">{selectedMember?.full_name || nome}</p>
                  {casaRefugio && (
                    <>
                      <p className="text-xs text-muted-foreground mt-1">Casa Refúgio</p>
                      <p className="text-sm font-medium">{casaRefugio.name}</p>
                    </>
                  )}
                </div>
              )}
              <div>
                <Label>Nome *</Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome completo"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <Label>Gênero</Label>
                  <Select value={genero || "none"} onValueChange={(v) => setGenero(v === "none" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não informado</SelectItem>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <Label>Tel. Emergência</Label>
                <Input
                  value={telefoneEmergencia}
                  onChange={(e) => setTelefoneEmergencia(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <Label>Membro *</Label>
                <Select value={memberId || "none"} onValueChange={(v) => setMemberId(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o membro" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione...</SelectItem>
                    {members?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {casaRefugio && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Casa Refúgio</p>
                  <p className="text-sm font-medium">{casaRefugio.name}</p>
                </div>
              )}
              <div>
                <Label>Tel. Emergência</Label>
                <Input
                  value={telefoneEmergencia}
                  onChange={(e) => setTelefoneEmergencia(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </>
          )}

          {tiposPermitidos.length > 0 && (
            <div>
              <Label>Tipo de Inscrição *</Label>
              <Select value={tipoInscricao} onValueChange={(v) => {
                setTipoInscricao(v);
                // Auto-fill valorInscricao (not valorPago) based on type
                const vpt = evento?.valores_por_tipo as Record<string, string> | null;
                const hasVpt = vpt && Object.keys(vpt).length > 0;
                const valorTipo = hasVpt ? vpt[v] : null;
                const valorBase = evento?.valor_inscricao;
                const valorFinal = valorTipo ? parseFloat(valorTipo) : (valorBase || null);
                setValorInscricao(valorFinal && valorFinal > 0 ? valorFinal.toString() : "");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {tiposPermitidos.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TIPOS_INSCRICAO_LABELS[t] || t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-2">
                <Label className="text-xs text-muted-foreground">Valor da Inscrição (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorInscricao}
                  onChange={(e) => setValorInscricao(e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </div>
          )}

          <div>
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações adicionais..."
            />
          </div>

          <Separator />

          {/* Pagamento */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Pagamento</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={statusPagamento} onValueChange={setStatusPagamento}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="parcial">Parcial</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Select
                  value={usarMisto ? "misto" : (formaPagamento || "none")}
                  onValueChange={(v) => {
                    if (v === "misto") {
                      setUsarMisto(true);
                      setFormaPagamento("");
                      if (pagamentos.length === 0) {
                        setPagamentos([{ tipo: "", valor: "" }]);
                      }
                    } else {
                      setUsarMisto(false);
                      setPagamentos([]);
                      setFormaPagamento(v === "none" ? "" : v);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não informado</SelectItem>
                    {FORMAS_PAGAMENTO.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="misto">Multi (Misto)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {usarMisto && (
              <div className="space-y-3">
                {pagamentos.map((pag, index) => (
                  <div key={index} className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label className="text-xs">Forma</Label>
                      <Select
                        value={pag.tipo || "none"}
                        onValueChange={(v) => updatePagamento(index, "tipo", v === "none" ? "" : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Selecione...</SelectItem>
                          {FORMAS_PAGAMENTO.map((f) => (
                            <SelectItem key={f.value} value={f.value}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-28">
                      <Label className="text-xs">Valor (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={pag.valor}
                        onChange={(e) => updatePagamento(index, "valor", e.target.value)}
                        placeholder="0,00"
                      />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removePagamento(index)}
                      className="flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addPagamento}>
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar forma de pagamento
                </Button>
                {totalPagamentos > 0 && (
                  <div className="p-2 bg-muted/50 rounded text-sm space-y-1">
                    <div className="font-medium">Total pago: {formatCurrency(totalPagamentos)}</div>
                    {parseFloat(valorInscricao) > 0 && (
                      <div className={`font-medium ${(parseFloat(valorInscricao) - totalPagamentos) > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                        Saldo a pagar: {formatCurrency(Math.max(0, parseFloat(valorInscricao) - totalPagamentos))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {!usarMisto && (
              <div className="space-y-2">
                <div>
                  <Label>Valor Pago (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={valorPago}
                    onChange={(e) => setValorPago(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                {parseFloat(valorInscricao) > 0 && (
                  <div className={`p-2 bg-muted/50 rounded text-sm font-medium ${(parseFloat(valorInscricao) - (parseFloat(valorPago) || 0)) > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                    Saldo a pagar: {formatCurrency(Math.max(0, parseFloat(valorInscricao) - (parseFloat(valorPago) || 0)))}
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Previsões de Pagamento */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Previsões de Pagamento</h4>
            {previsoes.map((prev, index) => (
              <div key={index} className="flex items-end gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Data</Label>
                  <Input
                    type="date"
                    value={prev.data}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => {
                      const updated = [...previsoes];
                      updated[index] = { ...updated[index], data: e.target.value };
                      setPrevisoes(updated);
                    }}
                  />
                </div>
                <div className="w-28">
                  <Label className="text-xs">Valor (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={prev.valor}
                    onChange={(e) => {
                      const updated = [...previsoes];
                      updated[index] = { ...updated[index], valor: e.target.value };
                      setPrevisoes(updated);
                    }}
                    placeholder="0,00"
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setPrevisoes(previsoes.filter((_, i) => i !== index))}
                  className="flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPrevisoes([...previsoes, { data: "", valor: "" }])}
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar previsão
            </Button>
          </div>
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : isEditing ? "Salvar Alterações" : "Realizar Inscrição"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ImpactoInscricaoFormDialog;
