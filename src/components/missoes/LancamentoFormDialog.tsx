import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { todayDateStr } from "@/lib/date-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mesRef: string; // YYYY-MM-DD
  lancamento?: any | null;
}

const FORMAS = ["Dinheiro", "PIX", "Transferência", "Cartão", "Outro"];

export function LancamentoFormDialog({ open, onOpenChange, mesRef, lancamento }: Props) {
  const qc = useQueryClient();
  const [origem, setOrigem] = useState<"membro" | "condominio" | "manual">("membro");
  const [memberId, setMemberId] = useState<string>("");
  const [condominioId, setCondominioId] = useState<string>("");
  const [nomeManual, setNomeManual] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(todayDateStr());
  const [formaPagamento, setFormaPagamento] = useState("PIX");
  const [obs, setObs] = useState("");
  const [memberSearchOpen, setMemberSearchOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  useEffect(() => {
    if (lancamento) {
      setOrigem(lancamento.origem || "membro");
      setMemberId(lancamento.member_id || "");
      setCondominioId(lancamento.condominio_id || "");
      setNomeManual(lancamento.nome_manual || "");
      setValor(String(lancamento.valor || ""));
      setData(lancamento.data_lancamento || todayDateStr());
      setFormaPagamento(lancamento.forma_pagamento || "PIX");
      setObs(lancamento.observacoes || "");
    } else {
      setOrigem("membro");
      setMemberId("");
      setCondominioId("");
      setNomeManual("");
      setValor("");
      setData(todayDateStr());
      setFormaPagamento("PIX");
      setObs("");
    }
  }, [lancamento, open]);

  const { data: members = [] } = useQuery({
    queryKey: ["mm-members-simple"],
    queryFn: async () => {
      const { data } = await supabase
        .from("members")
        .select("id, full_name")
        .or("excluido.is.null,excluido.eq.false")
        .order("full_name");
      return (data || []) as { id: string; full_name: string }[];
    },
    enabled: open,
  });

  const { data: condominios = [] } = useQuery({
    queryKey: ["mm-condominios"],
    queryFn: async () => {
      const { data } = await supabase.from("condominios").select("id, name").order("name");
      return (data || []) as { id: string; name: string }[];
    },
    enabled: open,
  });

  const filteredMembers = memberSearch.length >= 2
    ? members.filter((m) => m.full_name.toLowerCase().includes(memberSearch.toLowerCase()))
    : members.slice(0, 30);
  const selectedMemberName = members.find((m) => m.id === memberId)?.full_name || "";

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        origem,
        member_id: origem === "membro" ? memberId || null : null,
        condominio_id: origem === "condominio" ? condominioId || null : null,
        nome_manual: origem === "manual" ? nomeManual : null,
        valor: parseFloat(valor) || 0,
        data_lancamento: data,
        mes_referencia: mesRef,
        forma_pagamento: formaPagamento,
        observacoes: obs || null,
      };
      if (lancamento?.id) {
        const { error } = await supabase
          .from("missoes_mocambique_lancamentos")
          .update(payload)
          .eq("id", lancamento.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("missoes_mocambique_lancamentos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mm-lancamentos"] });
      toast.success(lancamento ? "Lançamento atualizado!" : "Lançamento registrado!");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar."),
  });

  const canSave =
    !!valor &&
    parseFloat(valor) > 0 &&
    ((origem === "membro" && memberId) ||
      (origem === "condominio" && condominioId) ||
      (origem === "manual" && nomeManual.trim().length > 1));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[calc(100vw-1.5rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lancamento ? "Editar Lançamento" : "Novo Lançamento de Contribuição"}</DialogTitle>
        </DialogHeader>

        <Tabs value={origem} onValueChange={(v) => setOrigem(v as any)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="membro">Membro</TabsTrigger>
            <TabsTrigger value="condominio">Condomínio</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
          </TabsList>

          <TabsContent value="membro" className="space-y-2 mt-3">
            <Label>Membro</Label>
            <Popover open={memberSearchOpen} onOpenChange={setMemberSearchOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between">
                  {selectedMemberName || "Selecione um membro..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput placeholder="Buscar membro..." value={memberSearch} onValueChange={setMemberSearch} />
                  <CommandList>
                    <CommandEmpty>Nenhum encontrado.</CommandEmpty>
                    <CommandGroup>
                      {filteredMembers.map((m) => (
                        <CommandItem
                          key={m.id}
                          value={m.id}
                          onSelect={() => {
                            setMemberId(m.id);
                            setMemberSearchOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", memberId === m.id ? "opacity-100" : "opacity-0")} />
                          {m.full_name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </TabsContent>

          <TabsContent value="condominio" className="space-y-2 mt-3">
            <Label>Condomínio</Label>
            <Select value={condominioId} onValueChange={setCondominioId}>
              <SelectTrigger><SelectValue placeholder="Selecione o condomínio..." /></SelectTrigger>
              <SelectContent>
                {condominios.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TabsContent>

          <TabsContent value="manual" className="space-y-2 mt-3">
            <Label>Nome do contribuinte</Label>
            <Input value={nomeManual} onChange={(e) => setNomeManual(e.target.value)} placeholder="Nome completo" />
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <Label>Valor (R$)</Label>
            <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
          </div>
          <div>
            <Label>Data</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Forma de pagamento</Label>
          <Select value={formaPagamento} onValueChange={setFormaPagamento}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FORMAS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Observações</Label>
          <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={!canSave || saveMutation.isPending}>
            {saveMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}