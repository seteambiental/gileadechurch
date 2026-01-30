import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, X, Loader2, UserCog } from "lucide-react";
import { formatNameField, toTitleCase } from "@/lib/text-utils";
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
  FormDescription,
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
import { formatPhone, formatCep, unformatPhone, unformatCep, formatCPF } from "@/lib/masks";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useCepLookup } from "@/hooks/useCepLookup";
import { DateInput } from "@/components/ui/date-input";
import { CameraPhotoInput } from "@/components/ui/camera-photo-input";

const FUNCTION_TYPES = [
  { value: "membro", label: "Membro" },
  { value: "lider_casa_refugio", label: "Líder de Casa Refúgio" },
  { value: "lider_ministerio", label: "Líder de Ministério" },
  { value: "pastor_geral", label: "Pastor Geral" },
  { value: "pastor_auxiliar", label: "Pastor Auxiliar" },
  { value: "supervisor_condominio", label: "Supervisor de Condomínio" },
  { value: "sindico_condominio", label: "Síndico de Condomínio" },
  { value: "integrante_ministerio", label: "Integrante de Ministério" },
] as const;

const ROLE_TYPES = [
  { value: "membro", label: "Membro", description: "Acesso apenas ao portal de membros" },
  { value: "integrante_ministerio", label: "Integrante de Ministério", description: "Visualização do ministério (sem edição)" },
  { value: "lider_ministerio", label: "Líder de Ministério", description: "CRUD completo no ministério" },
  { value: "lider_casa_refugio", label: "Líder de Casa Refúgio", description: "Acesso à sua casa refúgio" },
  { value: "supervisor_casa_refugio", label: "Supervisor de Casa Refúgio", description: "Acesso às casas que supervisiona" },
  { value: "lider_condominio", label: "Líder de Condomínio", description: "Acesso ao condomínio" },
  { value: "pastor_auxiliar", label: "Pastor Auxiliar", description: "Acesso completo" },
  { value: "pastor_geral", label: "Pastor Geral", description: "Acesso completo" },
  { value: "admin", label: "Administrador", description: "Acesso completo + desenvolvimento" },
] as const;

// Funções específicas por ministério (baseado no nome do ministério)
const MINISTRY_SPECIFIC_FUNCTIONS: Record<string, { value: string; label: string }[]> = {
  "louvor": [
    { value: "vocal", label: "Vocal" },
    { value: "backing_vocal", label: "Backing Vocal" },
    { value: "violao", label: "Violão" },
    { value: "guitarra", label: "Guitarra" },
    { value: "baixo", label: "Baixo" },
    { value: "bateria", label: "Bateria" },
    { value: "teclado", label: "Teclado" },
    { value: "percussao", label: "Percussão" },
    { value: "saxofone", label: "Saxofone" },
    { value: "trompete", label: "Trompete" },
  ],
  "infantil": [
    { value: "lider", label: "Líder" },
    { value: "professor", label: "Professor" },
    { value: "auxiliar", label: "Auxiliar" },
  ],
  "kids": [
    { value: "lider", label: "Líder" },
    { value: "professor", label: "Professor" },
    { value: "auxiliar", label: "Auxiliar" },
  ],
  "mídia": [
    { value: "audio", label: "Áudio" },
    { value: "video", label: "Vídeo" },
    { value: "redes_sociais", label: "Redes Sociais" },
  ],
  "midia": [
    { value: "audio", label: "Áudio" },
    { value: "video", label: "Vídeo" },
    { value: "redes_sociais", label: "Redes Sociais" },
  ],
  "casa refúgio": [
    { value: "lider", label: "Líder" },
    { value: "colider", label: "Co-líder" },
    { value: "secretario", label: "Secretário" },
  ],
  "ensino": [
    { value: "professor", label: "Professor" },
    { value: "midia", label: "Mídia" },
  ],
  "jovens": [
    { value: "lider", label: "Líder" },
    { value: "colider", label: "Co-líder" },
  ],
  "impacto": [
    { value: "ministrador", label: "Ministrador" },
    { value: "apoio", label: "Apoio" },
  ],
  "dança": [
    { value: "lider", label: "Líder" },
    { value: "dançarino", label: "Dançarino(a)" },
  ],
  "estacionamento": [
    { value: "coordenador", label: "Coordenador" },
    { value: "orientador", label: "Orientador de Vagas" },
    { value: "manobrista", label: "Manobrista" },
  ],
  "organização": [
    { value: "coordenador", label: "Coordenador" },
    { value: "organizador", label: "Organizador" },
    { value: "acomodacao", label: "Acomodação" },
    { value: "som", label: "Som/Microfone" },
  ],
  "recepção": [
    { value: "coordenador", label: "Coordenador" },
    { value: "recepcionista", label: "Recepcionista" },
    { value: "informacao", label: "Informações" },
  ],
};

// Função para encontrar funções específicas pelo nome do ministério
const getMinistrySpecificFunctions = (ministryName: string | undefined) => {
  if (!ministryName) return null;
  const normalizedName = ministryName.toLowerCase().trim();
  
  for (const [key, functions] of Object.entries(MINISTRY_SPECIFIC_FUNCTIONS)) {
    if (normalizedName.includes(key)) {
      return functions;
    }
  }
  return null;
};

type FunctionType = typeof FUNCTION_TYPES[number]["value"];

interface MemberFunction {
  id?: string;
  function_type: FunctionType;
  ministry_id?: string | null;
  casa_refugio_id?: string | null;
  condominio_id?: string | null;
  subfuncao?: string | null;
}

const formSchema = z.object({
  full_name: z.string().min(1, "Nome é obrigatório"),
  genero: z.string().optional(),
  birth_date: z.string().optional(),
  member_since: z.string().optional(),
  cep: z.string().optional(),
  address: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  cpf: z.string().optional(),
  // Campos para criar usuário do sistema
  criar_usuario: z.boolean().optional(),
  perfil_usuario: z.enum(["membro", "integrante_ministerio", "lider_ministerio", "lider_casa_refugio", "supervisor_casa_refugio", "lider_condominio", "pastor_auxiliar", "pastor_geral", "admin"]).optional(),
  // Interesse em servir nos ministérios
  nao_pretende_servir: z.boolean().optional(),
  ministerios_interesse: z.array(z.string()).optional(),
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
    user_id?: string | null;
  } | null;
}

const MemberFormDialog = ({ open, onOpenChange, member }: MemberFormDialogProps) => {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [memberFunctions, setMemberFunctions] = useState<MemberFunction[]>([]);
  const [selectedMinistryIds, setSelectedMinistryIds] = useState<string[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      genero: "",
      birth_date: "",
      member_since: "",
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
      criar_usuario: false,
      perfil_usuario: undefined,
      nao_pretende_servir: false,
      ministerios_interesse: [],
    },
  });

  const criarUsuario = form.watch("criar_usuario");
  const perfilUsuario = form.watch("perfil_usuario");

  const { isLoading: isLoadingCep } = useCepLookup(form.watch("cep"), ({ address, neighborhood, city, state }) => {
    form.setValue("address", address || "");
    form.setValue("neighborhood", neighborhood || "");
    form.setValue("city", city || "");
    form.setValue("state", state || "");
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
            genero: memberData.genero || "",
            birth_date: memberData.birth_date || "",
            member_since: memberData.member_since || "",
            cep: memberData.cep ? formatCep(memberData.cep) : "",
            address: memberData.address || "",
            number: memberData.number || "",
            complement: memberData.complement || "",
            neighborhood: memberData.neighborhood || "",
            city: memberData.city || "",
            state: memberData.state || "",
            whatsapp: memberData.whatsapp ? formatPhone(memberData.whatsapp) : "",
            email: memberData.email || "",
            cpf: (memberData as any).cpf ? formatCPF((memberData as any).cpf) : "",
            criar_usuario: false,
            perfil_usuario: undefined,
            nao_pretende_servir: (memberData as any).nao_pretende_servir || false,
            ministerios_interesse: (memberData as any).ministerios_interesse || [],
          });
          setPhotoPreview(memberData.photo_url);

          // Buscar o perfil atual do usuário se ele já tem acesso ao sistema
          if (memberData.user_id) {
            const { data: roleData } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", memberData.user_id)
              .maybeSingle();
            
            if (roleData) {
              setCurrentUserRole(roleData.role);
            } else {
              setCurrentUserRole("membro"); // Default se não tiver role
            }
          } else {
            setCurrentUserRole(null);
          }
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
            subfuncao: f.subfuncao,
          })));
        }
      } else {
        form.reset();
        setPhotoPreview(null);
        setMemberFunctions([]);
        setSelectedMinistryIds([]);
        setCurrentUserRole(null);
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
        full_name: formatNameField(data.full_name),
        genero: data.genero || null,
        birth_date: data.birth_date || null,
        member_since: data.member_since || null,
        cep: data.cep ? unformatCep(data.cep) : null,
        address: data.address ? toTitleCase(data.address) : null,
        number: data.number || null,
        complement: data.complement || null,
        neighborhood: data.neighborhood ? toTitleCase(data.neighborhood) : null,
        city: data.city ? toTitleCase(data.city) : null,
        state: data.state?.toUpperCase() || null,
        whatsapp: data.whatsapp ? unformatPhone(data.whatsapp) : null,
        email: data.email || null,
        photo_url: photoUrl,
        cpf: data.cpf ? data.cpf.replace(/\D/g, "") : null,
        nao_pretende_servir: data.nao_pretende_servir || false,
        ministerios_interesse: data.ministerios_interesse || [],
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
          subfuncao: f.subfuncao || null,
        }));

        const { error: funcError } = await supabase
          .from("member_functions")
          .insert(functionsToInsert);

        if (funcError) throw funcError;
      }

      // Criar usuário do sistema automaticamente
      if (data.criar_usuario && data.email) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const session = sessionData.session;

          // Se estiver usando bypass ou o usuário não estiver autenticado, não existe JWT válido
          if (!session?.access_token) {
            return {
              criarUsuario: true,
              erroUsuario: true,
              erroUsuarioMsg: "Para criar usuário do sistema, é necessário estar logado.",
            };
          }

          const { data: result, error: funcError } = await supabase.functions.invoke(
            "criar-usuario-membro",
            {
              body: {
                email: data.email,
                cpf: data.cpf ? data.cpf.replace(/\D/g, "") : null,
                member_id: memberId,
                perfil: data.perfil_usuario || "membro",
              },
            }
          );

          if (funcError) {
            console.error("Erro ao criar usuário:", funcError);
            throw new Error(funcError.message || "Erro ao criar usuário no sistema");
          }

          return {
            criarUsuario: true,
            usuarioCriado: !result.was_existing,
            senhaDefault: result.default_password,
          };
        } catch (err) {
          console.error("Erro na criação de usuário:", err);
          // Não impede o cadastro do membro, apenas avisa
          return {
            criarUsuario: true,
            erroUsuario: true,
            erroUsuarioMsg: "Não foi possível criar o usuário do sistema.",
          };
        }
      }

      return { criarUsuario: false };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      if (result?.criarUsuario) {
        if (result.erroUsuario) {
          toast({
            title: member ? "Membro atualizado!" : "Membro cadastrado!",
            description:
              result.erroUsuarioMsg || "Porém houve um erro ao criar o usuário do sistema.",
            variant: "destructive",
          });
        } else if (result.usuarioCriado) {
          toast({
            title: member ? "Membro atualizado!" : "Membro cadastrado!",
            description: `Usuário criado! Senha padrão: ${result.senhaDefault}`,
          });
        } else {
          toast({
            title: member ? "Membro atualizado!" : "Membro cadastrado!",
            description: "Usuário já existia e foi vinculado.",
          });
        }
      } else {
        toast({ title: member ? "Membro atualizado!" : "Membro cadastrado!" });
      }
      onOpenChange(false);
      setPhotoFile(null);
      setPhotoPreview(null);
      setMemberFunctions([]);
      setSelectedMinistryIds([]);
    },
    onError: (error) => {
      toast({ title: "Erro ao salvar membro", description: (error as any)?.message || String(error), variant: "destructive" });
    },
  });


  const handlePhotoChange = (file: File | null) => {
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPhotoFile(null);
      setPhotoPreview(member?.photo_url || null);
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
                  <CameraPhotoInput
                    onPhotoCapture={handlePhotoChange}
                    photoPreview={photoPreview}
                  />
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

                <div>
                  <FormLabel>Gênero</FormLabel>
                  <Select
                    value={form.watch("genero") || ""}
                    onValueChange={(v) => form.setValue("genero", v)}
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

                <FormField
                  control={form.control}
                  name="birth_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Nascimento</FormLabel>
                      <FormControl>
                        <DateInput 
                          value={field.value} 
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="member_since"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Membro Desde</FormLabel>
                      <FormControl>
                        <DateInput 
                          value={field.value} 
                          onChange={field.onChange}
                        />
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
                          inputMode="tel"
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


                <FormField
                  control={form.control}
                  name="cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          placeholder="000.000.000-00"
                          onChange={(e) => field.onChange(formatCPF(e.target.value))}
                          maxLength={14}
                          inputMode="numeric"
                        />
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
                                maxLength={9}
                                inputMode="numeric"
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
                        <Input {...field} inputMode="numeric" />
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

              {/* Seção de interesse em ministérios foi removida - agora gerenciada via candidaturas_ministerio */}

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
                  const selectedMinistry = ministries.find(m => m.id === func.ministry_id);
                  const specificFunctions = getMinistrySpecificFunctions(selectedMinistry?.name);
                  
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
                                updateFunction(index, { ministry_id: value, subfuncao: null });
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

                        {/* Subfunção específica do ministério */}
                        {specificFunctions && func.ministry_id && (
                          <Select
                            value={func.subfuncao || ""}
                            onValueChange={(value) => updateFunction(index, { subfuncao: value })}
                          >
                            <SelectTrigger className="bg-card sm:col-span-2">
                              <SelectValue placeholder="Selecione a função no ministério" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border z-50">
                              {specificFunctions.map((sf) => (
                                <SelectItem key={sf.value} value={sf.value}>
                                  {sf.label}
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

              {/* Criar Usuário do Sistema */}
              {!member?.user_id && (
                <div className="space-y-4 p-4 rounded-lg bg-secondary/5 border border-secondary/20">
                  <div className="flex items-center gap-3">
                    <UserCog className="w-5 h-5 text-secondary" />
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">Usuário do Sistema</h4>
                      <p className="text-xs text-muted-foreground">
                        Criar acesso ao sistema para este membro
                      </p>
                    </div>
                    <FormField
                      control={form.control}
                      name="criar_usuario"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {criarUsuario && (
                    <div className="space-y-4 pt-2">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <FormLabel>Email para acesso *</FormLabel>
                          <p className="text-xs text-muted-foreground mb-2">
                            Será usado o email cadastrado acima
                          </p>
                          <Input 
                            value={form.watch("email") || ""} 
                            disabled 
                            className="bg-muted"
                          />
                          {!form.watch("email") && (
                            <p className="text-xs text-destructive mt-1">
                              Preencha o email acima para criar usuário
                            </p>
                          )}
                        </div>

                        <FormField
                          control={form.control}
                          name="perfil_usuario"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Perfil de Acesso *</FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o perfil" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {ROLE_TYPES.map((role) => (
                                    <SelectItem key={role.value} value={role.value}>
                                      <div>
                                        <span>{role.label}</span>
                                        <span className="text-xs text-muted-foreground ml-2">
                                          - {role.description}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {(perfilUsuario === "lider_ministerio" || perfilUsuario === "integrante_ministerio") && (
                        <div className="space-y-2">
                          <FormLabel>Vincular aos Ministérios</FormLabel>
                          <div className="max-h-32 overflow-y-auto space-y-2 p-3 rounded-lg bg-background border border-border">
                            {ministries.map((ministry) => (
                              <div key={ministry.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`ministry-${ministry.id}`}
                                  checked={selectedMinistryIds.includes(ministry.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedMinistryIds([...selectedMinistryIds, ministry.id]);
                                    } else {
                                      setSelectedMinistryIds(selectedMinistryIds.filter(id => id !== ministry.id));
                                    }
                                  }}
                                />
                                <label 
                                  htmlFor={`ministry-${ministry.id}`} 
                                  className="text-sm cursor-pointer"
                                >
                                  {ministry.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
                        ⚠️ A solicitação de acesso será enviada para aprovação de um usuário MASTER
                      </p>
                    </div>
                  )}
                </div>
              )}

              {member?.user_id && (
                <div className="space-y-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 text-green-600">
                    <UserCog className="w-5 h-5" />
                    <span className="font-medium">Este membro possui acesso ao sistema</span>
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FormLabel>Email de acesso</FormLabel>
                      <Input 
                        value={form.watch("email") || ""} 
                        disabled 
                        className="bg-muted mt-1"
                      />
                    </div>

                    <div>
                      <FormLabel>Perfil de Acesso Atual</FormLabel>
                      <Select
                        value={currentUserRole || "membro"}
                        onValueChange={async (newRole) => {
                          if (!member?.user_id) return;
                          
                          setIsUpdatingRole(true);
                          try {
                            // Remove role antigo
                            await supabase
                              .from("user_roles")
                              .delete()
                              .eq("user_id", member.user_id);
                            
                            // Adiciona novo role (exceto se for "membro" que não tem role específico)
                            if (newRole !== "membro") {
                              await supabase
                                .from("user_roles")
                                .insert({
                                  user_id: member.user_id,
                                  role: newRole as any,
                                });
                            }
                            
                            setCurrentUserRole(newRole);
                            toast({
                              title: "Perfil atualizado!",
                              description: `Perfil alterado para ${ROLE_TYPES.find(r => r.value === newRole)?.label}`,
                            });
                          } catch (error) {
                            console.error("Erro ao atualizar perfil:", error);
                            toast({
                              title: "Erro ao atualizar perfil",
                              description: String(error),
                              variant: "destructive",
                            });
                          } finally {
                            setIsUpdatingRole(false);
                          }
                        }}
                        disabled={isUpdatingRole}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione o perfil" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_TYPES.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              <div>
                                <span>{role.label}</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  - {role.description}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isUpdatingRole && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Atualizando perfil...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
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
