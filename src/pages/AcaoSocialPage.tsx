import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isAuthBypassed } from "@/lib/auth-bypass";
import { ArrowLeft, Loader2, Heart, Users, Building2, HandHeart, BarChart3, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import logoGileade from "@/assets/logo-gileade.jpeg";
import { AcaoSocialFamiliasTab } from "@/components/acao-social/AcaoSocialFamiliasTab";
import { AcaoSocialInstituicoesTab } from "@/components/acao-social/AcaoSocialInstituicoesTab";
import { AcaoSocialAjudasTab } from "@/components/acao-social/AcaoSocialAjudasTab";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const AcaoSocialPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("familias");
  const bypass = isAuthBypassed();

  // Stats
  const { data: stats } = useQuery({
    queryKey: ["acao_social_stats"],
    queryFn: async () => {
      const [familiasRes, instituicoesRes, ajudasRes] = await Promise.all([
        supabase.from("acao_social_familias").select("id", { count: "exact" }).eq("ativo", true),
        supabase.from("acao_social_instituicoes").select("id", { count: "exact" }).eq("ativo", true),
        supabase.from("acao_social_ajudas").select("id, valor, quantidade_cestas"),
      ]);

      const totalValor = ajudasRes.data?.reduce((acc, a) => acc + (a.valor || 0), 0) || 0;
      const totalCestas = ajudasRes.data?.reduce((acc, a) => acc + (a.quantidade_cestas || 0), 0) || 0;

      return {
        familias: familiasRes.count || 0,
        instituicoes: instituicoesRes.count || 0,
        ajudas: ajudasRes.data?.length || 0,
        totalValor,
        totalCestas,
      };
    },
  });

  useEffect(() => {
    if (!authLoading && !user && !bypass) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate, bypass]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-destructive animate-spin" />
      </div>
    );
  }

  if (!user && !bypass) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={logoGileade}
              alt="Gileade Church"
              className="w-10 h-10 rounded-full object-cover shadow-red"
            />
            <div>
              <h1 className="font-heading font-bold text-lg text-foreground">Ação Social</h1>
              <p className="text-xs text-muted-foreground">Ajuda comunitária</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/app")} className="text-muted-foreground hover:text-foreground">
              <Home className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/20">
                  <Users className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Famílias Ativas</p>
                  <p className="text-2xl font-bold">{stats?.familias || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Building2 className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Instituições</p>
                  <p className="text-2xl font-bold">{stats?.instituicoes || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <HandHeart className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Ajudas</p>
                  <p className="text-2xl font-bold">{stats?.ajudas || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <BarChart3 className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Cestas</p>
                  <p className="text-2xl font-bold">{stats?.totalCestas || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="familias" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Famílias</span>
            </TabsTrigger>
            <TabsTrigger value="instituicoes" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Instituições</span>
            </TabsTrigger>
            <TabsTrigger value="ajudas" className="flex items-center gap-2">
              <HandHeart className="w-4 h-4" />
              <span className="hidden sm:inline">Ajudas</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="familias">
            <AcaoSocialFamiliasTab />
          </TabsContent>

          <TabsContent value="instituicoes">
            <AcaoSocialInstituicoesTab />
          </TabsContent>

          <TabsContent value="ajudas">
            <AcaoSocialAjudasTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AcaoSocialPage;
