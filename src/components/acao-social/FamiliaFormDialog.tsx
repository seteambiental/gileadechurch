import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatPhone, formatCep } from "@/lib/masks";
import { formatNameField, toTitleCase, includesNormalized } from "@/lib/text-utils";
import { ClearableSelect } from "@/components/ui/clearable-select";
import { Plus, Trash2, Search, UserPlus, Users } from "lucide-react";

interface FamiliaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familia?: any;
}

const tiposAjuda = [
  "Cesta básica",
  "Auxílio financeiro",
  "Roupas",
  "Medicamentos",
  "Material escolar",
  "Móveis",
  "Outros",
];

const frequencias = [
  "Semanal",
  "Quinzenal",
  "Mensal",
  "Bimestral",
  "Trimestral",
  "Semestral",
  "Eventual",
];

const PARENTESCOS = [
  "Pai",
  "Mãe",
  "Filho",
  "Filha",
  "Esposo",
  "Esposa",
  "Irmão",
  "Irmã",
  "Avô",
  "Avó",
  "Neto",
  "Neta",
  "Tio",
  "Tia",
  "Sobrinho",
  "Sobrinha",
  "Primo",
  "Prima",
  "Genro",
  "Nora",
  "Sogro",
  "Sogra",
  "Enteado",
  "Enteada",
  "Outro",
];

interface MembroInline {
  id: string;
  nome: string;
  parentesco: string;
  member_id?: string | null;
  data_nascimento?: string;
  genero?: string;
}

export function FamiliaFormDialog({ open, onOpenChange, familia }: FamiliaFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!familia;

  const [membrosInline, setMembrosInline] = useState<MembroInline[]>([]);
  const [origemTab, setOrigemTab] = useState<"igreja" | "externo">("igreja");
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedParentesco, setSelectedParentesco] = useState("");

  // Free-text fields for external members
  const [externoNome, setExternoNome] = useState("");
  const [externoParentesco, setExternoParentesco] = useState("");
  const [externoNascimento, setExternoNascimento] = useState("");
  const [externoGenero, setExternoGenero] = useState("");

  const form = useForm({
    defaultValues: {
      nome_familia: "",
      endereco: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      cep: "",
      telefone: "",
      whatsapp: "",
      email: "",
      casa_refugio_id: "",
      lider_responsavel_id: "",
      tipo_ajuda: "",
      frequencia_ajuda: "",
      observacoes: "",
      ativo: true,
    },
  });

  const { data: casasRefugio } = useQuery({
    queryKey: ["casas_refugio_select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casas_refugio")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: lideres } = useQuery({
    queryKey: ["lideres_select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  // Search members for adding to family
  const { data: membersSearch = [] } = useQuery({
    queryKey: ["members_familia_search", memberSearch],
    queryFn: async () => {
      if (!memberSearch || memberSearch.length < 2) return [];
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, birth_date, genero")
        .or("excluido.is.null,excluido.eq.false")
        .ilike("full_name", `%${memberSearch}%`)
        .order("full_name")
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: memberSearch.length >= 2,
  });

  // Load existing members when editing
  useEffect(() => {
    if (familia?.id && isEditing) {
      supabase
        .from("acao_social_familia_membros")
        .select("*")
        .eq("familia_id", familia.id)
        .order("created_at")
        .then(({ data }) => {
          if (data) {
            setMembrosInline(
              data.map((m: any) => ({
                id: m.id,
                nome: m.nome,
                parentesco: m.parentesco || "",
                data_nascimento: m.data_nascimento || "",
                genero: m.genero || "",
              }))
            );
          }
        });
    }
  }, [familia?.id, isEditing]);

  useEffect(() => {
    if (familia) {
      form.reset({
        nome_familia: familia.nome_familia || "",
        endereco: familia.endereco || "",
        numero: familia.numero || "",
        complemento: familia.complemento || "",
        bairro: familia.bairro || "",
        cidade: familia.cidade || "",
        estado: familia.estado || "",
        cep: familia.cep || "",
        telefone: familia.telefone || "",
        whatsapp: familia.whatsapp || "",
        email: familia.email || "",
        casa_refugio_id: familia.casa_refugio_id || "",
        lider_responsavel_id: familia.lider_responsavel_id || "",
        tipo_ajuda: familia.tipo_ajuda || "",
        frequencia_ajuda: familia.frequencia_ajuda || "",
        observacoes: familia.observacoes || "",
        ativo: familia.ativo ?? true,
      });
    } else {
      form.reset({
        nome_familia: "",
        endereco: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
        cep: "",
        telefone: "",
        whatsapp: "",
        email: "",
        casa_refugio_id: "",
        lider_responsavel_id: "",
        tipo_ajuda: "",
        frequencia_ajuda: "",
        observacoes: "",
        ativo: true,
      });
      setMembrosInline([]);
    }
  }, [familia, form]);

  const addMemberFromChurch = (member: any) => {
    if (!selectedParentesco) {
      toast.error("Selecione o parentesco antes de adicionar");
      return;
    }
    if (membrosInline.some((m) => m.member_id === member.id)) {
      toast.error("Este membro já foi adicionado");
      return;
    }
    setMembrosInline((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        nome: member.full_name,
        parentesco: selectedParentesco,
        member_id: member.id,
        data_nascimento: member.birth_date || "",
        genero: member.genero || "",
      },
    ]);
    setMemberSearch("");
    setSelectedParentesco("");
  };

  const addExternalMember = () => {
    if (!externoNome.trim()) {
      toast.error("Informe o nome do membro");
      return;
    }
    if (!externoParentesco) {
      toast.error("Selecione o parentesco");
      return;
    }
    setMembrosInline((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        nome: externoNome.trim(),
        parentesco: externoParentesco,
        data_nascimento: externoNascimento || "",
        genero: externoGenero || "",
      },
    ]);
    setExternoNome("");
    setExternoParentesco("");
    setExternoNascimento("");
    setExternoGenero("");
  };

  const removeMembro = (id: string) => {
    setMembrosInline((prev) => prev.filter((m) => m.id !== id));
  };

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        ...values,
        nome_familia: formatNameField(values.nome_familia),
        endereco: values.endereco ? toTitleCase(values.endereco) : values.endereco,
        bairro: values.bairro ? toTitleCase(values.bairro) : values.bairro,
        cidade: values.cidade ? toTitleCase(values.cidade) : values.cidade,
        estado: values.estado?.toUpperCase() || values.estado,
        casa_refugio_id: values.casa_refugio_id || null,
        lider_responsavel_id: values.lider_responsavel_id || null,
      };

      let familiaId: string;

      if (isEditing) {
        const { error } = await supabase
          .from("acao_social_familias")
          .update(payload)
          .eq("id", familia.id);
        if (error) throw error;
        familiaId = familia.id;

        // Delete existing members and re-insert
        await supabase
          .from("acao_social_familia_membros")
          .delete()
          .eq("familia_id", familiaId);
      } else {
        const { data, error } = await supabase
          .from("acao_social_familias")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        familiaId = data.id;
      }

      // Insert family members
      if (membrosInline.length > 0) {
        const membrosPayload = membrosInline.map((m) => ({
          familia_id: familiaId,
          nome: formatNameField(m.nome),
          parentesco: m.parentesco || null,
          data_nascimento: m.data_nascimento || null,
          genero: m.genero || null,
        }));
        const { error: membrosError } = await supabase
          .from("acao_social_familia_membros")
          .insert(membrosPayload);
        if (membrosError) throw membrosError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["acao_social_familias"] });
      queryClient.invalidateQueries({ queryKey: ["acao_social_familia_membros_count"] });
      toast.success(isEditing ? "Família atualizada" : "Família cadastrada");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erro ao salvar família");
    },
  });

  const onSubmit = (values: any) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Família" : "Nova Família"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome_familia"
              rules={{ required: "Nome é obrigatório" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Família *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Família Silva" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="(00) 0000-0000"
                        onChange={(e) => field.onChange(formatPhone(e.target.value))}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="whatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="(00) 00000-0000"
                        onChange={(e) => field.onChange(formatPhone(e.target.value))}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="email@exemplo.com" />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="cep"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="00000-000"
                        onChange={(e) => field.onChange(formatCep(e.target.value))}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="endereco"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Rua, Avenida..." />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="numero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="complemento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complemento</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bairro"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bairro</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="casa_refugio_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Casa Refúgio que frequenta</FormLabel>
                    <FormControl>
                      <ClearableSelect
                        value={field.value || null}
                        onChange={(val) => field.onChange(val || "")}
                        options={(casasRefugio || []).map((casa) => ({
                          value: casa.id,
                          label: casa.name,
                        }))}
                        placeholder="Selecione..."
                        emptyLabel="Nenhuma"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lider_responsavel_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Líder Responsável</FormLabel>
                    <FormControl>
                      <ClearableSelect
                        value={field.value || null}
                        onChange={(val) => field.onChange(val || "")}
                        options={(lideres || []).map((lider) => ({
                          value: lider.id,
                          label: lider.full_name,
                        }))}
                        placeholder="Selecione..."
                        emptyLabel="Nenhum"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipo_ajuda"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Ajuda</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tiposAjuda.map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {tipo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="frequencia_ajuda"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequência da Ajuda</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {frequencias.map((freq) => (
                          <SelectItem key={freq} value={freq}>
                            {freq}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Família ativa</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Define se a família está recebendo ajuda atualmente
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Membros da família */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Membros da Família</h3>
                <Badge variant="secondary" className="ml-auto">{membrosInline.length}</Badge>
              </div>

              {/* Lista de membros adicionados */}
              {membrosInline.length > 0 && (
                <div className="space-y-2">
                  {membrosInline.map((membro) => (
                    <div
                      key={membro.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50 border"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{membro.nome}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{membro.parentesco}</Badge>
                          {membro.member_id && (
                            <Badge variant="secondary" className="text-xs">Membro da Igreja</Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeMembro(membro.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Tabs para adicionar membro */}
              <Tabs value={origemTab} onValueChange={(v) => setOrigemTab(v as "igreja" | "externo")}>
                <TabsList className="w-full">
                  <TabsTrigger value="igreja" className="flex-1 gap-1 text-xs">
                    <Search className="w-3 h-3" />
                    Membro da Igreja
                  </TabsTrigger>
                  <TabsTrigger value="externo" className="flex-1 gap-1 text-xs">
                    <UserPlus className="w-3 h-3" />
                    Pessoa Externa
                  </TabsTrigger>
                </TabsList>

                {/* Membro da Igreja */}
                <TabsContent value="igreja" className="space-y-3 mt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">Buscar Membro</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Digite o nome..."
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Parentesco</label>
                      <Select value={selectedParentesco} onValueChange={setSelectedParentesco}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {PARENTESCOS.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {memberSearch.length >= 2 && membersSearch.length > 0 && (
                    <div className="border rounded-md max-h-40 overflow-y-auto">
                      {membersSearch.map((m) => {
                        const alreadyAdded = membrosInline.some((mi) => mi.member_id === m.id);
                        return (
                          <div
                            key={m.id}
                            className={`flex items-center justify-between p-2 hover:bg-muted/50 border-b last:border-b-0 ${
                              alreadyAdded ? "opacity-50" : "cursor-pointer"
                            }`}
                            onClick={() => !alreadyAdded && addMemberFromChurch(m)}
                          >
                            <span className="text-sm font-medium">{m.full_name}</span>
                            {alreadyAdded ? (
                              <Badge variant="outline" className="text-xs">Adicionado</Badge>
                            ) : (
                              <Plus className="w-4 h-4 text-primary" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {memberSearch.length >= 2 && membersSearch.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">Nenhum membro encontrado</p>
                  )}
                </TabsContent>

                {/* Pessoa Externa */}
                <TabsContent value="externo" className="space-y-3 mt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">Nome Completo *</label>
                      <Input
                        placeholder="Nome do membro"
                        value={externoNome}
                        onChange={(e) => setExternoNome(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Parentesco *</label>
                      <Select value={externoParentesco} onValueChange={setExternoParentesco}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {PARENTESCOS.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">Data de Nascimento</label>
                      <Input
                        type="date"
                        value={externoNascimento}
                        onChange={(e) => setExternoNascimento(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Gênero</label>
                      <Select value={externoGenero} onValueChange={setExternoGenero}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Masculino">Masculino</SelectItem>
                          <SelectItem value="Feminino">Feminino</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addExternalMember}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Adicionar Membro
                  </Button>
                </TabsContent>
              </Tabs>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
