import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, LayoutDashboard, Users, Layers, DollarSign, Award, ClipboardList, GraduationCap } from "lucide-react";
import { JiuJitsuDashboard } from "@/components/jiujitsu/JiuJitsuDashboard";
import { JiuJitsuAlunosTab } from "@/components/jiujitsu/JiuJitsuAlunosTab";
import { JiuJitsuTurmasTab } from "@/components/jiujitsu/JiuJitsuTurmasTab";
import { JiuJitsuProfessoresTab } from "@/components/jiujitsu/JiuJitsuProfessoresTab";
import { JiuJitsuFinanceiroTab } from "@/components/jiujitsu/JiuJitsuFinanceiroTab";
import { JiuJitsuGraduacaoTab } from "@/components/jiujitsu/JiuJitsuGraduacaoTab";
import { JiuJitsuInscricoesTab } from "@/components/jiujitsu/JiuJitsuInscricoesTab";

export default function JiuJitsuPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("inicio");

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate("/app")}>
            <Home className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">🥋 Ministério de Jiu-Jitsu</h1>
            <p className="text-sm text-muted-foreground">Gestão de alunos, turmas e graduações</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full flex flex-wrap h-auto gap-1">
            <TabsTrigger value="inicio" className="flex items-center gap-1.5">
              <LayoutDashboard className="h-4 w-4" /> Início
            </TabsTrigger>
            <TabsTrigger value="alunos" className="flex items-center gap-1.5">
              <Users className="h-4 w-4" /> Alunos
            </TabsTrigger>
            <TabsTrigger value="turmas" className="flex items-center gap-1.5">
              <Layers className="h-4 w-4" /> Turmas
            </TabsTrigger>
            <TabsTrigger value="professores" className="flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4" /> Professores
            </TabsTrigger>
            <TabsTrigger value="inscricoes" className="flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4" /> Inscrições
            </TabsTrigger>
            <TabsTrigger value="financeiro" className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4" /> Financeiro
            </TabsTrigger>
            <TabsTrigger value="graduacao" className="flex items-center gap-1.5">
              <Award className="h-4 w-4" /> Graduação
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inicio"><JiuJitsuDashboard /></TabsContent>
          <TabsContent value="alunos"><JiuJitsuAlunosTab /></TabsContent>
          <TabsContent value="turmas"><JiuJitsuTurmasTab /></TabsContent>
          <TabsContent value="professores"><JiuJitsuProfessoresTab /></TabsContent>
          <TabsContent value="inscricoes"><JiuJitsuInscricoesTab /></TabsContent>
          <TabsContent value="financeiro"><JiuJitsuFinanceiroTab /></TabsContent>
          <TabsContent value="graduacao"><JiuJitsuGraduacaoTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
