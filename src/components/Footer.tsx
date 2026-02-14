import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Phone, Mail, MapPin, Instagram, Facebook, Youtube, Twitter, Globe, MessageCircle } from "lucide-react";
import logoGileade from "@/assets/logo-gileade.jpeg";
import { normalizeText } from "@/lib/text-utils";



const Footer = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => {
    // Buscar dados da igreja
    const { data: igrejaConfig } = useQuery({
      queryKey: ["igreja-config-footer"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("igreja_config")
          .select("*")
          .limit(1)
          .maybeSingle();
        if (error) return null;
        return data;
      },
    });

    // Buscar configuração da homepage (redes sociais e lema)
    const { data: homepageConfig } = useQuery({
      queryKey: ["homepage-config-footer"],
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

    // Buscar horários de culto (eventos recorrentes)
    const { data: cultosRecorrentes } = useQuery({
      queryKey: ["cultos-footer"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("agenda_igreja")
          .select("id, titulo, hora_inicio, dia_semana, tipo_evento")
          .eq("ativo", true)
          .eq("recorrente", true)
          .order("dia_semana", { ascending: true });
        if (error) return [];
        return data;
      },
    });

    // Filtrar apenas Culto de Celebração e Quarta com Propósito
    const cultosFiltrados = React.useMemo(() => {
      if (!cultosRecorrentes || cultosRecorrentes.length === 0) {
        return [
          { titulo: "Culto de Celebração", horario: "09:00" },
          { titulo: "Quarta com Propósito", horario: "19:30" },
        ];
      }

      const celebracaoKeywords = ["celebracao"];
      const quartaKeywords = ["quarta com proposito"];

      const celebracao = cultosRecorrentes.find((c) =>
        celebracaoKeywords.some((k) => normalizeText(c.titulo).includes(k))
      );
      const quarta = cultosRecorrentes.find((c) =>
        quartaKeywords.some((k) => normalizeText(c.titulo).includes(k))
      );

      const items: { titulo: string; horario: string }[] = [];
      if (celebracao) {
        items.push({
          titulo: celebracao.titulo,
          horario: celebracao.hora_inicio ? celebracao.hora_inicio.slice(0, 5) : "—",
        });
      }
      if (quarta) {
        items.push({
          titulo: quarta.titulo,
          horario: quarta.hora_inicio ? quarta.hora_inicio.slice(0, 5) : "—",
        });
      }

      if (items.length === 0) {
        return [
          { titulo: "Culto de Celebração", horario: "09:00" },
          { titulo: "Quarta com Propósito", horario: "19:30" },
        ];
      }

      return items;
    }, [cultosRecorrentes]);

    const lema = homepageConfig?.lema || "Um lugar de cura e restauração";
    const logoUrl = igrejaConfig?.logo_dark_url_2 ?? igrejaConfig?.logo_url ?? logoGileade;

    // Formatar número para WhatsApp
    const formatWhatsAppLink = (phone: string | null | undefined) => {
      if (!phone) return null;
      const cleanNumber = phone.replace(/\D/g, "");
      const fullNumber = cleanNumber.startsWith("55") ? cleanNumber : `55${cleanNumber}`;
      return `https://wa.me/${fullNumber}`;
    };

    const whatsappLink = formatWhatsAppLink(igrejaConfig?.celular || igrejaConfig?.telefone);

    return (
      <footer
        ref={ref}
        id="contato"
        className={`bg-surfaceInverse text-primary-foreground ${className ?? ""}`}
        {...props}
      >
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Logo & About */}
            <div className="space-y-4">
              <div className="flex items-center">
                <img
                  src={logoUrl}
                  alt={igrejaConfig?.nome_fantasia || "Logo"}
                  className="h-32 md:h-36 object-contain"
                  loading="lazy"
                />
              </div>
              <p className="text-primary-foreground/80 text-sm leading-relaxed">
                {lema}
              </p>
            </div>

            {/* Contato */}
            <div className="space-y-4">
              <h4 className="font-heading font-bold text-lg text-secondary">Contato</h4>
              <div className="space-y-3 text-sm">
                {whatsappLink && (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-primary-foreground/80 hover:text-secondary transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{igrejaConfig?.celular || igrejaConfig?.telefone}</span>
                  </a>
                )}
                {!whatsappLink && (igrejaConfig?.telefone || igrejaConfig?.celular) && (
                  <a
                    href={`tel:+55${(igrejaConfig.celular || igrejaConfig.telefone)?.replace(/\D/g, "")}`}
                    className="flex items-center gap-3 text-primary-foreground/80 hover:text-secondary transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    <span>{igrejaConfig.celular || igrejaConfig.telefone}</span>
                  </a>
                )}
                {igrejaConfig?.email && (
                  <a
                    href={`mailto:${igrejaConfig.email}`}
                    className="flex items-center gap-3 text-primary-foreground/80 hover:text-secondary transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    <span>{igrejaConfig.email}</span>
                  </a>
                )}
                <div className="flex items-start gap-3 text-primary-foreground/80">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    {igrejaConfig?.address ? (
                      <>
                        {igrejaConfig.address}, {igrejaConfig.number}
                        <br />
                        {igrejaConfig.neighborhood} - {igrejaConfig.city}/{igrejaConfig.state}
                      </>
                    ) : (
                      <>
                        Rua Araçás, 103 - Uberaba
                        <br />
                        Curitiba - PR
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Horários */}
            <div className="space-y-4">
              <h4 className="font-heading font-bold text-lg text-secondary">Nossos Cultos</h4>
              <div className="space-y-3 text-sm text-primary-foreground/80">
                {cultosFiltrados.map((culto, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="font-medium text-primary-foreground">{culto.titulo}:</span>
                    <span>{culto.horario}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Redes Sociais */}
            <div className="space-y-4">
              <h4 className="font-heading font-bold text-lg text-secondary">Redes Sociais</h4>
              <div className="flex gap-3">
                {homepageConfig?.instagram && (
                  <a
                    href={homepageConfig.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl bg-primary-foreground/10 flex items-center justify-center hover:bg-secondary hover:text-secondary-foreground transition-all"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {homepageConfig?.facebook && (
                  <a
                    href={homepageConfig.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl bg-primary-foreground/10 flex items-center justify-center hover:bg-secondary hover:text-secondary-foreground transition-all"
                  >
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
                {homepageConfig?.youtube && (
                  <a
                    href={homepageConfig.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl bg-primary-foreground/10 flex items-center justify-center hover:bg-secondary hover:text-secondary-foreground transition-all"
                  >
                    <Youtube className="w-5 h-5" />
                  </a>
                )}
                {homepageConfig?.twitter && (
                  <a
                    href={homepageConfig.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl bg-primary-foreground/10 flex items-center justify-center hover:bg-secondary hover:text-secondary-foreground transition-all"
                  >
                    <Twitter className="w-5 h-5" />
                  </a>
                )}
                {igrejaConfig?.website && (
                  <a
                    href={`https://${igrejaConfig.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl bg-primary-foreground/10 flex items-center justify-center hover:bg-secondary hover:text-secondary-foreground transition-all"
                  >
                    <Globe className="w-5 h-5" />
                  </a>
                )}
              </div>
              <p className="text-xs text-primary-foreground/60">
                Siga-nos para ficar por dentro de tudo!
              </p>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 pt-8 border-t border-primary-foreground/10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-primary-foreground/60">
            <p>© {new Date().getFullYear()} {igrejaConfig?.nome_fantasia || "Gileade Church"}. Todos os direitos reservados.</p>
            <div className="flex items-center gap-4">
              <a href="/termos" className="hover:text-secondary transition-colors">Termos de Uso</a>
              <span>|</span>
              <a href="/privacidade" className="hover:text-secondary transition-colors">Política de Privacidade</a>
            </div>
            <p className="flex items-center gap-2">
              Feito com <span className="text-secondary">♥</span> para a glória de Deus
            </p>
          </div>
        </div>
      </footer>
    );
  }
);
Footer.displayName = "Footer";

export default Footer;
