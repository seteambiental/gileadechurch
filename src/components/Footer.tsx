import { Phone, Mail, MapPin, Instagram, Facebook, Youtube } from "lucide-react";
import logoGileade from "@/assets/logo-gileade.jpeg";

const Footer = () => {
  return (
    <footer id="contato" className="bg-gradient-dark text-primary-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Logo & About */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img 
                src={logoGileade} 
                alt="Gileade Church" 
                className="w-14 h-14 rounded-full object-cover shadow-red"
              />
              <div>
                <h3 className="font-heading font-bold text-xl">Gileade</h3>
                <span className="text-orange text-sm font-medium">Church</span>
              </div>
            </div>
            <p className="text-primary-foreground/80 text-sm leading-relaxed">
              Um lugar de refúgio, adoração e comunhão. Venha fazer parte da nossa família!
            </p>
          </div>

          {/* Contato */}
          <div className="space-y-4">
            <h4 className="font-heading font-bold text-lg text-secondary">Contato</h4>
            <div className="space-y-3 text-sm">
              <a href="tel:+5500000000000" className="flex items-center gap-3 text-primary-foreground/80 hover:text-secondary transition-colors">
                <Phone className="w-4 h-4" />
                <span>(00) 0000-0000</span>
              </a>
              <a href="mailto:contato@gileadechurch.com.br" className="flex items-center gap-3 text-primary-foreground/80 hover:text-secondary transition-colors">
                <Mail className="w-4 h-4" />
                <span>contato@gileadechurch.com.br</span>
              </a>
              <div className="flex items-start gap-3 text-primary-foreground/80">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Rua Exemplo, 123 - Bairro<br />Cidade - Estado</span>
              </div>
            </div>
          </div>

          {/* Horários */}
          <div className="space-y-4">
            <h4 className="font-heading font-bold text-lg text-secondary">Nossos Cultos</h4>
            <div className="space-y-3 text-sm text-primary-foreground/80">
              <div>
                <p className="font-medium text-primary-foreground">Domingo</p>
                <p>Manhã: 09h | Noite: 19h</p>
              </div>
              <div>
                <p className="font-medium text-primary-foreground">Quarta-feira</p>
                <p>Culto de Ensino: 19h30</p>
              </div>
              <div>
                <p className="font-medium text-primary-foreground">Sexta-feira</p>
                <p>Arena Jovem: 20h</p>
              </div>
            </div>
          </div>

          {/* Redes Sociais */}
          <div className="space-y-4">
            <h4 className="font-heading font-bold text-lg text-secondary">Redes Sociais</h4>
            <div className="flex gap-3">
              <a
                href="https://instagram.com/gileadechurch"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-primary-foreground/10 flex items-center justify-center hover:bg-secondary hover:text-secondary-foreground transition-all"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-xl bg-primary-foreground/10 flex items-center justify-center hover:bg-secondary hover:text-secondary-foreground transition-all"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-xl bg-primary-foreground/10 flex items-center justify-center hover:bg-secondary hover:text-secondary-foreground transition-all"
              >
                <Youtube className="w-5 h-5" />
              </a>
            </div>
            <p className="text-xs text-primary-foreground/60">
              Siga-nos para ficar por dentro de tudo!
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-primary-foreground/10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-primary-foreground/60">
          <p>© 2024 Gileade Church. Todos os direitos reservados.</p>
          <p className="flex items-center gap-2">
            Feito com <span className="text-secondary">♥</span> para a glória de Deus
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
