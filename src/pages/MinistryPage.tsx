import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { isAuthBypassed } from "@/lib/auth-bypass";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, LucideIcon, Megaphone, Car, ClipboardList, Crown, Shield, Zap, DoorOpen, BookOpen as BookOpenIcon, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import logoGileade from "@/assets/logo-gileade.jpeg";
import {
  Baby,
  BookOpen,
  Camera,
  Disc3,
  Drama,
  Flame,
  HandHeart,
  Heart,
  HeartHandshake,
  Home,
  Music,
  Sparkles,
  UserCheck,
  Users,
  CalendarDays,
  BarChart3,
  ListMusic,
} from "lucide-react";
import { MinisterioEquipeTab } from "@/components/ministerio/MinisterioEquipeTab";
import { MinisterioEscalasTab } from "@/components/ministerio/MinisterioEscalasTab";
import { MinisterioEstatisticasTab } from "@/components/ministerio/MinisterioEstatisticasTab";
import { MinisterioRepertorioTab } from "@/components/ministerio/MinisterioRepertorioTab";
import { DancaRepertorioTab } from "@/components/ministerio/DancaRepertorioTab";
import { DancaEquipesTab } from "@/components/ministerio/DancaEquipesTab";
import { DancaEscalasTab } from "@/components/ministerio/DancaEscalasTab";
import { CasaisTurmasTab } from "@/components/casais/CasaisTurmasTab";
import { CasaisCasaisTab } from "@/components/casais/CasaisCasaisTab";
import { CasaisMateriaisTab } from "@/components/casais/CasaisMateriaisTab";

interface MinistryInfo {
  title: string;
  description: string;
  icon: LucideIcon;
  fullDescription: string;
  hasEscalas?: boolean;
  hasRepertorio?: boolean;
  isDanca?: boolean;
  isCasais?: boolean;
}

const ministriesData: Record<string, MinistryInfo> = {
  "acao-social": {
    title: "Ação Social",
    description: "Ajuda comunitária",
    icon: Heart,
    fullDescription:
      "Ministério dedicado a promover ações de solidariedade e assistência às comunidades carentes, incluindo distribuição de alimentos, roupas e apoio em situações de vulnerabilidade.",
  },
  casais: {
    title: "Casais",
    description: "Ministério de casais",
    icon: HeartHandshake,
    fullDescription:
      "Ministério dedicado ao fortalecimento dos casamentos e famílias, promovendo encontros, retiros e aconselhamento matrimonial.",
    isCasais: true,
  },
  "casas-refugio": {
    title: "Casas Refúgio",
    description: "Células",
    icon: Home,
    fullDescription:
      "Grupos de comunhão que se reúnem semanalmente em lares para estudo bíblico, oração e edificação mútua.",
  },
  consolidacao: {
    title: "Consolidação",
    description: "Novos convertidos",
    icon: UserCheck,
    fullDescription:
      "Ministério responsável por acompanhar e discipular os novos convertidos em seus primeiros passos na fé.",
  },
  danca: {
    title: "Dança",
    description: "Expressão corporal",
    icon: Disc3,
    fullDescription:
      "Ministério de adoração através da dança, expressando louvor ao Senhor através de coreografias.",
    hasEscalas: true,
    isDanca: true,
  },
  ensino: {
    title: "Ensino",
    description: "Discipulado",
    icon: BookOpen,
    fullDescription:
      "Ministério focado na formação bíblica e teológica dos membros através de cursos e estudos sistemáticos.",
  },
  estacionamento: {
    title: "Estacionamento",
    description: "Organização de vagas",
    icon: Car,
    fullDescription:
      "Ministério responsável pela organização e direcionamento do estacionamento nos cultos e eventos da igreja.",
    hasEscalas: true,
  },
  evangelizacao: {
    title: "Evangelização",
    description: "Alcançar vidas",
    icon: Megaphone,
    fullDescription:
      "Ministério dedicado ao evangelismo e alcance de vidas, com ações, discipulado e iniciativas de impacto na comunidade.",
  },
  flow: {
    title: "Flow",
    description: "Jovens",
    icon: Flame,
    fullDescription:
      "Ministério voltado para jovens, com encontros dinâmicos, retiros e atividades que fortalecem a fé.",
  },
  gt: {
    title: "GT",
    description: "Adolescentes",
    icon: Sparkles,
    fullDescription:
      "Ministério dedicado aos adolescentes, com programação especial para essa faixa etária.",
  },
  intercessao: {
    title: "Intercessão",
    description: "Oração",
    icon: HandHeart,
    fullDescription:
      "Ministério de oração intercessora, levantando súplicas pela igreja, cidade e nações.",
  },
  kids: {
    title: "Kids",
    description: "Ministério infantil",
    icon: Baby,
    fullDescription:
      "Ministério dedicado às crianças, com ensino bíblico lúdico e atividades apropriadas para cada idade.",
  },
  louvor: {
    title: "Louvor",
    description: "Adoração e música",
    icon: Music,
    fullDescription:
      "Ministério responsável pela condução do louvor e adoração nos cultos e eventos da igreja.",
    hasEscalas: true,
    hasRepertorio: true,
  },
  midia: {
    title: "Mídia",
    description: "Comunicação visual",
    icon: Camera,
    fullDescription:
      "Ministério de comunicação responsável por fotos, vídeos, transmissões e mídias sociais da igreja.",
    hasEscalas: true,
  },
  mulheres: {
    title: "Mulheres",
    description: "Ministério feminino",
    icon: Crown,
    fullDescription:
      "Ministério dedicado ao fortalecimento e discipulado das mulheres da igreja.",
  },
  "organizacao-culto": {
    title: "Organização de Culto",
    description: "Logística dos cultos",
    icon: ClipboardList,
    fullDescription:
      "Ministério responsável pela organização e logística dos cultos, incluindo recepção, acomodação e suporte geral.",
    hasEscalas: true,
  },
  recepcao: {
    title: "Recepção",
    description: "Acolhimento",
    icon: DoorOpen,
    fullDescription:
      "Ministério dedicado a receber e acolher as pessoas na entrada dos cultos e eventos, proporcionando uma experiência acolhedora.",
    hasEscalas: true,
  },
  servico: {
    title: "Serviço (Dorcas)",
    description: "Apoio à igreja",
    icon: HandHeart,
    fullDescription:
      "Ministério de serviço dedicado ao suporte prático nas atividades da igreja, incluindo organização de eventos e apoio logístico.",
  },
  teatro: {
    title: "Teatro",
    description: "Artes cênicas",
    icon: Drama,
    fullDescription:
      "Ministério de artes cênicas que apresenta peças teatrais e esquetes com mensagens edificantes.",
  },
};

const MinistryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("info");

  const bypass = isAuthBypassed();

  // Fetch ministry from database to get ID
  const { data: ministryFromDb } = useQuery({
    queryKey: ["ministry-by-name", slug],
    queryFn: async () => {
      if (!slug) return null;
      const ministry = ministriesData[slug];
      if (!ministry) return null;
      
      // Search for ministry by partial name match
      const { data, error } = await supabase
        .from("ministries")
        .select("id, name")
        .or(`name.ilike.%${ministry.title}%,name.ilike.%ministério de ${ministry.title}%`)
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  useEffect(() => {
    if (!authLoading && !user && !bypass) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate, bypass]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-destructive animate-spin" />
      </div>
    );
  }

  if (!user && !bypass) {
    return null;
  }

  const ministry = slug ? ministriesData[slug] : null;

  if (!ministry) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-heading font-bold text-foreground mb-4">
            Ministério não encontrado
          </h1>
          <Button onClick={() => navigate("/app")}>Voltar ao painel</Button>
        </div>
      </div>
    );
  }

  const IconComponent = ministry.icon;
  const hasEscalas = ministry.hasEscalas && ministryFromDb?.id;
  const hasRepertorio = ministry.hasRepertorio && ministryFromDb?.id;
  const isDanca = ministry.isDanca && ministryFromDb?.id;
  const isCasais = ministry.isCasais;

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
                {ministry.title}
              </h1>
              <p className="text-xs text-muted-foreground">{ministry.description}</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/app")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {(hasEscalas || isCasais) ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className={`grid w-full ${isCasais ? 'grid-cols-4' : isDanca ? 'grid-cols-5' : hasRepertorio ? 'grid-cols-5' : 'grid-cols-4'} mb-6`}>
              <TabsTrigger value="info" className="flex items-center gap-2">
                <IconComponent className="w-4 h-4" />
                <span className="hidden sm:inline">Sobre</span>
              </TabsTrigger>
              {isCasais ? (
                <>
                  <TabsTrigger value="turmas" className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    <span className="hidden sm:inline">Turmas</span>
                  </TabsTrigger>
                  <TabsTrigger value="casais" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline">Casais</span>
                  </TabsTrigger>
                  <TabsTrigger value="materiais" className="flex items-center gap-2">
                    <BookOpenIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Materiais</span>
                  </TabsTrigger>
                </>
              ) : (
                <>
                  <TabsTrigger value="equipe" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline">{isDanca ? 'Equipes' : 'Equipe'}</span>
                  </TabsTrigger>
                  <TabsTrigger value="escalas" className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    <span className="hidden sm:inline">Escalas</span>
                  </TabsTrigger>
                  {(hasRepertorio || isDanca) && (
                    <TabsTrigger value="repertorio" className="flex items-center gap-2">
                      <ListMusic className="w-4 h-4" />
                      <span className="hidden sm:inline">Repertório</span>
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="estatisticas" className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    <span className="hidden sm:inline">Estatísticas</span>
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            <TabsContent value="info">
              <Card className="bg-card border-border">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 flex items-center justify-center w-20 h-20 rounded-2xl bg-destructive text-destructive-foreground shadow-red">
                    <IconComponent className="w-10 h-10" strokeWidth={1.5} />
                  </div>
                  <CardTitle className="text-2xl font-heading">{ministry.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center max-w-2xl mx-auto">
                    {ministry.fullDescription}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {isCasais ? (
              <>
                <TabsContent value="turmas">
                  <CasaisTurmasTab />
                </TabsContent>
                <TabsContent value="casais">
                  <CasaisCasaisTab />
                </TabsContent>
                <TabsContent value="materiais">
                  <CasaisMateriaisTab />
                </TabsContent>
              </>
            ) : (
              <>
                <TabsContent value="equipe">
                  {isDanca ? (
                    <DancaEquipesTab ministryId={ministryFromDb!.id} />
                  ) : (
                    <MinisterioEquipeTab ministryId={ministryFromDb!.id} ministryName={ministry.title} />
                  )}
                </TabsContent>

                <TabsContent value="escalas">
                  {isDanca ? (
                    <DancaEscalasTab ministryId={ministryFromDb!.id} />
                  ) : (
                    <MinisterioEscalasTab ministryId={ministryFromDb!.id} />
                  )}
                </TabsContent>

                {hasRepertorio && (
                  <TabsContent value="repertorio">
                    <MinisterioRepertorioTab ministryId={ministryFromDb!.id} />
                  </TabsContent>
                )}

                {isDanca && !hasRepertorio && (
                  <TabsContent value="repertorio">
                    <DancaRepertorioTab ministryId={ministryFromDb!.id} />
                  </TabsContent>
                )}

                <TabsContent value="estatisticas">
                  <MinisterioEstatisticasTab ministryId={ministryFromDb!.id} />
                </TabsContent>
              </>
            )}

          </Tabs>
        ) : (
          <Card className="bg-card border-border">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 flex items-center justify-center w-20 h-20 rounded-2xl bg-destructive text-destructive-foreground shadow-red">
                <IconComponent className="w-10 h-10" strokeWidth={1.5} />
              </div>
              <CardTitle className="text-2xl font-heading">{ministry.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground text-center max-w-2xl mx-auto">
                {ministry.fullDescription}
              </p>

              <div className="grid gap-4 md:grid-cols-3 pt-4">
                <Card className="bg-muted/30 border-border">
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-foreground">0</p>
                    <p className="text-sm text-muted-foreground">Membros</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30 border-border">
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-foreground">0</p>
                    <p className="text-sm text-muted-foreground">Líderes</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30 border-border">
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-foreground">0</p>
                    <p className="text-sm text-muted-foreground">Eventos</p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-center pt-4">
                <p className="text-sm text-muted-foreground italic">
                  Em breve: gestão completa do ministério
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default MinistryPage;
