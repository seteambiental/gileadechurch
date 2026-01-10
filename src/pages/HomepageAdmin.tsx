import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isAuthBypassed } from "@/lib/auth-bypass";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Image, Bell, Clock, MessageSquare, Home, Settings, ImageIcon } from "lucide-react";
import logoGileade from "@/assets/logo-gileade.jpeg";
import HomepageHeroTab from "@/components/homepage-admin/HomepageHeroTab";
import HomepageAvisosTab from "@/components/homepage-admin/HomepageAvisosTab";
import HomepageProgramacaoTab from "@/components/homepage-admin/HomepageProgramacaoTab";
import HomepageTestemunhosTab from "@/components/homepage-admin/HomepageTestemunhosTab";
import HomepageCasasRefugioTab from "@/components/homepage-admin/HomepageCasasRefugioTab";
import HomepageConfigTab from "@/components/homepage-admin/HomepageConfigTab";
import HomepageLogosTab from "@/components/homepage-admin/HomepageLogosTab";

const HomepageAdmin = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("hero");
  const isBypassed = isAuthBypassed();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary" />
      </div>
    );
  }

  if (!user && !isBypassed) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/app")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <img 
              src={logoGileade} 
              alt="Gileade Church" 
              className="w-10 h-10 rounded-full object-cover shadow-red"
            />
            <div>
              <h1 className="font-heading font-bold text-lg text-foreground">
                Gerenciar Homepage
              </h1>
              <p className="text-xs text-muted-foreground">
                Configure os elementos da página inicial
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => window.open("/", "_blank")}>
            <Home className="w-4 h-4 mr-2" />
            Ver Homepage
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap gap-1 h-auto p-1 mb-6">
            <TabsTrigger value="hero" className="gap-2">
              <Image className="w-4 h-4" />
              Hero & Redes Sociais
            </TabsTrigger>
            <TabsTrigger value="logos" className="gap-2">
              <ImageIcon className="w-4 h-4" />
              Logos
            </TabsTrigger>
            <TabsTrigger value="avisos" className="gap-2">
              <Bell className="w-4 h-4" />
              Avisos
            </TabsTrigger>
            <TabsTrigger value="programacao" className="gap-2">
              <Clock className="w-4 h-4" />
              Programação
            </TabsTrigger>
            <TabsTrigger value="testemunhos" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Testemunhos
            </TabsTrigger>
            <TabsTrigger value="casas-refugio" className="gap-2">
              <Home className="w-4 h-4" />
              Casas Refúgio
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2">
              <Settings className="w-4 h-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hero">
            <HomepageHeroTab />
          </TabsContent>
          <TabsContent value="logos">
            <HomepageLogosTab />
          </TabsContent>
          <TabsContent value="avisos">
            <HomepageAvisosTab />
          </TabsContent>
          <TabsContent value="programacao">
            <HomepageProgramacaoTab />
          </TabsContent>
          <TabsContent value="testemunhos">
            <HomepageTestemunhosTab />
          </TabsContent>
          <TabsContent value="casas-refugio">
            <HomepageCasasRefugioTab />
          </TabsContent>
          <TabsContent value="config">
            <HomepageConfigTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default HomepageAdmin;
