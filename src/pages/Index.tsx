import { useMemo, useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AnnouncementCard from "@/components/AnnouncementCard";
import TestimonyCard from "@/components/TestimonyCard";
import PrayerRequestForm from "@/components/PrayerRequestForm";
import CasasRefugioMap from "@/components/CasasRefugioMap";
import SectionTitle from "@/components/SectionTitle";
import heroImage from "@/assets/hero-grapes.jpg";
import rumoAos1000Banner from "@/assets/rumo-aos-1000.png";

const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const Index = () => {
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

  // Buscar testemunhos aprovados (ativos por 15 dias)
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

  // Buscar contagem de membros para o contador "Rumo aos 1000"
  const { data: membrosCount } = useQuery({
    queryKey: ["membros-count-public"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("members")
        .select("*", { count: "exact", head: true });
      if (error) return 0;
      return count || 0;
    },
  });

  // Calcular quantos faltam para 1000
  const faltamPara1000 = useMemo(() => {
    const atual = membrosCount || 0;
    return Math.max(0, 1000 - atual);
  }, [membrosCount]);

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
    return eventosRecorrentes.map((evento) => ({
      day: diasSemana[evento.dia_semana ?? 0],
      time: evento.hora_inicio ? evento.hora_inicio.slice(0, 5) : "—",
      event: evento.titulo,
    }));
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

  // Carrossel do hero
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 4000, stopOnInteraction: false })
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollTo = useCallback(
    (index: number) => emblaApi && emblaApi.scrollTo(index),
    [emblaApi]
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Carousel Section */}
      <section
        id="inicio"
        className="relative min-h-screen overflow-hidden"
      >
        <div className="absolute inset-0" ref={emblaRef}>
          <div className="flex h-full">
            {/* Slide 1 - Hero principal */}
            <div className="flex-[0_0_100%] min-w-0 relative min-h-screen flex items-center justify-center">
              <div className="absolute inset-0">
                <img
                  src={homepageConfig?.hero_image_url || heroImage}
                  alt="Gileade Church - Um lugar de cura e restauração"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-primary/70" />
              </div>
              <div className="relative z-10 container mx-auto px-4 text-center">
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="inline-block px-4 py-2 rounded-full bg-secondary/20 border border-secondary/30 text-secondary text-sm font-medium mb-4">
                    Bem-vindo à Gileade Church
                  </div>
                  <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-bold text-primary-foreground leading-tight">
                    {heroTitulo.includes("Cura") ? (
                      <>
                        Um Lugar de{" "}
                        <span className="text-secondary">Cura e Restauração</span>
                      </>
                    ) : (
                      heroTitulo
                    )}
                  </h1>
                  <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto leading-relaxed">
                    {heroSubtitulo}
                  </p>
                </div>
              </div>
            </div>

            {/* Slide 2 - Rumo aos 1000 */}
            <div className="flex-[0_0_100%] min-w-0 relative min-h-screen flex items-center justify-center">
              <div className="absolute inset-0">
                <img
                  src={rumoAos1000Banner}
                  alt="Rumo aos 1000 Cadastros no App"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="relative z-10 container mx-auto px-4 text-center">
                <div className="max-w-2xl mx-auto space-y-4">
                  <p className="text-lg md:text-xl text-amber-400 font-medium">
                    Faltam
                  </p>
                  <div className="text-7xl md:text-9xl font-heading font-bold text-destructive">
                    {faltamPara1000}
                  </div>
                  <p className="text-base md:text-lg text-amber-400">
                    cadastros para atingirmos a meta!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Indicadores do carrossel */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {[0, 1].map((index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                selectedIndex === index
                  ? "bg-secondary w-8"
                  : "bg-primary-foreground/40 hover:bg-primary-foreground/60"
              }`}
              aria-label={`Ir para slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
          <div className="w-6 h-10 rounded-full border-2 border-primary-foreground/30 flex items-start justify-center p-2">
            <div className="w-1.5 h-3 rounded-full bg-secondary animate-bounce" />
          </div>
        </div>
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
                  className="mt-3 inline-block text-sm text-secondary hover:underline"
                  href={`https://www.openstreetmap.org/?mlat=${igrejaConfig.latitude}&mlon=${igrejaConfig.longitude}#map=17/${igrejaConfig.latitude}/${igrejaConfig.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir no mapa
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
