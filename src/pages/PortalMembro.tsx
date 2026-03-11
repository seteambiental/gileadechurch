import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMemberPortal } from "@/hooks/useMemberPortal";
import { useUserAccess } from "@/hooks/useUserAccess";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LogOut,
  Loader2,
  Calendar,
  DollarSign,
  HandHeart,
  Home,
  User,
  Send,
  Baby,
  HandHelping,
  ArrowRightLeft,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logoGileade from "@/assets/logo-gileade.jpeg";
import pgChurchKidsIcon from "@/assets/pg-church-kids.png";

// Componentes das abas
import { PortalAgendaTab } from "@/components/portal/PortalAgendaTab";
import { PortalFinancasTab } from "@/components/portal/PortalFinancasTab";
import { PortalCandidaturaTab } from "@/components/portal/PortalCandidaturaTab";
import { PortalCasaRefugioTab } from "@/components/portal/PortalCasaRefugioTab";
import { PortalMinisterioTab } from "@/components/portal/PortalMinisterioTab";
import { PortalCandidaturaServicoTab } from "@/components/portal/PortalCandidaturaServicoTab";
import { PortalKidsCheckinTab } from "@/components/portal/PortalKidsCheckinTab";
import { CheckMePrompt } from "@/components/portal/CheckMePrompt";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PortalMembro = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const {
    memberProfile,
    loadingProfile,
    portalAccess,
    memberMinistries,
    memberCasasRefugio,
    isAnfitriao,
  } = useMemberPortal();
  const { isAdmin } = useUserAccess(user?.id);
  const [activeTab, setActiveTab] = useState("home");
  const [showCheckMePrompt, setShowCheckMePrompt] = useState(false);
  const [checkMeDismissed, setCheckMeDismissed] = useState(false);
  const { isNearChurch, loading: geoLoading } = useGeolocation();

  // Check if member is responsible for kids
  const { data: hasKids } = useQuery({
    queryKey: ["portal-has-kids", memberProfile?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("kids_responsaveis")
        .select("id", { count: "exact", head: true })
        .eq("responsavel_member_id", memberProfile!.id);
      return (count || 0) > 0;
    },
    enabled: !!memberProfile?.id,
  });

  // Show check-me prompt when near church and has kids
  useEffect(() => {
    if (!geoLoading && isNearChurch && hasKids && !checkMeDismissed) {
      setShowCheckMePrompt(true);
    }
  }, [geoLoading, isNearChurch, hasKids, checkMeDismissed]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?redirect=/portal");
    }
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    navigate("/");
    await signOut();
  };

  if (authLoading || loadingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  if (!user) return null;

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
  // Determinar se membro tem acesso à Casa Refúgio no portal do membro
  // Apenas membros regulares (casa_refugio_id) ou anfitriões - líderes/supervisores/síndicos usam o Portal Ministério
  const isMemberOfCasaRefugio = !!memberProfile?.casa_refugio_id || isAnfitriao;

  const availableTabs: { id: string; label: string; icon: React.ElementType }[] = [
    { id: "home", label: "Início", icon: Home },
    { id: "financas", label: "Contribuir", icon: DollarSign },
  ];

  if (isMemberOfCasaRefugio) {
    availableTabs.push({ id: "casas-refugio", label: "Casa Refúgio", icon: Home });
  }

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

  if (hasKids) {
    availableTabs.push({ id: "kids-checkin", label: "Check-me PG", icon: Baby });
  }
  availableTabs.push({ id: "servico", label: "Servir na Porta", icon: HandHelping });
  availableTabs.push({ id: "candidatura", label: "Servir", icon: Send });

  return (
    <div className="min-h-screen bg-background">
      {/* Check-me prompt */}
      {showCheckMePrompt && memberProfile && (
        <CheckMePrompt
          memberId={memberProfile.id}
          memberName={memberProfile.full_name}
          onDismiss={() => { setShowCheckMePrompt(false); setCheckMeDismissed(true); }}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border">
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
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground gap-2"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Trocar Portal</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate("/app")}>
                    Portal ADM
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/lideres")}>
                    Portal Ministério
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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

          {/* Home Tab - reformulated */}
          <TabsContent value="home">
            <div className="space-y-6">
              {/* Quick access cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {isMemberOfCasaRefugio && (
                  <Card 
                    className="cursor-pointer hover:border-secondary transition-colors"
                    onClick={() => setActiveTab("casas-refugio")}
                  >
                    <CardContent className="py-5 text-center">
                      <Home className="w-6 h-6 mx-auto mb-2 text-secondary" />
                      <p className="text-sm font-medium">Casa Refúgio</p>
                      <p className="text-xs text-muted-foreground">{memberCasasRefugio[0]?.name || "Minha CR"}</p>
                    </CardContent>
                  </Card>
                )}

                {hasKids && (
                  <>
                    <Card 
                      className="cursor-pointer hover:border-secondary transition-colors"
                      onClick={() => navigate("/portal/kids")}
                    >
                      <CardContent className="py-5 text-center">
                        <img src={pgChurchKidsIcon} alt="PG Kids" className="w-6 h-6 mx-auto mb-2" />
                        <p className="text-sm font-medium">Portal Kids</p>
                        <p className="text-xs text-muted-foreground">PG Crianças</p>
                      </CardContent>
                    </Card>
                    <Card 
                      className="cursor-pointer hover:border-secondary transition-colors"
                      onClick={() => setActiveTab("kids-checkin")}
                    >
                      <CardContent className="py-5 text-center">
                        <Baby className="w-6 h-6 mx-auto mb-2 text-secondary" />
                        <p className="text-sm font-medium">Check-me PG</p>
                        <p className="text-xs text-muted-foreground">Presença Kids</p>
                      </CardContent>
                    </Card>
                  </>
                )}

                <Card 
                  className="cursor-pointer hover:border-secondary transition-colors"
                  onClick={() => setActiveTab("financas")}
                >
                  <CardContent className="py-5 text-center">
                    <DollarSign className="w-6 h-6 mx-auto mb-2 text-secondary" />
                    <p className="text-sm font-medium">Contribuir</p>
                    <p className="text-xs text-muted-foreground">PIX e ofertas</p>
                  </CardContent>
                </Card>

                <Card 
                  className="cursor-pointer hover:border-secondary transition-colors"
                  onClick={() => setActiveTab("candidatura")}
                >
                  <CardContent className="py-5 text-center">
                    <Send className="w-6 h-6 mx-auto mb-2 text-secondary" />
                    <p className="text-sm font-medium">Servir</p>
                    <p className="text-xs text-muted-foreground">Ministérios</p>
                  </CardContent>
                </Card>
              </div>

              {/* Calendar */}
              <PortalAgendaTab />
            </div>
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

          <TabsContent value="kids-checkin">
            <PortalKidsCheckinTab memberId={memberProfile.id} memberName={memberProfile.full_name} />
          </TabsContent>

          <TabsContent value="servico">
            <PortalCandidaturaServicoTab memberId={memberProfile.id} />
          </TabsContent>

          <TabsContent value="candidatura">
            <PortalCandidaturaTab memberId={memberProfile.id} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            {(portalAccess?.role === "lider_ministerio" ||
              portalAccess?.role === "lider_casa_refugio" ||
              portalAccess?.role === "sindico_condominio" ||
              portalAccess?.role === "supervisor_condominio" ||
              portalAccess?.role === "pastor_geral" ||
              portalAccess?.role === "pastor_auxiliar") && (
              <button
                onClick={() => navigate("/lideres")}
                className="hover:text-foreground font-medium text-secondary"
              >
                Portal Ministério →
              </button>
            )}
            <button
              onClick={() => navigate("/")}
              className="hover:text-foreground"
            >
              ← Voltar para a homepage
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PortalMembro;
