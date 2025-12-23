import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoGileade from "@/assets/logo-gileade.jpeg";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    { label: "App", href: "#app" },
    { label: "Contato", href: "#contato" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-card/95 backdrop-blur-md shadow-elegant py-2"
          : "bg-transparent py-4"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a href="#inicio" className="flex items-center gap-3 group">
            <img 
              src={logoGileade} 
              alt="Gileade Church" 
              className="w-12 h-12 rounded-full object-cover shadow-red"
            />
            <div className="flex flex-col">
              <span className={`font-heading font-bold text-xl tracking-tight transition-colors ${
                isScrolled ? "text-foreground" : "text-primary-foreground"
              }`}>
                Gileade
              </span>
              <span className={`text-xs font-medium -mt-1 transition-colors ${
                isScrolled ? "text-secondary" : "text-orange"
              }`}>
                Church
              </span>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all hover:bg-secondary/10 ${
                  isScrolled
                    ? "text-foreground hover:text-secondary"
                    : "text-primary-foreground/90 hover:text-primary-foreground"
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* CTA Button */}
          <div className="hidden lg:block">
            <Button
              variant="secondary"
              className="font-heading font-semibold shadow-red"
            >
              Visite-nos
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`lg:hidden p-2 rounded-lg transition-colors ${
              isScrolled ? "text-foreground" : "text-primary-foreground"
            }`}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <nav className="lg:hidden mt-4 p-4 rounded-2xl bg-card/95 backdrop-blur-md shadow-elegant-lg animate-scale-in">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-4 py-3 rounded-xl font-medium text-foreground hover:bg-secondary/10 hover:text-secondary transition-all"
                >
                  {item.label}
                </a>
              ))}
              <Button
                variant="secondary"
                className="mt-2 font-heading font-semibold shadow-red"
              >
                Visite-nos
              </Button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
