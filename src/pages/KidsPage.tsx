import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { differenceInYears, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  UserCheck, 
  CalendarCheck, 
  ChevronRight,
  Baby,
  BarChart3,
  UserPlus,
  Bell,
  ArrowLeft,
  Settings
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { KidsTurmaTab } from "@/components/kids/KidsTurmaTab";
import { KidsLideresTab } from "@/components/kids/KidsLideresTab";
import { KidsPresencaTab } from "@/components/kids/KidsPresencaTab";
import { KidsDashboard } from "@/components/kids/KidsDashboard";
import { KidsResponsaveisTab } from "@/components/kids/KidsResponsaveisTab";
import { KidsNotificacoesTab } from "@/components/kids/KidsNotificacoesTab";
import { KidsConfigTab } from "@/components/kids/KidsConfigTab";

interface TurmaConfig {
  id: string;
  turma: string;
  nome_exibicao: string;
  cor_hex: string;
  idade_minima: number;
  idade_maxima: number;
}

const KidsPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Buscar configuração das turmas
  const { data: turmasConfig, isLoading: loadingTurmas } = useQuery({
    queryKey: ["kids-turmas-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kids_turmas_config")
        .select("*")
        .order("idade_minima", { ascending: true });
      
      if (error) throw error;
      return data as TurmaConfig[];
    },
  });

  // Buscar membros (crianças)
  const { data: members, isLoading: loadingMembers } = useQuery({
    queryKey: ["members-kids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, birth_date, genero, whatsapp, photo_url")
        .not("birth_date", "is", null);
      
      if (error) throw error;
      return data;
    },
  });

  // Buscar novos convertidos (crianças)
  const { data: novosConvertidos, isLoading: loadingNovos } = useQuery({
    queryKey: ["novos-convertidos-kids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("novos_convertidos")
        .select("id, full_name, data_nascimento, genero, whatsapp")
        .not("data_nascimento", "is", null);
      
      if (error) throw error;
      return data;
    },
  });

  // Filtrar crianças por turma baseado na idade
  const criancasPorTurma = useMemo(() => {
    if (!turmasConfig || (!members && !novosConvertidos)) return {};

    const hoje = new Date();
    const resultado: Record<string, Array<{
      id: string;
      nome: string;
      idade: number;
      genero: string | null;
      whatsapp: string | null;
      foto: string | null;
      tipo: "membro" | "novo_convertido";
    }>> = {};

    turmasConfig.forEach((turma) => {
      resultado[turma.turma] = [];
    });

    // Processar membros
    members?.forEach((member) => {
      if (!member.birth_date) return;
      const idade = differenceInYears(hoje, parseISO(member.birth_date));
      
      const turma = turmasConfig.find(
        (t) => idade >= t.idade_minima && idade <= t.idade_maxima
      );
      
      if (turma) {
        resultado[turma.turma].push({
          id: member.id,
          nome: member.full_name,
          idade,
          genero: member.genero,
          whatsapp: member.whatsapp,
          foto: member.photo_url,
          tipo: "membro",
        });
      }
    });

    // Processar novos convertidos
    novosConvertidos?.forEach((nc) => {
      if (!nc.data_nascimento) return;
      const idade = differenceInYears(hoje, parseISO(nc.data_nascimento));
      
      const turma = turmasConfig.find(
        (t) => idade >= t.idade_minima && idade <= t.idade_maxima
      );
      
      if (turma) {
        resultado[turma.turma].push({
          id: nc.id,
          nome: nc.full_name,
          idade,
          genero: nc.genero,
          whatsapp: nc.whatsapp,
          foto: null,
          tipo: "novo_convertido",
        });
      }
    });

    // Ordenar por nome
    Object.keys(resultado).forEach((turma) => {
      resultado[turma].sort((a, b) => a.nome.localeCompare(b.nome));
    });

    return resultado;
  }, [turmasConfig, members, novosConvertidos]);

  // Totais
  const totalCriancas = useMemo(() => {
    return Object.values(criancasPorTurma).reduce(
      (acc, criancas) => acc + criancas.length,
      0
    );
  }, [criancasPorTurma]);

  const isLoading = loadingTurmas || loadingMembers || loadingNovos;

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/dashboard")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Baby className="h-8 w-8 text-primary" />
              Ministério Kids
            </h1>
            <p className="text-muted-foreground">
              Gestão do ministério infantil por turmas e faixas etárias
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {totalCriancas} crianças cadastradas
        </Badge>
      </div>

      {/* Cards de turmas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {turmasConfig?.map((turma) => (
          <Card 
            key={turma.id} 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            style={{ borderTopColor: turma.cor_hex, borderTopWidth: 4 }}
            onClick={() => setActiveTab(turma.turma)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span style={{ color: turma.cor_hex }}>{turma.nome_exibicao}</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {criancasPorTurma[turma.turma]?.length || 0}
              </div>
              <p className="text-sm text-muted-foreground">
                {turma.idade_minima} a {turma.idade_maxima} anos
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          {turmasConfig?.map((turma) => (
            <TabsTrigger 
              key={turma.turma} 
              value={turma.turma}
              className="flex items-center gap-2"
              style={{ 
                borderBottom: activeTab === turma.turma ? `3px solid ${turma.cor_hex}` : undefined 
              }}
            >
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: turma.cor_hex }} 
              />
              {turma.nome_exibicao}
            </TabsTrigger>
          ))}
          <TabsTrigger value="lideres" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Líderes
          </TabsTrigger>
          <TabsTrigger value="responsaveis" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Responsáveis
          </TabsTrigger>
          <TabsTrigger value="presenca" className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4" />
            Presença
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        {/* Dashboard */}
        <TabsContent value="dashboard">
          <KidsDashboard 
            turmasConfig={turmasConfig || []} 
            criancasPorTurma={criancasPorTurma} 
          />
        </TabsContent>

        {/* Tabs de cada turma */}
        {turmasConfig?.map((turma) => (
          <TabsContent key={turma.turma} value={turma.turma}>
            <KidsTurmaTab 
              turma={turma} 
              criancas={criancasPorTurma[turma.turma] || []} 
            />
          </TabsContent>
        ))}

        {/* Líderes */}
        <TabsContent value="lideres">
          <KidsLideresTab turmasConfig={turmasConfig || []} />
        </TabsContent>

        {/* Responsáveis */}
        <TabsContent value="responsaveis">
          <KidsResponsaveisTab 
            turmasConfig={turmasConfig || []} 
            criancasPorTurma={criancasPorTurma}
          />
        </TabsContent>

        {/* Presença */}
        <TabsContent value="presenca">
          <KidsPresencaTab 
            turmasConfig={turmasConfig || []} 
            criancasPorTurma={criancasPorTurma}
          />
        </TabsContent>

        {/* Notificações */}
        <TabsContent value="notificacoes">
          <KidsNotificacoesTab />
        </TabsContent>

        {/* Configurações */}
        <TabsContent value="config">
          <KidsConfigTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default KidsPage;
