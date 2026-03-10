import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { differenceInYears } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
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
  BarChart3,
  Bell,
  ArrowLeft,
  Settings,
  CalendarDays,
  FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { KidsTurmaTab } from "@/components/kids/KidsTurmaTab";
import { KidsLideresTab } from "@/components/kids/KidsLideresTab";
import { KidsPresencaTab } from "@/components/kids/KidsPresencaTab";
import { KidsDashboard } from "@/components/kids/KidsDashboard";
import { KidsEscalasTab } from "@/components/kids/KidsEscalasTab";
import { KidsNotificacoesTab } from "@/components/kids/KidsNotificacoesTab";
import { KidsConfigTab } from "@/components/kids/KidsConfigTab";
import { CriancaVisitanteFormDialog } from "@/components/kids/CriancaVisitanteFormDialog";
import { ExportButton } from "@/components/ui/export-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { savePDF } from "@/lib/export";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TurmaConfig {
  id: string;
  turma: string;
  nome_exibicao: string;
  cor_hex: string;
  idade_minima: number;
  idade_maxima: number;
}

interface Responsavel {
  id: string;
  full_name: string;
  whatsapp: string | null;
}

const KidsPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [chamadaDialogOpen, setChamadaDialogOpen] = useState(false);
  const [chamadaTurma, setChamadaTurma] = useState("");

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
        .select("id, full_name, birth_date, genero, whatsapp, photo_url, kids_numero, responsavel_id")
        .not("birth_date", "is", null);
      
      if (error) throw error;
      return data;
    },
  });

  // Buscar novos convertidos (crianças) com responsáveis vinculados
  const { data: novosConvertidos, isLoading: loadingNovos } = useQuery({
    queryKey: ["novos-convertidos-kids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("novos_convertidos")
        .select(`
          id, 
          full_name, 
          data_nascimento, 
          genero, 
          whatsapp,
          photo_url,
          kids_numero,
          membro_vinculado_id,
          responsavel_nome,
          responsavel_whatsapp,
          membro_vinculado:members!novos_convertidos_membro_vinculado_id_fkey(
            id,
            full_name,
            whatsapp
          )
        `)
        .not("data_nascimento", "is", null);
      
      if (error) throw error;
      return data;
    },
  });

  // Buscar responsáveis via kids_responsaveis
  const { data: responsaveis } = useQuery({
    queryKey: ["kids-responsaveis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kids_responsaveis")
        .select(`
          crianca_novo_convertido_id,
          crianca_member_id,
          responsavel_member_id,
          responsavel:members!kids_responsaveis_responsavel_member_id_fkey(
            id,
            full_name,
            whatsapp
          )
        `)
        .eq("principal", true);
      
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
      responsavelNome: string | null;
      responsavelWhatsapp: string | null;
      kidsNumero: number | null;
    }>> = {};

    turmasConfig.forEach((turma) => {
      resultado[turma.turma] = [];
    });

    // Processar membros
    members?.forEach((member) => {
      if (!member.birth_date) return;
      const idade = differenceInYears(hoje, parseLocalDate(member.birth_date));
      
      const turma = turmasConfig.find(
        (t) => idade >= t.idade_minima && idade <= t.idade_maxima
      );
      
      if (turma) {
        // Buscar responsável via kids_responsaveis
        const respVinculo = responsaveis?.find(r => r.crianca_member_id === member.id);
        const resp = respVinculo?.responsavel as Responsavel | null;
        
        // Fallback: usar responsavel_id do cadastro do membro
        let responsavelNome = resp?.full_name || null;
        let responsavelWhatsapp = resp?.whatsapp || null;
        if (!responsavelNome && member.responsavel_id) {
          const respMember = members?.find(m => m.id === member.responsavel_id);
          if (respMember) {
            responsavelNome = respMember.full_name;
            responsavelWhatsapp = respMember.whatsapp;
          }
        }
        
        resultado[turma.turma].push({
          id: member.id,
          nome: member.full_name,
          idade,
          genero: member.genero,
          whatsapp: member.whatsapp,
          foto: member.photo_url,
          tipo: "membro",
          responsavelNome,
          responsavelWhatsapp,
          kidsNumero: member.kids_numero || null,
        });
      }
    });

    // Processar novos convertidos
    novosConvertidos?.forEach((nc) => {
      if (!nc.data_nascimento) return;
      const idade = differenceInYears(hoje, parseLocalDate(nc.data_nascimento));
      
      const turma = turmasConfig.find(
        (t) => idade >= t.idade_minima && idade <= t.idade_maxima
      );
      
      if (turma) {
        // Prioridade: 1) membro_vinculado, 2) kids_responsaveis, 3) campos diretos
        const membroVinculado = nc.membro_vinculado as Responsavel | null;
        const respVinculo = responsaveis?.find(r => r.crianca_novo_convertido_id === nc.id);
        const respKids = respVinculo?.responsavel as Responsavel | null;
        
        // Usar dados do membro vinculado ou kids_responsaveis, ou campos diretos
        const responsavelNome = membroVinculado?.full_name || respKids?.full_name || nc.responsavel_nome || null;
        const responsavelWhatsapp = membroVinculado?.whatsapp || respKids?.whatsapp || nc.responsavel_whatsapp || null;
        
        resultado[turma.turma].push({
          id: nc.id,
          nome: nc.full_name,
          idade,
          genero: nc.genero,
          whatsapp: nc.whatsapp,
          foto: nc.photo_url || null,
          tipo: "novo_convertido",
          responsavelNome,
          responsavelWhatsapp,
          kidsNumero: nc.kids_numero || null,
        });
      }
    });

    // Ordenar por nome
    Object.keys(resultado).forEach((turma) => {
      resultado[turma].sort((a, b) => a.nome.localeCompare(b.nome));
    });

    return resultado;
  }, [turmasConfig, members, novosConvertidos, responsaveis]);

  // Totais
  const totalCriancas = useMemo(() => {
    return Object.values(criancasPorTurma).reduce(
      (acc, criancas) => acc + criancas.length,
      0
    );
  }, [criancasPorTurma]);

  // Dados para exportação geral (todas as turmas)
  const allCriancasExport = useMemo(() => {
    if (!turmasConfig) return [];
    const result: Array<{ turma: string } & (typeof criancasPorTurma)[string][number]> = [];
    turmasConfig.forEach((t) => {
      (criancasPorTurma[t.turma] || []).forEach((c) => {
        result.push({ ...c, turma: t.nome_exibicao });
      });
    });
    return result.sort((a, b) => a.turma.localeCompare(b.turma) || a.nome.localeCompare(b.nome));
  }, [turmasConfig, criancasPorTurma]);

  const isLoading = loadingTurmas || loadingMembers || loadingNovos;

  const generateChamadaPDF = (turmaKey: string) => {
    const turma = turmasConfig?.find((t) => t.turma === turmaKey);
    if (!turma) return;
    const criancas = criancasPorTurma[turmaKey] || [];
    if (criancas.length === 0) {
      toast({ title: "Nenhuma criança nesta turma", variant: "destructive" });
      return;
    }

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    // Header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`Lista de Chamada — ${turma.nome_exibicao}`, 14, 18);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Faixa etária: ${turma.idade_minima} a ${turma.idade_maxima} anos  •  Total: ${criancas.length} crianças`, 14, 25);
    doc.text(`Data: ____/____/________`, 14, 32);

    autoTable(doc, {
      startY: 38,
      head: [["Nº", "Nome", "Idade", "Responsável", "Assinatura"]],
      body: criancas.map((c, i) => [
        String(i + 1),
        c.nome,
        String(c.idade),
        c.responsavelNome || "—",
        "",
      ]),
      styles: { fontSize: 9, cellPadding: 3, overflow: "ellipsize" },
      headStyles: { fillColor: [100, 100, 100], fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 70 },
        2: { cellWidth: 14, halign: "center" },
        3: { cellWidth: 60 },
        4: { cellWidth: 50 },
      },
      theme: "grid",
    });

    savePDF(doc, `chamada_${turma.nome_exibicao.replace(/\s/g, "_")}.pdf`);
    setChamadaDialogOpen(false);
  };

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
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-cyan-100">
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/app")}
              className="text-gray-600 hover:text-gray-800 bg-white/50 hover:bg-white/80"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <span className="text-4xl">🎈</span>
                <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
                  Ministério Kids
                </span>
              </h1>
              <p className="text-gray-600">
                Gestão do ministério infantil por turmas e faixas etárias
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CriancaVisitanteFormDialog />
            <ExportButton
              data={allCriancasExport}
              columns={[
                { header: "Turma", accessor: "turma" },
                { header: "Nome", accessor: "nome" },
                { header: "Idade", accessor: (r) => `${r.idade} anos` },
                { header: "Gênero", accessor: (r) => r.genero === "masculino" ? "Menino" : r.genero === "feminino" ? "Menina" : "-" },
                { header: "Responsável", accessor: "responsavelNome" },
                { header: "WhatsApp Responsável", accessor: "responsavelWhatsapp" },
                { header: "Status", accessor: (r) => r.tipo === "membro" ? "Membro" : "Visitante" },
              ]}
              filename="kids-relatorio-geral"
              title="Ministério Kids - Relatório Geral"
              sheetName="Todas as Turmas"
            />
            <Badge className="text-lg px-4 py-2 bg-white/80 text-gray-700 hover:bg-white shadow-sm">
              🌟 {totalCriancas} crianças cadastradas
            </Badge>
          </div>
        </div>

        {/* Cards de turmas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {turmasConfig?.map((turma) => (
            <Card 
              key={turma.id} 
              className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 bg-white/90 backdrop-blur-sm"
              style={{ borderTopColor: turma.cor_hex, borderTopWidth: 4 }}
              onClick={() => setActiveTab(turma.turma)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span style={{ color: turma.cor_hex }}>{turma.nome_exibicao}</span>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-800">
                  {criancasPorTurma[turma.turma]?.length || 0}
                </div>
                <p className="text-sm text-gray-500">
                  {turma.idade_minima} a {turma.idade_maxima} anos
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1 bg-white/80 backdrop-blur-sm p-2 rounded-xl">
            <TabsTrigger value="dashboard" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="lideres" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
              <UserCheck className="h-4 w-4" />
              Equipe
            </TabsTrigger>
            <TabsTrigger value="presenca" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
              <CalendarCheck className="h-4 w-4" />
              Presença
            </TabsTrigger>
            <TabsTrigger value="escalas" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
              <CalendarDays className="h-4 w-4" />
              Escalas
            </TabsTrigger>
            <TabsTrigger value="notificacoes" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
              <Bell className="h-4 w-4" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 h-9"
              onClick={() => setChamadaDialogOpen(true)}
            >
              <FileText className="h-4 w-4" />
              Chamada PDF
            </Button>
          </TabsList>

          <div className="mt-4 bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-sm">

        {/* Dashboard */}
        <TabsContent value="dashboard">
          <KidsDashboard 
            turmasConfig={turmasConfig || []} 
            criancasPorTurma={criancasPorTurma} 
          />
        </TabsContent>

        {/* Tabs de cada turma (acessadas pelos cards) */}
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

        {/* Escalas */}
        <TabsContent value="escalas">
          <KidsEscalasTab turmasConfig={turmasConfig || []} />
        </TabsContent>

          {/* Configurações */}
          <TabsContent value="config">
            <KidsConfigTab />
          </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Dialog para selecionar turma e gerar chamada PDF */}
      <Dialog open={chamadaDialogOpen} onOpenChange={setChamadaDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar Lista de Chamada</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Selecione a turma (PG)</label>
              <Select value={chamadaTurma} onValueChange={setChamadaTurma}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma turma..." />
                </SelectTrigger>
                <SelectContent>
                  {turmasConfig?.map((t) => (
                    <SelectItem key={t.turma} value={t.turma}>
                      {t.nome_exibicao} ({criancasPorTurma[t.turma]?.length || 0} crianças)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={!chamadaTurma}
              onClick={() => generateChamadaPDF(chamadaTurma)}
            >
              <FileText className="w-4 h-4 mr-2" />
              Gerar PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KidsPage;
