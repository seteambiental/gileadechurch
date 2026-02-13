import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AnnouncementCard from "@/components/AnnouncementCard";
import TestimonyCard from "@/components/TestimonyCard";
import PrayerRequestForm from "@/components/PrayerRequestForm";
import CasasRefugioMap from "@/components/CasasRefugioMap";
import SectionTitle from "@/components/SectionTitle";
import heroImage from "@/assets/hero-grapes.jpg";
import { MemberRequestForm } from "@/components/MemberRequestForm";
import { CompartilharCadastroDialog } from "@/components/CompartilharCadastroDialog";
import { Button } from "@/components/ui/button";
import { UserPlus, Share2, CalendarDays, ChevronLeft, ChevronRight, Navigation } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";

const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const Index = () => {
  const [memberFormOpen, setMemberFormOpen] = useState(false);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);

  // Buscar imagens do carrossel
  const { data: carrosselImages } = useQuery({
    queryKey: ["homepage-carrossel-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_carrossel")
        .select("*")
        .eq("ativo", true)
        .order("ordem", { ascending: true });
      if (error) return [];
      return data;
    },
  });

  // Total de slides: 1 (hero fixo) + imagens do carrossel
  const totalSlides = 1 + (carrosselImages?.length || 0);

  // Auto-rotação do carrossel a cada 10 segundos
  useEffect(() => {
    if (totalSlides <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentCarouselIndex((prev) => 
        prev === totalSlides - 1 ? 0 : prev + 1
      );
    }, 10000);

    return () => clearInterval(interval);
  }, [totalSlides]);

  // Buscar configuração do hero
  const { data: homepageConfig } = useQuery({
    queryKey: ["homepage-config-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_config")
        .select("*")
        .limit(1)
        .single();
      if (error) return null;
      return data;
    },
  });

  // Buscar dados da igreja (endereço e coordenadas)
  const { data: igrejaConfig } = useQuery({
    queryKey: ["igreja-config-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("igreja_config")
        .select("address, number, neighborhood, city, state, cep, latitude, longitude, nome_fantasia")
        .limit(1)
        .single();
      if (error) return null;
      return data;
    },
  });

  // Buscar avisos ativos
  const { data: avisosDb } = useQuery({
    queryKey: ["homepage-avisos-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_avisos")
        .select("*")
        .eq("ativo", true)
        .order("ordem", { ascending: true });
      if (error) return [];
      return data;
    },
  });

  // Buscar eventos recorrentes (programação)
  const { data: eventosRecorrentes } = useQuery({
    queryKey: ["eventos-recorrentes-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_igreja")
        .select("*")
        .eq("ativo", true)
        .eq("recorrente", true)
        .order("dia_semana", { ascending: true });
      if (error) return [];
      return data;
    },
  });

  // Buscar eventos com flyer (próximos eventos especiais) - até 4
  // Apenas eventos que ainda não passaram (data_fim ou data_evento >= hoje)
  const { data: eventosComFlyer } = useQuery({
    queryKey: ["eventos-com-flyer-public"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("agenda_igreja")
        .select("id, titulo, flyer_url, data_evento, data_fim, limite_vagas")
        .eq("ativo", true)
        .eq("recorrente", false)
        .not("flyer_url", "is", null)
        .or(`data_fim.gte.${today},and(data_fim.is.null,data_evento.gte.${today})`)
        .order("data_evento", { ascending: true })
        .limit(8);
      if (error) return [];
      // Filtrar apenas flyers externos (não SVGs gerados pela IA)
      const externosOnly = (data || []).filter((e: any) => {
        const url = (e.flyer_url || "").toLowerCase();
        return !url.endsWith(".svg");
      });
      return externosOnly.slice(0, 4);
    },
  });

  // Buscar vídeos da homepage
  const { data: videosHomepage } = useQuery({
    queryKey: ["homepage-videos-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_videos")
        .select("*")
        .eq("ativo", true)
        .order("ordem", { ascending: true });
      if (error) return [];
      return data;
    },
  });

  const { data: testemunhosDb } = useQuery({
    queryKey: ["testemunhos-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testemunhos")
        .select("*")
        .eq("aprovado", true)
        .order("created_at", { ascending: false });
      if (error) return [];
      return data;
    },
  });

  // Filtrar testemunhos ativos (15 dias)
  const testemunhosAtivos = useMemo(() => {
    if (!testemunhosDb) return [];
    const now = new Date();
    return testemunhosDb.filter((t) => {
      if (t.arquivado) return false;
      const daysSinceCreated = differenceInDays(now, new Date(t.created_at));
      return daysSinceCreated <= 15;
    }).slice(0, 6);
  }, [testemunhosDb]);

  // Formatar avisos para o componente
  const announcements = useMemo(() => {
    if (!avisosDb || avisosDb.length === 0) {
      return [
        {
          title: "Bem-vindo à Gileade",
          description: "Venha nos visitar e conhecer nossa comunidade!",
          type: "info" as const,
        },
      ];
    }
    return avisosDb.map((aviso) => ({
      title: aviso.titulo,
      description: aviso.descricao,
      date: aviso.data || undefined,
      time: aviso.horario || undefined,
      type: aviso.tipo as "event" | "urgent" | "info",
    }));
  }, [avisosDb]);

  // Formatar programação
  const scheduleItems = useMemo(() => {
    if (!eventosRecorrentes || eventosRecorrentes.length === 0) {
      return [
        { day: "Domingo", time: "09h", event: "Culto da Família" },
        { day: "Domingo", time: "19h", event: "Culto de Celebração" },
        { day: "Quarta", time: "19h30", event: "Culto de Ensino" },
      ];
    }

    // Separar eventos de ceia (mensais) dos demais
    const ceiaKeywords = ["ceia", "santa ceia"];
    const celebracaoKeywords = ["celebração", "celebracao"];
    
    const eventosCeia = eventosRecorrentes.filter(
      (e) => e.tipo_recorrencia === "mensal" && ceiaKeywords.some((k) => e.titulo.toLowerCase().includes(k))
    );
    const ceiaByDay: Record<number, typeof eventosCeia[0]> = {};
    eventosCeia.forEach((c) => {
      if (c.dia_semana != null) ceiaByDay[c.dia_semana] = c;
    });

    // IDs dos eventos de ceia para excluí-los da lista principal
    const ceiaIds = new Set(eventosCeia.map((c) => c.id));

    const items = eventosRecorrentes
      .filter((e) => !ceiaIds.has(e.id))
      .map((evento) => {
        let day = diasSemana[evento.dia_semana ?? 0];
        let title = evento.titulo;

        // Se for evento mensal, adicionar indicação de qual semana
        if (evento.tipo_recorrencia === "mensal" && evento.semana_mes) {
          const semanaLabels: Record<number, string> = {
            1: "1º",
            2: "2º",
            3: "3º",
            4: "4º",
            5: "Último",
          };
          day = `${semanaLabels[evento.semana_mes] || ""} ${day} do mês`;
        }

        // Se é um culto de celebração e existe ceia no mesmo dia, unificar como "Culto de Ceia"
        if (
          evento.tipo_recorrencia === "semanal" &&
          celebracaoKeywords.some((k) => evento.titulo.toLowerCase().includes(k)) &&
          evento.dia_semana != null &&
          ceiaByDay[evento.dia_semana]
        ) {
          const ceia = ceiaByDay[evento.dia_semana];
          const semanaLabel = ceia.semana_mes ? `${ceia.semana_mes}º` : "2º";
          title = `Culto de Ceia (${semanaLabel} ${diasSemana[evento.dia_semana]})`;
        }

        return {
          day,
          time: evento.hora_inicio ? evento.hora_inicio.slice(0, 5) : "—",
          event: title,
        };
      });

    return items;
  }, [eventosRecorrentes]);

  // Formatar testemunhos
  const testimonies = useMemo(() => {
    if (testemunhosAtivos.length === 0) {
      return [
        {
          content: "Encontrei paz e propósito na Gileade Church. A comunhão e o amor que recebi aqui mudaram minha vida completamente.",
          author: "Membro da Igreja",
          role: "Membro",
        },
      ];
    }
    return testemunhosAtivos.map((t) => ({
      content: t.testemunho,
      author: t.anonimo ? "Anônimo" : t.nome || "Membro",
      role: "Membro",
      photoUrl: t.anonimo ? undefined : t.foto_url,
    }));
  }, [testemunhosAtivos]);

  // Título do hero
  const heroTitulo = homepageConfig?.hero_titulo || "Um Lugar de Cura e Restauração";
  const heroSubtitulo = homepageConfig?.hero_subtitulo || "Venha fazer parte de uma comunidade que vive o amor de Cristo. Aqui você encontra acolhimento, crescimento espiritual e propósito.";

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section - Responsivo: altura limitada em mobile */}
      <section
        id="inicio"
        className="relative w-full overflow-hidden h-[44vh] min-h-[360px] sm:h-[65vh] md:h-[70vh] lg:h-[75vh] xl:h-[78vh] sm:min-h-[560px]"
      >
        {/* Background - Slide 0 é sempre o Hero fixo, demais são do carrossel */}
        <div className="absolute inset-0 bg-primary">
          {/* Slide 0: Hero fixo com texto */}
          <div
            className={`absolute inset-0 transition-opacity duration-1000 ${
              currentCarouselIndex === 0 ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src={homepageConfig?.hero_image_url || heroImage}
              alt="Gileade Church - Um lugar de cura e restauração"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-primary/70" />
          </div>

          {/* Slides do carrossel (índices 1+) - Fullscreen esticado */}
          {carrosselImages && carrosselImages.map((img, index) => (
            <div
              key={img.id}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index + 1 === currentCarouselIndex ? "opacity-100" : "opacity-0"
              }`}
            >
              <img
                src={img.imagem_url}
                alt={img.titulo}
                className="w-full h-full object-fill"
                loading="lazy"
                decoding="async"
              />
            </div>
          ))}
        </div>

        {/* Content - Só aparece no slide 0 (hero fixo) */}
        {currentCarouselIndex === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="container mx-auto px-3 sm:px-4 text-center">
              <div className="max-w-4xl mx-auto space-y-2 sm:space-y-4 md:space-y-6">
                <div className="inline-block px-2 sm:px-4 py-1 sm:py-2 rounded-full bg-secondary/20 border border-secondary/30 text-secondary text-[10px] sm:text-xs md:text-sm font-medium animate-fade-in">
                  Bem-vindo à Gileade Church
                </div>
                
                <h1 className="text-[clamp(1.35rem,6.5vw,4.25rem)] font-heading font-bold text-primary-foreground leading-[1.08] sm:leading-tight animate-fade-in">
                  {heroTitulo.includes("Cura") ? (
                    <>
                      Um Lugar de{" "}
                      <span className="text-secondary">Cura e Restauração</span>
                    </>
                  ) : (
                    heroTitulo
                  )}
                </h1>
                
                <p className="text-[clamp(0.85rem,3.6vw,1.25rem)] text-primary-foreground/80 max-w-2xl mx-auto leading-relaxed animate-fade-in">
                  {heroSubtitulo}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Setas de navegação do Carrossel */}
        {totalSlides > 1 && (
          <>
            <button
              onClick={() => setCurrentCarouselIndex((prev) => prev === 0 ? totalSlides - 1 : prev - 1)}
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-all backdrop-blur-sm"
              aria-label="Slide anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => setCurrentCarouselIndex((prev) => prev === totalSlides - 1 ? 0 : prev + 1)}
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-all backdrop-blur-sm"
              aria-label="Próximo slide"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Scroll Indicator - só quando não há carrossel */}
        {totalSlides <= 1 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-fade-in z-10">
            <div className="w-6 h-10 rounded-full border-2 border-primary-foreground/30 flex items-start justify-center p-2">
              <div className="w-1.5 h-3 rounded-full bg-secondary animate-bounce" />
            </div>
          </div>
        )}
      </section>

      {/* Announcements Section */}
      <section id="avisos" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <SectionTitle
            title="Avisos"
            subtitle="Fique por dentro das novidades da nossa igreja"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {announcements.map((announcement, index) => (
              <AnnouncementCard
                key={`${announcement.title}-${index}`}
                {...announcement}
                delay={index * 100}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Schedule Section */}
      <section id="programacao" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <SectionTitle
                title="Programação"
                subtitle="Participe dos nossos cultos e eventos semanais"
              />

              <div className="space-y-4">
                {scheduleItems.slice(0, 6).map((item, index) => (
                  <div
                    key={`${item.day}-${item.time}-${index}`}
                    className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-secondary transition-all animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex-shrink-0 w-20 h-20 rounded-xl bg-gradient-dark flex flex-col items-center justify-center text-primary-foreground overflow-hidden">
                      <span className="text-xs font-medium opacity-80">{item.day}</span>
                      <span className="font-heading font-bold text-base">{item.time}</span>
                    </div>
                    <div>
                      <h4 className="font-heading font-semibold text-foreground">
                        {item.event}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {item.day === "Domingo" ? "Sede da Igreja" : "Confira o local"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Eventos com Flyer - Grid 2x2 */}
              {eventosComFlyer && eventosComFlyer.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-heading font-semibold text-foreground mb-4">
                    Próximos Eventos
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {eventosComFlyer.map((evento, index) => (
                      <Link
                        key={evento.id}
                        to={`/inscricao/${evento.id}`}
                        className="group block rounded-lg overflow-hidden border border-border hover:border-secondary transition-all animate-fade-in shadow-sm hover:shadow-md bg-card"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <img
                          src={evento.flyer_url}
                          alt={evento.titulo}
                          className="w-full h-auto object-contain group-hover:scale-[1.02] transition-transform duration-300"
                        />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <SectionTitle
                title="Pedidos de Oração"
                subtitle="Compartilhe conosco suas necessidades"
              />
              <PrayerRequestForm />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonies Section */}
      {testimonies.length > 0 && (
        <section className="py-20 bg-gradient-dark">
          <div className="container mx-auto px-4">
            <SectionTitle
              title="Testemunhos"
              subtitle="Vidas transformadas pelo poder de Deus"
              centered
              light
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonies.map((testimony, index) => (
                <TestimonyCard
                  key={`${testimony.author}-${index}`}
                  {...testimony}
                  delay={index * 100}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Videos Section */}
      {videosHomepage && videosHomepage.length > 0 && (
        <section id="videos" className="py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <SectionTitle
              title="Vídeos"
              subtitle="Assista aos nossos vídeos e mensagens"
              centered
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {videosHomepage.map((video, index) => {
                // Extract YouTube ID for embed
                const ytMatch = video.video_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
                const ytId = ytMatch ? ytMatch[1] : null;

                return (
                  <div
                    key={video.id}
                    className="bg-card rounded-xl overflow-hidden border border-border shadow-sm animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {ytId ? (
                      <div className="aspect-video">
                        <iframe
                          src={`https://www.youtube.com/embed/${ytId}`}
                          title={video.titulo}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="w-full h-full"
                        />
                      </div>
                    ) : (
                      <a
                        href={video.video_url}
                        target="_blank"
                        rel="noreferrer"
                        className="block aspect-video bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                      >
                        {video.thumbnail_url ? (
                          <img src={video.thumbnail_url} alt={video.titulo} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-muted-foreground">Assistir vídeo</span>
                        )}
                      </a>
                    )}
                    <div className="p-4">
                      <h4 className="font-heading font-semibold text-foreground">{video.titulo}</h4>
                      {video.descricao && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{video.descricao}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Cadastro Section */}
      <section id="cadastro" className="py-20 bg-secondary/10">
        <div className="container mx-auto px-4">
          <SectionTitle
            title="Faça Parte da Nossa Família"
            subtitle="Cadastre-se e participe ativamente da nossa comunidade"
            centered
          />

          <div className="max-w-md mx-auto text-center space-y-6">
            <p className="text-muted-foreground">
              Preencha o formulário de cadastro e faça parte da família Gileade Church. 
              Você receberá informações sobre nossos eventos, cultos e muito mais!
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => setMemberFormOpen(true)}
                className="gap-2"
              >
                <UserPlus className="w-5 h-5" />
                Quero me Cadastrar
              </Button>
              
              <CompartilharCadastroDialog
                trigger={
                  <Button variant="outline" size="lg" className="gap-2">
                    <Share2 className="w-5 h-5" />
                    Compartilhar
                  </Button>
                }
              />
            </div>
          </div>
        </div>
      </section>

      {/* Cell Groups / Casas Refúgio Section */}
      <section id="casas-refugio" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <SectionTitle
            title="Casas Refúgio"
            subtitle="Encontre uma célula perto de você e cresça em comunhão"
            centered
          />

          <CasasRefugioMap />
        </div>
      </section>

      {/* Location Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <SectionTitle
            title="Nossa Localização"
            subtitle="Venha nos visitar! Estamos esperando por você"
            centered
          />

          <div className="max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-elegant border border-border bg-card">
            <div className="aspect-video">
              {/* @ts-ignore - latitude e longitude são campos novos */}
              {igrejaConfig?.latitude && igrejaConfig?.longitude ? (
                <iframe
                  title="Mapa - Localização da Igreja"
                  className="w-full h-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${(igrejaConfig.longitude as number) - 0.01}%2C${(igrejaConfig.latitude as number) - 0.005}%2C${(igrejaConfig.longitude as number) + 0.01}%2C${(igrejaConfig.latitude as number) + 0.005}&layer=mapnik&marker=${igrejaConfig.latitude}%2C${igrejaConfig.longitude}`}
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <div className="text-center p-8">
                    <p className="text-muted-foreground mb-2">Mapa em breve</p>
                    <p className="text-xs text-muted-foreground">
                      Configure a geolocalização nos dados da igreja
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6">
              <p className="font-heading font-semibold text-foreground">
                {igrejaConfig?.address ? (
                  <>
                    {igrejaConfig.address}, {igrejaConfig.number} - {igrejaConfig.neighborhood}
                  </>
                ) : (
                  "Endereço não configurado"
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {igrejaConfig?.city ? (
                  <>
                    {igrejaConfig.city} - {igrejaConfig.state}
                    {igrejaConfig.cep && `, CEP ${igrejaConfig.cep}`}
                  </>
                ) : (
                  "Configure o endereço nos dados da igreja"
                )}
              </p>
              {/* @ts-ignore */}
              {igrejaConfig?.latitude && igrejaConfig?.longitude && (
                <a
                  className="mt-3 inline-flex items-center gap-2 text-sm text-secondary hover:underline"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${igrejaConfig.latitude},${igrejaConfig.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Navigation className="w-4 h-4" />
                  Traçar rota no Google Maps
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* Member Request Form Dialog */}
      <MemberRequestForm open={memberFormOpen} onOpenChange={setMemberFormOpen} />
    </div>
  );
};

export default Index;
