import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const TIPOS_INSCRICAO = [
  { value: "membro", label: "Membro" },
  { value: "nao_membro", label: "Não membro" },
  { value: "familia", label: "Família" },
  { value: "equipe", label: "Equipe (apoio/serviço)" },
  { value: "ministrador", label: "Ministrador" },
];

const CAMPOS_FORMULARIO_OPTIONS = [
  { key: "nome", label: "Nome completo" },
  { key: "telefone", label: "Telefone / WhatsApp" },
  { key: "genero", label: "Gênero" },
  { key: "telefone_emergencia", label: "Telefone de Emergência" },
  { key: "cpf", label: "CPF" },
  { key: "rg", label: "RG" },
  { key: "is_menor", label: "Menor de idade / Responsável" },
  { key: "alergia", label: "Alergia alimentar" },
  { key: "medicamento", label: "Medicamento" },
  { key: "preferencia_beliche", label: "Preferência de beliche" },
  { key: "forma_pagamento", label: "Forma de Pagamento" },
  { key: "igreja_congrega", label: "Igreja onde congrega" },
  { key: "ministerio_igreja", label: "Ministério na igreja" },
  { key: "observacoes", label: "Observações" },
];

const ALL_CAMPOS_KEYS = CAMPOS_FORMULARIO_OPTIONS.map(c => c.key);

const PREFIXOS_REFERENCIA: Record<string, string> = {
  "MAN": "Manaim",
  "IMF": "Impacto Feminino",
  "IMM": "Impacto Masculino",
  "IMJ": "Impacto Jovem",
  "ACK": "Acampa Kids",
  "RTK": "Retiro Kids",
  "RGT": "Retiro GT",
  "RJO": "Retiro Jovem",
};

const formSchema = z.object({
  titulo: z.string().min(1, "Título é obrigatório"),
  data_inicio: z.string().min(1, "Data de início é obrigatória"),
  data_fim: z.string().optional(),
  tipo: z.string().min(1, "Tipo é obrigatório"),
  local: z.string().optional(),
  descricao: z.string().optional(),
  valor_inscricao: z.string().optional(),
  limite_vagas: z.string().optional(),
  tipos_inscricao: z.array(z.string()).min(1, "Selecione pelo menos um tipo de inscrição"),
  tem_custo: z.boolean().optional(),
  valores_por_tipo: z.record(z.string(), z.string()).optional(),
  prefixo_referencia: z.string().optional(),
  link_grupo_whatsapp: z.string().optional(),
  link_grupo_whatsapp_participantes: z.string().optional(),
  link_grupo_whatsapp_equipe: z.string().optional(),
  link_grupo_whatsapp_ministradores: z.string().optional(),
  campos_formulario: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

const TIPOS_IMPACTO = [
  { value: "mulheres", label: "Impacto Feminino" },
  { value: "homens", label: "Impacto Masculino" },
  { value: "criancas", label: "Crianças" },
  { value: "jovens", label: "Jovens" },
  { value: "adolescentes", label: "Adolescentes" },
  { value: "casais", label: "Casais" },
];

interface ImpactoEventoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evento?: any;
}

const ImpactoEventoFormDialog = ({ open, onOpenChange, evento }: ImpactoEventoFormDialogProps) => {
  const queryClient = useQueryClient();
  const isEditing = !!evento;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titulo: "",
      data_inicio: "",
      data_fim: "",
      tipo: "",
      local: "",
      descricao: "",
      valor_inscricao: "",
      limite_vagas: "",
      tipos_inscricao: ["membro", "nao_membro", "familia", "equipe", "ministrador"],
      tem_custo: false,
      valores_por_tipo: {},
      prefixo_referencia: "",
      link_grupo_whatsapp: "",
      link_grupo_whatsapp_participantes: "",
      link_grupo_whatsapp_equipe: "",
      link_grupo_whatsapp_ministradores: "",
      campos_formulario: [...ALL_CAMPOS_KEYS],
    },
  });

  useEffect(() => {
    if (open && evento) {
      form.reset({
        titulo: evento.titulo || "",
        data_inicio: evento.data_inicio || "",
        data_fim: evento.data_fim || "",
        tipo: evento.tipo || "",
        local: evento.local || "",
        descricao: evento.descricao || "",
        valor_inscricao: evento.valor_inscricao?.toString() || "",
        limite_vagas: evento.limite_vagas?.toString() || "",
        tipos_inscricao: evento.tipos_inscricao || ["membro", "nao_membro", "familia", "equipe", "ministrador"],
        tem_custo: evento.tem_custo || false,
        valores_por_tipo: evento.valores_por_tipo || {},
        prefixo_referencia: evento.prefixo_referencia || "",
        link_grupo_whatsapp: evento.link_grupo_whatsapp || "",
        link_grupo_whatsapp_participantes: evento.link_grupo_whatsapp_participantes || "",
        link_grupo_whatsapp_equipe: evento.link_grupo_whatsapp_equipe || "",
        link_grupo_whatsapp_ministradores: evento.link_grupo_whatsapp_ministradores || "",
        campos_formulario: evento.campos_formulario || [...ALL_CAMPOS_KEYS],
      });
    } else if (open && !evento) {
      form.reset({
        titulo: "",
        data_inicio: "",
        data_fim: "",
        tipo: "",
        local: "",
        descricao: "",
        valor_inscricao: "",
        limite_vagas: "",
        tipos_inscricao: ["membro", "nao_membro", "familia", "equipe", "ministrador"],
        tem_custo: false,
        valores_por_tipo: {},
        prefixo_referencia: "",
        link_grupo_whatsapp: "",
        link_grupo_whatsapp_participantes: "",
        link_grupo_whatsapp_equipe: "",
        link_grupo_whatsapp_ministradores: "",
        campos_formulario: [...ALL_CAMPOS_KEYS],
      });
    }
  }, [open, evento, form]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: any = {
        titulo: values.titulo,
        data_inicio: values.data_inicio,
        data_fim: values.data_fim || null,
        tipo: values.tipo,
        local: values.local || null,
        descricao: values.descricao || null,
        valor_inscricao: values.valor_inscricao ? parseFloat(values.valor_inscricao) : 0,
        limite_vagas: values.limite_vagas ? parseInt(values.limite_vagas) : null,
        tipos_inscricao: values.tipos_inscricao,
        tem_custo: values.tem_custo || false,
        valores_por_tipo: values.tem_custo ? (values.valores_por_tipo || {}) : {},
        prefixo_referencia: values.prefixo_referencia || null,
        link_grupo_whatsapp: values.link_grupo_whatsapp?.trim() || null,
        link_grupo_whatsapp_participantes: values.link_grupo_whatsapp_participantes?.trim() || null,
        link_grupo_whatsapp_equipe: values.link_grupo_whatsapp_equipe?.trim() || null,
        link_grupo_whatsapp_ministradores: values.link_grupo_whatsapp_ministradores?.trim() || null,
        campos_formulario: values.campos_formulario || ALL_CAMPOS_KEYS,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("impacto_eventos")
          .update(payload)
          .eq("id", evento.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("impacto_eventos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? "Evento atualizado!" : "Evento criado!");
      queryClient.invalidateQueries({ queryKey: ["impacto-eventos"] });
      form.reset();
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erro ao salvar evento");
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Evento" : "Novo Evento de Impacto"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Impacto Mulheres 2026" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TIPOS_IMPACTO.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="data_inicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Início *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="data_fim"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Fim</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="local"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Local</FormLabel>
                  <FormControl>
                    <Input placeholder="Local do evento" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="limite_vagas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Limite de Vagas</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Ilimitado" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="prefixo_referencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prefixo Referência</FormLabel>
                    <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {Object.entries(PREFIXOS_REFERENCIA).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {key} — {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tem_custo"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="cursor-pointer">$ Evento tem custo</FormLabel>
                </FormItem>
              )}
            />

            {form.watch("tem_custo") && (
              <div className="space-y-3 border rounded-md p-3 bg-muted/30">
                <FormField
                  control={form.control}
                  name="valor_inscricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Padrão (R$)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0,00" className="max-w-[160px]" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="space-y-2 border rounded-md p-3 bg-background">
                  <p className="text-sm font-medium">Valores por Tipo de Inscrição</p>
                  <p className="text-xs text-muted-foreground">Deixe vazio para usar o valor padrão</p>
                  {TIPOS_INSCRICAO.filter(t => (form.watch("tipos_inscricao") || []).includes(t.value)).map((tipo) => (
                    <div key={tipo.value} className="flex items-center gap-3">
                      <Label className="min-w-[140px] text-sm">{tipo.label}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        className="max-w-[120px]"
                        value={form.watch(`valores_por_tipo.${tipo.value}`) || ""}
                        onChange={(e) => {
                          const current = form.getValues("valores_por_tipo") || {};
                          form.setValue("valores_por_tipo", { ...current, [tipo.value]: e.target.value });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descrição do evento..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3 border rounded-md p-3 bg-muted/30">
              <p className="text-sm font-medium">Links por tipo de inscrição</p>
              <p className="text-xs text-muted-foreground">
                Cada inscrito recebe automaticamente o link do grupo correspondente ao seu tipo de inscrição.
              </p>
              <FormField
                control={form.control}
                name="link_grupo_whatsapp_participantes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Participantes (Membros e Não Membros)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://chat.whatsapp.com/..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="link_grupo_whatsapp_equipe"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Equipe / Apoio</FormLabel>
                    <FormControl>
                      <Input placeholder="https://chat.whatsapp.com/..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="link_grupo_whatsapp_ministradores"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Ministradores</FormLabel>
                    <FormControl>
                      <Input placeholder="https://chat.whatsapp.com/..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tipos_inscricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipos de Inscrição Permitidos *</FormLabel>
                  <div className="space-y-2">
                    {TIPOS_INSCRICAO.map((tipo) => (
                      <div key={tipo.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`tipo_insc_${tipo.value}`}
                          checked={field.value?.includes(tipo.value)}
                          onCheckedChange={(checked) => {
                            const current = field.value || [];
                            if (checked) {
                              field.onChange([...current, tipo.value]);
                            } else {
                              field.onChange(current.filter((v: string) => v !== tipo.value));
                            }
                          }}
                        />
                        <Label htmlFor={`tipo_insc_${tipo.value}`} className="cursor-pointer text-sm">
                          {tipo.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="campos_formulario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campos do Formulário de Inscrição</FormLabel>
                  <p className="text-xs text-muted-foreground mb-2">
                    Marque os campos que deseja exibir no formulário público de inscrição
                  </p>
                  <div className="space-y-2 border rounded-md p-3 bg-muted/30 max-h-[200px] overflow-y-auto">
                    <div className="flex items-center gap-2 mb-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2"
                        onClick={() => field.onChange([...ALL_CAMPOS_KEYS])}
                      >
                        Marcar todos
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2"
                        onClick={() => field.onChange([])}
                      >
                        Desmarcar todos
                      </Button>
                    </div>
                    {CAMPOS_FORMULARIO_OPTIONS.map((campo) => (
                      <div key={campo.key} className="flex items-center gap-2">
                        <Checkbox
                          id={`campo_${campo.key}`}
                          checked={field.value?.includes(campo.key)}
                          onCheckedChange={(checked) => {
                            const current = field.value || [];
                            if (checked) {
                              field.onChange([...current, campo.key]);
                            } else {
                              field.onChange(current.filter((v: string) => v !== campo.key));
                            }
                          }}
                        />
                        <Label htmlFor={`campo_${campo.key}`} className="cursor-pointer text-sm">
                          {campo.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : isEditing ? "Atualizar" : "Criar Evento"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ImpactoEventoFormDialog;
