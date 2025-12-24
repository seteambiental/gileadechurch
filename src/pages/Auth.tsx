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
import { Loader2 } from "lucide-react";
import logoGileade from "@/assets/logo-gileade.jpeg";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().email("Email inválido").max(255, "Email muito longo"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").max(72, "Senha muito longa"),
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

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});

  const { signIn, signUp, user, loading, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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


  const validateForm = () => {
    try {
      authSchema.parse({ email, password });
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: { email?: string; password?: string } = {};
        err.errors.forEach((error) => {
          if (error.path[0] === "email") fieldErrors.email = error.message;
          if (error.path[0] === "password") fieldErrors.password = error.message;
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
        const fieldErrors: { password?: string; confirmPassword?: string } = {};
        err.errors.forEach((error) => {
          if (error.path[0] === "password") fieldErrors.password = error.message;
          if (error.path[0] === "confirmPassword") fieldErrors.confirmPassword = error.message;
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateNewPasswordForm()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: error.message,
        });
        return;
      }

      toast({
        title: "Senha atualizada!",
        description: "Agora você já pode entrar com a nova senha.",
      });

      // limpa tokens da URL para evitar ficar preso no modo recovery
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
        toast({
          variant: "destructive",
          title: "Erro",
          description: error.message,
        });
      } else {
        toast({
          title: "Email enviado!",
          description: "Verifique sua caixa de entrada para redefinir sua senha.",
        });
        setIsForgotPassword(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              variant: "destructive",
              title: "Erro ao entrar",
              description: "Email ou senha incorretos.",
            });
          } else {
            toast({
              variant: "destructive",
              title: "Erro ao entrar",
              description: error.message,
            });
          }
        } else {
          toast({
            title: "Bem-vindo!",
            description: "Login realizado com sucesso.",
          });
          navigate("/app");
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes("User already registered")) {
            toast({
              variant: "destructive",
              title: "Erro no cadastro",
              description: "Este email já está cadastrado. Tente fazer login.",
            });
          } else {
            toast({
              variant: "destructive",
              title: "Erro no cadastro",
              description: error.message,
            });
          }
        } else {
          toast({
            title: "Conta criada!",
            description: "Sua conta foi criada com sucesso. Faça login para continuar.",
          });
          setIsLogin(true);
        }
      }
    } finally {
      setIsLoading(false);
    }
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
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
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


  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/50 bg-card/95 backdrop-blur">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full overflow-hidden shadow-red">
            <img src={logoGileade} alt="Gileade Church" className="w-full h-full object-cover" />
          </div>
          <div>
            <CardTitle className="font-heading text-2xl text-foreground">
              {isLogin ? "Entrar no App" : "Criar Conta"}
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              {isLogin
                ? "Acesse os ministérios da Gileade Church"
                : "Crie sua conta para acessar o app"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
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
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            {isLogin && (
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
            )}

            <Button
              type="submit"
              className="w-full"
              variant="secondary"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isLogin ? "Entrar" : "Criar Conta"}
            </Button>

            {isLogin && (
              <Button
                type="button"
                className="w-full"
                variant="outline"
                onClick={() => {
                  setAuthBypassed(true);
                  navigate("/app");
                }}
                disabled={isLoading}
              >
                Entrar sem senha (temporário)
              </Button>
            )}

          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-secondary hover:underline"
            >
              {isLogin
                ? "Não tem conta? Cadastre-se"
                : "Já tem conta? Faça login"}
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
};

export default Auth;
