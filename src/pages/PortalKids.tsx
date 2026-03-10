import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMemberPortal } from "@/hooks/useMemberPortal";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Loader2,
  Baby,
  BookOpen,
  Video,
  CalendarDays,
  MessageSquare,
  Rocket,
  Construction,
} from "lucide-react";
import { differenceInYears, format } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";

// Kids assets
import kidsLogoPG from "@/assets/kids-logo-pg.png";
import kidsMenina from "@/assets/kids-menina-astronauta.png";
import kidsMenino from "@/assets/kids-menino-astronauta.png";
import kidsFoguete from "@/assets/kids-foguete.png";
import kidsEstrelas1 from "@/assets/kids-estrelas-1.png";
import kidsEstrelas2 from "@/assets/kids-estrelas-2.png";

const PortalKids = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { memberProfile, loadingProfile } = useMemberPortal();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?redirect=/portal/kids");
    }
  }, [user, authLoading, navigate]);

  // Buscar filhos
  const { data: filhos = [], isLoading: loadingFilhos } = useQuery({
    queryKey: ["portal-kids-filhos-page", memberProfile?.id],
    queryFn: async () => {
      const { data: vinculos } = await supabase
        .from("kids_responsaveis")
        .select(`
          crianca_member_id,
          crianca_novo_convertido_id,
          crianca_member:members!kids_responsaveis_crianca_member_id_fkey(id, full_name, birth_date, photo_url, genero, kids_turma_override),
          crianca_nc:novos_convertidos!kids_responsaveis_crianca_novo_convertido_id_fkey(id, full_name, data_nascimento, photo_url, genero, kids_turma_override)
        `)
        .eq("responsavel_member_id", memberProfile!.id);

      const allChildren: any[] = [];
      const addedIds = new Set<string>();

      vinculos?.forEach(v => {
        const child = v.crianca_member || v.crianca_nc;
        if (!child) return;
        const id = (child as any).id;
        if (addedIds.has(id)) return;
        addedIds.add(id);
        const birthDate = (child as any).birth_date || (child as any).data_nascimento;
        if (!birthDate) return;
        const idade = differenceInYears(new Date(), parseLocalDate(birthDate));
        if (idade > 12) return;
        allChildren.push({
          id,
          nome: (child as any).full_name,
          foto: (child as any).photo_url,
          genero: (child as any).genero,
          idade,
          turmaOverride: (child as any).kids_turma_override,
        });
      });

      return allChildren;
    },
    enabled: !!memberProfile?.id,
  });

  // Buscar turmas
  const { data: turmasConfig } = useQuery({
    queryKey: ["kids-turmas-config-portal-kids"],
    queryFn: async () => {
      const { data } = await supabase.from("kids_turmas_config").select("*").order("idade_minima");
      return data;
    },
  });

  const getTurma = (child: any) => {
    if (child.turmaOverride) return turmasConfig?.find(t => t.turma === child.turmaOverride);
    return turmasConfig?.find(t => child.idade >= t.idade_minima && child.idade <= t.idade_maxima);
  };

  if (authLoading || loadingProfile || loadingFilhos) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-pink-50 dark:from-blue-950 dark:to-pink-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-secondary" />
      </div>
    );
  }

  if (!user || !memberProfile) return null;

  const futureFeatures = [
    { icon: BookOpen, title: "Materiais da Turma", desc: "Conteúdos postados pelos professores" },
    { icon: Video, title: "Vídeos e Mídias", desc: "Vídeos e materiais especiais" },
    { icon: CalendarDays, title: "Eventos Kids", desc: "Inscrição para eventos especiais" },
    { icon: MessageSquare, title: "Mural de Avisos", desc: "Comunicados dos coordenadores" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-pink-50 dark:from-blue-950 dark:via-background dark:to-pink-950 relative overflow-hidden">
      {/* Decorative elements */}
      <img
        src={kidsEstrelas1}
        alt=""
        className="absolute top-8 left-6 w-12 opacity-60 pointer-events-none animate-pulse"
      />
      <img
        src={kidsEstrelas2}
        alt=""
        className="absolute top-24 right-8 w-10 opacity-50 pointer-events-none animate-pulse"
        style={{ animationDelay: "1s" }}
      />
      <img
        src={kidsFoguete}
        alt=""
        className="absolute top-40 left-4 w-8 opacity-40 pointer-events-none"
        style={{ transform: "rotate(-20deg)" }}
      />
      <img
        src={kidsEstrelas1}
        alt=""
        className="absolute bottom-32 right-6 w-14 opacity-40 pointer-events-none animate-pulse"
        style={{ animationDelay: "2s" }}
      />
      <img
        src={kidsEstrelas2}
        alt=""
        className="absolute bottom-64 left-8 w-8 opacity-30 pointer-events-none animate-pulse"
        style={{ animationDelay: "0.5s" }}
      />

      {/* Header */}
      <header className="relative z-10 py-4 px-4">
        <div className="container max-w-2xl mx-auto flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/portal")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Portal do Membro
          </Button>
          <Button size="sm" onClick={() => navigate("/kids/checkme")}>
            <Baby className="h-4 w-4 mr-1" />
            Check-me
          </Button>
        </div>
      </header>

      <div className="relative z-10 container max-w-2xl mx-auto px-4 pb-12">
        {/* Hero - Logo grande */}
        <div className="text-center py-6 relative">
          <img
            src={kidsLogoPG}
            alt="PG - Pequenos Gileadita"
            className="mx-auto w-52 sm:w-64 object-contain drop-shadow-lg"
          />
          <p className="text-sm text-muted-foreground mt-2 font-medium">
            Portal dos Pequenos Gileadita 🚀
          </p>
        </div>

        {/* Astronautas + Filhos */}
        <div className="relative mb-8">
          {/* Menina flutuando à esquerda */}
          <img
            src={kidsMenina}
            alt=""
            className="absolute -left-2 -top-4 w-16 sm:w-20 opacity-70 pointer-events-none"
            style={{ transform: "rotate(10deg)" }}
          />
          {/* Menino flutuando à direita */}
          <img
            src={kidsMenino}
            alt=""
            className="absolute -right-2 -top-6 w-20 sm:w-24 opacity-70 pointer-events-none"
            style={{ transform: "rotate(-5deg)" }}
          />

          <div className="pt-8">
            <h2 className="font-heading font-bold text-lg text-center mb-3">
              {filhos.length > 0 ? "Seus Filhos no PG" : "Nenhum filho cadastrado"}
            </h2>

            {filhos.length > 0 ? (
              <div className="grid gap-3">
                {filhos.map(child => {
                  const turma = getTurma(child);
                  return (
                    <Card key={child.id} className="border-l-4 bg-card/80 backdrop-blur-sm" style={{ borderLeftColor: turma?.cor_hex }}>
                      <CardContent className="py-4 flex items-center gap-3">
                        <Avatar className="w-12 h-12 border-2" style={{ borderColor: turma?.cor_hex }}>
                          <AvatarImage src={child.foto || undefined} />
                          <AvatarFallback className="font-bold">{child.nome.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-bold">{child.nome}</h3>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" style={{ borderColor: turma?.cor_hex, color: turma?.cor_hex }}>
                              {turma?.nome_exibicao || "Sem turma"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{child.idade} anos</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="bg-card/60 backdrop-blur-sm">
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Baby className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Nenhum filho cadastrado no PG Kids.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Foguete decorativo separador */}
        <div className="flex items-center justify-center gap-3 my-6">
          <div className="h-px bg-border flex-1" />
          <img src={kidsFoguete} alt="" className="w-6 h-6" />
          <span className="text-xs text-muted-foreground font-medium">Em breve</span>
          <img src={kidsFoguete} alt="" className="w-6 h-6" style={{ transform: "scaleX(-1)" }} />
          <div className="h-px bg-border flex-1" />
        </div>

        {/* Future features */}
        <div className="grid grid-cols-2 gap-3">
          {futureFeatures.map((feature, i) => (
            <Card key={i} className="bg-card/60 backdrop-blur-sm border-dashed opacity-70">
              <CardContent className="py-5 text-center">
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-2">
                  <feature.icon className="w-5 h-5 text-secondary" />
                </div>
                <h3 className="font-bold text-sm">{feature.title}</h3>
                <p className="text-[11px] text-muted-foreground mt-1">{feature.desc}</p>
                <Badge variant="outline" className="mt-2 text-[10px]">
                  <Construction className="w-3 h-3 mr-1" />
                  Em breve
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Astronautas decorativos no rodapé */}
        <div className="flex justify-between items-end mt-8 px-4">
          <img src={kidsMenina} alt="" className="w-20 opacity-40" />
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Pequenos Gileadita • Crianças de 4 a 11 anos
            </p>
          </div>
          <img src={kidsMenino} alt="" className="w-24 opacity-40" />
        </div>
      </div>
    </div>
  );
};

export default PortalKids;
