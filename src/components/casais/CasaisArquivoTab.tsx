import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Archive, GraduationCap } from "lucide-react";
import { CasaisTurmasEncerradasTab } from "./CasaisTurmasEncerradasTab";
import { CasaisConcluidosTab } from "./CasaisConcluidosTab";

export function CasaisArquivoTab() {
  return (
    <Tabs defaultValue="turmas-encerradas" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="turmas-encerradas" className="flex items-center gap-2">
          <Archive className="w-4 h-4" />
          Turmas Encerradas
        </TabsTrigger>
        <TabsTrigger value="casais-concluidos" className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4" />
          Casais Concluídos
        </TabsTrigger>
      </TabsList>
      <TabsContent value="turmas-encerradas">
        <CasaisTurmasEncerradasTab />
      </TabsContent>
      <TabsContent value="casais-concluidos">
        <CasaisConcluidosTab />
      </TabsContent>
    </Tabs>
  );
}
