import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, X, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoGileade from "@/assets/logo-gileade.jpeg";

// Roles que têm acesso ao portal de líderes
const LEADER_FUNCTION_TYPES = [
  "pastor_geral",
  "pastor_auxiliar",
  "sindico_condominio",
  "supervisor_condominio",
  "lider_casa_refugio",
  "lider_ministerio",
  "integrante_ministerio",
];

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

  // Verificar se o usuário tem função de liderança
  const { data: leaderAccess } = useQuery({
    queryKey: ["header-leader-access", user?.id],
    queryFn: async () => {
      if (!user?.id) return { isLeader: false, isAdmin: false };

      // Verificar se é admin na tabela user_roles
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "pastor_geral", "pastor_auxiliar"]);

      if (roleData && roleData.length > 0) {
        return { isLeader: true, isAdmin: true };
      }

      // Verificar se tem função de liderança na member_functions
      const { data: memberData } = await supabase
        .from("members")
        .select("id, member_functions(function_type)")
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberData?.member_functions) {
        const hasLeaderFunction = memberData.member_functions.some((fn: { function_type: string }) =>
          LEADER_FUNCTION_TYPES.includes(fn.function_type)
        );
        return { isLeader: hasLeaderFunction, isAdmin: false };
      }

      return { isLeader: false, isAdmin: false };
    },
    enabled: !!user?.id,
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
            
            {user ? (
              <div className="flex items-center gap-2 ml-4">
                {leaderAccess?.isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-heading font-semibold border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                    onClick={() => navigate("/cadastros")}
                  >
                    <Shield className="w-4 h-4 mr-1" />
                    Admin
                  </Button>
                )}
                {leaderAccess?.isLeader && (
                  <Button
                    variant="secondary"
                    className="font-heading font-semibold shadow-red"
                    onClick={() => navigate("/lideres")}
                  >
                    Portal de Líderes
                  </Button>
                )}
                {!leaderAccess?.isLeader && (
                  <Button
                    variant="secondary"
                    className="font-heading font-semibold shadow-red"
                    onClick={() => navigate("/portal")}
                  >
                    <User className="w-4 h-4 mr-1" />
                    Meu Portal
                  </Button>
                )}
              </div>
            ) : (
              <Button
                variant="secondary"
                className="font-heading font-semibold shadow-red ml-4"
                onClick={() => navigate("/auth")}
              >
                Entrar
              </Button>
            )}
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
                
                {user ? (
                  <div className="flex flex-col gap-2 mt-2">
                    {leaderAccess?.isAdmin && (
                      <Button
                        variant="outline"
                        className="font-heading font-semibold border-primary-foreground/30 text-primary-foreground"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          navigate("/cadastros");
                        }}
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Administração
                      </Button>
                    )}
                    {leaderAccess?.isLeader && (
                      <Button
                        variant="secondary"
                        className="font-heading font-semibold shadow-red"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          navigate("/lideres");
                        }}
                      >
                        Portal de Líderes
                      </Button>
                    )}
                    {!leaderAccess?.isLeader && (
                      <Button
                        variant="secondary"
                        className="font-heading font-semibold shadow-red"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          navigate("/portal");
                        }}
                      >
                        <User className="w-4 h-4 mr-2" />
                        Meu Portal
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    className="mt-2 font-heading font-semibold shadow-red"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      navigate("/auth");
                    }}
                  >
                    Entrar
                  </Button>
                )}
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
