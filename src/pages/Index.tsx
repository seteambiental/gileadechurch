import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";
import { normalizeText } from "@/lib/text-utils";
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
  const navigate = useNavigate();
  const [memberFormOpen, setMemberFormOpen] = useState(false);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  // Detecta viewport mobile para escolher a variante correta da imagem do carrossel
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(
    typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false,
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent) => setIsMobileViewport(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
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

  // Contador de membros cadastrados (via RPC para funcionar sem autenticação)
  const { data: totalMembros } = useQuery({
    queryKey: ["total-membros-counter-homepage"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_members_count");
      if (error) return 0;
      return Number(data) || 0;
    },
  });

  // Em telas mobile, itens sem imagem mobile dedicada são ocultados do carrossel
  // (evita usar a versão desktop como fallback, que fica com faixas/desenquadrada).
  const visibleCarrosselImages = useMemo(() => {
    if (!carrosselImages) return [];
    if (!isMobileViewport) return carrosselImages;
    return carrosselImages.filter((img) => !!(img as any).imagem_url_mobile);
  }, [carrosselImages, isMobileViewport]);

  // Total de slides: 1 (hero fixo) + imagens do carrossel + 1 (contador)
  const totalSlides = 1 + (visibleCarrosselImages.length || 0) + 1;
  const contadorSlideIndex = totalSlides - 1;

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

  // Buscar avisos ativos (exclui vencidos, ordena por data cronológica)
  const { data: avisosDb } = useQuery({
    queryKey: ["homepage-avisos-public"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("homepage_avisos")
        .select("*")
        .eq("ativo", true);
      if (error) return [];

      // Helper: parse "dd/MM/yyyy" to Date
      const parseDataAviso = (d: string): Date | null => {
        const parts = d.split("/");
        if (parts.length !== 3) return null;
        const [dd, mm, yyyy] = parts;
        return new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
      };

      // Filtra avisos com data passada
      const filtered = (data || []).filter((a) => {
        if (!a.data) return true;
        const parsed = parseDataAviso(a.data);
        return parsed ? parsed >= today : true;
      });
      // Ordena cronologicamente: avisos com data primeiro (asc), sem data por ordem
      return filtered.sort((a, b) => {
        if (a.data && b.data) {
          const dateA = parseDataAviso(a.data);
          const dateB = parseDataAviso(b.data);
          if (dateA && dateB) return dateA.getTime() - dateB.getTime();
        }
        if (a.data && !b.data) return -1;
        if (!a.data && b.data) return 1;
        return (a.ordem ?? 0) - (b.ordem ?? 0);
      });
    },
  });

  // Buscar programação customizada da homepage
  const { data: programacaoCustom } = useQuery({
    queryKey: ["homepage-programacao-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_programacao")
        .select("*")
        .eq("ativo", true)
        .order("dia_semana", { ascending: true })
        .order("ordem", { ascending: true });
      if (error) return [];
      return data;
    },
  });

  // Buscar eventos recorrentes (programação) - fallback se não houver customização
  const { data: eventosRecorrentes } = useQuery({
    queryKey: ["eventos-recorrentes-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_igreja")
        .select("*")
        .eq("ativo", true)
        .eq("recorrente", true)
        .neq("genero_alvo", "somente_convidados")
        .order("dia_semana", { ascending: true });
      if (error) return [];
      return data;
    },
    enabled: !programacaoCustom || programacaoCustom.length === 0,
  });

  // Buscar próximos eventos especiais - até 4
  // O evento continua aparecendo mesmo sem pôster (mostra um cartão com data/título)
  const { data: eventosComFlyer } = useQuery({
    queryKey: ["eventos-com-flyer-public"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("agenda_igreja")
        .select("id, titulo, tipo_evento, flyer_url, data_evento, data_fim, hora_inicio, local, cor, necessita_inscricao, limite_vagas, visibilidade")
        .eq("ativo", true)
        .eq("recorrente", false)
        .eq("visibilidade", "publico")
        .eq("status", "aprovado")
        .neq("genero_alvo", "somente_convidados")
        .or(`data_fim.gte.${today},and(data_fim.is.null,data_evento.gte.${today})`)
        .order("data_evento", { ascending: true })
        .limit(12);
      if (error) return [];
      // Mantém eventos que são "especiais": têm pôster (não-SVG) OU precisam de inscrição.
      const proximos = (data || []).filter((e: any) => {
        const url = (e.flyer_url || "").toLowerCase();
        const temPosterValido = !!url && !url.endsWith(".svg");
        return temPosterValido || e.necessita_inscricao;
      });
      return proximos.slice(0, 4);
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
          id: "default",
          title: "Bem-vindo à Gileade",
          description: "Venha nos visitar e conhecer nossa comunidade!",
          type: "info" as const,
        },
      ];
    }
    return avisosDb.map((aviso) => ({
      id: aviso.id,
      title: aviso.titulo,
      description: aviso.descricao,
      date: aviso.data || undefined,
      time: aviso.horario || undefined,
      type: aviso.tipo as "event" | "urgent" | "info",
    }));
  }, [avisosDb]);

  // Formatar programação - usar customização se existir, senão fallback automático
  const scheduleItems = useMemo(() => {
    // Se há programação customizada, usar ela
    if (programacaoCustom && programacaoCustom.length > 0) {
      const today = new Date();
      const todayDow = today.getDay();

      return programacaoCustom.map((item: any) => ({
        day: diasSemana[item.dia_semana],
        time: item.horario ? item.horario.slice(0, 5) : "—",
        event: item.titulo,
        subtitle: item.subtitulo || null,
      })).sort((a: any, b: any) => {
        const diaA = ((diasSemana.indexOf(a.day)) - todayDow + 7) % 7;
        const diaB = ((diasSemana.indexOf(b.day)) - todayDow + 7) % 7;
        if (diaA !== diaB) return diaA - diaB;
        return (a.time || "").localeCompare(b.time || "");
      });
    }

    // Fallback: lógica automática da agenda
    if (!eventosRecorrentes || eventosRecorrentes.length === 0) {
      return [
        { day: "Domingo", time: "09:00", event: "Culto de Celebração", subtitle: null },
        { day: "Quarta", time: "19:30", event: "Quarta com Propósito", subtitle: null },
      ];
    }

    const today = new Date();
    const todayDow = today.getDay();

    const next7DaysDow = new Set<number>();
    for (let i = 0; i < 7; i++) {
      next7DaysDow.add((todayDow + i) % 7);
    }

    const eventosDaSemana = eventosRecorrentes.filter(
      (e) => e.dia_semana != null && next7DaysDow.has(e.dia_semana)
    );

    const ceiaEvento = eventosDaSemana.find((e) =>
      normalizeText(e.titulo).includes("ceia")
    );
    const quartaPCEvento = eventosDaSemana.find((e) =>
      normalizeText(e.titulo).includes("prestacao de contas")
    );

    const filtrados = eventosDaSemana.filter((e) => {
      const tituloNorm = normalizeText(e.titulo);
      if (ceiaEvento && tituloNorm.includes("celebracao") && e.dia_semana === ceiaEvento.dia_semana) {
        return false;
      }
      if (quartaPCEvento && e.id !== quartaPCEvento.id && tituloNorm.includes("proposito") && !tituloNorm.includes("prestacao") && e.dia_semana === quartaPCEvento.dia_semana) {
        return false;
      }
      return true;
    });

    const vistos = new Set<string>();
    const unicos = filtrados.filter((e) => {
      const key = normalizeText(e.titulo);
      if (vistos.has(key)) return false;
      vistos.add(key);
      return true;
    });

    const sorted = [...unicos].sort((a, b) => {
      const diaA = ((a.dia_semana ?? 0) - todayDow + 7) % 7;
      const diaB = ((b.dia_semana ?? 0) - todayDow + 7) % 7;
      if (diaA !== diaB) return diaA - diaB;
      return (a.hora_inicio || "").localeCompare(b.hora_inicio || "");
    });

    const items = sorted.map((e) => {
      const diffDays = ((e.dia_semana ?? 0) - todayDow + 7) % 7;
      const eventDate = new Date(today);
      eventDate.setDate(today.getDate() + diffDays);

      let titulo = e.titulo;
      if (ceiaEvento && e.id === ceiaEvento.id) {
        const weekNum = Math.ceil(eventDate.getDate() / 7);
        titulo = `Culto de Ceia (${weekNum}º Domingo)`;
      }
      if (quartaPCEvento && e.id === quartaPCEvento.id) {
        titulo = "Quarta com Propósito";
      }

      return {
        day: diasSemana[e.dia_semana ?? 0],
        time: e.hora_inicio ? e.hora_inicio.slice(0, 5) : "—",
        event: titulo,
        subtitle: null as string | null,
      };
    });

    if (items.length === 0) {
      return [
        { day: "Domingo", time: "09:00", event: "Culto de Celebração", subtitle: null },
        { day: "Quarta", time: "19:30", event: "Quarta com Propósito", subtitle: null },
      ];
    }

    return items;
  }, [programacaoCustom, eventosRecorrentes]);

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
        className="relative w-full overflow-hidden h-[42vh] sm:h-[50vh] md:h-[54vh] lg:h-auto lg:aspect-video lg:max-h-[900px]"
      >
        {/* Background - Slide 0 é sempre o Hero fixo, demais são do carrossel */}
        <div className="absolute inset-0 bg-primary">
          {/* Slide 0: Hero fixo com texto */}
          <div
            className={`absolute inset-0 transition-opacity duration-1000 ${
              currentCarouselIndex === 0
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none"
            }`}
          >
            <img
              src={homepageConfig?.hero_image_url || heroImage}
              alt="Gileade Church - Um lugar de cura e restauração"
              className="w-full h-full object-contain object-center"
            />
            <div className="absolute inset-0 bg-primary/70" />
          </div>

          {/* Slides do carrossel (índices 1+) - encaixados no espaço disponível */}
          {visibleCarrosselImages.map((img, index) => (
              <div
                key={img.id}
                className={`absolute inset-0 transition-opacity duration-1000 ${
                  index + 1 === currentCarouselIndex
                    ? "opacity-100 pointer-events-auto"
                    : "opacity-0 pointer-events-none"
                }`}
              >
                {(() => {
                  const srcUrl =
                    isMobileViewport && (img as any).imagem_url_mobile
                      ? (img as any).imagem_url_mobile
                      : img.imagem_url;
                  const eventoId = (img as any).link_evento_id as string | null | undefined;
                  const href = eventoId
                    ? `/inscricao/${eventoId}`
                    : img.link_url || null;
                  const content = (
                    <img
                      src={srcUrl}
                      alt={img.titulo}
                      className="absolute inset-0 w-full h-full object-cover object-center"
                      loading="lazy"
                      decoding="async"
                    />
                  );
                  return href ? (
                    <a
                      href={href}
                      onClick={(e) => {
                        if (eventoId) {
                          e.preventDefault();
                          navigate(`/inscricao/${eventoId}`);
                        }
                      }}
                      className="absolute inset-0 block cursor-pointer"
                      aria-label={img.titulo}
                    >
                      {content}
                    </a>
                  ) : (
                    content
                  );
                })()}
              </div>
          ))}

          {/* Slide Contador de Cadastros */}
          <div
            className={`absolute inset-0 transition-opacity duration-1000 ${
              currentCarouselIndex === contadorSlideIndex
                ? "opacity-100 z-[2] pointer-events-auto"
                : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="absolute inset-0 bg-accent flex flex-col items-center justify-center">
              {/* Faixa preta */}
              <div className="w-full bg-black/90 py-6 sm:py-10 flex flex-col items-center gap-2 sm:gap-4 shadow-lg">
                <span className="text-accent font-heading font-extrabold text-lg sm:text-2xl md:text-3xl tracking-widest uppercase">
                  Rumo aos 1.000 Cadastros
                </span>
                <div className="flex items-baseline gap-3 sm:gap-6">
                  <span className="text-white font-heading font-black text-5xl sm:text-7xl md:text-8xl leading-none">
                    {totalMembros ?? 0}
                  </span>
                  <span className="text-white/50 font-heading font-bold text-2xl sm:text-4xl md:text-5xl">
                    / 1.000
                  </span>
                </div>
                {/* Barra de progresso */}
                <div className="w-4/5 max-w-lg bg-white/10 rounded-full h-5 sm:h-7 overflow-hidden mt-2">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-1000 flex items-center justify-end pr-2"
                    style={{ width: `${Math.min(((totalMembros ?? 0) / 1000) * 100, 100)}%` }}
                  >
                    {(totalMembros ?? 0) >= 30 && (
                      <span className="text-black text-[10px] sm:text-xs font-bold">
                        {(((totalMembros ?? 0) / 1000) * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-white/60 font-medium text-sm sm:text-base mt-1">
                  {(((totalMembros ?? 0) / 1000) * 100).toFixed(1)}% da nossa meta
                </span>
              </div>
            </div>
          </div>
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
              <div key={`${announcement.title}-${index}`} className="relative">
                <AnnouncementCard
                  {...announcement}
                  delay={index * 100}
                />
              </div>
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
                        {item.subtitle || (item.day === "Domingo" ? "Sede da Igreja" : "Confira o local")}
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {eventosComFlyer.map((evento, index) => {
                      const url = (evento.flyer_url || "").toLowerCase();
                      const temPoster = !!url && !url.endsWith(".svg");
                      const [ano, mes, dia] = (evento.data_evento || "").split("-").map(Number);
                      const dataEvento = ano ? new Date(ano, (mes || 1) - 1, dia || 1) : null;
                      return (
                        <Link
                          key={evento.id}
                          to={evento.tipo_evento === "apresentacao_criancas" ? `/inscricao/apresentacao/${evento.id}` : `/inscricao/${evento.id}`}
                          className="group block rounded-lg overflow-hidden border border-border hover:border-secondary transition-all animate-fade-in shadow-sm hover:shadow-md bg-card"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          {temPoster ? (
                            <img
                              src={evento.flyer_url}
                              alt={evento.titulo}
                              className="w-full h-auto object-contain group-hover:scale-[1.02] transition-transform duration-300"
                            />
                          ) : (
                            <div
                              className="aspect-[3/4] flex flex-col items-center justify-center gap-1 p-4 text-center"
                              style={{ backgroundColor: evento.cor || "hsl(var(--secondary))", color: "#ffffff" }}
                            >
                              {dataEvento && (
                                <span className="text-xs font-medium uppercase opacity-90">
                                  {format(dataEvento, "dd 'de' MMM", { locale: ptBR })}
                                </span>
                              )}
                              <span className="font-heading font-bold text-base leading-tight line-clamp-4">
                                {evento.titulo}
                              </span>
                              {evento.hora_inicio && (
                                <span className="text-xs opacity-90">{evento.hora_inicio.substring(0, 5)}</span>
                              )}
                              {evento.necessita_inscricao && (
                                <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide bg-white/20 rounded px-2 py-0.5">
                                  Inscrição
                                </span>
                              )}
                            </div>
                          )}
                        </Link>
                      );
                    })}
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
                onClick={() => navigate("/cadastro")}
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
