import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, X, Upload, Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatPhone, formatCep, unformatPhone, unformatCep } from "@/lib/masks";

const FUNCTION_TYPES = [
  { value: "lider_casa_refugio", label: "Líder de Casa Refúgio" },
  { value: "lider_ministerio", label: "Líder de Ministério" },
  { value: "pastor_geral", label: "Pastor Geral" },
  { value: "pastor_auxiliar", label: "Pastor Auxiliar" },
  { value: "supervisor_condominio", label: "Supervisor de Condomínio" },
  { value: "sindico_condominio", label: "Síndico de Condomínio" },
  { value: "integrante_ministerio", label: "Integrante de Ministério" },
] as const;

type FunctionType = typeof FUNCTION_TYPES[number]["value"];

interface MemberFunction {
  id?: string;
  function_type: FunctionType;
  ministry_id?: string | null;
  casa_refugio_id?: string | null;
  condominio_id?: string | null;
}

const formSchema = z.object({
  full_name: z.string().min(1, "Nome é obrigatório"),
  birth_date: z.string().optional(),
  cep: z.string().optional(),
  address: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
});

type FormData = z.infer<typeof formSchema>;

interface MemberFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: {
    id: string;
    full_name: string;
    birth_date: string | null;
    email: string | null;
    whatsapp: string | null;
    photo_url: string | null;
    city: string | null;
    state: string | null;
  } | null;
}

const MemberFormDialog = ({ open, onOpenChange, member }: MemberFormDialogProps) => {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [memberFunctions, setMemberFunctions] = useState<MemberFunction[]>([]);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      birth_date: "",
      cep: "",
      address: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      whatsapp: "",
      email: "",
    },
  });

  // Fetch member details if editing
  useEffect(() => {
    const fetchMemberDetails = async () => {
      if (member) {
        const { data: memberData } = await supabase
          .from("members")
          .select("*")
          .eq("id", member.id)
          .single();

        if (memberData) {
          form.reset({
            full_name: memberData.full_name,
            birth_date: memberData.birth_date || "",
            cep: memberData.cep ? formatCep(memberData.cep) : "",
            address: memberData.address || "",
            number: memberData.number || "",
            complement: memberData.complement || "",
            neighborhood: memberData.neighborhood || "",
            city: memberData.city || "",
            state: memberData.state || "",
            whatsapp: memberData.whatsapp ? formatPhone(memberData.whatsapp) : "",
            email: memberData.email || "",
          });
          setPhotoPreview(memberData.photo_url);
        }

        const { data: functionsData } = await supabase
          .from("member_functions")
          .select("*")
          .eq("member_id", member.id);

        if (functionsData) {
          setMemberFunctions(functionsData.map(f => ({
            id: f.id,
            function_type: f.function_type as FunctionType,
            ministry_id: f.ministry_id,
            casa_refugio_id: f.casa_refugio_id,
            condominio_id: f.condominio_id,
          })));
        }
      } else {
        form.reset();
        setPhotoPreview(null);
        setMemberFunctions([]);
      }
    };

    if (open) {
      fetchMemberDetails();
    }
  }, [member, open, form]);

  // Fetch options for functions
  const { data: ministries = [] } = useQuery({
    queryKey: ["ministries"],
    queryFn: async () => {
      const { data } = await supabase.from("ministries").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: casasRefugio = [] } = useQuery({
    queryKey: ["casas_refugio"],
    queryFn: async () => {
      const { data } = await supabase.from("casas_refugio").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: condominios = [] } = useQuery({
    queryKey: ["condominios"],
    queryFn: async () => {
      const { data } = await supabase.from("condominios").select("id, name").order("name");
      return data || [];
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      let photoUrl = member?.photo_url || null;

      // Upload photo if new one selected
      if (photoFile) {
        const fileExt = photoFile.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("member-photos")
          .upload(fileName, photoFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("member-photos")
          .getPublicUrl(fileName);

        photoUrl = urlData.publicUrl;
      }

      const memberData = {
        full_name: data.full_name,
        birth_date: data.birth_date || null,
        cep: data.cep ? unformatCep(data.cep) : null,
        address: data.address || null,
        number: data.number || null,
        complement: data.complement || null,
        neighborhood: data.neighborhood || null,
        city: data.city || null,
        state: data.state || null,
        whatsapp: data.whatsapp ? unformatPhone(data.whatsapp) : null,
        email: data.email || null,
        photo_url: photoUrl,
      };

      let memberId: string;

      if (member) {
        const { error } = await supabase
          .from("members")
          .update(memberData)
          .eq("id", member.id);
        if (error) throw error;
        memberId = member.id;

        // Delete existing functions
        await supabase.from("member_functions").delete().eq("member_id", member.id);
      } else {
        const { data: newMember, error } = await supabase
          .from("members")
          .insert(memberData)
          .select()
          .single();
        if (error) throw error;
        memberId = newMember.id;
      }

      // Insert new functions
      if (memberFunctions.length > 0) {
        const functionsToInsert = memberFunctions.map((f) => ({
          member_id: memberId,
          function_type: f.function_type,
          ministry_id: f.ministry_id || null,
          casa_refugio_id: f.casa_refugio_id || null,
          condominio_id: f.condominio_id || null,
        }));

        const { error: funcError } = await supabase
          .from("member_functions")
          .insert(functionsToInsert);

        if (funcError) throw funcError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast({ title: member ? "Membro atualizado!" : "Membro cadastrado!" });
      onOpenChange(false);
      setPhotoFile(null);
      setPhotoPreview(null);
      setMemberFunctions([]);
    },
    onError: (error) => {
      toast({ title: "Erro ao salvar membro", description: String(error), variant: "destructive" });
    },
  });

  const handleCepBlur = async () => {
    const cepValue = form.getValues("cep");
    const cep = cepValue ? unformatCep(cepValue) : "";
    if (cep.length !== 8) return;

    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        form.setValue("address", data.logradouro || "");
        form.setValue("neighborhood", data.bairro || "");
        form.setValue("city", data.localidade || "");
        form.setValue("state", data.uf || "");
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addFunction = () => {
    setMemberFunctions([...memberFunctions, { function_type: "integrante_ministerio" }]);
  };

  const removeFunction = (index: number) => {
    setMemberFunctions(memberFunctions.filter((_, i) => i !== index));
  };

  const updateFunction = (index: number, updates: Partial<MemberFunction>) => {
    const updated = [...memberFunctions];
    updated[index] = { ...updated[index], ...updates };
    // Clear related IDs when function type changes
    if (updates.function_type) {
      updated[index].ministry_id = null;
      updated[index].casa_refugio_id = null;
      updated[index].condominio_id = null;
    }
    setMemberFunctions(updated);
  };

  const getFunctionRelatedOptions = (funcType: FunctionType) => {
    switch (funcType) {
      case "lider_ministerio":
      case "integrante_ministerio":
        return { type: "ministry", options: ministries };
      case "lider_casa_refugio":
        return { type: "casa_refugio", options: casasRefugio };
      case "supervisor_condominio":
      case "sindico_condominio":
        return { type: "condominio", options: condominios };
      default:
        return null;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{member ? "Editar Membro" : "Novo Membro"}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
              {/* Photo */}
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20 border-2 border-secondary/30 shrink-0">
                  <AvatarImage 
                    src={photoPreview || undefined} 
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-secondary/20 text-secondary text-xl">
                    {form.watch("full_name") ? getInitials(form.watch("full_name")) : "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                    id="photo-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("photo-upload")?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Foto
                  </Button>
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Nome Completo *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birth_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Nascimento</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
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
                          placeholder="(00) 00000-0000" 
                          {...field}
                          onChange={(e) => field.onChange(formatPhone(e.target.value))}
                          maxLength={16}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Address */}
              <div className="space-y-4">
                <h4 className="font-medium text-foreground">Endereço</h4>
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="cep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              placeholder="00000-000"
                              onChange={(e) => field.onChange(formatCep(e.target.value))}
                              onBlur={handleCepBlur}
                              maxLength={9}
                            />
                            {isLoadingCep && (
                              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Logradouro</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="complement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complemento</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="neighborhood"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bairro</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <FormControl>
                          <Input {...field} maxLength={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Functions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-foreground">Funções na Igreja</h4>
                  <Button type="button" variant="outline" size="sm" onClick={addFunction}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Função
                  </Button>
                </div>

                {memberFunctions.map((func, index) => {
                  const relatedOptions = getFunctionRelatedOptions(func.function_type);
                  return (
                    <div key={index} className="flex gap-2 items-start p-4 rounded-lg bg-background border border-border">
                      <div className="flex-1 grid gap-2 sm:grid-cols-2">
                        <Select
                          value={func.function_type}
                          onValueChange={(value) => updateFunction(index, { function_type: value as FunctionType })}
                        >
                          <SelectTrigger className="bg-card">
                            <SelectValue placeholder="Selecione a função" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border z-50">
                            {FUNCTION_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {relatedOptions && relatedOptions.options.length > 0 && (
                          <Select
                            value={
                              relatedOptions.type === "ministry"
                                ? func.ministry_id || ""
                                : relatedOptions.type === "casa_refugio"
                                ? func.casa_refugio_id || ""
                                : func.condominio_id || ""
                            }
                            onValueChange={(value) => {
                              if (relatedOptions.type === "ministry") {
                                updateFunction(index, { ministry_id: value });
                              } else if (relatedOptions.type === "casa_refugio") {
                                updateFunction(index, { casa_refugio_id: value });
                              } else {
                                updateFunction(index, { condominio_id: value });
                              }
                            }}
                          >
                            <SelectTrigger className="bg-card">
                              <SelectValue placeholder={`Selecione ${
                                relatedOptions.type === "ministry" ? "o ministério" :
                                relatedOptions.type === "casa_refugio" ? "a casa refúgio" : "o condomínio"
                              }`} />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border z-50">
                              {relatedOptions.options.map((opt) => (
                                <SelectItem key={opt.id} value={opt.id}>
                                  {opt.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive hover:text-destructive"
                        onClick={() => removeFunction(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}

                {memberFunctions.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma função adicionada
                  </p>
                )}
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-secondary hover:bg-secondary/90" disabled={mutation.isPending}>
                  {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {member ? "Salvar" : "Cadastrar"}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default MemberFormDialog;
