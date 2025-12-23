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
} from "lucide-react";
import MinistryCard from "@/components/MinistryCard";
import SectionTitle from "@/components/SectionTitle";
import { Button } from "@/components/ui/button";
import logoGileade from "@/assets/logo-gileade.jpeg";

const ministries = [
  { icon: Users, title: "Cadastros", description: "Gestão de membros", path: "/cadastros" },
  { icon: Baby, title: "Kids", description: "Ministério infantil" },
  { icon: Music, title: "Louvor", description: "Adoração e música" },
  { icon: Heart, title: "Serviço (Dorcas)", description: "Ação social" },
  { icon: Calendar, title: "Programação", description: "Agenda da igreja" },
  { icon: PartyPopper, title: "Eventos", description: "Celebrações especiais" },
  { icon: Sparkles, title: "GT", description: "Adolescentes" },
  { icon: Flame, title: "Flow", description: "Jovens" },
  { icon: Home, title: "Casas Refúgio", description: "Células" },
  { icon: DollarSign, title: "Financeiro", description: "Gestão financeira" },
  { icon: HandHeart, title: "Intercessão", description: "Oração" },
  { icon: Drama, title: "Teatro", description: "Artes cênicas" },
  { icon: Camera, title: "Mídia", description: "Comunicação visual" },
  { icon: BookOpen, title: "Ensino", description: "Discipulado" },
  { icon: Disc3, title: "Dança", description: "Expressão corporal" },
  { icon: HeartHandshake, title: "Casais", description: "Ministério de casais" },
  { icon: UserCheck, title: "Consolidação", description: "Novos convertidos" },
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
              onClick={ministry.path ? () => navigate(ministry.path) : undefined}
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
