import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isAuthBypassed } from "@/lib/auth-bypass";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Loader2,
  Users,
  UserCheck,
  Home,
  Heart,
} from "lucide-react";
import logoGileade from "@/assets/logo-gileade.jpeg";
import { ConsolidacaoEventosTab } from "@/components/consolidacao/ConsolidacaoEventosTab";
import { useToast } from "@/hooks/use-toast";

const ConsolidacaoPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const bypass = isAuthBypassed();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("convertidos");

  useEffect(() => {
    if (!authLoading && !user && !bypass) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate, bypass]);

  const { data: convertidos = [], isLoading } = useQuery({
    queryKey: ["novos-convertidos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("novos_convertidos")
        .select(`*`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const convertidosConv = convertidos.filter((c) => (c as any).tipo_conversao !== "reconciliacao");
  const reconciliados = convertidos.filter((c) => (c as any).tipo_conversao === "reconciliacao");

  const pendentes = convertidosConv.filter((c) => !c.tornou_membro);
  const membros = convertidosConv.filter((c) => c.tornou_membro);

  const recPendentes = reconciliados.filter((c) => !c.tornou_membro);
  const recMembros = reconciliados.filter((c) => c.tornou_membro);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-destructive animate-spin" />
      </div>
    );
  }

  if (!user && !bypass) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoGileade} alt="Gileade" className="w-10 h-10 rounded-full object-cover shadow-red" />
            <div>
              <h1 className="font-heading font-bold text-lg text-foreground">Consolidação</h1>
              <p className="text-xs text-muted-foreground">Acompanhamento de Novos Convertidos</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/app")} className="text-muted-foreground hover:text-foreground">
              <Home className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="convertidos" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Novos Convertidos</span>
              <span className="sm:hidden">Convertidos</span>
            </TabsTrigger>
            <TabsTrigger value="eventos" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              <span>Reconciliações</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="convertidos">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card className="bg-card border-border">
                <CardContent className="pt-4 pb-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Users className="w-5 h-5 text-destructive" />
                    <p className="text-2xl font-bold text-foreground">{pendentes.length}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Em Trilho</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="pt-4 pb-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <UserCheck className="w-5 h-5 text-green-600" />
                    <p className="text-2xl font-bold text-foreground">{membros.length}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Tornaram-se Membros</p>
                </CardContent>
              </Card>
            </div>

            <ConsolidacaoEventosTab tipo="conversao" includeManual hideTitle />
          </TabsContent>

          <TabsContent value="eventos">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card className="bg-card border-border">
                <CardContent className="pt-4 pb-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Heart className="w-5 h-5 text-destructive" />
                    <p className="text-2xl font-bold text-foreground">{recPendentes.length}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Em Trilho</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="pt-4 pb-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <UserCheck className="w-5 h-5 text-green-600" />
                    <p className="text-2xl font-bold text-foreground">{recMembros.length}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Tornaram-se Membros</p>
                </CardContent>
              </Card>
            </div>

            <ConsolidacaoEventosTab tipo="reconciliacao" includeManual />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ConsolidacaoPage;
