import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lightbulb, Bug, Rocket } from "lucide-react";
import SistemaSolicitacoesList from "./SistemaSolicitacoesList";

const SistemaTab = () => {
  const [activeTab, setActiveTab] = useState("melhoria");

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-card border border-border h-10">
          <TabsTrigger
            value="melhoria"
            className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground flex items-center gap-2"
          >
            <Lightbulb className="w-4 h-4" />
            <span className="hidden sm:inline">Melhorias</span>
          </TabsTrigger>
          <TabsTrigger
            value="erro"
            className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground flex items-center gap-2"
          >
            <Bug className="w-4 h-4" />
            <span className="hidden sm:inline">Erros</span>
          </TabsTrigger>
          <TabsTrigger
            value="implementacao"
            className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground flex items-center gap-2"
          >
            <Rocket className="w-4 h-4" />
            <span className="hidden sm:inline">Implementação</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="melhoria">
          <SistemaSolicitacoesList tipo="melhoria" />
        </TabsContent>
        <TabsContent value="erro">
          <SistemaSolicitacoesList tipo="erro" />
        </TabsContent>
        <TabsContent value="implementacao">
          <SistemaSolicitacoesList tipo="implementacao" />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SistemaTab;
