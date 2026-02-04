import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Loader2 } from "lucide-react";
import { formatCep, formatPhone, formatCPF } from "@/lib/masks";
import { DateInput } from "@/components/ui/date-input";
import { formatNameField, toTitleCase } from "@/lib/text-utils";
import { ClearableSelect } from "@/components/ui/clearable-select";

interface NovoConvertidoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  convertido?: any;
  eventoId?: string;
  eventoTitulo?: string;
}

const getInitialFormData = (convertido?: any, eventoId?: string) => ({
  full_name: convertido?.full_name || "",
  whatsapp: convertido?.whatsapp || "",
  email: convertido?.email || "",
  genero: convertido?.genero || "",
  data_nascimento: convertido?.data_nascimento || "",
  cpf: convertido?.cpf ? formatCPF(convertido.cpf) : "",
  cep: convertido?.cep || "",
  address: convertido?.address || "",
  numero: convertido?.numero || "",
  complement: convertido?.complement || "",
  neighborhood: convertido?.neighborhood || "",
  city: convertido?.city || "",
  state: convertido?.state || "",
  membro_vinculado_id: convertido?.membro_vinculado_id || "",
  casa_refugio_id: convertido?.casa_refugio_id || "",
  tipo_conversao: convertido?.tipo_conversao || "",
  como_chegou: convertido?.como_chegou || "",
  data_decisao: convertido?.data_decisao || "",
  batizado: convertido?.batizado || false,
  data_batismo: convertido?.data_batismo || "",
  impacto_data_1: convertido?.datas_impacto?.[0] || "",
  impacto_data_2: convertido?.datas_impacto?.[1] || "",
  participou_manaim: convertido?.participou_manaim || false,
  data_manaim: convertido?.data_manaim || "",
  participou_culto_membresia: convertido?.participou_culto_membresia || false,
  data_culto_membresia: convertido?.data_culto_membresia || "",
  frequenta_casa_refugio: convertido?.frequenta_casa_refugio || false,
  casa_refugio_frequenta_id: convertido?.casa_refugio_frequenta_id || "",
  evento_id: convertido?.evento_id || eventoId || "",
});

export const NovoConvertidoFormDialog = ({
  open,
  onOpenChange,
  convertido,
  eventoId,
  eventoTitulo,
}: NovoConvertidoFormDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingCep, setIsFetchingCep] = useState(false);

  const [formData, setFormData] = useState(getInitialFormData(convertido, eventoId));

  // Reset form when dialog opens or convertido changes
  useEffect(() => {
    if (open) {
      setFormData(getInitialFormData(convertido, eventoId));
    }
  }, [open, convertido, eventoId]);

  const { data: membros = [] } = useQuery({
    queryKey: ["membros-lista"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: casasRefugio = [] } = useQuery({
    queryKey: ["casas-refugio-lista"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casas_refugio")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const fetchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    setIsFetchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setFormData((prev) => ({
          ...prev,
          address: data.logradouro || "",
          neighborhood: data.bairro || "",
          city: data.localidade || "",
          state: data.uf || "",
        }));
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    } finally {
      setIsFetchingCep(false);
    }
  };

  const handleCepChange = (value: string) => {
    const maskedCep = formatCep(value);
    setFormData((prev) => ({ ...prev, cep: maskedCep }));
    if (maskedCep.replace(/\D/g, "").length === 8) {
      fetchAddressByCep(maskedCep);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name.trim()) {
      toast({ variant: "destructive", title: "Nome é obrigatório" });
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        full_name: formatNameField(formData.full_name),
        whatsapp: formData.whatsapp || null,
        email: formData.email || null,
        genero: formData.genero || null,
        data_nascimento: formData.data_nascimento || null,
        cpf: formData.cpf ? formData.cpf.replace(/\D/g, "") : null,
        cep: formData.cep || null,
        address: formData.address ? toTitleCase(formData.address) : null,
        numero: formData.numero || null,
        complement: formData.complement || null,
        neighborhood: formData.neighborhood ? toTitleCase(formData.neighborhood) : null,
        city: formData.city ? toTitleCase(formData.city) : null,
        state: formData.state?.toUpperCase() || null,
        membro_vinculado_id: formData.membro_vinculado_id || null,
        casa_refugio_id: formData.casa_refugio_id || null,
        tipo_conversao: formData.tipo_conversao || null,
        como_chegou: formData.como_chegou || null,
        data_decisao: formData.data_decisao || null,
        batizado: formData.batizado,
        data_batismo: formData.batizado ? formData.data_batismo || null : null,
        datas_impacto: [formData.impacto_data_1, formData.impacto_data_2].filter(Boolean),
        participou_manaim: formData.participou_manaim,
        data_manaim: formData.participou_manaim ? formData.data_manaim || null : null,
        participou_culto_membresia: formData.participou_culto_membresia,
        data_culto_membresia: formData.participou_culto_membresia ? formData.data_culto_membresia || null : null,
        frequenta_casa_refugio: formData.frequenta_casa_refugio,
        casa_refugio_frequenta_id: formData.frequenta_casa_refugio ? formData.casa_refugio_frequenta_id || null : null,
        evento_id: formData.evento_id || null,
      };

      if (convertido) {
        const { error } = await supabase
          .from("novos_convertidos")
          .update(payload)
          .eq("id", convertido.id);
        if (error) throw error;
        toast({ title: "Atualizado com sucesso!" });
      } else {
        const { error } = await supabase
          .from("novos_convertidos")
          .insert(payload);
        if (error) throw error;
        toast({ title: "Cadastrado com sucesso!" });
      }

      queryClient.invalidateQueries({ queryKey: ["novos-convertidos"] });
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {convertido ? "Editar Novo Convertido" : "Cadastrar Novo Convertido"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados Pessoais */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground border-b pb-2">Dados Pessoais</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="full_name">Nome Completo *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: formatPhone(e.target.value) })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <Label>Gênero</Label>
                <Select
                  value={formData.genero}
                  onValueChange={(v) => setFormData({ ...formData, genero: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="feminino">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                <DateInput
                  id="data_nascimento"
                  value={formData.data_nascimento}
                  onChange={(value) => setFormData({ ...formData, data_nascimento: value })}
                />
              </div>


              <div>
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground border-b pb-2">Endereço</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="cep">CEP</Label>
                <div className="relative">
                  <Input
                    id="cep"
                    value={formData.cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="00000-000"
                  />
                  {isFetchingCep && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
              
              <div className="md:col-span-3">
                <Label htmlFor="address">Logradouro</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="complement">Complemento</Label>
                <Input
                  id="complement"
                  value={formData.complement}
                  onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  maxLength={2}
                />
              </div>
            </div>
          </div>

          {/* Vínculos */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground border-b pb-2">Vínculos</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Membro Vinculado (Padrinho/Madrinha)</Label>
                <ClearableSelect
                  value={formData.membro_vinculado_id || null}
                  onChange={(val) => setFormData({ ...formData, membro_vinculado_id: val || "" })}
                  options={membros.map((m) => ({
                    value: m.id,
                    label: m.full_name,
                  }))}
                  placeholder="Sem vínculo"
                  emptyLabel="Sem vínculo"
                />
              </div>
              
              <div>
                <Label>Veio através de Casa Refúgio?</Label>
                <ClearableSelect
                  value={formData.casa_refugio_id || null}
                  onChange={(val) => setFormData({ ...formData, casa_refugio_id: val || "" })}
                  options={casasRefugio.map((cr) => ({
                    value: cr.id,
                    label: cr.name,
                  }))}
                  placeholder="Não veio por CR"
                  emptyLabel="Não veio por CR"
                />
              </div>
            </div>
          </div>

          {/* Conversão */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground border-b pb-2">Conversão</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select
                  value={formData.tipo_conversao}
                  onValueChange={(v) => setFormData({ ...formData, tipo_conversao: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conversao">Conversão</SelectItem>
                    <SelectItem value="reconciliacao">Reconciliação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Como Chegou</Label>
                <Select
                  value={formData.como_chegou}
                  onValueChange={(v) => setFormData({ ...formData, como_chegou: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="culto_domingo">Culto Domingo</SelectItem>
                    <SelectItem value="culto_quarta">Culto Quarta</SelectItem>
                    <SelectItem value="casa_refugio">Casa Refúgio</SelectItem>
                    <SelectItem value="impacto">Impacto</SelectItem>
                    <SelectItem value="acao_evangelistica">Ação Evangelística</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="data_decisao">Data da Decisão</Label>
                <DateInput
                  id="data_decisao"
                  value={formData.data_decisao}
                  onChange={(value) => setFormData({ ...formData, data_decisao: value })}
                  maxDate={undefined}
                />
              </div>
            </div>
          </div>

          {/* Trilho de Membresia */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground border-b pb-2">Trilho de Membresia</h3>
            
            <div className="space-y-4">
              {/* Batismo */}
              <div className="flex items-start gap-4 p-3 bg-muted/50 rounded-lg">
                <Checkbox
                  id="batizado"
                  checked={formData.batizado}
                  onCheckedChange={(c) => setFormData({ ...formData, batizado: !!c })}
                />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="batizado" className="cursor-pointer">Batizado</Label>
                  {formData.batizado && (
                    <DateInput
                      value={formData.data_batismo}
                      onChange={(value) => setFormData({ ...formData, data_batismo: value })}
                      maxDate={undefined}
                    />
                  )}
                </div>
              </div>

              {/* Impacto - 2 datas obrigatórias */}
              <div className="p-3 bg-muted/50 rounded-lg space-y-3">
                <Label className="font-medium">Impactos (2 participações)</Label>
                <p className="text-xs text-muted-foreground">Preencha as 2 datas para completar este checkpoint</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">1º Impacto</Label>
                    <DateInput
                      value={formData.impacto_data_1}
                      onChange={(value) => setFormData({ ...formData, impacto_data_1: value })}
                      maxDate={undefined}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">2º Impacto</Label>
                    <DateInput
                      value={formData.impacto_data_2}
                      onChange={(value) => setFormData({ ...formData, impacto_data_2: value })}
                      maxDate={undefined}
                    />
                  </div>
                </div>
              </div>

              {/* Manaim */}
              <div className="flex items-start gap-4 p-3 bg-muted/50 rounded-lg">
                <Checkbox
                  id="participou_manaim"
                  checked={formData.participou_manaim}
                  onCheckedChange={(c) => setFormData({ ...formData, participou_manaim: !!c })}
                />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="participou_manaim" className="cursor-pointer">Participou do Manaim</Label>
                  {formData.participou_manaim && (
                    <DateInput
                      value={formData.data_manaim}
                      onChange={(value) => setFormData({ ...formData, data_manaim: value })}
                      maxDate={undefined}
                    />
                  )}
                </div>
              </div>

              {/* Culto de Membresia */}
              <div className="flex items-start gap-4 p-3 bg-muted/50 rounded-lg">
                <Checkbox
                  id="participou_culto_membresia"
                  checked={formData.participou_culto_membresia}
                  onCheckedChange={(c) => setFormData({ ...formData, participou_culto_membresia: !!c })}
                />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="participou_culto_membresia" className="cursor-pointer">Participou do Culto de Membresia</Label>
                  {formData.participou_culto_membresia && (
                    <DateInput
                      value={formData.data_culto_membresia}
                      onChange={(value) => setFormData({ ...formData, data_culto_membresia: value })}
                      maxDate={undefined}
                    />
                  )}
                </div>
              </div>

              {/* Frequenta Casa Refúgio */}
              <div className="flex items-start gap-4 p-3 bg-muted/50 rounded-lg">
                <Checkbox
                  id="frequenta_casa_refugio"
                  checked={formData.frequenta_casa_refugio}
                  onCheckedChange={(c) => setFormData({ ...formData, frequenta_casa_refugio: !!c })}
                />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="frequenta_casa_refugio" className="cursor-pointer">Frequenta Casa Refúgio</Label>
                  {formData.frequenta_casa_refugio && (
                    <Select
                      value={formData.casa_refugio_frequenta_id}
                      onValueChange={(v) => setFormData({ ...formData, casa_refugio_frequenta_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a Casa Refúgio" />
                      </SelectTrigger>
                      <SelectContent>
                        {casasRefugio.map((cr) => (
                          <SelectItem key={cr.id} value={cr.id}>{cr.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="secondary" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {convertido ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
