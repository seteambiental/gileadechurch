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
import { Loader2, Upload, ChevronLeft, ChevronRight } from "lucide-react";
import logoGileade from "@/assets/logo-gileade.jpeg";
import { z } from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPhone, formatCep, unformatPhone, unformatCep, formatCPF } from "@/lib/masks";
import { useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCepLookup } from "@/hooks/useCepLookup";

const loginSchema = z.object({
  email: z.string().email("Email inválido").max(255, "Email muito longo"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").max(72, "Senha muito longa"),
});

const signupSchema = z.object({
  full_name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  genero: z.string().optional(),
  birth_date: z.string().optional(),
  whatsapp: z.string().optional(),
  cep: z.string().optional(),
  address: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  cpf: z.string().optional(),
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
  const [preCheckName, setPreCheckName] = useState("");
  const [preCheckBirthDate, setPreCheckBirthDate] = useState("");
  const [existingMemberEmail, setExistingMemberEmail] = useState<string | null>(null);
  const [step, setStep] = useState(1); // Steps: 1 = dados pessoais, 2 = endereço, 3 = acesso

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
      if (!signupData.email) fieldErrors.email = "Email é obrigatório";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupData.email)) fieldErrors.email = "Email inválido";
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
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast({ variant: "destructive", title: "Erro", description: error.message });
        return;
      }

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
                  setPreCheckName("");
                  setPreCheckBirthDate("");
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
          // User doesn't exist - proceed to registration form
          setSignupData({
            ...signupData,
            full_name: preCheckName.trim(),
            birth_date: preCheckBirthDate,
          });
          setIsPreCheck(false);
          setStep(1);
          toast({
            title: "Você pode prosseguir!",
            description: "Complete seu cadastro preenchendo as informações abaixo.",
          });
        }
      } catch (error: any) {
        console.error("Error checking user:", error);
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
                  <Label htmlFor="preCheckBirthDate">Data de Nascimento</Label>
                  <Input
                    id="preCheckBirthDate"
                    type="date"
                    value={preCheckBirthDate}
                    onChange={(e) => setPreCheckBirthDate(e.target.value)}
                    className={errors.preCheckBirthDate ? "border-destructive" : ""}
                  />
                  {errors.preCheckBirthDate && <p className="text-sm text-destructive">{errors.preCheckBirthDate}</p>}
                </div>
                <Button type="submit" className="w-full" variant="secondary" disabled={isLoading}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Verificar
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsPreCheck(false);
                  setIsLogin(true);
                  setExistingMemberEmail(null);
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
                        size="sm"
                        onClick={() => document.getElementById("photo-upload")?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Foto (opcional)
                      </Button>
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
                      <Label>WhatsApp</Label>
                      <Input
                        value={signupData.whatsapp}
                        onChange={(e) => setSignupData({ ...signupData, whatsapp: formatPhone(e.target.value) })}
                        placeholder="(00) 00000-0000"
                        maxLength={16}
                      />
                    </div>

                    <div className="p-3 bg-muted/50 rounded-lg border border-border">
                      <p className="text-sm text-muted-foreground">
                        <strong>Sua senha será gerada automaticamente:</strong>
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        • Com CPF: os 4 primeiros dígitos do CPF
                      </p>
                      <p className="text-sm text-muted-foreground">
                        • Sem CPF: 1234
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Gênero</Label>
                      <Select
                        value={signupData.genero}
                        onValueChange={(v) => setSignupData({ ...signupData, genero: v })}
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

                    <div className="space-y-2">
                      <Label>Data de Nascimento</Label>
                      <Input
                        type="date"
                        value={signupData.birth_date}
                        onChange={(e) => setSignupData({ ...signupData, birth_date: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>CPF</Label>
                      <Input
                        value={signupData.cpf}
                        onChange={(e) => setSignupData({ ...signupData, cpf: formatCPF(e.target.value) })}
                        placeholder="000.000.000-00"
                        maxLength={14}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Address */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>CEP</Label>
                      <div className="relative">
                        <Input
                          value={signupData.cep}
                          onChange={(e) => setSignupData({ ...signupData, cep: formatCep(e.target.value) })}
                          placeholder="00000-000"
                          maxLength={9}
                        />
                        {isLoadingCep && (
                          <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label>Logradouro</Label>
                      <Input
                        value={signupData.address}
                        onChange={(e) => setSignupData({ ...signupData, address: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Número</Label>
                      <Input
                        value={signupData.number}
                        onChange={(e) => setSignupData({ ...signupData, number: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label>Complemento</Label>
                      <Input
                        value={signupData.complement}
                        onChange={(e) => setSignupData({ ...signupData, complement: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Bairro</Label>
                      <Input
                        value={signupData.neighborhood}
                        onChange={(e) => setSignupData({ ...signupData, neighborhood: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Cidade</Label>
                      <Input
                        value={signupData.city}
                        onChange={(e) => setSignupData({ ...signupData, city: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <Input
                        value={signupData.state}
                        onChange={(e) => setSignupData({ ...signupData, state: e.target.value })}
                        maxLength={2}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Access Profile */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <Label>Perfil de Acesso Solicitado</Label>
                    <p className="text-sm text-muted-foreground">
                      Selecione o tipo de acesso que você precisa. Um administrador irá aprovar sua solicitação.
                    </p>

                    <div className="space-y-3">
                      {[
                        { value: "membro", label: "Membro", description: "Acesso básico para visualização" },
                        { value: "integrante_ministerio", label: "Integrante de Ministério", description: "Visualização do ministério (sem edição)" },
                        { value: "lider_ministerio", label: "Líder de Ministério", description: "Acesso completo ao ministério" },
                      ].map((perfil) => (
                        <div
                          key={perfil.value}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            signupData.perfil_solicitado === perfil.value
                              ? "border-secondary bg-secondary/10"
                              : "border-border hover:border-secondary/50"
                          }`}
                          onClick={() => setSignupData({ ...signupData, perfil_solicitado: perfil.value as "membro" | "lider_ministerio" | "integrante_ministerio" })}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-4 h-4 rounded-full border-2 ${
                                signupData.perfil_solicitado === perfil.value
                                  ? "border-secondary bg-secondary"
                                  : "border-muted-foreground"
                              }`}
                            />
                            <div>
                              <p className="font-medium">{perfil.label}</p>
                              <p className="text-sm text-muted-foreground">{perfil.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {(signupData.perfil_solicitado === "lider_ministerio" || signupData.perfil_solicitado === "integrante_ministerio") && ministries.length > 0 && (
                    <div className="space-y-3">
                      <Label>Ministérios</Label>
                      <p className="text-sm text-muted-foreground">
                        Selecione os ministérios que você participa
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {ministries.map((ministry) => (
                          <div
                            key={ministry.id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={ministry.id}
                              checked={signupData.ministerio_ids?.includes(ministry.id)}
                              onCheckedChange={(checked) => {
                                const current = signupData.ministerio_ids || [];
                                if (checked) {
                                  setSignupData({ ...signupData, ministerio_ids: [...current, ministry.id] });
                                } else {
                                  setSignupData({ ...signupData, ministerio_ids: current.filter((id) => id !== ministry.id) });
                                }
                              }}
                            />
                            <label htmlFor={ministry.id} className="text-sm cursor-pointer">
                              {ministry.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
