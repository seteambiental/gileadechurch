import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserPlus, CheckCircle2, Search, AlertCircle, CalendarIcon, Church, ChevronLeft, ChevronRight, Baby } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { formatPhone, formatCep, unformatPhone, unformatCep, formatCPF } from "@/lib/masks";
import { useCepLookup } from "@/hooks/useCepLookup";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TermsCheckbox } from "./TermsCheckbox";
import { CameraPhotoInput } from "@/components/ui/camera-photo-input";
import { formatNameField, toTitleCase } from "@/lib/text-utils";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { ResponsavelSelect } from "@/components/ui/responsavel-select";
import { needsResponsible, getAgeString } from "@/lib/age-utils";

const formSchema = z.object({
  first_name: z.string().min(2, "Primeiro nome é obrigatório"),
  full_name: z.string().min(3, "Nome completo é obrigatório"),
  email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
  whatsapp: z.string().min(10, "WhatsApp é obrigatório"),
  genero: z.string().min(1, "Gênero é obrigatório"),
  birth_date: z.string().min(1, "Data de nascimento é obrigatória"),
  cep: z.string().min(9, "CEP é obrigatório"),
  address: z.string().min(3, "Endereço é obrigatório"),
  number: z.string().min(1, "Número é obrigatório"),
  complement: z.string().optional(),
  neighborhood: z.string().min(2, "Bairro é obrigatório"),
  city: z.string().min(2, "Cidade é obrigatória"),
  state: z.string().min(2, "Estado é obrigatório"),
  cpf: z.string().min(14, "CPF é obrigatório"),
  ministerios_interesse: z.array(z.string()).optional(),
  nao_pretende_servir: z.boolean().optional(),
  responsavel_id: z.string().optional(),
}).refine((data) => {
  // If under 12 years old, responsavel_id is required
  if (needsResponsible(data.birth_date) && !data.responsavel_id) {
    return false;
  }
  return true;
}, {
  message: "Menores de 12 anos precisam ter um responsável vinculado",
  path: ["responsavel_id"],
});

type FormData = z.infer<typeof formSchema>;

interface MemberRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Função para formatar data digitada (DD/MM/AAAA)
const formatDateInput = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
  return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
};

// Converter DD/MM/AAAA para YYYY-MM-DD
const convertToISODate = (dateStr: string): string | null => {
  const parsed = parse(dateStr, "dd/MM/yyyy", new Date());
  if (isValid(parsed)) {
    return format(parsed, "yyyy-MM-dd");
  }
  return null;
};

export const MemberRequestForm = ({ open, onOpenChange }: MemberRequestFormProps) => {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [dateInputValue, setDateInputValue] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isAdvancingStep, setIsAdvancingStep] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Quando muda de etapa, volta para o topo do modal para não “sumir” o conteúdo
  // (ex.: usuário está no fim da etapa 3 e a etapa 4 é curta)
  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0 });
  }, [currentStep]);

  // Steps: 1=Verificação, 2=Dados Pessoais, 3=Endereço, 4=Ministérios, 5=Termos
  const TOTAL_STEPS = 5;

  // Buscar lista de ministérios
  const { data: ministries = [] } = useQuery({
    queryKey: ["ministries-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ministries")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: "",
      full_name: "",
      email: "",
      whatsapp: "",
      genero: "",
      birth_date: "",
      cep: "",
      address: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      cpf: "",
      ministerios_interesse: [],
      nao_pretende_servir: false,
      responsavel_id: "",
    },
  });

  const firstName = form.watch("first_name");
  const birthDate = form.watch("birth_date");
  const isMinor = needsResponsible(birthDate);

  const checkMember = async () => {
    const firstNameClean = firstName?.trim();
    const birthDateValue = birthDate;

    if (!firstNameClean || firstNameClean.length < 2) {
      setVerificationError("Informe o primeiro nome");
      return;
    }

    if (!birthDateValue) {
      setVerificationError("Informe a data de nascimento");
      return;
    }

    setIsChecking(true);
    setVerificationError(null);

    try {
      const { data, error } = await supabase.functions.invoke("verificar-membro-existente", {
        body: {
          firstName: firstNameClean,
          birthDate: birthDateValue,
        },
      });

      if (error) throw error;

      if (data?.exists) {
        setVerificationError("USUÁRIO JÁ CADASTRADO");
        setVerified(false);
        return;
      }

      setVerified(true);
      setVerificationError(null);
      setCurrentStep(2);
      toast({
        title: "Cadastro liberado",
        description: "Você pode continuar com o cadastro.",
      });
    } catch {
      setVerificationError("Erro ao verificar. Tente novamente.");
    } finally {
      setIsChecking(false);
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const cpfClean = data.cpf.replace(/\D/g, "");

      // Revalida no backend antes de inserir (evita bypass de UI)
      const { data: check, error: checkError } = await supabase.functions.invoke(
        "verificar-membro-existente",
        {
          body: {
            firstName: data.first_name,
            birthDate: data.birth_date,
            cpf: cpfClean,
          },
        },
      );

      if (checkError) throw checkError;
      if (check?.exists) throw new Error("USUÁRIO JÁ CADASTRADO");

      // Upload da foto se existir
      let photoUrl: string | null = null;
      if (photoFile) {
        const fileExt = photoFile.name.split(".").pop();
        const fileName = `solicitacao_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("member-photos")
          .upload(fileName, photoFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("member-photos")
          .getPublicUrl(fileName);

        photoUrl = urlData.publicUrl;
      }

      const payload = {
        full_name: formatNameField(data.full_name),
        email: data.email || null,
        whatsapp: data.whatsapp ? unformatPhone(data.whatsapp) : null,
        genero: data.genero || null,
        birth_date: data.birth_date || null,
        cep: data.cep ? unformatCep(data.cep) : null,
        address: data.address ? toTitleCase(data.address) : null,
        number: data.number || null,
        complement: data.complement || null,
        neighborhood: data.neighborhood ? toTitleCase(data.neighborhood) : null,
        city: data.city ? toTitleCase(data.city) : null,
        state: data.state?.toUpperCase() || null,
        cpf: cpfClean,
        photo_url: photoUrl,
        ministerios_interesse: data.nao_pretende_servir ? [] : (data.ministerios_interesse || []),
        nao_pretende_servir: data.nao_pretende_servir || false,
        responsavel_id: data.responsavel_id || null,
      };

      // Inserção via função backend (contorna RLS do client/anon)
      const { data: created, error: createError } = await supabase.functions.invoke(
        "criar-solicitacao-membro",
        { body: payload },
      );

      if (createError) throw createError;
      if (!created?.success) throw new Error("Não foi possível criar a solicitação.");
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar solicitação",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    },
  });

  const { isLoading: isLoadingCep } = useCepLookup(form.watch("cep"), ({ address, neighborhood, city, state }) => {
    form.setValue("address", address || "");
    form.setValue("neighborhood", neighborhood || "");
    form.setValue("city", city || "");
    form.setValue("state", state || "");
  });

  const handleClose = () => {
    setSubmitted(false);
    setVerified(false);
    setVerificationError(null);
    setDateInputValue("");
    setAcceptedTerms(false);
    setTermsError(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    setCurrentStep(1);
    form.reset();
    onOpenChange(false);
  };

  // Reset verification when first name or birth date changes
  const handleFirstNameChange = (value: string) => {
    form.setValue("first_name", value);
    setVerified(false);
    setVerificationError(null);
  };

  const handleDateInputChange = (value: string) => {
    const formatted = formatDateInput(value);
    setDateInputValue(formatted);
    
    // Se a data estiver completa (DD/MM/AAAA), converter para ISO
    if (formatted.length === 10) {
      const isoDate = convertToISODate(formatted);
      if (isoDate) {
        form.setValue("birth_date", isoDate);
      }
    } else {
      form.setValue("birth_date", "");
    }
    setVerified(false);
    setVerificationError(null);
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      const isoDate = format(date, "yyyy-MM-dd");
      const displayDate = format(date, "dd/MM/yyyy");
      form.setValue("birth_date", isoDate);
      setDateInputValue(displayDate);
      setCalendarOpen(false);
      setVerified(false);
      setVerificationError(null);
    }
  };

  const canCheck = firstName?.trim().length >= 2 && birthDate?.length === 10;

  // Validação por step
  const validateStep = async (step: number): Promise<boolean> => {
    switch (step) {
      case 2: {
        // Dados pessoais
        const result = await form.trigger(["full_name", "cpf", "whatsapp", "email", "genero"]);
        if (!photoFile) {
          toast({
            title: "Foto obrigatória",
            description: "Por favor, tire uma foto ou selecione uma imagem.",
            variant: "destructive",
          });
          return false;
        }
        return result;
      }
      case 3: {
        // Endereço
        return await form.trigger(["cep", "address", "number", "neighborhood", "city", "state"]);
      }
      case 4: {
        // Ministérios - sempre válido
        return true;
      }
      default:
        return true;
    }
  };

  const handleNextStep = async () => {
    // Evita pular etapas por duplo clique/toque (especialmente no mobile)
    if (isAdvancingStep) return;
    setIsAdvancingStep(true);

    const isValid = await validateStep(currentStep);

    if (isValid) {
      setCurrentStep((prev) => {
        // Sequência obrigatória: 2 → 3 → 4 → 5 (não pode pular a etapa 4)
        if (prev === 2) return 3;
        if (prev === 3) return 4;
        if (prev === 4) return 5;
        return Math.min(prev + 1, TOTAL_STEPS);
      });
    }
    setIsAdvancingStep(false);
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 2)); // Não volta para step 1 após verificação
  };

  const handleSubmit = (data: FormData) => {
    if (!acceptedTerms) {
      setTermsError("Você deve aceitar os termos para continuar");
      return;
    }
    mutation.mutate(data);
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return "Verificação";
      case 2: return "Dados Pessoais";
      case 3: return "Endereço";
      case 4: return "Ministérios";
      case 5: return "Termos e Confirmação";
      default: return "";
    }
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">
              Solicitação Enviada!
            </h2>
            <p className="text-muted-foreground mb-4">
              Sua solicitação de cadastro foi enviada com sucesso. 
              Um administrador irá analisar e você será notificado em breve.
            </p>
            <Button onClick={handleClose}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <div ref={scrollContainerRef} className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Quero fazer parte da Igreja
            </DialogTitle>
            <DialogDescription>
              {currentStep === 1 
                ? "Primeiro, informe seu primeiro nome e data de nascimento para verificar se você já está cadastrado."
                : `Etapa ${currentStep} de ${TOTAL_STEPS}: ${getStepTitle()}`
              }
            </DialogDescription>
          </DialogHeader>

          {/* Progress indicator */}
          {verified && (
            <div className="flex gap-1 mb-4">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    i + 1 <= currentStep ? "bg-secondary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* STEP 1: Verificação */}
            {currentStep === 1 && (
              <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primeiro Nome *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Seu primeiro nome"
                          value={field.value}
                          onChange={(e) => handleFirstNameChange(e.target.value)}
                          disabled={verified}
                          className={verified ? "bg-muted" : ""}
                        />
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
                      <FormLabel>Data de Nascimento *</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            placeholder="DD/MM/AAAA"
                            value={dateInputValue}
                            onChange={(e) => handleDateInputChange(e.target.value)}
                            maxLength={10}
                            className={`flex-1 ${verified ? "bg-muted" : ""}`}
                            disabled={verified}
                          />
                        </FormControl>
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="shrink-0"
                              disabled={verified}
                            >
                              <CalendarIcon className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                              mode="single"
                              selected={field.value ? parse(field.value, "yyyy-MM-dd", new Date()) : undefined}
                              onSelect={handleCalendarSelect}
                              disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                              initialFocus
                              locale={ptBR}
                              captionLayout="dropdown-buttons"
                              fromYear={1920}
                              toYear={new Date().getFullYear()}
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="button"
                  onClick={checkMember}
                  disabled={isChecking || !canCheck}
                  variant="secondary"
                  className="w-full"
                >
                  {isChecking ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" />
                  )}
                  Consultar
                </Button>

                {verificationError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{verificationError}</AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end pt-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: Dados Pessoais */}
            {currentStep === 2 && (
              <div className="space-y-4">
                {/* Campo de Foto */}
                <div className="flex flex-col items-center gap-3 py-4 border rounded-lg bg-muted/30">
                  <CameraPhotoInput
                    photoPreview={photoPreview}
                    onPhotoCapture={(file) => {
                      setPhotoFile(file);
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setPhotoPreview(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      } else {
                        setPhotoPreview(null);
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Tire uma foto ou selecione uma imagem *
                  </p>
                  {!photoPreview && (
                    <p className="text-xs text-destructive">Foto é obrigatória</p>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo *</FormLabel>
                      <FormControl>
                        <Input placeholder="Seu nome completo" {...field} />
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
                      <FormLabel>CPF *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="000.000.000-00"
                          value={field.value}
                          onChange={(e) => field.onChange(formatCPF(e.target.value))}
                          inputMode="numeric"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="whatsapp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WhatsApp *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="(00) 00000-0000"
                            {...field}
                            onChange={(e) => field.onChange(formatPhone(e.target.value))}
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
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="seu@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="genero"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gênero *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="masculino">Masculino</SelectItem>
                          <SelectItem value="feminino">Feminino</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Campo de Responsável - Aparece apenas para menores de 12 anos */}
                {isMinor && (
                  <div className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 space-y-3">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                      <Baby className="h-5 w-5" />
                      <span className="text-sm font-medium">
                        Cadastro de menor de 12 anos ({getAgeString(birthDate)})
                      </span>
                    </div>
                    <p className="text-xs text-amber-600 dark:text-amber-500">
                      Crianças menores de 12 anos precisam ter um responsável vinculado. 
                      Selecione abaixo quem será o responsável pela criança.
                    </p>
                    <FormField
                      control={form.control}
                      name="responsavel_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Responsável *</FormLabel>
                          <FormControl>
                            <ResponsavelSelect
                              value={field.value || null}
                              onChange={(value) => field.onChange(value || "")}
                              placeholder="Selecionar responsável..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Endereço */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="cep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="00000-000"
                            {...field}
                            onChange={(e) => field.onChange(formatCep(e.target.value))}
                            inputMode="numeric"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Endereço *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={isLoadingCep ? "Buscando..." : "Rua, Avenida..."}
                            {...field}
                            // Mesmo durante a busca do CEP, permitir preenchimento manual
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número *</FormLabel>
                        <FormControl>
                          <Input placeholder="123" {...field} inputMode="numeric" />
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
                          <Input placeholder="Apto, Bloco..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="neighborhood"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bairro *</FormLabel>
                      <FormControl>
                        <Input placeholder="Bairro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade *</FormLabel>
                        <FormControl>
                          <Input placeholder="Cidade" {...field} />
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
                        <FormLabel>Estado *</FormLabel>
                        <FormControl>
                          <Input placeholder="UF" maxLength={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* STEP 4: Ministérios */}
            {currentStep === 4 && (
              <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Church className="w-5 h-5 text-secondary" />
                  <Label className="text-base font-semibold">Gostaria de servir em algum ministério?</Label>
                </div>

                <FormField
                  control={form.control}
                  name="nao_pretende_servir"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            if (checked) {
                              form.setValue("ministerios_interesse", []);
                            }
                          }}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal">
                          Ainda não pretendo servir
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                {!form.watch("nao_pretende_servir") && (
                  <FormField
                    control={form.control}
                    name="ministerios_interesse"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm text-muted-foreground">
                          Selecione os ministérios de seu interesse:
                        </FormLabel>
                        <ScrollArea className="h-48 rounded-md border border-border p-3 bg-background">
                          <div className="space-y-2">
                            {ministries.map((ministry) => (
                              <div key={ministry.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`ministry-${ministry.id}`}
                                  checked={field.value?.includes(ministry.id) || false}
                                  onCheckedChange={(checked) => {
                                    const currentValue = field.value || [];
                                    if (checked) {
                                      field.onChange([...currentValue, ministry.id]);
                                    } else {
                                      field.onChange(currentValue.filter((id) => id !== ministry.id));
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`ministry-${ministry.id}`}
                                  className="text-sm font-normal cursor-pointer"
                                >
                                  {ministry.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            {/* STEP 5: Termos e Confirmação */}
            {currentStep === 5 && (
              <div className="space-y-4">
                {/* Resumo do Cadastro */}
                <div className="p-4 border rounded-lg bg-muted/30">
                  <h3 className="font-semibold mb-2">Resumo do Cadastro</h3>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p><strong>Nome:</strong> {form.watch("full_name")}</p>
                    <p><strong>Email:</strong> {form.watch("email")}</p>
                    <p><strong>WhatsApp:</strong> {form.watch("whatsapp")}</p>
                    <p><strong>Endereço:</strong> {form.watch("address")}, {form.watch("number")} - {form.watch("neighborhood")}</p>
                    <p><strong>Cidade:</strong> {form.watch("city")} - {form.watch("state")}</p>
                  </div>
                </div>

                {/* Ministérios - ENTRE o resumo e os termos */}
                <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Church className="w-5 h-5 text-secondary" />
                    <Label className="text-base font-semibold">Gostaria de servir em algum ministério?</Label>
                  </div>

                  <FormField
                    control={form.control}
                    name="nao_pretende_servir"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              if (checked) {
                                form.setValue("ministerios_interesse", []);
                              }
                            }}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-normal">
                            Ainda não pretendo servir
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  {!form.watch("nao_pretende_servir") && (
                    <FormField
                      control={form.control}
                      name="ministerios_interesse"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm text-muted-foreground">
                            Selecione os ministérios de seu interesse:
                          </FormLabel>
                          <ScrollArea className="h-48 rounded-md border border-border p-3 bg-background">
                            <div className="space-y-2">
                              {ministries.map((ministry) => (
                                <div key={ministry.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`ministry-final-${ministry.id}`}
                                    checked={field.value?.includes(ministry.id) || false}
                                    onCheckedChange={(checked) => {
                                      const currentValue = field.value || [];
                                      if (checked) {
                                        field.onChange([...currentValue, ministry.id]);
                                      } else {
                                        field.onChange(currentValue.filter((id) => id !== ministry.id));
                                      }
                                    }}
                                  />
                                  <label
                                    htmlFor={`ministry-final-${ministry.id}`}
                                    className="text-sm font-normal cursor-pointer"
                                  >
                                    {ministry.name}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* Termos */}
                <TermsCheckbox
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => {
                    setAcceptedTerms(checked);
                    if (checked) setTermsError(null);
                  }}
                  error={termsError || undefined}
                />
              </div>
            )}

            {/* Navigation buttons */}
            {currentStep > 1 && (
              <div className="flex justify-between gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevStep}
                  disabled={currentStep === 2}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Voltar
                </Button>

                {currentStep < TOTAL_STEPS ? (
                  <Button type="button" onClick={handleNextStep} disabled={isAdvancingStep}>
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Enviar Solicitação
                  </Button>
                )}
              </div>
            )}
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
