import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMemberPortal, PortalRole } from "@/hooks/useMemberPortal";
import {
  LogOut,
  Loader2,
  Calendar,
  BarChart3,
  Home,
  Shield,
  Settings,
  HandHeart,
  Building2,
  ClipboardCheck,
  DollarSign,
  ArrowRightLeft,
  ArrowLeft,
  Baby,
  HandHelping,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logoGileade from "@/assets/logo-gileade.jpeg";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserAccess } from "@/hooks/useUserAccess";

// Componentes das seções
import { PortalLideresAgendaTab } from "@/components/portal-lideres/PortalLideresAgendaTab";
import { PortalLideresIndicadores } from "@/components/portal-lideres/PortalLideresIndicadores";
import { PortalLideresMinisterio } from "@/components/portal-lideres/PortalLideresMinisterio";
import { PortalLideresCasaisMinisterio } from "@/components/portal-lideres/PortalLideresCasaisMinisterio";
import { PortalLideresKidsMinisterio } from "@/components/portal-lideres/PortalLideresKidsMinisterio";
import { PortalLideresCasaRefugio } from "@/components/portal-lideres/PortalLideresCasaRefugio";
import { PortalLideresCondominio } from "@/components/portal-lideres/PortalLideresCondominio";
import { PortalLideresAprovacoes } from "@/components/portal-lideres/PortalLideresAprovacoes";
import { PortalFinancasTab } from "@/components/portal/PortalFinancasTab";
import { PortalLideresCandidaturaServico } from "@/components/portal-lideres/PortalLideresCandidaturaServico";
import SistemaTab from "@/components/cadastros/SistemaTab";

// Roles que têm acesso ao portal de líderes
const LEADER_ROLES: PortalRole[] = [
  "pastor_geral",
  "pastor_auxiliar",
  "sindico_condominio",
  "supervisor_condominio",
  "supervisor_casa_refugio",
  "lider_casa_refugio",
  "secretario_casa_refugio",
  "lider_ministerio",
  "integrante_ministerio",
];

interface MenuItemConfig {
  id: string;
  label: string;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  badge?: string | number;
}

const PortalLideres = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const {
    memberProfile,
    loadingProfile,
    portalAccess,
    memberMinistries,
    memberCasasRefugio,
  } = useMemberPortal();
  const { isAdmin } = useUserAccess(user?.id);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [subNavBackFn, setSubNavBackFn] = useState<(() => void) | null>(null);

  // Wrapper to avoid React interpreting the function as a state updater
  const handleSubNavChange = useCallback((backFn: (() => void) | null) => {
    setSubNavBackFn(() => backFn);
  }, []);

  const handleHeaderBack = () => {
    if (subNavBackFn) {
      subNavBackFn();
    } else {
      setActiveSection(null);
    }
  };

  // Reset sub-nav when section changes
  useEffect(() => {
    setSubNavBackFn(null);
  }, [activeSection]);

  // Detect if member is part of PG Kids team via kids_lideres
  const { data: kidsLiderInfo } = useQuery({
    queryKey: ["portal-lideres-kids-lider", memberProfile?.id],
    queryFn: async () => {
      if (!memberProfile?.id) return null;
      const { data, error } = await supabase
        .from("kids_lideres")
        .select("funcao")
        .eq("member_id", memberProfile.id)
        .eq("ativo", true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!memberProfile?.id,
  });

  // Fetch PG ministry info
  const { data: pgMinistry } = useQuery({
    queryKey: ["portal-lideres-pg-ministry"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ministries")
        .select("id, name")
        .or("name.ilike.%infantil%,name.ilike.%kids%,name.ilike.%p g%")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!kidsLiderInfo,
  });

  // Buscar logo da igreja
  const { data: igrejaConfig } = useQuery({
    queryKey: ["igreja-config-portal-lideres"],
    queryFn: async () => {
      const { data } = await supabase
        .from("igreja_config")
        .select("logo_dark_url, nome_fantasia")
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?redirect=/lideres");
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
          <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-xl font-bold text-foreground mb-2">Perfil não encontrado</h1>
          <p className="text-muted-foreground mb-4">
            Seu usuário ainda não está vinculado a um cadastro de membro.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate("/")}>Voltar ao início</Button>
            <Button variant="secondary" onClick={handleSignOut}>Sair</Button>
          </div>
        </div>
      </div>
    );
  }

  // Check access - also allow kids_lideres members
  const hasKidsAccess = !!kidsLiderInfo;
  if (!portalAccess || (!LEADER_ROLES.includes(portalAccess.role) && !hasKidsAccess)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-xl font-bold text-foreground mb-2">Acesso Restrito</h1>
          <p className="text-muted-foreground mb-4">
            Este portal é exclusivo para líderes de ministérios, casas refúgio, supervisores e síndicos.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate("/portal")}>Portal do Membro</Button>
            <Button variant="secondary" onClick={() => navigate("/")}>Voltar ao início</Button>
          </div>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  const getRoleLabel = (role: PortalRole): string => {
    const labels: Record<PortalRole, string> = {
      admin: "Administrador",
      pastor_geral: "Pastor Geral",
      pastor_auxiliar: "Pastor Auxiliar",
      lider_condominio: "Líder de Condomínio",
      supervisor_casa_refugio: "Supervisor",
      sindico_condominio: "Síndico",
      supervisor_condominio: "Supervisor de Condomínio",
      lider_casa_refugio: "Líder de Casa Refúgio",
      secretario_casa_refugio: "Secretário(a) de Casa Refúgio",
      lider_ministerio: "Líder de Ministério",
      integrante_ministerio: "Equipe de Ministério",
      membro: "Membro",
    };
    return labels[role] || role;
  };

  const canEdit = portalAccess!.role !== "integrante_ministerio";

  // Build combined ministries list (include PG from kids_lideres if not already present)
  const allMinistries = [...memberMinistries];
  if (kidsLiderInfo && pgMinistry) {
    const alreadyHasPG = allMinistries.some((m) => m.id === pgMinistry.id);
    if (!alreadyHasPG) {
      allMinistries.push({
        id: pgMinistry.id,
        name: pgMinistry.name,
        isLider: kidsLiderInfo.funcao === "coordenador",
      });
    }
  }

  // Build menu items
  const menuItems: MenuItemConfig[] = [];

  menuItems.push({
    id: "programacao",
    label: "Programação",
    subtitle: "Agenda e eventos",
    icon: Calendar,
    color: "hsl(var(--secondary))",
  });

  menuItems.push({
    id: "indicadores",
    label: "Indicadores",
    subtitle: "Estatísticas",
    icon: BarChart3,
    color: "hsl(280, 70%, 55%)",
  });

  // Ministries
  allMinistries.forEach((ministry) => {
    const slug = ministry.name.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-");
    const isPG = slug.includes("infantil") || slug.includes("p-g") || slug.includes("kids");
    menuItems.push({
      id: `ministerio-${slug}`,
      label: ministry.name,
      subtitle: ministry.isLider ? "Líder" : "Equipe",
      icon: isPG ? Baby : HandHeart,
      color: isPG ? "hsl(280, 70%, 55%)" : "hsl(350, 70%, 50%)",
    });
  });

  // Casas Refúgio
  if (
    memberCasasRefugio.length > 0 ||
    ["pastor_geral", "pastor_auxiliar", "sindico_condominio", "supervisor_condominio", "supervisor_casa_refugio", "lider_casa_refugio", "secretario_casa_refugio"].includes(portalAccess!.role)
  ) {
    menuItems.push({
      id: "casas-refugio",
      label: "Casas Refúgio",
      subtitle: "Gestão de CRs",
      icon: Home,
      color: "hsl(160, 60%, 45%)",
    });
  }

  // Condomínios
  if (["pastor_geral", "pastor_auxiliar", "sindico_condominio"].includes(portalAccess!.role)) {
    menuItems.push({
      id: "condominios",
      label: "Condomínios",
      subtitle: "Gestão de condomínios",
      icon: Building2,
      color: "hsl(30, 95%, 50%)",
    });
  }

  // Aprovações
  if (
    ["pastor_geral", "pastor_auxiliar", "sindico_condominio", "supervisor_condominio", "supervisor_casa_refugio", "lider_casa_refugio", "secretario_casa_refugio", "lider_ministerio"].includes(portalAccess!.role)
  ) {
    menuItems.push({
      id: "aprovacoes",
      label: "Aprovações",
      subtitle: "Pendências",
      icon: ClipboardCheck,
      color: "hsl(340, 75%, 55%)",
    });
  }

  // Servir na Porta
  if (memberCasasRefugio.length > 0) {
    menuItems.push({
      id: "servir-porta",
      label: "Servir",
      subtitle: "Escalas e tarefas",
      icon: HandHelping,
      color: "hsl(220, 60%, 50%)",
    });
  }

  // Contribuir
  menuItems.push({
    id: "financas",
    label: "Contribuir",
    subtitle: "PIX e ofertas",
    icon: DollarSign,
    color: "hsl(30, 95%, 50%)",
  });

  // Sistema
  menuItems.push({
    id: "sistema",
    label: "Sistema",
    subtitle: "Chamados técnicos",
    icon: Settings,
    color: "hsl(0, 0%, 45%)",
  });

  // Render section content
  const renderSectionContent = () => {
    if (!activeSection) return null;

    switch (activeSection) {
      case "programacao":
        return <PortalLideresAgendaTab portalAccess={portalAccess!} memberId={memberProfile.id} />;
      case "indicadores":
        return <PortalLideresIndicadores portalAccess={portalAccess!} />;
      case "casas-refugio":
        return (
          <PortalLideresCasaRefugio
            portalAccess={portalAccess!}
            memberCasasRefugio={memberCasasRefugio}
            canEdit={canEdit}
            memberId={memberProfile.id}
          />
        );
      case "condominios":
        return <PortalLideresCondominio portalAccess={portalAccess!} canEdit={canEdit} />;
      case "aprovacoes":
        return <PortalLideresAprovacoes portalAccess={portalAccess!} memberId={memberProfile.id} />;
      case "servir-porta":
        return <PortalLideresCandidaturaServico memberId={memberProfile.id} memberCasasRefugio={memberCasasRefugio} />;
      case "financas":
        return <PortalFinancasTab />;
      case "sistema":
        return <SistemaTab />;
      default: {
        // Ministry sections
        const ministry = allMinistries.find((m) => {
          const slug = m.name.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, "-");
          return activeSection === `ministerio-${slug}`;
        });
        if (ministry) {
          const slug = ministry.name.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, "-");
          const isPG = slug.includes("infantil") || slug.includes("p-g") || slug.includes("kids");
          const isCasais = slug.includes("casais") || slug.includes("casal");
          if (isPG) {
            return (
              <PortalLideresKidsMinisterio
                ministryId={ministry.id}
                ministryName={ministry.name}
                isLider={ministry.isLider}
                canEdit={ministry.isLider || portalAccess!.role === "pastor_geral" || portalAccess!.role === "pastor_auxiliar"}
                portalAccess={portalAccess}
                memberId={memberProfile.id}
                onSubNavChange={handleSubNavChange}
              />
            );
          }
          if (isCasais) {
            return (
              <PortalLideresCasaisMinisterio
                ministryId={ministry.id}
                ministryName={ministry.name}
                isLider={ministry.isLider}
                canEdit={ministry.isLider || portalAccess!.role === "pastor_geral" || portalAccess!.role === "pastor_auxiliar"}
                portalAccess={portalAccess}
                onSubNavChange={handleSubNavChange}
              />
            );
          }
          return (
            <PortalLideresMinisterio
              ministryId={ministry.id}
              ministryName={ministry.name}
              ministrySlug={slug}
              isLider={ministry.isLider}
              canEdit={ministry.isLider || portalAccess!.role === "pastor_geral" || portalAccess!.role === "pastor_auxiliar"}
              portalAccess={portalAccess}
              onSubNavChange={setSubNavBackFn}
            />
          );
        }
        return null;
      }
    }
  };

  const activeSectionLabel = menuItems.find((m) => m.id === activeSection)?.label || "";
  const logoUrl = igrejaConfig?.logo_dark_url ?? logoGileade;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {activeSection ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleHeaderBack}
                className="text-foreground -ml-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            ) : (
              <img
                src={logoUrl}
                alt={igrejaConfig?.nome_fantasia || "Logo"}
                className="w-9 h-9 rounded-full object-cover"
              />
            )}
            <div>
              <h1 className="font-heading font-bold text-base sm:text-lg text-foreground leading-tight">
                {activeSection ? activeSectionLabel : "Portal Ministério"}
              </h1>
              {!activeSection && (
                <p className="text-[11px] text-muted-foreground">
                  {igrejaConfig?.nome_fantasia || "Igreja Gileade"}
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
              <div className="hidden sm:block text-right">
                <span className="text-sm font-medium block">{memberProfile.full_name.split(" ")[0]}</span>
                <Badge variant="outline" className="text-[10px]">
                  {getRoleLabel(portalAccess!.role)}
                </Badge>
              </div>
            </div>
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8">
                    <ArrowRightLeft className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate("/app")}>Portal ADM</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/portal")}>Portal do Membro</DropdownMenuItem>
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
          <div className="animate-in fade-in slide-in-from-right-4 duration-200">
            {renderSectionContent()}
          </div>
        ) : (
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
                  Bem-vindo(a) ao Portal Ministério
                </p>
              </div>
            </div>

            {/* Menu Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {menuItems.map((item) => (
                <Card
                  key={item.id}
                  className="cursor-pointer active:scale-[0.97] hover:shadow-md transition-all duration-150 border-border/60 overflow-hidden group"
                  onClick={() => setActiveSection(item.id)}
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
                        <item.icon className="w-5 h-5" style={{ color: item.color }} />
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

            {/* Quick link to Portal do Membro */}
            <Card className="border-secondary/20 bg-secondary/5">
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Portal do Membro</p>
                  <p className="text-xs text-muted-foreground">Acesse seu portal pessoal</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => navigate("/portal")}>
                  Acessar →
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Footer */}
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

export default PortalLideres;
