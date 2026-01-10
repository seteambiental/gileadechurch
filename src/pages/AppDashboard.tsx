import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isAuthBypassed, setAuthBypassed } from "@/lib/auth-bypass";
import {
  Users,
  Baby,
  Music,
  Heart,
  Calendar,
  PartyPopper,
  Sparkles,
  Flame,
  Home,
  DollarSign,
  HandHeart,
  Drama,
  Camera,
  BookOpen,
  Disc3,
  BarChart3,
  LogOut,
  Loader2,
  HeartHandshake,
  UserCheck,
  Crown,
  Shield,
  Zap,
  Megaphone,
  Car,
  ClipboardList,
  DoorOpen,
  Globe,
} from "lucide-react";
import MinistryCard from "@/components/MinistryCard";
import SectionTitle from "@/components/SectionTitle";
import { Button } from "@/components/ui/button";
import logoGileade from "@/assets/logo-gileade.jpeg";

// Ministérios (ícones vermelhos) - ordenados alfabeticamente
const ministries = [
  { icon: Heart, title: "Ação Social", description: "Ajuda comunitária", path: "/ministerio/acao-social" },
  { icon: HeartHandshake, title: "Casais", description: "Ministério de casais", path: "/ministerio/casais" },
  { icon: Home, title: "Casas Refúgio", description: "Células", path: "/ministerio/casas-refugio" },
  { icon: UserCheck, title: "Consolidação", description: "Novos convertidos", path: "/ministerio/consolidacao" },
  { icon: Disc3, title: "Dança", description: "Expressão corporal", path: "/ministerio/danca" },
  { icon: BookOpen, title: "Ensino", description: "Discipulado", path: "/ministerio/ensino" },
  { icon: Car, title: "Estacionamento", description: "Organização de vagas", path: "/ministerio/estacionamento" },
  { icon: Megaphone, title: "Evangelização", description: "Alcançar vidas", path: "/ministerio/evangelizacao" },
  { icon: Flame, title: "Flow", description: "Jovens", path: "/ministerio/flow" },
  { icon: Sparkles, title: "GT", description: "Adolescentes", path: "/ministerio/gt" },
  { icon: Zap, title: "Impacto", description: "Evangelismo", path: "/ministerio/impacto" },
  { icon: HandHeart, title: "Intercessão", description: "Oração", path: "/ministerio/intercessao" },
  { icon: Baby, title: "Kids", description: "Ministério infantil", path: "/ministerio/kids" },
  { icon: Music, title: "Louvor", description: "Adoração e música", path: "/ministerio/louvor" },
  { icon: Camera, title: "Mídia", description: "Comunicação visual", path: "/ministerio/midia" },
  { icon: Globe, title: "Missões Moçambique", description: "Apoio missionário", path: "/ministerio/missoes-mocambique" },
  { icon: Crown, title: "Mulheres", description: "Ministério feminino", path: "/ministerio/mulheres" },
  { icon: ClipboardList, title: "Organização de Culto", description: "Logística dos cultos", path: "/ministerio/organizacao-culto" },
  { icon: DoorOpen, title: "Recepção", description: "Acolhimento", path: "/ministerio/recepcao" },
  { icon: HandHeart, title: "Serviço (Dorcas)", description: "Apoio à igreja", path: "/ministerio/servico" },
  { icon: Drama, title: "Teatro", description: "Artes cênicas", path: "/ministerio/teatro" },
  { icon: Shield, title: "True Man", description: "Ministério masculino", path: "/ministerio/true-man" },
];

// Outros módulos (ícones pretos)
const otherModules = [
  { icon: Users, title: "Cadastros", description: "Gestão de membros", path: "/cadastros" },
  { icon: Globe, title: "Homepage", description: "Editar página inicial", path: "/app/homepage" },
  { icon: Calendar, title: "Programação", description: "Agenda da igreja", path: "/agenda" },
  { icon: PartyPopper, title: "Eventos", description: "Celebrações especiais", path: "/agenda" },
  { icon: DollarSign, title: "Financeiro", description: "Gestão financeira" },
  { icon: BarChart3, title: "Indicadores", description: "Métricas e relatórios" },
];

const AppDashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [isBypassed, setIsBypassed] = useState(false);

  // Buscar logo da igreja
  const { data: igrejaConfig } = useQuery({
    queryKey: ["igreja-config-app"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("igreja_config")
        .select("logo_dark_url, nome_fantasia")
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data;
    },
  });

  const logoUrl = igrejaConfig?.logo_dark_url ?? logoGileade;

  useEffect(() => {
    const bypassed = isAuthBypassed();
    setIsBypassed(bypassed);
    
    if (!loading && !user && !bypassed) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    setAuthBypassed(false);
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  if (!user && !isBypassed) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pt-56">
      {/* Header igual à homepage, sem menu de navegação */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surfaceInverse text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="relative h-56 flex flex-col items-center justify-center">
            {/* Logo centralizada */}
            <a href="/" className="flex items-center">
              <img
                src={logoUrl}
                alt={igrejaConfig?.nome_fantasia || "Logo"}
                className="h-44 md:h-48 lg:h-52 object-contain"
              />
            </a>

            {/* Botão Sair no canto direito */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {!user && isBypassed && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/auth")}
                  className="text-secondary border-secondary hover:bg-secondary/10"
                >
                  Fazer Login
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {user ? "Sair" : "Encerrar"}
              </Button>
            </div>
          </div>
        </div>
      </header>


      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Outros Módulos */}
        <SectionTitle
          title="Gestão"
          subtitle="Módulos administrativos da igreja"
          centered
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {otherModules.map((module, index) => (
            <MinistryCard
              key={module.title}
              icon={module.icon}
              title={module.title}
              description={module.description}
              delay={index * 50}
              variant="default"
              onClick={module.path ? () => navigate(module.path) : undefined}
            />
          ))}
        </div>

        {/* Separador */}
        <div className="my-8 border-t border-border" />

        {/* Ministérios */}
        <SectionTitle
          title="Ministérios"
          subtitle="Escolha o ministério que deseja acessar"
          centered
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {ministries.map((ministry, index) => (
            <MinistryCard
              key={ministry.title}
              icon={ministry.icon}
              title={ministry.title}
              description={ministry.description}
              delay={index * 50}
              variant={ministry.title === "Kids" ? "kids" : "ministry"}
              onClick={() => navigate(ministry.path)}
            />
          ))}
        </div>
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

export default AppDashboard;
