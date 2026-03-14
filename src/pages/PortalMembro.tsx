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
  ArrowLeft,
  Music,
  Church,
  ClipboardList,
  GraduationCap,
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
import pgRetornoImg from "@/assets/pg-retorno.jpg";

// Componentes das seções
import { PortalAgendaTab } from "@/components/portal/PortalAgendaTab";
import { PortalFinancasTab } from "@/components/portal/PortalFinancasTab";
import { PortalCandidaturaTab } from "@/components/portal/PortalCandidaturaTab";
import { PortalCasaRefugioTab } from "@/components/portal/PortalCasaRefugioTab";
import { PortalMinisterioTab } from "@/components/portal/PortalMinisterioTab";
import { PortalCandidaturaServicoTab } from "@/components/portal/PortalCandidaturaServicoTab";
import { PortalKidsCheckinTab } from "@/components/portal/PortalKidsCheckinTab";
import { PortalInscricoesTab } from "@/components/portal/PortalInscricoesTab";
import { CheckMePrompt } from "@/components/portal/CheckMePrompt";
import { PortalCursoCasaisTab } from "@/components/portal/PortalCursoCasaisTab";

interface MenuItemConfig {
  id: string;
  label: string;
  subtitle?: string;
  icon: React.ElementType;
  iconImg?: string;
  iconImgClass?: string;
  color?: string;
  action?: () => void;
}

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
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showCheckMePrompt, setShowCheckMePrompt] = useState(false);
  const [checkMeDismissed, setCheckMeDismissed] = useState(false);
  const { isNearChurch, loading: geoLoading } = useGeolocation();

  // Check if member is responsible for kids
  const { data: hasKids } = useQuery({
    queryKey: ["portal-has-kids", memberProfile?.id],
    queryFn: async () => {
      // Check kids_responsaveis table
      const { count: countResp } = await supabase
        .from("kids_responsaveis")
        .select("id", { count: "exact", head: true })
        .eq("responsavel_member_id", memberProfile!.id);
      if ((countResp || 0) > 0) return true;

      // Also check direct children (responsavel_id on members)
      const { count: countDirect } = await supabase
        .from("members")
        .select("id", { count: "exact", head: true })
        .eq("responsavel_id", memberProfile!.id)
        .not("birth_date", "is", null);
      return (countDirect || 0) > 0;
    },
    enabled: !!memberProfile?.id,
  });

  // Check if member is enrolled in casais course
  const { data: hasCasaisCurso } = useQuery({
    queryKey: ["portal-has-casais-curso", memberProfile?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("casais_inscritos")
        .select("id", { count: "exact", head: true })
        .or(`membro_masculino_id.eq.${memberProfile!.id},membro_feminino_id.eq.${memberProfile!.id}`)
        .eq("status", "aprovado");
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

  const isMemberOfCasaRefugio = !!memberProfile?.casa_refugio_id || isAnfitriao;

  // Build menu items
  const menuItems: MenuItemConfig[] = [];

  // Agenda
  menuItems.push({
    id: "agenda",
    label: "Agenda",
    subtitle: "Eventos e cultos",
    icon: Calendar,
    color: "hsl(var(--secondary))",
  });

  // Contribuir
  menuItems.push({
    id: "financas",
    label: "Contribuir",
    subtitle: "PIX e ofertas",
    icon: DollarSign,
    color: "hsl(30, 95%, 50%)",
  });

  // Casa Refúgio
  if (isMemberOfCasaRefugio) {
    menuItems.push({
      id: "casas-refugio",
      label: "Casa Refúgio",
      subtitle: memberCasasRefugio[0]?.name || "Minha CR",
      icon: Home,
      color: "hsl(160, 60%, 45%)",
    });
  }

  // Kids
  if (hasKids) {
    menuItems.push({
      id: "portal-kids",
      label: "Portal Kids",
      subtitle: "PG Church Kids",
      icon: Baby,
      iconImg: pgRetornoImg,
      iconImgClass: "w-full h-full object-cover rounded-xl",
      color: "hsl(280, 70%, 55%)",
      action: () => navigate("/portal/kids"),
    });

    menuItems.push({
      id: "kids-checkin",
      label: "Check-me PG",
      subtitle: "Presença Kids",
      icon: Baby,
      color: "hsl(200, 80%, 50%)",
    });
  }

  // Inscrições
  menuItems.push({
    id: "inscricoes",
    label: "Inscrições",
    subtitle: "Eventos abertos",
    icon: ClipboardList,
    color: "hsl(340, 75%, 55%)",
  });

  // Curso de Casais
  if (hasCasaisCurso) {
    menuItems.push({
      id: "curso-casais",
      label: "Curso de Casais",
      subtitle: "Materiais e turma",
      icon: GraduationCap,
      color: "hsl(350, 70%, 50%)",
    });
  }

  // Ministérios do membro
  memberMinistries.forEach((ministry) => {
    const slug = ministry.name.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-");
    menuItems.push({
      id: `ministerio-${slug}`,
      label: ministry.name,
      subtitle: ministry.isLider ? "Líder" : "Integrante",
      icon: HandHeart,
      color: "hsl(350, 70%, 50%)",
    });
  });

  // Servir na Porta
  menuItems.push({
    id: "servico",
    label: "Servir na Porta",
    subtitle: "Escalas e tarefas",
    icon: HandHelping,
    color: "hsl(220, 60%, 50%)",
  });

  // Servir (candidatura)
  menuItems.push({
    id: "candidatura",
    label: "Servir",
    subtitle: "Ministérios",
    icon: Send,
    color: "hsl(260, 60%, 55%)",
  });

  const handleMenuClick = (item: MenuItemConfig) => {
    if (item.action) {
      item.action();
    } else {
      setActiveSection(item.id);
    }
  };

  // Render section content
  const renderSectionContent = () => {
    if (!activeSection) return null;

    switch (activeSection) {
      case "agenda":
        return <PortalAgendaTab />;
      case "curso-casais":
        return <PortalCursoCasaisTab memberId={memberProfile.id} />;
      case "inscricoes":
        return <PortalInscricoesTab />;
      case "financas":
        return <PortalFinancasTab />;
      case "casas-refugio":
        return (
          <PortalCasaRefugioTab 
            portalAccess={portalAccess} 
            memberCasasRefugio={memberCasasRefugio}
          />
        );
      case "kids-checkin":
        return <PortalKidsCheckinTab memberId={memberProfile.id} memberName={memberProfile.full_name} />;
      case "servico":
        return <PortalCandidaturaServicoTab memberId={memberProfile.id} />;
      case "candidatura":
        return <PortalCandidaturaTab memberId={memberProfile.id} />;
      default: {
        // Ministry tabs
        const ministry = memberMinistries.find((m) => {
          const slug = m.name.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, "-");
          return activeSection === `ministerio-${slug}`;
        });
        if (ministry) {
          const slug = ministry.name.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, "-");
          return (
            <PortalMinisterioTab 
              ministryId={ministry.id}
              ministryName={ministry.name}
              ministrySlug={slug}
              isLider={ministry.isLider}
              portalAccess={portalAccess}
            />
          );
        }
        return null;
      }
    }
  };

  const activeSectionLabel = menuItems.find(m => m.id === activeSection)?.label || "";

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {activeSection ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveSection(null)}
                className="text-foreground -ml-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            ) : (
              <img
                src={logoGileade}
                alt="Gileade Church"
                className="w-9 h-9 rounded-full object-cover"
              />
            )}
            <div>
              <h1 className="font-heading font-bold text-base sm:text-lg text-foreground leading-tight">
                {activeSection ? activeSectionLabel : "Portal do Membro"}
              </h1>
              {!activeSection && (
                <p className="text-[11px] text-muted-foreground">
                  Igreja Gileade
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8 border border-border">
                <AvatarImage src={memberProfile.photo_url || undefined} />
                <AvatarFallback className="bg-secondary/20 text-secondary text-xs">
                  {getInitials(memberProfile.full_name)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm font-medium">{memberProfile.full_name.split(" ")[0]}</span>
            </div>
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground h-8 w-8"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
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
              size="icon"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-foreground h-8 w-8"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {activeSection ? (
          // Section content view
          <div className="animate-in fade-in slide-in-from-right-4 duration-200">
            {renderSectionContent()}
          </div>
        ) : (
          // Home grid view
          <div className="space-y-5">
            {/* Greeting */}
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 border-2 border-secondary/30 sm:hidden">
                <AvatarImage src={memberProfile.photo_url || undefined} />
                <AvatarFallback className="bg-secondary/10 text-secondary font-bold">
                  {getInitials(memberProfile.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-heading font-bold text-lg sm:text-xl">
                  Olá, {memberProfile.full_name.split(" ")[0]}! 👋
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Bem-vindo(a) ao seu portal
                </p>
              </div>
            </div>

            {/* Menu Grid - 2 columns mobile, 3 on tablet, 4 on desktop */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {menuItems.map((item) => (
                <Card
                  key={item.id}
                  className="cursor-pointer active:scale-[0.97] hover:shadow-md transition-all duration-150 border-border/60 overflow-hidden group"
                  onClick={() => handleMenuClick(item)}
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col items-center text-center py-5 px-3 relative">
                      {/* Color accent bar */}
                      <div 
                        className="absolute top-0 left-0 right-0 h-1 opacity-80"
                        style={{ backgroundColor: item.color }}
                      />
                      
                      {/* Icon */}
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center mb-2.5 transition-transform group-hover:scale-110"
                        style={{ backgroundColor: `${item.color}15` }}
                      >
                        {item.iconImg ? (
                          <img src={item.iconImg} alt={item.label} className={item.iconImgClass || "w-6 h-6 object-contain"} />
                        ) : (
                          <item.icon className="w-5.5 h-5.5" style={{ color: item.color }} />
                        )}
                      </div>
                      
                      {/* Label */}
                      <p className="text-sm font-semibold text-foreground leading-tight">{item.label}</p>
                      {item.subtitle && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{item.subtitle}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick links */}
            {(portalAccess?.role === "lider_ministerio" ||
              portalAccess?.role === "lider_casa_refugio" ||
              portalAccess?.role === "sindico_condominio" ||
              portalAccess?.role === "supervisor_condominio" ||
              portalAccess?.role === "pastor_geral" ||
              portalAccess?.role === "pastor_auxiliar") && (
              <Card className="border-secondary/20 bg-secondary/5">
                <CardContent className="py-3 px-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Portal Ministério</p>
                    <p className="text-xs text-muted-foreground">Acesse a gestão completa</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => navigate("/lideres")}
                  >
                    Acessar →
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>

      {/* Footer - only on home */}
      {!activeSection && (
        <footer className="py-4 border-t border-border">
          <div className="container mx-auto px-4 text-center">
            <button
              onClick={() => navigate("/")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ← Voltar para a homepage
            </button>
          </div>
        </footer>
      )}
    </div>
  );
};

export default PortalMembro;
