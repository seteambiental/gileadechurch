import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserRoundCheck } from "lucide-react";
import { formatCep, formatPhone, formatCPF, unformatPhone, unformatCep } from "@/lib/masks";
import { DateInput } from "@/components/ui/date-input";
import { formatNameField, toTitleCase } from "@/lib/text-utils";
import { useCepLookup } from "@/hooks/useCepLookup";
import { todayDateStr } from "@/lib/date-utils";

export interface InscricaoConsolidacao {
  id: string;
  member_id?: string | null;
  nome: string;
  telefone?: string | null;
  email?: string | null;
  genero?: string | null;
  data_nascimento?: string | null;
  observacoes?: string | null;
  /** Where the record lives: live event inscription or manual consolidation entry. */
  source?: "evento" | "manual";
}

interface ConverterMembroDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inscricao: InscricaoConsolidacao | null;
  /** Tanstack query keys to invalidate after a successful conversion. */
  invalidateKeys?: string[];
}

const normalizeGenero = (g?: string | null) => {
  const lower = (g || "").toLowerCase();
  if (lower === "m" || lower === "masculino") return "Masculino";
  if (lower === "f" || lower === "feminino") return "Feminino";
  return "";
};

export const ConverterMembroDialog = ({
  open,
  onOpenChange,
  inscricao,
  invalidateKeys = [],
}: ConverterMembroDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    genero: "",
    estado_civil: "",
    birth_date: "",
    member_since: todayDateStr(),
    cep: "",
    address: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    whatsapp: "",
    email: "",
    cpf: "",
  });

  useEffect(() => {
    if (open && inscricao) {
      setForm({
        full_name: inscricao.nome || "",
        genero: normalizeGenero(inscricao.genero),
        estado_civil: "",
        birth_date: inscricao.data_nascimento || "",
        member_since: todayDateStr(),
        cep: "",
        address: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
        whatsapp: inscricao.telefone ? formatPhone(inscricao.telefone) : "",
        email: inscricao.email || "",
        cpf: "",
      });
    }
  }, [open, inscricao]);

  const { isLoading: isFetchingCep } = useCepLookup(form.cep, ({ address, neighborhood, city, state }) => {
    setForm((prev) => ({
      ...prev,
      address: address || prev.address,
      neighborhood: neighborhood || prev.neighborhood,
      city: city || prev.city,
      state: state || prev.state,
    }));
  });

  const setField = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleConvert = async () => {
    if (!inscricao) return;
    if (!form.full_name.trim()) {
      toast({ variant: "destructive", title: "Informe o nome" });
      return;
    }

    setIsLoading(true);
    try {
      const memberData = {
        full_name: formatNameField(form.full_name),
        genero: form.genero || null,
        estado_civil: form.estado_civil || null,
        birth_date: form.birth_date || null,
        member_since: form.member_since || todayDateStr(),
        cep: form.cep ? unformatCep(form.cep) : null,
        address: form.address ? toTitleCase(form.address) : null,
        number: form.number || null,
        complement: form.complement || null,
        neighborhood: form.neighborhood ? toTitleCase(form.neighborhood) : null,
        city: form.city ? toTitleCase(form.city) : null,
        state: form.state ? form.state.toUpperCase() : null,
        whatsapp: form.whatsapp ? unformatPhone(form.whatsapp) : null,
        email: form.email || null,
        cpf: form.cpf ? form.cpf.replace(/\D/g, "") : null,
      };

      const { data: newMember, error: memberError } = await supabase
        .from("members")
        .insert(memberData)
        .select("id")
        .single();
      if (memberError) throw memberError;

      if (inscricao.source === "manual") {
        const { error: updateError } = await supabase
          .from("novos_convertidos")
          .update({ tornou_membro: true, member_id: newMember.id, data_membresia: todayDateStr() })
          .eq("id", inscricao.id);
        if (updateError) throw updateError;
      } else {
        const { error: updateError } = await supabase
          .from("impacto_inscricoes")
          .update({ virou_membro: true, membro_convertido_id: newMember.id, member_id: newMember.id })
          .eq("id", inscricao.id);
        if (updateError) throw updateError;
      }

      toast({ title: "Convertido para membro com sucesso!" });
      invalidateKeys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      queryClient.invalidateQueries({ queryKey: ["members"] });
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao converter", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Converter para Membro</DialogTitle>
          <DialogDescription>
            Confira e complete os dados. Ao converter, a pessoa sai da consolidação e passa para o cadastro de membros.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-2">
            <Label>Nome completo *</Label>
            <Input value={form.full_name} onChange={(e) => setField("full_name", e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Gênero</Label>
            <Select value={form.genero} onValueChange={(v) => setField("genero", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Masculino">Masculino</SelectItem>
                <SelectItem value="Feminino">Feminino</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Estado civil</Label>
            <Select value={form.estado_civil} onValueChange={(v) => setField("estado_civil", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                <SelectItem value="casado">Casado(a)</SelectItem>
                <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                <SelectItem value="viuvo">Viúvo(a)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data de nascimento</Label>
            <DateInput value={form.birth_date} onChange={(v) => setField("birth_date", v)} />
          </div>

          <div className="space-y-2">
            <Label>Membro desde</Label>
            <DateInput value={form.member_since} onChange={(v) => setField("member_since", v)} />
          </div>

          <div className="space-y-2">
            <Label>WhatsApp</Label>
            <Input value={form.whatsapp} onChange={(e) => setField("whatsapp", formatPhone(e.target.value))} />
          </div>

          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>CPF</Label>
            <Input value={form.cpf} onChange={(e) => setField("cpf", formatCPF(e.target.value))} />
          </div>

          <div className="space-y-2">
            <Label>CEP</Label>
            <div className="relative">
              <Input value={form.cep} onChange={(e) => setField("cep", formatCep(e.target.value))} />
              {isFetchingCep && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />}
            </div>
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label>Endereço</Label>
            <Input value={form.address} onChange={(e) => setField("address", e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Número</Label>
            <Input value={form.number} onChange={(e) => setField("number", e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Complemento</Label>
            <Input value={form.complement} onChange={(e) => setField("complement", e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Bairro</Label>
            <Input value={form.neighborhood} onChange={(e) => setField("neighborhood", e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Cidade</Label>
            <Input value={form.city} onChange={(e) => setField("city", e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Estado (UF)</Label>
            <Input maxLength={2} value={form.state} onChange={(e) => setField("state", e.target.value.toUpperCase())} />
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleConvert} disabled={isLoading} className="bg-green-600 text-white hover:bg-green-700">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserRoundCheck className="w-4 h-4 mr-2" />}
            Converter para Membro
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};