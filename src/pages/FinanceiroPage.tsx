import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserAccess } from "@/hooks/useUserAccess";
import { isAuthBypassed } from "@/lib/auth-bypass";
import ImpactoFinanceiroTab from "@/components/impacto/ImpactoFinanceiroTab";
import TeologiaFinanceiroTab from "@/components/teologia/TeologiaFinanceiroTab";
import { CasaisFinanceiroTab } from "@/components/casais/CasaisFinanceiroTab";
import { JiuJitsuFinanceiroTab } from "@/components/jiujitsu/JiuJitsuFinanceiroTab";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2, DollarSign, GraduationCap, Heart, Swords } from "lucide-react";

const FinanceiroPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAdmin } = useUserAccess(user?.id);
  const bypassed = isAuthBypassed();
  const [eventoId, setEventoId] = useState(searchParams.get("evento") || "");

  useEffect(() => {
    if (!loading && !user && !bypassed) {
      navigate("/auth");
    }
  }, [user, loading, navigate, bypassed]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-surfaceInverse text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="h-16 flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/app")}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-heading font-bold text-lg">Financeiro</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-24 pb-12">
        <Tabs defaultValue="eventos" className="w-full">
          <TabsList className="w-full justify-start mb-6 overflow-x-auto">
            <TabsTrigger value="eventos" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span>Eventos</span>
            </TabsTrigger>
            <TabsTrigger value="teologia" className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              <span>Curso de Teologia</span>
            </TabsTrigger>
            <TabsTrigger value="casais" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              <span>Curso de Casais</span>
            </TabsTrigger>
            <TabsTrigger value="jiujitsu" className="flex items-center gap-2">
              <Swords className="w-4 h-4" />
              <span>Jiu-Jitsu</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="eventos">
            <ImpactoFinanceiroTab eventoSelecionado={eventoId} onEventoChange={setEventoId} />
          </TabsContent>

          <TabsContent value="teologia">
            <TeologiaFinanceiroTab />
          </TabsContent>

          <TabsContent value="casais">
            <CasaisFinanceiroTab />
          </TabsContent>

          <TabsContent value="jiujitsu">
            <JiuJitsuFinanceiroTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default FinanceiroPage;
