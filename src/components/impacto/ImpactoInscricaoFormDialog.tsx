import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  familia: "Família",
  equipe: "Equipe (apoio/serviço)",
};

const FORMAS_PAGAMENTO = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "cartao_debito", label: "Cartão de Débito" },
  { value: "transferencia", label: "Transferência" },
  { value: "boleto", label: "Boleto" },
];

interface Pagamento {
  tipo: string;
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
  const [observacoes, setObservacoes] = useState("");
  const [statusPagamento, setStatusPagamento] = useState("pendente");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [valorPago, setValorPago] = useState("");
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [usarMisto, setUsarMisto] = useState(false);
  const [tipoInscricao, setTipoInscricao] = useState("membro");

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

  const tiposPermitidos: string[] = (evento?.tipos_inscricao as string[] | null) || ["membro", "nao_membro", "familia", "equipe"];

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
      setNome(inscricao.nome || "");
      setTelefone(inscricao.telefone || "");
      setEmail(inscricao.email || "");
      setGenero(inscricao.genero || "");
      setObservacoes(inscricao.observacoes || "");
      setTipoInscricao(inscricao.tipo_inscricao || "membro");
      setStatusPagamento(inscricao.status_pagamento || "pendente");
      setFormaPagamento(inscricao.forma_pagamento || "");
      setValorPago(inscricao.valor_pago?.toString() || "");

      const existingPagamentos = inscricao.pagamentos as Pagamento[] | null;
      if (existingPagamentos && existingPagamentos.length > 0) {
        setPagamentos(existingPagamentos.map((p: any) => ({ tipo: p.tipo, valor: p.valor?.toString() || "" })));
        setUsarMisto(true);
      } else {
        setPagamentos([]);
        setUsarMisto(false);
      }
    } else if (open && !inscricao) {
      setIsManual(false);
      setMemberId("");
      setNome("");
      setTelefone("");
      setEmail("");
      setGenero("");
      setObservacoes("");
      setTipoInscricao(tiposPermitidos[0] || "membro");
      setStatusPagamento("pendente");
      setFormaPagamento("");
      setValorPago("");
      setPagamentos([]);
      setUsarMisto(false);
    }
  }, [open, inscricao]);

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
        tipo_inscricao: tipoInscricao || "membro",
        status_pagamento: statusPagamento,
        forma_pagamento: usarMisto ? "misto" : (formaPagamento || null),
        valor_pago: totalPago || null,
        pagamentos: pagamentosJson.length > 0 ? pagamentosJson : null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("impacto_inscricoes")
          .update(payload)
          .eq("id", inscricao.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("impacto_inscricoes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? "Inscrição atualizada!" : "Inscrição realizada!");
      queryClient.invalidateQueries({ queryKey: ["impacto-inscricoes", eventoId] });
      queryClient.invalidateQueries({ queryKey: ["impacto-inscricoes-count"] });
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

          {isManual ? (
            <>
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
            </>
          )}

          {tiposPermitidos.length > 0 && (
            <div>
              <Label>Tipo de Inscrição *</Label>
              <Select value={tipoInscricao} onValueChange={(v) => {
                setTipoInscricao(v);
                // Auto-fill valor_pago based on type
                const valoresPorTipo = evento?.valores_por_tipo as Record<string, string> | null;
                const valorTipo = valoresPorTipo?.[v];
                const valorBase = evento?.valor_inscricao;
                const valorFinal = valorTipo ? parseFloat(valorTipo) : (valorBase || null);
                if (valorFinal && valorFinal > 0) {
                  setValorPago(valorFinal.toString());
                }
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
              {(() => {
                const valoresPorTipo = evento?.valores_por_tipo as Record<string, string> | null;
                const valorTipo = valoresPorTipo?.[tipoInscricao];
                const valorBase = evento?.valor_inscricao;
                const valorExibir = valorTipo ? parseFloat(valorTipo) : (valorBase || null);
                return valorExibir && valorExibir > 0 ? (
                  <p className="text-sm text-muted-foreground mt-1">
                    Valor configurado: <strong>R$ {Number(valorExibir).toFixed(2).replace(".", ",")}</strong>
                  </p>
                ) : null;
              })()}
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
                  <div className="p-2 bg-muted/50 rounded text-sm font-medium">
                    Total pago: R$ {totalPagamentos.toFixed(2)}
                  </div>
                )}
              </div>
            )}
            {!usarMisto && (
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
            )}
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
