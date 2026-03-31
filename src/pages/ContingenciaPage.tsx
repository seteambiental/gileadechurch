import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserAccess } from "@/hooks/useUserAccess";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Shield, Home } from "lucide-react";
import ContingenciaDashboard from "@/components/contingencia/ContingenciaDashboard";
import ContingenciaBackupsTab from "@/components/contingencia/ContingenciaBackupsTab";
import ContingenciaVersoesTab from "@/components/contingencia/ContingenciaVersoesTab";
import ContingenciaIncidentesTab from "@/components/contingencia/ContingenciaIncidentesTab";
import ContingenciaProcedimentosTab from "@/components/contingencia/ContingenciaProcedimentosTab";
import { useEffect } from "react";

export default function ContingenciaPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading } = useUserAccess(user?.id);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/app");
    }
  }, [user, isAdmin, loading, navigate]);

  if (loading) return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate("/app")}>
            <Home className="h-5 w-5" />
          </Button>
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-bold">Contingência & Recuperação</h1>
            <p className="text-xs text-muted-foreground">Gestão de backups, versões, incidentes e procedimentos</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="dashboard">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="backups">Backups</TabsTrigger>
            <TabsTrigger value="versoes">Versões</TabsTrigger>
            <TabsTrigger value="incidentes">Incidentes</TabsTrigger>
            <TabsTrigger value="procedimentos">Procedimentos</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <ContingenciaDashboard />
          </TabsContent>
          <TabsContent value="backups">
            <ContingenciaBackupsTab />
          </TabsContent>
          <TabsContent value="versoes">
            <ContingenciaVersoesTab />
          </TabsContent>
          <TabsContent value="incidentes">
            <ContingenciaIncidentesTab />
          </TabsContent>
          <TabsContent value="procedimentos">
            <ContingenciaProcedimentosTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
