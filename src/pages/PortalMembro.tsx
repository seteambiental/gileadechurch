import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMemberPortal } from "@/hooks/useMemberPortal";
import {
  LogOut,
  Loader2,
  Calendar,
  DollarSign,
  HandHeart,
  Home,
  User,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import logoGileade from "@/assets/logo-gileade.jpeg";

// Componentes das abas
import { PortalAgendaTab } from "@/components/portal/PortalAgendaTab";
import { PortalFinancasTab } from "@/components/portal/PortalFinancasTab";
import { PortalCandidaturaTab } from "@/components/portal/PortalCandidaturaTab";
import { PortalCasaRefugioTab } from "@/components/portal/PortalCasaRefugioTab";
import { PortalMinisterioTab } from "@/components/portal/PortalMinisterioTab";

const PortalMembro = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const {
    memberProfile,
    loadingProfile,
    portalAccess,
    memberMinistries,
    memberCasasRefugio,
  } = useMemberPortal();

  const [activeTab, setActiveTab] = useState("agenda");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?redirect=/portal");
    }
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading || loadingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  // Se não encontrou perfil de membro vinculado
  if (!memberProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-xl font-bold text-foreground mb-2">
            Perfil não encontrado
          </h1>
          <p className="text-muted-foreground mb-4">
            Seu usuário ainda não está vinculado a um cadastro de membro. 
            Entre em contato com a secretaria da igreja.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate("/")}>
              Voltar ao início
            </Button>
            <Button variant="secondary" onClick={handleSignOut}>
              Sair
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  // Determinar abas disponíveis
  const availableTabs: { id: string; label: string; icon: React.ElementType }[] = [
    { id: "agenda", label: "Agenda", icon: Calendar },
    { id: "financas", label: "Finanças", icon: DollarSign },
  ];

  // Adicionar aba de Casas Refúgio se tiver acesso
  if (memberCasasRefugio.length > 0 || 
      portalAccess?.role === "pastor_geral" ||
      portalAccess?.role === "sindico_condominio" ||
      portalAccess?.role === "supervisor_condominio") {
    availableTabs.push({ id: "casas-refugio", label: "Casas Refúgio", icon: Home });
  }

  // Adicionar abas de ministérios
  memberMinistries.forEach((ministry) => {
    const slug = ministry.name.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-");
    availableTabs.push({
      id: `ministerio-${slug}`,
      label: ministry.name,
      icon: HandHeart,
    });
  });

  // Sempre adicionar candidatura
  availableTabs.push({ id: "candidatura", label: "Quero Servir", icon: Send });

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
              <h1 className="font-heading font-bold text-lg text-foreground">
                Portal do Membro
              </h1>
              <p className="text-xs text-muted-foreground">
                Igreja Gileade
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <Avatar className="w-8 h-8 border border-border">
                <AvatarImage src={memberProfile.photo_url || undefined} />
                <AvatarFallback className="bg-secondary/20 text-secondary text-xs">
                  {getInitials(memberProfile.full_name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{memberProfile.full_name.split(" ")[0]}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4" />
              <span className="sr-only">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Mobile: Scroll horizontal com abas compactas */}
          <div className="relative -mx-3 sm:mx-0 px-3 sm:px-0">
            <TabsList className="w-full overflow-x-auto flex-nowrap justify-start mb-4 sm:mb-6 h-auto p-1 gap-1 scrollbar-hide">
              {availableTabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap px-3 py-2 text-xs sm:text-sm min-w-fit flex-shrink-0"
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="agenda">
            <PortalAgendaTab />
          </TabsContent>

          <TabsContent value="financas">
            <PortalFinancasTab />
          </TabsContent>

          <TabsContent value="casas-refugio">
            <PortalCasaRefugioTab 
              portalAccess={portalAccess} 
              memberCasasRefugio={memberCasasRefugio}
            />
          </TabsContent>

          {memberMinistries.map((ministry) => {
            const slug = ministry.name.toLowerCase()
              .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
              .replace(/\s+/g, "-");
            return (
              <TabsContent key={ministry.id} value={`ministerio-${slug}`}>
                <PortalMinisterioTab 
                  ministryId={ministry.id}
                  ministryName={ministry.name}
                  ministrySlug={slug}
                  isLider={ministry.isLider}
                  portalAccess={portalAccess}
                />
              </TabsContent>
            );
          })}

          <TabsContent value="candidatura">
            <PortalCandidaturaTab memberId={memberProfile.id} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Voltar para a homepage
          </button>
        </div>
      </footer>
    </div>
  );
};

export default PortalMembro;
