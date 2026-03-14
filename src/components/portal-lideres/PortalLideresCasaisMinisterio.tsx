import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Loader2,
  HeartHandshake,
  CalendarDays,
  ClipboardList,
  Award,
  BookOpen,
  Share2,
  ArrowLeft,
} from "lucide-react";
import { PortalAccess } from "@/hooks/useMemberPortal";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CasaisTurmasTab } from "@/components/casais/CasaisTurmasTab";
import { CasaisCasaisTab } from "@/components/casais/CasaisCasaisTab";
import { CasaisInscricoesTab } from "@/components/casais/CasaisInscricoesTab";
import { CasaisProfessoresTab } from "@/components/casais/CasaisProfessoresTab";
import { CasaisMateriaisTab } from "@/components/casais/CasaisMateriaisTab";
import { CompartilharInscricaoCasaisDialog } from "@/components/casais/CompartilharInscricaoCasaisDialog";

interface PortalLideresCasaisMinisterioProps {
  ministryId: string;
  ministryName: string;
  isLider: boolean;
  canEdit: boolean;
  portalAccess: PortalAccess | null;
}

interface MenuCard {
  id: string;
  label: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
}

const menuCards: MenuCard[] = [
  {
    id: "turmas",
    label: "Turmas",
    subtitle: "Gerenciar turmas",
    icon: CalendarDays,
    color: "hsl(200, 70%, 50%)",
  },
  {
    id: "casais",
    label: "Casais",
    subtitle: "Lista de casais",
    icon: Users,
    color: "hsl(350, 70%, 50%)",
  },
  {
    id: "inscricoes",
    label: "Inscrições",
    subtitle: "Fichas recebidas",
    icon: ClipboardList,
    color: "hsl(160, 60%, 45%)",
  },
  {
    id: "professores",
    label: "Professores",
    subtitle: "Corpo docente",
    icon: Award,
    color: "hsl(30, 95%, 50%)",
  },
  {
    id: "materiais",
    label: "Materiais",
    subtitle: "Apostilas e recursos",
    icon: BookOpen,
    color: "hsl(280, 70%, 55%)",
  },
  {
    id: "link-inscricao",
    label: "Link Inscrição",
    subtitle: "Compartilhar ficha",
    icon: Share2,
    color: "hsl(220, 60%, 50%)",
  },
];

export const PortalLideresCasaisMinisterio = ({
  ministryId,
  ministryName,
  isLider,
  canEdit,
  portalAccess,
}: PortalLideresCasaisMinisterioProps) => {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [shareCasaisOpen, setShareCasaisOpen] = useState(false);

  // Stats
  const { data: stats } = useQuery({
    queryKey: ["portal-casais-stats"],
    queryFn: async () => {
      const [turmas, casais, inscricoes, professores] = await Promise.all([
        supabase.from("casais_turmas").select("id", { count: "exact", head: true }).eq("ativo", true),
        supabase.from("casais_inscritos").select("id", { count: "exact", head: true }),
        supabase.from("casais_inscritos").select("id", { count: "exact", head: true }).eq("status", "pendente"),
        supabase.from("casais_professores").select("id", { count: "exact", head: true }).eq("ativo", true),
      ]);
      return {
        turmas: turmas.count || 0,
        casais: casais.count || 0,
        inscricoesPendentes: inscricoes.count || 0,
        professores: professores.count || 0,
      };
    },
  });

  const handleCardClick = (id: string) => {
    if (id === "link-inscricao") {
      setShareCasaisOpen(true);
    } else {
      setActiveTab(id);
    }
  };

  const getBadge = (id: string): string | number | undefined => {
    if (!stats) return undefined;
    if (id === "turmas") return stats.turmas;
    if (id === "casais") return stats.casais;
    if (id === "inscricoes" && stats.inscricoesPendentes > 0) return stats.inscricoesPendentes;
    if (id === "professores") return stats.professores;
    return undefined;
  };

  if (activeTab) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setActiveTab(null)} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>

        {activeTab === "turmas" && <CasaisTurmasTab />}
        {activeTab === "casais" && <CasaisCasaisTab />}
        {activeTab === "inscricoes" && <CasaisInscricoesTab />}
        {activeTab === "professores" && <CasaisProfessoresTab />}
        {activeTab === "materiais" && <CasaisMateriaisTab />}

        <CompartilharInscricaoCasaisDialog open={shareCasaisOpen} onOpenChange={setShareCasaisOpen} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
          <HeartHandshake className="w-6 h-6 text-destructive" />
        </div>
        <div>
          <h2 className="font-heading font-bold text-xl">{ministryName}</h2>
          <div className="flex items-center gap-2">
            {isLider && <Badge variant="secondary">Líder</Badge>}
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {menuCards.map((card) => {
          const Icon = card.icon;
          const badge = getBadge(card.id);
          return (
            <Card
              key={card.id}
              className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] relative overflow-hidden"
              onClick={() => handleCardClick(card.id)}
            >
              <CardContent className="pt-5 pb-4 flex flex-col items-center text-center gap-2">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-1"
                  style={{ backgroundColor: card.color.replace("hsl(", "hsla(").replace(")", ", 0.15)") }}
                >
                  <Icon className="w-6 h-6" style={{ color: card.color }} />
                </div>
                <p className="font-semibold text-sm">{card.label}</p>
                <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                {badge !== undefined && (
                  <Badge
                    variant={card.id === "inscricoes" ? "destructive" : "secondary"}
                    className="absolute top-2 right-2 text-xs"
                  >
                    {badge}
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <CompartilharInscricaoCasaisDialog open={shareCasaisOpen} onOpenChange={setShareCasaisOpen} />
    </div>
  );
};
