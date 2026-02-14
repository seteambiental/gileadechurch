import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoGileade from "@/assets/logo-gileade.jpeg";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Buscar logo da igreja
  const { data: igrejaConfig } = useQuery({
    queryKey: ["igreja-config-header"],
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

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { label: "Início", href: "#inicio" },
    { label: "Avisos", href: "#avisos" },
    { label: "Programação", href: "#programacao" },
    { label: "Casas Refúgio", href: "#casas-refugio" },
    { label: "Contato", href: "#contato" },
  ];

  const logoUrl = igrejaConfig?.logo_dark_url ?? logoGileade;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 bg-surfaceInverse text-primary-foreground transition-shadow duration-300 ${
        isScrolled ? "shadow-elegant" : ""
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="relative h-20 md:h-24 lg:h-28 flex items-center justify-between">
          {/* Logo à esquerda */}
          <a href="#inicio" className="flex items-center">
            <img
              src={logoUrl}
              alt={igrejaConfig?.nome_fantasia || "Logo"}
              className="h-16 md:h-20 lg:h-24 object-contain"
            />
          </a>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg transition-colors text-primary-foreground"
            aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="px-3 py-2 rounded-lg font-medium text-sm transition-all hover:bg-primary-foreground/10 text-primary-foreground/90 hover:text-primary-foreground"
              >
                {item.label}
              </a>
            ))}
            
            {/* Botão de acesso */}
            <Button
              variant="secondary"
              className="font-heading font-semibold shadow-red ml-4"
              onClick={() => navigate(user ? "/portal" : "/auth")}
            >
              {user ? "Meu Portal" : "Entrar"}
            </Button>
          </nav>
        </div>

        {/* Mobile Menu (abaixo do header) */}
        {isMobileMenuOpen && (
          <nav className="lg:hidden pb-6">
            <div className="p-4 rounded-2xl bg-primary-foreground/5 border border-primary-foreground/10 animate-scale-in">
              <div className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-4 py-3 rounded-xl font-medium text-primary-foreground hover:bg-primary-foreground/10 transition-all"
                  >
                    {item.label}
                  </a>
                ))}
                
                {/* Botão de acesso */}
                <Button
                  variant="secondary"
                  className="mt-2 font-heading font-semibold shadow-red"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate(user ? "/portal" : "/auth");
                  }}
                >
                  {user ? "Meu Portal" : "Entrar"}
                </Button>
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
