import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isAuthBypassed, setAuthBypassed } from "@/lib/auth-bypass";
import { Users, Church, Home, Building2, ArrowLeft, Loader2, Building, UserCheck, LogOut, UserPlus, UserRound, Shield, Settings, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import logoGileade from "@/assets/logo-gileade.jpeg";
import MembrosTab from "@/components/cadastros/MembrosTab";

import MinisteriosTab from "@/components/cadastros/MinisteriosTab";
import CasasRefugioTab from "@/components/cadastros/CasasRefugioTab";
import CondominiosTab from "@/components/cadastros/CondominiosTab";
import IgrejaTab from "@/components/cadastros/IgrejaTab";
import AprovacaoUsuariosTab from "@/components/cadastros/AprovacaoUsuariosTab";
import SolicitacoesMembrosTab from "@/components/cadastros/SolicitacoesMembrosTab";
import VisitantesTab from "@/components/cadastros/VisitantesTab";
import PastorAuxiliarPermissoesTab from "@/components/cadastros/PastorAuxiliarPermissoesTab";
import SistemaTab from "@/components/cadastros/SistemaTab";
import AcessosTab from "@/components/cadastros/AcessosTab";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const Cadastros = () => {
  const isBypassed = isAuthBypassed();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  
  const handleSignOut = async () => {
    setAuthBypassed(false);
    navigate("/");
    await signOut();
  };
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(tabParam || "membros");

  // Check if user is master
  const { data: isMaster } = useQuery({
    queryKey: ["user_is_master", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["pastor_geral", "pastor_auxiliar", "admin"]);
      return data && data.length > 0;
    },
    enabled: !!user?.id,
  });

  // Check strict admin (apenas admin ou pastor_geral) — para aba Acessos
  const { data: isStrictAdmin } = useQuery({
    queryKey: ["user_is_strict_admin", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "pastor_geral"]);
      return data && data.length > 0;
    },
    enabled: !!user?.id,
  });

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["member-requests-pending-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("member_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pendente");
      if (error) throw error;
      return count || 0;
    },
  });

  useEffect(() => {
    if (!loading && !user && !isAuthBypassed()) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={logoGileade}
              alt="Gileade Church"
              className="w-10 h-10 rounded-full object-cover shadow-red"
            />
            <div>
              <h1 className="font-heading font-bold text-lg text-foreground">Cadastros</h1>
              <p className="text-xs text-muted-foreground">Gestão de dados</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/app")} className="text-muted-foreground hover:text-foreground">
              <Home className="w-4 h-4" />
            </Button>
            
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            ) : isBypassed ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/auth")}
                className="text-muted-foreground hover:text-foreground"
              >
                Entrar
              </Button>
            ) : null}
          </div>
        </div>
      </header>


      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full mb-6 bg-card border border-border h-12 grid-cols-10">
            <TabsTrigger 
              value="membros" 
              className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground text-foreground flex items-center gap-2"
            >
              <Users className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Membros</span>
            </TabsTrigger>
            <TabsTrigger 
              value="visitantes" 
              className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground text-foreground flex items-center gap-2"
            >
              <UserRound className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Visitantes</span>
            </TabsTrigger>
            <TabsTrigger 
              value="solicitacoes" 
              className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground text-foreground flex items-center gap-2 relative"
            >
              <UserPlus className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Novas</span>
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="ministerios" 
              className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground text-foreground flex items-center gap-2"
            >
              <Church className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Ministérios</span>
            </TabsTrigger>
            <TabsTrigger 
              value="casas" 
              className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground text-foreground flex items-center gap-2"
            >
              <Home className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Casas Refúgio</span>
            </TabsTrigger>
            <TabsTrigger 
              value="condominios" 
              className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground text-foreground flex items-center gap-2"
            >
              <Building2 className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Condomínios</span>
            </TabsTrigger>
            <TabsTrigger 
              value="igreja" 
              className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground text-foreground flex items-center gap-2"
            >
              <Building className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Igreja</span>
            </TabsTrigger>
            <TabsTrigger 
              value="aprovacoes" 
              className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground text-foreground flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Aprovações</span>
            </TabsTrigger>
            {isMaster && (
              <TabsTrigger 
                value="permissoes" 
                className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground text-foreground flex items-center gap-2"
              >
                <Shield className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Permissões</span>
              </TabsTrigger>
            )}
            <TabsTrigger 
              value="sistema" 
              className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground text-foreground flex items-center gap-2"
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Sistema</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="membros">
            <MembrosTab />
          </TabsContent>

          <TabsContent value="visitantes">
            <VisitantesTab />
          </TabsContent>

          <TabsContent value="solicitacoes">
            <SolicitacoesMembrosTab />
          </TabsContent>

          <TabsContent value="ministerios">
            <MinisteriosTab />
          </TabsContent>

          <TabsContent value="casas">
            <CasasRefugioTab />
          </TabsContent>

          <TabsContent value="condominios">
            <CondominiosTab />
          </TabsContent>

          <TabsContent value="igreja">
            <IgrejaTab />
          </TabsContent>

          <TabsContent value="aprovacoes">
            <AprovacaoUsuariosTab />
          </TabsContent>

          {isMaster && (
            <TabsContent value="permissoes">
              <PastorAuxiliarPermissoesTab />
            </TabsContent>
          )}

          <TabsContent value="sistema">
            <SistemaTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Cadastros;
