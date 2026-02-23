import { useEffect, useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import logoGileade from "@/assets/logo-gileade.jpeg";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Componentes das abas
import { PortalLideresAgendaTab } from "@/components/portal-lideres/PortalLideresAgendaTab";
import { PortalLideresIndicadores } from "@/components/portal-lideres/PortalLideresIndicadores";
import { PortalLideresMinisterio } from "@/components/portal-lideres/PortalLideresMinisterio";
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
  "lider_ministerio",
  "integrante_ministerio",
];

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

  const [activeTab, setActiveTab] = useState("programacao");

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

  // Verificar se tem perfil de membro
  if (!memberProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
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

  // Verificar se tem acesso de líder
  if (!portalAccess || !LEADER_ROLES.includes(portalAccess.role)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-xl font-bold text-foreground mb-2">
            Acesso Restrito
          </h1>
          <p className="text-muted-foreground mb-4">
            Este portal é exclusivo para líderes de ministérios, casas refúgio,
            supervisores e síndicos.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate("/portal")}>
              Portal do Membro
            </Button>
            <Button variant="secondary" onClick={() => navigate("/")}>
              Voltar ao início
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
      lider_ministerio: "Líder de Ministério",
      integrante_ministerio: "Equipe de Ministério",
      membro: "Membro",
    };
    return labels[role] || role;
  };

  // Verificar se pode editar (Líder) ou apenas visualizar (Equipe/Integrante)
  const canEdit = portalAccess.role !== "integrante_ministerio";

  // Determinar abas disponíveis baseado no role
  const availableTabs: { id: string; label: string; icon: React.ElementType }[] = [];

  // Todos têm acesso à Programação e Indicadores (visualização)
  availableTabs.push({ id: "programacao", label: "Programação", icon: Calendar });
  availableTabs.push({ id: "indicadores", label: "Indicadores", icon: BarChart3 });

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

  // Casas Refúgio para líderes/supervisores
  if (
    memberCasasRefugio.length > 0 ||
    portalAccess.role === "pastor_geral" ||
    portalAccess.role === "pastor_auxiliar" ||
    portalAccess.role === "sindico_condominio" ||
    portalAccess.role === "supervisor_condominio" ||
    portalAccess.role === "supervisor_casa_refugio" ||
    portalAccess.role === "lider_casa_refugio"
  ) {
    availableTabs.push({ id: "casas-refugio", label: "Casas Refúgio", icon: Home });
  }

  // Condomínios para síndicos
  if (
    portalAccess.role === "pastor_geral" ||
    portalAccess.role === "pastor_auxiliar" ||
    portalAccess.role === "sindico_condominio"
  ) {
    availableTabs.push({ id: "condominios", label: "Condomínios", icon: Building2 });
  }

  // Aprovações pendentes para quem pode aprovar
  if (
    portalAccess.role === "pastor_geral" ||
    portalAccess.role === "pastor_auxiliar" ||
    portalAccess.role === "sindico_condominio" ||
    portalAccess.role === "supervisor_condominio" ||
    portalAccess.role === "supervisor_casa_refugio" ||
    portalAccess.role === "lider_casa_refugio" ||
    portalAccess.role === "lider_ministerio"
  ) {
    availableTabs.push({ id: "aprovacoes", label: "Aprovações", icon: ClipboardCheck });
  }

  // Servir na Porta - para líderes/supervisores de Casa Refúgio
  if (memberCasasRefugio.length > 0) {
    availableTabs.push({ id: "servir-porta", label: "Servir", icon: HandHeart });
  }

  // Finanças - disponível para todos os líderes
  availableTabs.push({ id: "financas", label: "Finanças", icon: DollarSign });

  // Sistema - disponível para todos os líderes
  availableTabs.push({ id: "sistema", label: "Sistema", icon: Settings });

  const logoUrl = igrejaConfig?.logo_dark_url ?? logoGileade;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-surfaceInverse text-primary-foreground">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={logoUrl}
              alt={igrejaConfig?.nome_fantasia || "Logo"}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <h1 className="font-heading font-bold text-lg">
                Portal de Líderes
              </h1>
              <p className="text-xs text-primary-foreground/70">
                {igrejaConfig?.nome_fantasia || "Igreja Gileade"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <Avatar className="w-8 h-8 border border-primary-foreground/20">
                <AvatarImage src={memberProfile.photo_url || undefined} />
                <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-xs">
                  {getInitials(memberProfile.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="text-right">
                <span className="text-sm font-medium block">{memberProfile.full_name.split(" ")[0]}</span>
                <Badge variant="outline" className="text-[10px] border-primary-foreground/30 text-primary-foreground/80">
                  {getRoleLabel(portalAccess.role)}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
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

          <TabsContent value="programacao">
            <PortalLideresAgendaTab portalAccess={portalAccess} memberId={memberProfile.id} />
          </TabsContent>

          <TabsContent value="indicadores">
            <PortalLideresIndicadores portalAccess={portalAccess} />
          </TabsContent>

          <TabsContent value="casas-refugio">
            <PortalLideresCasaRefugio
              portalAccess={portalAccess}
              memberCasasRefugio={memberCasasRefugio}
              canEdit={canEdit}
              memberId={memberProfile.id}
            />
          </TabsContent>

          <TabsContent value="condominios">
            <PortalLideresCondominio portalAccess={portalAccess} canEdit={canEdit} />
          </TabsContent>

          <TabsContent value="aprovacoes">
            <PortalLideresAprovacoes portalAccess={portalAccess} memberId={memberProfile.id} />
          </TabsContent>

          <TabsContent value="servir-porta">
            <PortalLideresCandidaturaServico
              memberId={memberProfile.id}
              memberCasasRefugio={memberCasasRefugio}
            />
          </TabsContent>

          <TabsContent value="financas">
            <PortalFinancasTab />
          </TabsContent>

          <TabsContent value="sistema">
            <SistemaTab />
          </TabsContent>

          {memberMinistries.map((ministry) => {
            const slug = ministry.name.toLowerCase()
              .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
              .replace(/\s+/g, "-");
            return (
              <TabsContent key={ministry.id} value={`ministerio-${slug}`}>
                <PortalLideresMinisterio
                  ministryId={ministry.id}
                  ministryName={ministry.name}
                  ministrySlug={slug}
                  isLider={ministry.isLider}
                  canEdit={ministry.isLider || portalAccess.role === "pastor_geral" || portalAccess.role === "pastor_auxiliar"}
                  portalAccess={portalAccess}
                />
              </TabsContent>
            );
          })}
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <button
              onClick={() => navigate("/portal")}
              className="hover:text-foreground"
            >
              Portal do Membro
            </button>
            <span>•</span>
            <button
              onClick={() => navigate("/")}
              className="hover:text-foreground"
            >
              Homepage
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PortalLideres;
