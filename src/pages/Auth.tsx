import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { isAuthBypassed, setAuthBypassed } from "@/lib/auth-bypass";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const loginSchema = z.object({
  email: z.string().email("Email inválido").max(255, "Email muito longo"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").max(72, "Senha muito longa"),
});

const signupSchema = z.object({
  full_name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string().min(6, "Confirme a senha"),
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
  rg: z.string().optional(),
  perfil_solicitado: z.enum(["membro", "lider", "ministerial"]),
  ministerio_ids: z.array(z.string()).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não conferem",
  path: ["confirmPassword"],
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
  const [step, setStep] = useState(1); // Steps: 1 = dados pessoais, 2 = endereço, 3 = acesso
  
  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Signup fields
  const [signupData, setSignupData] = useState<Partial<SignupData>>({
    full_name: "",
    email: "",
    password: "",
    confirmPassword: "",
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
    rg: "",
    perfil_solicitado: "membro",
    ministerio_ids: [],
  });
  
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signIn, signUp, user, loading, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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
      navigate("/app");
      return;
    }

    const url = window.location.href;
    const isRecoveryUrl = url.includes("type=recovery") || url.includes("access_token=") || url.includes("code=");
    if (isRecoveryUrl) {
      setIsRecovery(true);
      setIsForgotPassword(false);
      setIsLogin(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
        setIsForgotPassword(false);
        setIsLogin(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!loading && user && !isRecovery) {
      navigate("/app");
    }
  }, [user, loading, navigate, isRecovery]);

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
      if (!signupData.password) fieldErrors.password = "Senha é obrigatória";
      else if (signupData.password.length < 6) fieldErrors.password = "Senha deve ter no mínimo 6 caracteres";
      if (!signupData.confirmPassword) fieldErrors.confirmPassword = "Confirme a senha";
      else if (signupData.password !== signupData.confirmPassword) fieldErrors.confirmPassword = "As senhas não conferem";
    }
    
    setErrors(fieldErrors);
    return Object.keys(fieldErrors).length === 0;
  };

  const handleCepBlur = async () => {
    const cep = signupData.cep ? unformatCep(signupData.cep) : "";
    if (cep.length !== 8) return;

    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setSignupData(prev => ({
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
        navigate("/app");
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
      // 1. Create the auth user
      const { error: signUpError, data: authData } = await signUp(signupData.email!, signupData.password!);
      if (signUpError) {
        if (signUpError.message.includes("User already registered")) {
          toast({ variant: "destructive", title: "Erro no cadastro", description: "Este email já está cadastrado. Tente fazer login." });
        } else {
          toast({ variant: "destructive", title: "Erro no cadastro", description: signUpError.message });
        }
        return;
      }

      const userId = authData?.user?.id || null;
      let photoUrl: string | null = null;
      if (photoFile) {
        const fileExt = photoFile.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("member-photos")
          .upload(fileName, photoFile);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("member-photos")
            .getPublicUrl(fileName);
          photoUrl = urlData.publicUrl;
        }
      }

      // 3. Create member record
      const memberData = {
        full_name: signupData.full_name!,
        genero: signupData.genero || null,
        birth_date: signupData.birth_date || null,
        cep: signupData.cep ? unformatCep(signupData.cep) : null,
        address: signupData.address || null,
        number: signupData.number || null,
        complement: signupData.complement || null,
        neighborhood: signupData.neighborhood || null,
        city: signupData.city || null,
        state: signupData.state || null,
        whatsapp: signupData.whatsapp ? unformatPhone(signupData.whatsapp) : null,
        email: signupData.email,
        photo_url: photoUrl,
        rg: signupData.rg || null,
        cpf: signupData.cpf ? signupData.cpf.replace(/\D/g, "") : null,
        user_id: userId,
      };

      const { data: newMember, error: memberError } = await supabase
        .from("members")
        .insert(memberData)
        .select()
        .single();

      if (memberError) throw memberError;

      // 4. Create access request for approval
      const { error: accessError } = await supabase
        .from("user_access_requests")
        .insert({
          member_id: newMember.id,
          email: signupData.email!,
          requested_role: signupData.perfil_solicitado as "membro" | "lider" | "ministerial",
          requested_ministry_ids: signupData.ministerio_ids || [],
          status: "pendente",
        });

      if (accessError) throw accessError;

      toast({
        title: "Cadastro realizado!",
        description: "Sua solicitação foi enviada para aprovação. Você receberá uma notificação quando for aprovado.",
      });

      // Reset form and go to login
      setSignupData({
        full_name: "",
        email: "",
        password: "",
        confirmPassword: "",
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
        rg: "",
        perfil_solicitado: "membro",
        ministerio_ids: [],
      });
      setPhotoFile(null);
      setPhotoPreview(null);
      setStep(1);
      setIsLogin(true);
    } catch (error) {
      toast({ variant: "destructive", title: "Erro no cadastro", description: String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (validateSignupStep(step)) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
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
                <Input
                  id="password"
                  type="password"
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
                <Input
                  id="confirmPassword"
                  type="password"
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
              <CardTitle className="font-heading text-2xl text-foreground">Entrar no App</CardTitle>
              <CardDescription className="text-muted-foreground mt-2">
                Acesse os ministérios da Gileade Church
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
                <Input
                  id="password"
                  type="password"
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
                  setStep(1);
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

  // Signup form with steps
  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-border/50 bg-card/95 backdrop-blur">
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
          <ScrollArea className="max-h-[60vh]">
            <form onSubmit={handleSignup} className="space-y-4 pr-4">
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

                    <div className="space-y-2">
                      <Label>Senha *</Label>
                      <Input
                        type="password"
                        value={signupData.password}
                        onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                        className={errors.password ? "border-destructive" : ""}
                      />
                      {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label>Confirmar Senha *</Label>
                      <Input
                        type="password"
                        value={signupData.confirmPassword}
                        onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                        className={errors.confirmPassword ? "border-destructive" : ""}
                      />
                      {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
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

                    <div className="space-y-2">
                      <Label>RG</Label>
                      <Input
                        value={signupData.rg}
                        onChange={(e) => setSignupData({ ...signupData, rg: e.target.value })}
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
                          onBlur={handleCepBlur}
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
                        { value: "lider", label: "Líder", description: "Acesso para líderes de célula ou ministério" },
                        { value: "ministerial", label: "Ministerial", description: "Acesso aos ministérios selecionados" },
                      ].map((perfil) => (
                        <div
                          key={perfil.value}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            signupData.perfil_solicitado === perfil.value
                              ? "border-secondary bg-secondary/10"
                              : "border-border hover:border-secondary/50"
                          }`}
                          onClick={() => setSignupData({ ...signupData, perfil_solicitado: perfil.value as "membro" | "lider" | "ministerial" })}
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

                  {signupData.perfil_solicitado === "ministerial" && ministries.length > 0 && (
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
                  <Button type="button" variant="secondary" onClick={nextStep}>
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
          </ScrollArea>

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
};

export default Auth;
