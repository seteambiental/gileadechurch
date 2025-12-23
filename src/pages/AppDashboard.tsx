import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
} from "lucide-react";
import MinistryCard from "@/components/MinistryCard";
import SectionTitle from "@/components/SectionTitle";
import { Button } from "@/components/ui/button";
import logoGileade from "@/assets/logo-gileade.jpeg";

// Ministérios (ícones vermelhos) - ordenados alfabeticamente
const ministries = [
  { icon: HeartHandshake, title: "Casais", description: "Ministério de casais", path: "/ministerio/casais" },
  { icon: Home, title: "Casas Refúgio", description: "Células", path: "/ministerio/casas-refugio" },
  { icon: UserCheck, title: "Consolidação", description: "Novos convertidos", path: "/ministerio/consolidacao" },
  { icon: Disc3, title: "Dança", description: "Expressão corporal", path: "/ministerio/danca" },
  { icon: BookOpen, title: "Ensino", description: "Discipulado", path: "/ministerio/ensino" },
  { icon: Flame, title: "Flow", description: "Jovens", path: "/ministerio/flow" },
  { icon: Sparkles, title: "GT", description: "Adolescentes", path: "/ministerio/gt" },
  { icon: Zap, title: "Impacto", description: "Evangelismo", path: "/ministerio/impacto" },
  { icon: HandHeart, title: "Intercessão", description: "Oração", path: "/ministerio/intercessao" },
  { icon: Baby, title: "Kids", description: "Ministério infantil", path: "/ministerio/kids" },
  { icon: Music, title: "Louvor", description: "Adoração e música", path: "/ministerio/louvor" },
  { icon: Camera, title: "Mídia", description: "Comunicação visual", path: "/ministerio/midia" },
  { icon: Crown, title: "Mulheres", description: "Ministério feminino", path: "/ministerio/mulheres" },
  { icon: Heart, title: "Serviço (Dorcas)", description: "Ação social", path: "/ministerio/servico" },
  { icon: Drama, title: "Teatro", description: "Artes cênicas", path: "/ministerio/teatro" },
  { icon: Shield, title: "True Man", description: "Ministério masculino", path: "/ministerio/true-man" },
];

// Outros módulos (ícones pretos)
const otherModules = [
  { icon: Users, title: "Cadastros", description: "Gestão de membros", path: "/cadastros" },
  { icon: Calendar, title: "Programação", description: "Agenda da igreja" },
  { icon: PartyPopper, title: "Eventos", description: "Celebrações especiais" },
  { icon: DollarSign, title: "Financeiro", description: "Gestão financeira" },
  { icon: BarChart3, title: "Indicadores", description: "Métricas e relatórios" },
];

const AppDashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
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

  if (!user) {
    return null;
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
              <h1 className="font-heading font-bold text-lg text-foreground">
                Gileade Church
              </h1>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
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
              variant="ministry"
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
