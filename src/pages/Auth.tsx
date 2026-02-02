import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { isAuthBypassed, setAuthBypassed } from "@/lib/auth-bypass";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, ChevronRight, Church, Baby } from "lucide-react";
import logoGileade from "@/assets/logo-gileade.jpeg";
import { z } from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPhone, formatCep, unformatPhone, unformatCep, formatCPF } from "@/lib/masks";
import { useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCepLookup } from "@/hooks/useCepLookup";
import { DateInput } from "@/components/ui/date-input";
import { CameraPhotoInput } from "@/components/ui/camera-photo-input";
import { TermsCheckbox } from "@/components/TermsCheckbox";
import { ResponsavelSelect } from "@/components/ui/responsavel-select";
import { needsResponsible, getAgeString, calculateAge } from "@/lib/age-utils";

const loginSchema = z.object({
  email: z.string().email("Email inválido").max(255, "Email muito longo"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").max(72, "Senha muito longa"),
});

const signupSchema = z.object({
  full_name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  genero: z.string().min(1, "Gênero é obrigatório"),
  birth_date: z.string().min(1, "Data de nascimento é obrigatória"),
  whatsapp: z.string().min(1, "WhatsApp é obrigatório"),
  cep: z.string().min(1, "CEP é obrigatório"),
  address: z.string().min(1, "Logradouro é obrigatório"),
  number: z.string().min(1, "Número é obrigatório"),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, "Bairro é obrigatório"),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().min(1, "Estado é obrigatório"),
  cpf: z.string().min(1, "CPF é obrigatório"),
  perfil_solicitado: z.enum(["membro", "lider_ministerio", "integrante_ministerio"]),
  ministerio_ids: z.array(z.string()).optional(),
});

const newPasswordSchema = z
  .object({
    password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").max(72, "Senha muito longa"),
    confirmPassword: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").max(72, "Senha muito longa"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  });

type SignupData = z.infer<typeof signupSchema>;

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [isPreCheck, setIsPreCheck] = useState(false); // New state for pre-registration check
  const [preCheckPassed, setPreCheckPassed] = useState(false);
  const [preCheckName, setPreCheckName] = useState("");
  const [preCheckBirthDate, setPreCheckBirthDate] = useState("");
  const [preCheckEstadoCivil, setPreCheckEstadoCivil] = useState<"solteiro" | "casado" | "viuvo" | "">("");
  const [preCheckGenero, setPreCheckGenero] = useState<"masculino" | "feminino" | "">("");
  const [existingMemberEmail, setExistingMemberEmail] = useState<string | null>(null);
  const [step, setStep] = useState(1); // Steps: 1 = dados pessoais, 2 = endereço, 3 = acesso
  
  // Tipo de cadastro: membro ou visitante
  const [tipocadastro, setTipoCadastro] = useState<"membro" | "visitante" | null>(null);
  
  // Terms acceptance
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedTermsVisitante, setAcceptedTermsVisitante] = useState(false);
  const [naoPretendeServir, setNaoPretendeServir] = useState(false);
  
  // Responsável para menores de 12 anos
  const [responsavelId, setResponsavelId] = useState<string | null>(null);
  
  // IDs dos ministérios para direcionamento automático
  const MINISTERIO_GT_ID = "a1669791-6ce2-48b2-b97f-d133948da63f";
  const MINISTERIO_FLOW_ID = "45684131-e033-4ef6-914e-bc49d1dc7b20";
  const MINISTERIO_MULHERES_ID = "cb045877-8a53-4fe4-b704-b5aea35085b9";
  const MINISTERIO_TRUE_MAN_ID = "245abe33-491a-4cae-afb7-32e6e18584e2";

  
  // Visitante fields (simplified form)
  const [visitanteData, setVisitanteData] = useState({
    nome: "",
    sobrenome: "",
    whatsapp: "",
  });

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Signup fields
  const [signupData, setSignupData] = useState<Partial<SignupData>>({
    full_name: "",
    email: "",
    genero: "",
    birth_date: "",
    whatsapp: "",
    cep: "",
    address: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    cpf: "",
    perfil_solicitado: "membro",
    ministerio_ids: [],
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signIn, signUp, user, loading, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const getSafeRedirect = () => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    if (!redirect) return "/app";

    // Only allow same-site relative paths
    if (!redirect.startsWith("/")) return "/app";
    if (redirect.startsWith("//")) return "/app";

    return redirect;
  };

  const redirectTo = getSafeRedirect();

  // Fetch ministries for selection
  const { data: ministries = [] } = useQuery({
    queryKey: ["ministries"],
    queryFn: async () => {
      const { data } = await supabase.from("ministries").select("id, name").order("name");
      return data || [];
    },
    enabled: !isLogin,
  });

  useEffect(() => {
    if (isAuthBypassed()) {
      navigate(redirectTo);
      return;
    }

    const url = window.location.href;
    const isRecoveryUrl = url.includes("type=recovery") || url.includes("access_token=") || url.includes("code=");
    if (isRecoveryUrl) {
      setIsRecovery(true);
      setIsForgotPassword(false);
      setIsLogin(true);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
        setIsForgotPassword(false);
        setIsLogin(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, redirectTo]);

  useEffect(() => {
    if (!loading && user && !isRecovery) {
      navigate(redirectTo);
    }
  }, [user, loading, navigate, isRecovery, redirectTo]);


  const validateLoginForm = () => {
    try {
      loginSchema.parse({ email, password });
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          if (error.path[0]) fieldErrors[error.path[0] as string] = error.message;
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const validateNewPasswordForm = () => {
    try {
      newPasswordSchema.parse({ password, confirmPassword });
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          if (error.path[0]) fieldErrors[error.path[0] as string] = error.message;
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const validateSignupStep = (currentStep: number) => {
    const fieldErrors: Record<string, string> = {};
    
    if (currentStep === 1) {
      if (!signupData.full_name) fieldErrors.full_name = "Nome é obrigatório";
      if (!preCheckGenero) fieldErrors.preCheckGenero = "Gênero é obrigatório";
      
      // Estado civil obrigatório para maiores de 12 anos
      const { years: idade } = calculateAge(preCheckBirthDate);
      if (preCheckBirthDate && idade >= 12 && !preCheckEstadoCivil) {
        fieldErrors.preCheckEstadoCivil = "Estado civil é obrigatório";
      }
      
      if (!signupData.email) fieldErrors.email = "Email é obrigatório";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupData.email)) fieldErrors.email = "Email inválido";
      if (!signupData.whatsapp) fieldErrors.whatsapp = "WhatsApp é obrigatório";
      if (!signupData.cpf) fieldErrors.cpf = "CPF é obrigatório";

      // Menor de 12 anos: responsável obrigatório
      if (preCheckBirthDate && needsResponsible(preCheckBirthDate) && !responsavelId) {
        fieldErrors.responsavelId = "Selecione um responsável para continuar";
      }
    }
    
    if (currentStep === 2) {
      if (!signupData.cep) fieldErrors.cep = "CEP é obrigatório";
      if (!signupData.address) fieldErrors.address = "Logradouro é obrigatório";
      if (!signupData.number) fieldErrors.number = "Número é obrigatório";
      if (!signupData.neighborhood) fieldErrors.neighborhood = "Bairro é obrigatório";
      if (!signupData.city) fieldErrors.city = "Cidade é obrigatória";
      if (!signupData.state) fieldErrors.state = "Estado é obrigatório";
    }
    
    setErrors(fieldErrors);
    return Object.keys(fieldErrors).length === 0;
  };

  const { isLoading: isLoadingCep } = useCepLookup(signupData.cep, ({ address, neighborhood, city, state }) => {
    setSignupData((prev) => ({
      ...prev,
      address: address || "",
      neighborhood: neighborhood || "",
      city: city || "",
      state: state || "",
    }));
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
      setPhotoPreview(null);
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

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateNewPasswordForm()) return;

    setIsLoading(true);
    try {
      // First, ensure we have an active session from the recovery link
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        toast({ 
          variant: "destructive", 
          title: "Sessão expirada", 
          description: "O link de recuperação expirou. Solicite um novo link." 
        });
        window.history.replaceState({}, document.title, "/auth");
        setIsRecovery(false);
        setIsForgotPassword(true);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast({ variant: "destructive", title: "Erro", description: error.message });
        return;
      }

      // Sign out to force re-login with new password
      await supabase.auth.signOut();
      
      toast({ title: "Senha atualizada!", description: "Agora você já pode entrar com a nova senha." });
      window.history.replaceState({}, document.title, "/auth");
      setIsRecovery(false);
      setPassword("");
      setConfirmPassword("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrors({ email: "Digite seu email" });
      return;
    }

    try {
      z.string().email().parse(email);
    } catch {
      setErrors({ email: "Email inválido" });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await resetPassword(email);
      if (error) {
        toast({ variant: "destructive", title: "Erro", description: error.message });
      } else {
        toast({ title: "Email enviado!", description: "Verifique sua caixa de entrada para redefinir sua senha." });
        setIsForgotPassword(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLoginForm()) return;

    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast({ variant: "destructive", title: "Erro ao entrar", description: "Email ou senha incorretos." });
        } else {
          toast({ variant: "destructive", title: "Erro ao entrar", description: error.message });
        }
      } else {
        toast({ title: "Bem-vindo!", description: "Login realizado com sucesso." });
        navigate(redirectTo);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSignupStep(3)) return;

    // Segurança extra: nunca permitir finalizar cadastro de menor sem responsável
    if (signupData.birth_date && needsResponsible(signupData.birth_date) && !responsavelId) {
      setErrors((prev) => ({ ...prev, responsavelId: "Selecione um responsável para continuar" }));
      toast({
        variant: "destructive",
        title: "Responsável obrigatório",
        description: "Para menores de 12 anos, selecione um responsável antes de prosseguir.",
      });
      return;
    }

    // Validate terms acceptance
    if (!acceptedTerms) {
      setErrors({ ...errors, acceptedTerms: "Você deve aceitar os termos para continuar" });
      return;
    }

    setIsLoading(true);
    try {
      // Upload photo first if exists
      let photoUrl: string | null = null;
      if (photoFile) {
        const fileExt = photoFile.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("member-photos")
          .upload(fileName, photoFile);

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("member-photos").getPublicUrl(fileName);
          photoUrl = urlData.publicUrl;
        }
      }

      const cpfClean = signupData.cpf ? signupData.cpf.replace(/\D/g, "") : null;
      
      // Verifica se é membro simples (sem ministérios) = aprovação automática
      const isMemberOnly = signupData.perfil_solicitado === "membro";
      const hasMinistries = (signupData.ministerio_ids?.length || 0) > 0;
      const needsManualApproval = !isMemberOnly || hasMinistries;

      const requestPayload = {
        full_name: signupData.full_name!,
        email: signupData.email!,
        whatsapp: signupData.whatsapp ? unformatPhone(signupData.whatsapp) : null,
        genero: signupData.genero || null,
        birth_date: signupData.birth_date && signupData.birth_date.trim() !== "" ? signupData.birth_date : null,
        cep: signupData.cep ? unformatCep(signupData.cep) : null,
        address: signupData.address || null,
        number: signupData.number || null,
        complement: signupData.complement || null,
        neighborhood: signupData.neighborhood || null,
        city: signupData.city || null,
        state: signupData.state || null,
        cpf: cpfClean,
        photo_url: photoUrl,
        status: "pendente",
        responsavel_id: responsavelId,
        ministerios_interesse: signupData.ministerio_ids || [],
        nao_pretende_servir: naoPretendeServir,
        estado_civil: preCheckEstadoCivil || null,
      };

      const { error: requestError } = await supabase.from("member_requests").insert(requestPayload);
      
      if (requestError) {
        throw requestError;
      }

      if (needsManualApproval) {
        toast({
          title: "Solicitação enviada!",
          description: "Seu cadastro foi enviado para análise. Um administrador irá aprovar e você receberá as instruções de acesso.",
        });
      } else {
        toast({
          title: "Solicitação enviada!",
          description: "Seu cadastro de membro foi enviado e será processado em breve.",
        });
      }

      // Reset form and go to login
      setSignupData({
        full_name: "",
        email: "",
        genero: "",
        birth_date: "",
        whatsapp: "",
        cep: "",
        address: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
        cpf: "",
        perfil_solicitado: "membro",
        ministerio_ids: [],
      });
      setPhotoFile(null);
      setPhotoPreview(null);
      setAcceptedTerms(false);
      setStep(1);
      setIsLogin(true);
    } catch (error: any) {
      const msg = error?.message || error?.error_description || error?.details || String(error);
      toast({ variant: "destructive", title: "Erro no cadastro", description: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (validateSignupStep(step)) {
      setStep(step + 1);
      // Scroll to top when changing steps
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    setStep(step - 1);
    // Scroll to top when changing steps
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  // Recovery (new password) form
  if (isRecovery) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 bg-card/95 backdrop-blur">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full overflow-hidden shadow-red">
              <img src={logoGileade} alt="Gileade Church" className="w-full h-full object-cover" />
            </div>
            <div>
              <CardTitle className="font-heading text-2xl text-foreground">Nova Senha</CardTitle>
              <CardDescription className="text-muted-foreground mt-2">
                Defina uma nova senha para sua conta
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetNewPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <PasswordInput
                  id="password"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={errors.password ? "border-destructive" : ""}
                />
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                <PasswordInput
                  id="confirmPassword"
                  placeholder="••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={errors.confirmPassword ? "border-destructive" : ""}
                />
                {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
              </div>

              <Button type="submit" className="w-full" variant="secondary" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar nova senha
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  window.history.replaceState({}, document.title, "/auth");
                  setIsRecovery(false);
                  setPassword("");
                  setConfirmPassword("");
                  setErrors({});
                }}
                className="text-sm text-secondary hover:underline"
              >
                ← Voltar para o login
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Forgot password form
  if (isForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 bg-card/95 backdrop-blur">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full overflow-hidden shadow-red">
              <img src={logoGileade} alt="Gileade Church" className="w-full h-full object-cover" />
            </div>
            <div>
              <CardTitle className="font-heading text-2xl text-foreground">Recuperar Senha</CardTitle>
              <CardDescription className="text-muted-foreground mt-2">
                Digite seu email para receber um link de recuperação
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
              <Button type="submit" className="w-full" variant="secondary" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Enviar Link de Recuperação
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setErrors({});
                }}
                className="text-sm text-secondary hover:underline"
              >
                ← Voltar para o login
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Login form
  if (isLogin) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 bg-card/95 backdrop-blur">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full overflow-hidden shadow-red">
              <img src={logoGileade} alt="Gileade Church" className="w-full h-full object-cover" />
            </div>
            <div>
              <CardTitle className="font-heading text-2xl text-foreground">
                {redirectTo === "/portal" ? "Portal do Membro" : "Entrar no App"}
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-2">
                {redirectTo === "/portal"
                  ? "Entre com seu email e senha para acessar sua área."
                  : "Acesse os ministérios da Gileade Church"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <PasswordInput
                  id="password"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={errors.password ? "border-destructive" : ""}
                />
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true);
                    setErrors({});
                  }}
                  className="text-sm text-secondary hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>

              <Button type="submit" className="w-full" variant="secondary" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Entrar
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setIsPreCheck(true);
                  setPreCheckPassed(false);
                  setPreCheckName("");
                  setPreCheckBirthDate("");
                  setPreCheckEstadoCivil("");
                  setPreCheckGenero("");
                  setExistingMemberEmail(null);
                  setErrors({});
                }}
                className="text-sm text-secondary hover:underline"
              >
                Não tem conta? Cadastre-se
              </button>
            </div>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← Voltar para a homepage
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pre-check form: verify if user already exists before showing full signup form
  if (isPreCheck) {
    const handlePreCheck = async (e: React.FormEvent) => {
      e.preventDefault();
      
      const fieldErrors: Record<string, string> = {};
      if (!preCheckName.trim()) fieldErrors.preCheckName = "Nome é obrigatório";
      if (!preCheckBirthDate) fieldErrors.preCheckBirthDate = "Data de nascimento é obrigatória";

      // Menor de 12 anos: responsável obrigatório (evita bypass via clique no tipo de cadastro)
      if (preCheckBirthDate && needsResponsible(preCheckBirthDate) && !responsavelId) {
        fieldErrors.responsavelId = "Selecione um responsável para continuar";
      }
      
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        return;
      }

      setIsLoading(true);
      try {
        // Use edge function with service role to bypass RLS
        const { data, error } = await supabase.functions.invoke("verificar-membro-existente", {
          body: {
            firstName: preCheckName.trim(),
            birthDate: preCheckBirthDate,
          },
        });

        if (error) throw error;

        if (data.exists) {
          setPreCheckPassed(false);
          if (data.reason === "name_birth") {
            // User already exists - offer password recovery
            setExistingMemberEmail(data.email || null);
            toast({
              title: "Cadastro encontrado!",
              description: data.email 
                ? "Já existe um cadastro com esses dados. Você pode recuperar sua senha."
                : "Já existe um cadastro com esses dados, mas não há email associado. Entre em contato com a secretaria.",
            });
          } else if (data.reason === "name_birth_request") {
            // User has a pending request
            const statusMsg = data.status === "pendente" 
              ? "Já existe uma solicitação de cadastro com esses dados aguardando aprovação."
              : data.status === "rejeitada"
                ? "Sua solicitação anterior foi rejeitada. Entre em contato com a secretaria."
                : "Já existe uma solicitação de cadastro com esses dados.";
            toast({
              variant: "destructive",
              title: "Solicitação encontrada",
              description: statusMsg,
            });
          } else if (data.reason === "cpf" || data.reason === "cpf_request") {
            toast({
              variant: "destructive",
              title: "CPF já cadastrado",
              description: "Este CPF já está associado a um cadastro existente.",
            });
          }
        } else {
          // User doesn't exist - calculate automatic ministry based on age, gender and marital status
          const { years: idadeCalc } = calculateAge(preCheckBirthDate);
          let ministerioAutomaticoId: string | null = null;
          
          // Regras de direcionamento:
          // 0-11 anos -> Kids (sem ministério, apenas responsável)
          // 12-17 anos -> GT
          // 18+ solteiro(a) -> Flow
          // 18+ casado/viúvo (masculino) -> True Man
          // 18+ casada/viúva (feminino) -> Mulheres
          if (idadeCalc >= 12 && idadeCalc <= 17) {
            ministerioAutomaticoId = MINISTERIO_GT_ID;
          } else if (idadeCalc >= 18) {
            if (preCheckEstadoCivil === "solteiro") {
              ministerioAutomaticoId = MINISTERIO_FLOW_ID;
            } else if (preCheckEstadoCivil === "casado" || preCheckEstadoCivil === "viuvo") {
              if (preCheckGenero === "feminino") {
                ministerioAutomaticoId = MINISTERIO_MULHERES_ID;
              } else if (preCheckGenero === "masculino") {
                ministerioAutomaticoId = MINISTERIO_TRUE_MAN_ID;
              }
            }
          }
          
          // Set signup data with pre-check info and automatic ministry
          setSignupData({
            ...signupData,
            full_name: preCheckName.trim(),
            birth_date: preCheckBirthDate,
            genero: preCheckGenero || undefined,
            ministerio_ids: ministerioAutomaticoId ? [ministerioAutomaticoId] : [],
          });
          // Pre-fill visitante data as well
          const nameParts = preCheckName.trim().split(" ");
          setVisitanteData({
            nome: nameParts[0] || "",
            sobrenome: nameParts.slice(1).join(" ") || "",
            whatsapp: "",
          });
          setTipoCadastro(null); // Show type selection
          setPreCheckPassed(true);
          toast({
            title: "Você pode prosseguir!",
            description: "Selecione o tipo de cadastro abaixo.",
          });
        }
      } catch (error: any) {
        console.error("Error checking user:", error);
        setPreCheckPassed(false);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Ocorreu um erro ao verificar os dados. Tente novamente.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    const handleSendPasswordRecovery = async () => {
      if (!existingMemberEmail) return;
      
      setIsLoading(true);
      try {
        const { error } = await resetPassword(existingMemberEmail);
        if (error) {
          toast({ variant: "destructive", title: "Erro", description: error.message });
        } else {
          toast({
            title: "Email enviado!",
            description: `Verifique a caixa de entrada de ${existingMemberEmail} para redefinir sua senha.`,
          });
          setIsPreCheck(false);
          setIsLogin(true);
          setExistingMemberEmail(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 bg-card/95 backdrop-blur">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full overflow-hidden shadow-red">
              <img src={logoGileade} alt="Gileade Church" className="w-full h-full object-cover" />
            </div>
            <div>
              <CardTitle className="font-heading text-2xl text-foreground">
                {existingMemberEmail ? "Cadastro Encontrado" : "Verificar Cadastro"}
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-2">
                {existingMemberEmail 
                  ? "Já existe um cadastro com esses dados."
                  : "Informe seu nome e data de nascimento para verificarmos se você já possui cadastro."}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {existingMemberEmail ? (
              <div className="space-y-4">
                <p className="text-center text-sm text-muted-foreground">
                  Email cadastrado: <strong>{existingMemberEmail}</strong>
                </p>
                <Button
                  onClick={handleSendPasswordRecovery}
                  className="w-full"
                  variant="secondary"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Enviar email para recuperar senha
                </Button>
                <Button
                  onClick={() => {
                    setExistingMemberEmail(null);
                    setPreCheckName("");
                    setPreCheckBirthDate("");
                  }}
                  className="w-full"
                  variant="outline"
                >
                  Tentar com outros dados
                </Button>
              </div>
            ) : (
              <form onSubmit={handlePreCheck} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="preCheckName">Nome (primeiro nome ou nome composto)</Label>
                  <Input
                    id="preCheckName"
                    placeholder="Ex: Maria ou Ana Paula"
                    value={preCheckName}
                    onChange={(e) => setPreCheckName(e.target.value)}
                    className={errors.preCheckName ? "border-destructive" : ""}
                  />
                  {errors.preCheckName && <p className="text-sm text-destructive">{errors.preCheckName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preCheckBirthDate">Data de Nascimento *</Label>
                  <DateInput
                    id="preCheckBirthDate"
                    value={preCheckBirthDate}
                    onChange={(value) => {
                      setPreCheckBirthDate(value);
                      setPreCheckPassed(false);
                      // Reset responsável quando mudar a data
                      if (!needsResponsible(value)) {
                        setResponsavelId(null);
                      }
                    }}
                    className={errors.preCheckBirthDate ? "[&>input]:border-destructive" : ""}
                  />
                  {errors.preCheckBirthDate && <p className="text-sm text-destructive">{errors.preCheckBirthDate}</p>}
                </div>
                
                {/* Campo de Responsável para menores de 12 anos */}
                {preCheckBirthDate && needsResponsible(preCheckBirthDate) && (
                  <div className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 space-y-3">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                      <Baby className="h-5 w-5" />
                      <span className="text-sm font-medium">
                        Cadastro de menor de 12 anos ({getAgeString(preCheckBirthDate)})
                      </span>
                    </div>
                    <p className="text-xs text-amber-600 dark:text-amber-500">
                      Crianças menores de 12 anos precisam ter um responsável vinculado. 
                      Selecione abaixo quem será o responsável pela criança.
                    </p>
                    <div className="space-y-2">
                      <Label>Responsável *</Label>
                      <ResponsavelSelect
                        value={responsavelId}
                        onChange={(value) => setResponsavelId(value)}
                        placeholder="Selecionar responsável..."
                      />
                      {errors.responsavelId && <p className="text-sm text-destructive">{errors.responsavelId}</p>}
                    </div>
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  variant="secondary" 
                  disabled={isLoading || (preCheckBirthDate && needsResponsible(preCheckBirthDate) && !responsavelId)}
                >
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Verificar
                </Button>
              </form>
            )}

            {/* Type Selection after verification */}
            {preCheckPassed && tipocadastro === null && !existingMemberEmail && (
              <div className="space-y-4 mt-6 border-t border-border pt-6">
                <div>
                  <Label>Tipo de Cadastro</Label>
                  <p className="text-sm text-muted-foreground">
                    Selecione como deseja se cadastrar:
                  </p>
                </div>
                <div className="space-y-3">
                  <div
                    className="p-4 border rounded-lg cursor-pointer transition-colors border-border hover:border-secondary/50"
                    onClick={() => {
                      setTipoCadastro("membro");
                      setIsPreCheck(false);
                      setStep(1);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />
                      <div>
                        <p className="font-medium">Membro</p>
                        <p className="text-sm text-muted-foreground">Cadastro completo para membros da igreja</p>
                      </div>
                    </div>
                  </div>
                  <div
                    className="p-4 border rounded-lg cursor-pointer transition-colors border-border hover:border-secondary/50"
                    onClick={() => {
                      setTipoCadastro("visitante");
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />
                      <div>
                        <p className="font-medium">Visitante</p>
                        <p className="text-sm text-muted-foreground">Cadastro simplificado para visitantes</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Visitante Form */}
            {tipocadastro === "visitante" && (
              <div className="space-y-4 mt-6 border-t border-border pt-6">
                <Label className="text-lg font-semibold">Cadastro de Visitante</Label>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="visitanteNome">Nome *</Label>
                    <Input
                      id="visitanteNome"
                      value={visitanteData.nome}
                      onChange={(e) => setVisitanteData({ ...visitanteData, nome: e.target.value })}
                      placeholder="Primeiro nome"
                      className={errors.visitanteNome ? "border-destructive" : ""}
                    />
                    {errors.visitanteNome && <p className="text-sm text-destructive">{errors.visitanteNome}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visitanteSobrenome">Sobrenome *</Label>
                    <Input
                      id="visitanteSobrenome"
                      value={visitanteData.sobrenome}
                      onChange={(e) => setVisitanteData({ ...visitanteData, sobrenome: e.target.value })}
                      placeholder="Sobrenome"
                      className={errors.visitanteSobrenome ? "border-destructive" : ""}
                    />
                    {errors.visitanteSobrenome && <p className="text-sm text-destructive">{errors.visitanteSobrenome}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visitanteWhatsapp">WhatsApp *</Label>
                    <Input
                      id="visitanteWhatsapp"
                      value={visitanteData.whatsapp}
                      onChange={(e) => setVisitanteData({ ...visitanteData, whatsapp: formatPhone(e.target.value) })}
                      placeholder="(00) 00000-0000"
                      maxLength={16}
                      inputMode="tel"
                      className={errors.visitanteWhatsapp ? "border-destructive" : ""}
                    />
                    {errors.visitanteWhatsapp && <p className="text-sm text-destructive">{errors.visitanteWhatsapp}</p>}
                  </div>
                  <TermsCheckbox
                    checked={acceptedTermsVisitante}
                    onCheckedChange={setAcceptedTermsVisitante}
                    error={errors.acceptedTermsVisitante}
                  />

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setTipoCadastro(null);
                        setErrors({});
                        setAcceptedTermsVisitante(false);
                      }}
                      className="flex-1"
                    >
                      Voltar
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={isLoading}
                      className="flex-1"
                      onClick={async () => {
                        // Validate visitante form
                        const fieldErrors: Record<string, string> = {};
                        if (!visitanteData.nome.trim()) fieldErrors.visitanteNome = "Nome é obrigatório";
                        if (!visitanteData.sobrenome.trim()) fieldErrors.visitanteSobrenome = "Sobrenome é obrigatório";
                        if (!visitanteData.whatsapp.trim()) fieldErrors.visitanteWhatsapp = "WhatsApp é obrigatório";
                        if (!acceptedTermsVisitante) fieldErrors.acceptedTermsVisitante = "Você deve aceitar os termos para continuar";
                        
                        if (Object.keys(fieldErrors).length > 0) {
                          setErrors(fieldErrors);
                          return;
                        }

                        setIsLoading(true);
                        try {
                          const fullName = `${visitanteData.nome.trim()} ${visitanteData.sobrenome.trim()}`;
                          const whatsappClean = unformatPhone(visitanteData.whatsapp);
                          
                          const { error } = await supabase.from("novos_convertidos").insert({
                            full_name: fullName,
                            whatsapp: whatsappClean,
                            data_nascimento: preCheckBirthDate || null,
                            observacoes: "Visitante (cadastro via site)",
                          });

                          if (error) throw error;

                          toast({
                            title: "Cadastro realizado!",
                            description: "Seu cadastro de visitante foi concluído com sucesso.",
                          });

                          // Reset and go to login
                          setVisitanteData({ nome: "", sobrenome: "", whatsapp: "" });
                          setTipoCadastro(null);
                          setPreCheckName("");
                          setPreCheckBirthDate("");
                          setIsPreCheck(false);
                          setAcceptedTermsVisitante(false);
                          setIsLogin(true);
                        } catch (error: any) {
                          console.error("Erro ao cadastrar visitante:", error);
                          toast({
                            variant: "destructive",
                            title: "Erro",
                            description: "Não foi possível concluir o cadastro. Tente novamente.",
                          });
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                    >
                      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Cadastrar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsPreCheck(false);
                  setIsLogin(true);
                  setExistingMemberEmail(null);
                  setTipoCadastro(null);
                  setErrors({});
                }}
                className="text-sm text-secondary hover:underline"
              >
                ← Voltar para o login
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark flex items-start justify-center p-4 py-8 overflow-y-auto">
      <Card className="w-full max-w-2xl border-border/50 bg-card/95 backdrop-blur flex flex-col">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full overflow-hidden shadow-red">
            <img src={logoGileade} alt="Gileade Church" className="w-full h-full object-cover" />
          </div>
          <div>
            <CardTitle className="font-heading text-2xl text-foreground">Criar Conta</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Preencha seus dados para solicitar acesso ao app
            </CardDescription>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex items-center ${s < 3 ? "flex-1" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    s <= step
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded transition-colors ${
                      s < step ? "bg-secondary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground px-4">
            <span>Dados Pessoais</span>
            <span>Endereço</span>
            <span>Acesso</span>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
              {/* Step 1: Personal Data */}
              {step === 1 && (
                <div className="space-y-4">
                  {/* Photo */}
                  <div className="flex items-center gap-4 justify-center">
                    <Avatar className="w-20 h-20 border-2 border-secondary/30">
                      <AvatarImage src={photoPreview || undefined} className="object-cover" />
                      <AvatarFallback className="bg-secondary/20 text-secondary text-xl">
                        {signupData.full_name ? getInitials(signupData.full_name) : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CameraPhotoInput
                        onPhotoCapture={handlePhotoChange}
                        photoPreview={photoPreview}
                        buttonLabel="Foto (opcional)"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2 space-y-2">
                      <Label>Nome Completo *</Label>
                      <Input
                        value={signupData.full_name}
                        onChange={(e) => setSignupData({ ...signupData, full_name: e.target.value })}
                        className={errors.full_name ? "border-destructive" : ""}
                      />
                      {errors.full_name && <p className="text-sm text-destructive">{errors.full_name}</p>}
                    </div>

                    {/* Gênero - logo após nome */}
                    <div className="space-y-2">
                      <Label>Gênero *</Label>
                      <Select
                        value={preCheckGenero}
                        onValueChange={(v) => setPreCheckGenero(v as "masculino" | "feminino")}
                      >
                        <SelectTrigger className={errors.preCheckGenero ? "border-destructive" : ""}>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="masculino">Masculino</SelectItem>
                          <SelectItem value="feminino">Feminino</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.preCheckGenero && <p className="text-sm text-destructive">{errors.preCheckGenero}</p>}
                    </div>

                    {/* Estado Civil - apenas para maiores de 12 anos */}
                    {preCheckBirthDate && !needsResponsible(preCheckBirthDate) && (
                      <div className="space-y-2">
                        <Label>Estado Civil *</Label>
                        <Select
                          value={preCheckEstadoCivil}
                          onValueChange={(v) => setPreCheckEstadoCivil(v as "solteiro" | "casado" | "viuvo")}
                        >
                          <SelectTrigger className={errors.preCheckEstadoCivil ? "border-destructive" : ""}>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                            <SelectItem value="casado">Casado(a)</SelectItem>
                            <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.preCheckEstadoCivil && <p className="text-sm text-destructive">{errors.preCheckEstadoCivil}</p>}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={signupData.email}
                        onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                        className={errors.email ? "border-destructive" : ""}
                      />
                      {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label>WhatsApp *</Label>
                      <Input
                        value={signupData.whatsapp}
                        onChange={(e) => setSignupData({ ...signupData, whatsapp: formatPhone(e.target.value) })}
                        placeholder="(00) 00000-0000"
                        maxLength={16}
                        inputMode="tel"
                        className={errors.whatsapp ? "border-destructive" : ""}
                      />
                      {errors.whatsapp && <p className="text-sm text-destructive">{errors.whatsapp}</p>}
                    </div>

                    <div className="p-3 bg-muted/50 rounded-lg border border-border">
                      <p className="text-sm text-muted-foreground">
                        <strong>Sua senha será gerada automaticamente:</strong>
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        6 primeiros dígitos do CPF
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ex: CPF 123.456.789-00 → Senha: 123456
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>CPF *</Label>
                      <Input
                        value={signupData.cpf}
                        onChange={(e) => setSignupData({ ...signupData, cpf: formatCPF(e.target.value) })}
                        placeholder="000.000.000-00"
                        maxLength={14}
                        inputMode="numeric"
                        className={errors.cpf ? "border-destructive" : ""}
                      />
                      {errors.cpf && <p className="text-sm text-destructive">{errors.cpf}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Address */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>CEP *</Label>
                      <div className="relative">
                        <Input
                          value={signupData.cep}
                          onChange={(e) => setSignupData({ ...signupData, cep: formatCep(e.target.value) })}
                          placeholder="00000-000"
                          maxLength={9}
                          inputMode="numeric"
                          className={errors.cep ? "border-destructive" : ""}
                        />
                        {isLoadingCep && (
                          <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                      {errors.cep && <p className="text-sm text-destructive">{errors.cep}</p>}
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label>Logradouro *</Label>
                      <Input
                        value={signupData.address}
                        onChange={(e) => setSignupData({ ...signupData, address: e.target.value })}
                        className={errors.address ? "border-destructive" : ""}
                      />
                      {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label>Número *</Label>
                      <Input
                        value={signupData.number}
                        onChange={(e) => setSignupData({ ...signupData, number: e.target.value })}
                        className={errors.number ? "border-destructive" : ""}
                      />
                      {errors.number && <p className="text-sm text-destructive">{errors.number}</p>}
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label>Complemento</Label>
                      <Input
                        value={signupData.complement}
                        onChange={(e) => setSignupData({ ...signupData, complement: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Bairro *</Label>
                      <Input
                        value={signupData.neighborhood}
                        onChange={(e) => setSignupData({ ...signupData, neighborhood: e.target.value })}
                        className={errors.neighborhood ? "border-destructive" : ""}
                      />
                      {errors.neighborhood && <p className="text-sm text-destructive">{errors.neighborhood}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label>Cidade *</Label>
                      <Input
                        value={signupData.city}
                        onChange={(e) => setSignupData({ ...signupData, city: e.target.value })}
                        className={errors.city ? "border-destructive" : ""}
                      />
                      {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label>Estado *</Label>
                      <Input
                        value={signupData.state}
                        onChange={(e) => setSignupData({ ...signupData, state: e.target.value })}
                        maxLength={2}
                        className={errors.state ? "border-destructive" : ""}
                      />
                      {errors.state && <p className="text-sm text-destructive">{errors.state}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Confirmation */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="p-4 bg-muted/50 rounded-lg border border-border">
                    <h3 className="font-semibold mb-3">Confirme seus dados</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Nome:</strong> {signupData.full_name}</p>
                      <p><strong>Email:</strong> {signupData.email}</p>
                      <p><strong>WhatsApp:</strong> {signupData.whatsapp}</p>
                      <p><strong>CPF:</strong> {signupData.cpf}</p>
                      <p><strong>Endereço:</strong> {signupData.address}, {signupData.number}{signupData.complement ? ` - ${signupData.complement}` : ""}</p>
                      <p><strong>Bairro:</strong> {signupData.neighborhood}</p>
                      <p><strong>Cidade/Estado:</strong> {signupData.city}/{signupData.state}</p>
                    </div>
                  </div>

                  {/* Seção de Ministérios - ENTRE o resumo e os termos */}
                  <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-4">
                    <div className="flex items-center gap-2">
                      <Church className="w-5 h-5 text-secondary" />
                      <h3 className="font-semibold">Gostaria de servir em algum ministério?</h3>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="nao-pretende-servir"
                        checked={naoPretendeServir}
                        onCheckedChange={(checked) => {
                          setNaoPretendeServir(checked === true);
                          if (checked) {
                            setSignupData({ ...signupData, ministerio_ids: [] });
                          }
                        }}
                      />
                      <Label htmlFor="nao-pretende-servir" className="text-sm font-normal cursor-pointer">
                        Ainda não pretendo servir
                      </Label>
                    </div>

                    {!naoPretendeServir && (
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">
                          Selecione os ministérios de seu interesse:
                        </Label>
                        <ScrollArea className="h-48 rounded-md border border-border p-3 bg-background">
                          <div className="space-y-2">
                            {ministries.map((ministry) => (
                              <div key={ministry.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`ministry-auth-${ministry.id}`}
                                  checked={signupData.ministerio_ids?.includes(ministry.id) || false}
                                  onCheckedChange={(checked) => {
                                    const currentIds = signupData.ministerio_ids || [];
                                    if (checked) {
                                      setSignupData({ ...signupData, ministerio_ids: [...currentIds, ministry.id] });
                                    } else {
                                      setSignupData({ ...signupData, ministerio_ids: currentIds.filter((id) => id !== ministry.id) });
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`ministry-auth-${ministry.id}`}
                                  className="text-sm font-normal cursor-pointer"
                                >
                                  {ministry.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </div>

                  <TermsCheckbox
                    checked={acceptedTerms}
                    onCheckedChange={setAcceptedTerms}
                    error={errors.acceptedTerms}
                  />
                  
                  <div className="p-4 bg-secondary/10 rounded-lg border border-secondary/30">
                    <p className="text-sm text-muted-foreground">
                      Ao enviar sua solicitação, ela será analisada pela secretaria. 
                      Você receberá suas credenciais de acesso via WhatsApp após a aprovação.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      <strong>Sua senha será:</strong> Os 6 primeiros dígitos do seu CPF
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex justify-between pt-4">
                {step > 1 ? (
                  <Button type="button" variant="outline" onClick={prevStep}>
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Voltar
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsLogin(true);
                      setStep(1);
                      setErrors({});
                    }}
                  >
                    ← Já tenho conta
                  </Button>
                )}

                {step < 3 ? (
                  <Button type="button" variant="secondary" onClick={(e) => nextStep(e)}>
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button type="submit" variant="secondary" disabled={isLoading}>
                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Enviar Solicitação
                  </Button>
                )}
              </div>
            </form>
          <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center items-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setStep(1);
                setErrors({});
                setSignupData({
                  full_name: "",
                  email: "",
                  genero: "",
                  birth_date: "",
                  whatsapp: "",
                  cep: "",
                  address: "",
                  number: "",
                  complement: "",
                  neighborhood: "",
                  city: "",
                  state: "",
                  cpf: "",
                  perfil_solicitado: "membro",
                  ministerio_ids: [],
                });
                setPhotoFile(null);
                setPhotoPreview(null);
              }}
              className="text-sm text-secondary hover:underline font-medium"
            >
              Cancelar cadastro
            </button>
            <span className="hidden sm:inline text-muted-foreground">•</span>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Voltar para a homepage
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
