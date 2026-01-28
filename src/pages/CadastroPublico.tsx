import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { MemberRequestForm } from "@/components/MemberRequestForm";
import heroImage from "@/assets/hero-grapes.jpg";

const CadastroPublico = () => {
  const [formOpen, setFormOpen] = useState(true);

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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section com formulário */}
      <section
        className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
      >
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={homepageConfig?.hero_image_url || heroImage}
            alt="Gileade Church - Faça parte da nossa família"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-primary/80" />
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-8 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="inline-block px-4 py-2 rounded-full bg-secondary/20 border border-secondary/30 text-secondary text-sm font-medium mb-4 animate-fade-in">
              Bem-vindo à Gileade Church
            </div>
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-primary-foreground leading-tight animate-fade-in">
              Faça Parte da{" "}
              <span className="text-secondary">Nossa Família</span>
            </h1>
            
            <p className="text-lg text-primary-foreground/80 max-w-xl mx-auto leading-relaxed animate-fade-in">
              Preencha o formulário abaixo e cadastre-se para participar ativamente da nossa comunidade.
            </p>
          </div>
        </div>
      </section>

      <Footer />

      {/* Member Request Form Dialog - Abre automaticamente */}
      <MemberRequestForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
};

export default CadastroPublico;
