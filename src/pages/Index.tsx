import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, User, UserPlus } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AnnouncementCard from "@/components/AnnouncementCard";
import TestimonyCard from "@/components/TestimonyCard";
import PrayerRequestForm from "@/components/PrayerRequestForm";
import CellGroupCard from "@/components/CellGroupCard";
import SectionTitle from "@/components/SectionTitle";
import { Button } from "@/components/ui/button";
import { MemberRequestForm } from "@/components/MemberRequestForm";
import heroImage from "@/assets/hero-church.jpg";

const announcements = [
  {
    title: "Culto de Natal",
    description: "Celebração especial de Natal com toda a família. Venha adorar conosco e celebrar o nascimento de Jesus!",
    date: "25/12/2024",
    time: "19h",
    type: "event" as const,
  },
  {
    title: "Jejum e Oração",
    description: "Semana de consagração para buscar a Deus em oração e jejum. Participe conosco!",
    date: "06/01 a 12/01",
    time: "06h - 18h",
    type: "urgent" as const,
  },
  {
    title: "Batismo nas Águas",
    description: "Inscrições abertas para o próximo batismo. Fale com seu líder de célula.",
    date: "19/01/2025",
    type: "info" as const,
  },
];

const testimonies = [
  {
    content: "Encontrei paz e propósito na Gileade Church. A comunhão e o amor que recebi aqui mudaram minha vida completamente.",
    author: "Maria Silva",
    role: "Membro há 3 anos",
  },
  {
    content: "Minha família foi restaurada através das orações e do acompanhamento pastoral. Somos eternamente gratos!",
    author: "João Santos",
    role: "Líder de Casa Refúgio",
  },
  {
    content: "Deus me curou de uma enfermidade através da oração dos irmãos. Ele é fiel e todo poderoso!",
    author: "Ana Costa",
    role: "Membro",
  },
];

const cellGroups = [
  {
    name: "Casa Refúgio Graça",
    leader: "Pr. Carlos e Márcia",
    location: "Centro, próximo à praça principal",
    dayTime: "Terça-feira às 19h30",
    members: 15,
  },
  {
    name: "Casa Refúgio Esperança",
    leader: "Diácono Paulo e Rosa",
    location: "Bairro Jardim das Flores",
    dayTime: "Quarta-feira às 20h",
    members: 12,
  },
  {
    name: "Casa Refúgio Vitória",
    leader: "Ricardo e Fernanda",
    location: "Bairro Nova Vida",
    dayTime: "Quinta-feira às 19h30",
    members: 18,
  },
  {
    name: "Casa Refúgio Alegria",
    leader: "Marcos e Juliana",
    location: "Bairro Boa Vista",
    dayTime: "Sexta-feira às 20h",
    members: 10,
  },
];

const scheduleItems = [
  { day: "Domingo", time: "09h", event: "Culto da Família" },
  { day: "Domingo", time: "19h", event: "Culto de Celebração" },
  { day: "Quarta", time: "19h30", event: "Culto de Ensino" },
  { day: "Sexta", time: "20h", event: "Arena Jovem (Flow)" },
  { day: "Sábado", time: "16h", event: "GT - Encontro de Adolescentes" },
];

const Index = () => {
  const navigate = useNavigate();
  const [memberRequestOpen, setMemberRequestOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section
        id="inicio"
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
      >
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Gileade Church - Um lugar de cura e restauração"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-primary/70" />
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="inline-block px-4 py-2 rounded-full bg-secondary/20 border border-secondary/30 text-secondary text-sm font-medium mb-4 opacity-0 animate-fade-in">
              Bem-vindo à Gileade Church
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-bold text-primary-foreground leading-tight opacity-0 animate-fade-in stagger-1">
              Um Lugar de{" "}
              <span className="text-secondary">Cura e Restauração</span>
            </h1>
            
            <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto leading-relaxed opacity-0 animate-fade-in stagger-2">
              Venha fazer parte de uma comunidade que vive o amor de Cristo. 
              Aqui você encontra acolhimento, crescimento espiritual e propósito.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 opacity-0 animate-fade-in stagger-3">
              <Button
                size="lg"
                variant="secondary"
                className="font-heading font-semibold text-lg px-8 py-6 shadow-red animate-pulse-glow"
                onClick={() => setMemberRequestOpen(true)}
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Quero fazer parte
              </Button>
              <Button
                size="lg"
                variant="hero"
                className="font-heading font-semibold text-lg px-8 py-6"
                onClick={() => navigate("/auth")}
              >
                <LogIn className="w-5 h-5 mr-2" />
                Acessar App
              </Button>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 animate-fade-in stagger-4">
          <div className="w-6 h-10 rounded-full border-2 border-primary-foreground/30 flex items-start justify-center p-2">
            <div className="w-1.5 h-3 rounded-full bg-secondary animate-bounce" />
          </div>
        </div>
      </section>

      {/* App Access CTA Section */}
      <section id="app" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <SectionTitle
              title="Acesso ao App"
              subtitle="Área restrita para membros e líderes da Igreja Gilead"
              centered
            />
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                variant="secondary"
                className="font-heading font-semibold text-lg px-8 py-6 shadow-gold animate-pulse-gold"
                onClick={() => navigate("/auth")}
              >
                <LogIn className="w-5 h-5 mr-2" />
                Entrar no App
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="font-heading font-semibold text-lg px-8 py-6"
                onClick={() => navigate("/portal")}
              >
                <User className="w-5 h-5 mr-2" />
                Portal do Membro
              </Button>
            </div>
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
                key={announcement.title}
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
                {scheduleItems.map((item, index) => (
                  <div
                    key={`${item.day}-${item.time}`}
                    className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-secondary transition-all opacity-0 animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex-shrink-0 w-20 h-20 rounded-xl bg-gradient-dark flex flex-col items-center justify-center text-primary-foreground">
                      <span className="text-xs font-medium opacity-80">{item.day}</span>
                      <span className="font-heading font-bold text-xl">{item.time}</span>
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
                key={testimony.author}
                {...testimony}
                delay={index * 100}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Cell Groups Section */}
      <section id="casas-refugio" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <SectionTitle
            title="Casas Refúgio"
            subtitle="Encontre uma célula perto de você e cresça em comunhão"
            centered
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cellGroups.map((group, index) => (
              <CellGroupCard
                key={group.name}
                {...group}
                delay={index * 100}
              />
            ))}
          </div>

          <div className="mt-10 text-center">
            <Button
              variant="outline"
              size="lg"
              className="font-heading font-semibold"
            >
              Ver Todas as Casas Refúgio
            </Button>
          </div>
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

          <div className="max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-elegant">
            <div className="aspect-video bg-muted flex items-center justify-center">
              <div className="text-center p-8">
                <p className="text-muted-foreground mb-4">
                  Mapa em breve
                </p>
                <p className="font-heading font-semibold text-foreground">
                  Rua Exemplo, 123 - Bairro Centro
                </p>
                <p className="text-sm text-muted-foreground">
                  Cidade - Estado, CEP 00000-000
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* Modal de Solicitação de Cadastro */}
      <MemberRequestForm open={memberRequestOpen} onOpenChange={setMemberRequestOpen} />
    </div>
  );
};

export default Index;
