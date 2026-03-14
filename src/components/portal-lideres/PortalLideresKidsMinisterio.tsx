import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { differenceInYears } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { QrScannerDialog } from "@/components/kids/QrScannerDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  Bell,
  Settings,
  CalendarDays,
  QrCode,
  CalendarCheck,
  UserCheck,
  Users,
  ArrowLeft,
  Baby,
} from "lucide-react";
import { PortalAccess } from "@/hooks/useMemberPortal";

// Kids components
import { KidsTurmaTab } from "@/components/kids/KidsTurmaTab";
import { KidsLideresTab } from "@/components/kids/KidsLideresTab";
import { KidsPresencaTab } from "@/components/kids/KidsPresencaTab";
import { KidsDashboard } from "@/components/kids/KidsDashboard";
import { KidsEscalasTab } from "@/components/kids/KidsEscalasTab";
import { KidsNotificacoesTab } from "@/components/kids/KidsNotificacoesTab";
import { KidsConfigTab } from "@/components/kids/KidsConfigTab";
import { KidsCheckinTab } from "@/components/kids/KidsCheckinTab";
import { KidsResponsaveisTab } from "@/components/kids/KidsResponsaveisTab";

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

type KidsRole = "coordenador" | "professor" | "monitor" | null;

interface Props {
  ministryId: string;
  ministryName: string;
  isLider: boolean;
  canEdit: boolean;
  portalAccess: PortalAccess | null;
  memberId: string;
  onSubNavChange?: (backFn: (() => void) | null) => void;
}

export const PortalLideresKidsMinisterio = ({
  ministryId,
  ministryName,
  isLider,
  canEdit,
  portalAccess,
  memberId,
}: Props) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Detect kids role for current member
  const { data: kidsRole } = useQuery({
    queryKey: ["portal-kids-role", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kids_lideres")
        .select("funcao")
        .eq("member_id", memberId)
        .eq("ativo", true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data?.funcao as KidsRole) || null;
    },
    enabled: !!memberId,
  });

  // Full access for pastors/admins
  const hasFullAccess =
    portalAccess?.role === "pastor_geral" ||
    portalAccess?.role === "pastor_auxiliar" ||
    isLider;

  const effectiveRole: KidsRole = hasFullAccess ? "coordenador" : kidsRole;

  // Permissions
  const canManage = effectiveRole === "coordenador"; // CRUD completo
  const canAdd = effectiveRole === "coordenador" || effectiveRole === "professor";
  const canView = !!effectiveRole; // todos podem visualizar

  // Fetch turmas config
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

  // Fetch members (children)
  const { data: members, isLoading: loadingMembers } = useQuery({
    queryKey: ["members-kids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, birth_date, genero, whatsapp, photo_url, kids_numero, responsavel_id, kids_turma_override")
        .not("birth_date", "is", null);
      if (error) throw error;
      return data;
    },
  });

  // Fetch novos convertidos (children)
  const { data: novosConvertidos, isLoading: loadingNovos } = useQuery({
    queryKey: ["novos-convertidos-kids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("novos_convertidos")
        .select(`
          id, full_name, data_nascimento, genero, whatsapp, photo_url, kids_numero,
          membro_vinculado_id, responsavel_nome, responsavel_whatsapp,
          membro_vinculado:members!novos_convertidos_membro_vinculado_id_fkey(id, full_name, whatsapp)
        `)
        .not("data_nascimento", "is", null);
      if (error) throw error;
      return data;
    },
  });

  // Fetch responsáveis
  const { data: responsaveis } = useQuery({
    queryKey: ["kids-responsaveis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kids_responsaveis")
        .select(`
          crianca_novo_convertido_id, crianca_member_id, responsavel_member_id,
          responsavel:members!kids_responsaveis_responsavel_member_id_fkey(id, full_name, whatsapp)
        `)
        .eq("principal", true);
      if (error) throw error;
      return data;
    },
  });



  // Process children by turma
  const criancasPorTurma = useMemo(() => {
    if (!turmasConfig || (!members && !novosConvertidos)) return {};
    const hoje = new Date();
    const resultado: Record<string, Array<{
      id: string; nome: string; idade: number; genero: string | null;
      whatsapp: string | null; foto: string | null; tipo: "membro" | "novo_convertido";
      responsavelNome: string | null; responsavelWhatsapp: string | null; kidsNumero: number | null;
    }>> = {};

    turmasConfig.forEach((t) => { resultado[t.turma] = []; });

    members?.forEach((member) => {
      if (!member.birth_date) return;
      const idade = differenceInYears(hoje, parseLocalDate(member.birth_date));
      const override = (member as Record<string, unknown>).kids_turma_override as string | null;
      const turma = override
        ? turmasConfig.find((t) => t.turma === override)
        : turmasConfig.find((t) => idade >= t.idade_minima && idade <= t.idade_maxima);
      if (turma) {
        const respVinculo = responsaveis?.find(r => r.crianca_member_id === member.id);
        const resp = respVinculo?.responsavel as Responsavel | null;
        let responsavelNome = resp?.full_name || null;
        let responsavelWhatsapp = resp?.whatsapp || null;
        if (!responsavelNome && member.responsavel_id) {
          const respMember = members?.find(m => m.id === member.responsavel_id);
          if (respMember) { responsavelNome = respMember.full_name; responsavelWhatsapp = respMember.whatsapp; }
        }
        resultado[turma.turma].push({
          id: member.id, nome: member.full_name, idade, genero: member.genero,
          whatsapp: member.whatsapp, foto: member.photo_url, tipo: "membro",
          responsavelNome, responsavelWhatsapp, kidsNumero: member.kids_numero || null,
        });
      }
    });

    novosConvertidos?.forEach((nc) => {
      if (!nc.data_nascimento) return;
      const idade = differenceInYears(hoje, parseLocalDate(nc.data_nascimento));
      const override = (nc as Record<string, unknown>).kids_turma_override as string | null;
      const turma = override
        ? turmasConfig.find((t) => t.turma === override)
        : turmasConfig.find((t) => idade >= t.idade_minima && idade <= t.idade_maxima);
      if (turma) {
        const membroVinculado = nc.membro_vinculado as Responsavel | null;
        const respVinculo = responsaveis?.find(r => r.crianca_novo_convertido_id === nc.id);
        const respKids = respVinculo?.responsavel as Responsavel | null;
        resultado[turma.turma].push({
          id: nc.id, nome: nc.full_name, idade, genero: nc.genero,
          whatsapp: nc.whatsapp, foto: nc.photo_url || null, tipo: "novo_convertido",
          responsavelNome: membroVinculado?.full_name || respKids?.full_name || nc.responsavel_nome || null,
          responsavelWhatsapp: membroVinculado?.whatsapp || respKids?.whatsapp || nc.responsavel_whatsapp || null,
          kidsNumero: nc.kids_numero || null,
        });
      }
    });

    Object.keys(resultado).forEach((t) => resultado[t].sort((a, b) => a.nome.localeCompare(b.nome)));
    return resultado;
  }, [turmasConfig, members, novosConvertidos, responsaveis]);

  const totalCriancas = useMemo(() =>
    Object.values(criancasPorTurma).reduce((acc, c) => acc + c.length, 0), [criancasPorTurma]);

  const isLoading = loadingTurmas || loadingMembers || loadingNovos;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  // Menu items for card navigation
  interface MenuItem {
    id: string;
    label: string;
    subtitle: string;
    icon: React.ElementType;
    color: string;
    badge?: string | number;
    visible: boolean;
  }

  const menuItems: MenuItem[] = [
    {
      id: "dashboard", label: "Dashboard", subtitle: "Visão geral",
      icon: BarChart3, color: "hsl(280, 70%, 55%)", visible: canView,
    },
    {
      id: "checkin", label: "Check-in", subtitle: "Check-me / Check-in",
      icon: QrCode, color: "hsl(200, 80%, 50%)", visible: canView,
    },
    {
      id: "presenca", label: "Presença", subtitle: "Chamada e histórico",
      icon: CalendarCheck, color: "hsl(160, 60%, 45%)", visible: canView,
    },
    {
      id: "escalas", label: "Escalas", subtitle: "Escalas da equipe",
      icon: CalendarDays, color: "hsl(30, 95%, 50%)", visible: canView,
    },
    {
      id: "equipe", label: "Equipe", subtitle: `${effectiveRole === "coordenador" ? "Gerenciar" : "Visualizar"} equipe`,
      icon: UserCheck, color: "hsl(350, 70%, 50%)", visible: canView,
    },
    {
      id: "responsaveis", label: "Responsáveis", subtitle: "Pais e responsáveis",
      icon: Users, color: "hsl(220, 60%, 50%)", visible: canView,
    },
    {
      id: "notificacoes", label: "Notificações", subtitle: "Avisos e lembretes",
      icon: Bell, color: "hsl(340, 75%, 55%)", visible: canView,
    },
    {
      id: "config", label: "Configurações", subtitle: "Turmas e ajustes",
      icon: Settings, color: "hsl(0, 0%, 45%)", visible: canManage,
    },
  ];

  // Add turma cards
  const turmaMenuItems: MenuItem[] = (turmasConfig || []).map((t) => ({
    id: `turma-${t.turma}`,
    label: t.nome_exibicao,
    subtitle: `${t.idade_minima}-${t.idade_maxima} anos`,
    icon: Baby,
    color: t.cor_hex,
    badge: criancasPorTurma[t.turma]?.length || 0,
    visible: canView,
  }));

  const visibleMenuItems = menuItems.filter((m) => m.visible);

  // Render section content
  const renderSection = () => {
    if (!activeSection) return null;

    // Check turma sections
    const turmaMatch = activeSection.match(/^turma-(.+)$/);
    if (turmaMatch) {
      const turmaKey = turmaMatch[1];
      const turma = turmasConfig?.find((t) => t.turma === turmaKey);
      if (turma) {
        return (
          <KidsTurmaTab
            turma={turma}
            criancas={criancasPorTurma[turmaKey] || []}
            turmasConfig={turmasConfig || []}
          />
        );
      }
    }

    switch (activeSection) {
      case "dashboard":
        return <KidsDashboard turmasConfig={turmasConfig || []} criancasPorTurma={criancasPorTurma} />;
      case "checkin":
        return <KidsCheckinTab turmasConfig={turmasConfig || []} />;
      case "presenca":
        return <KidsPresencaTab turmasConfig={turmasConfig || []} criancasPorTurma={criancasPorTurma} />;
      case "escalas":
        return <KidsEscalasTab turmasConfig={turmasConfig || []} />;
      case "equipe":
        return <KidsLideresTab turmasConfig={turmasConfig || []} />;
      case "responsaveis":
        return <KidsResponsaveisTab turmasConfig={turmasConfig || []} criancasPorTurma={criancasPorTurma} />;
      case "notificacoes":
        return <KidsNotificacoesTab />;
      case "config":
        return <KidsConfigTab />;
      default:
        return null;
    }
  };

  const activeSectionLabel = activeSection
    ? [...visibleMenuItems, ...turmaMenuItems].find((m) => m.id === activeSection)?.label || ""
    : "";

  if (activeSection) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setActiveSection(null)} className="-ml-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="font-heading font-bold text-lg">{activeSectionLabel}</h2>
            <p className="text-xs text-muted-foreground">PG Church Kids</p>
          </div>
        </div>
        <div className="animate-in fade-in slide-in-from-right-4 duration-200">
          {renderSection()}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-xl flex items-center gap-2">
            🎈 {ministryName}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-xs">
              {effectiveRole === "coordenador" ? "Coordenador(a)" :
               effectiveRole === "professor" ? "Professor(a)" :
               effectiveRole === "monitor" ? "Monitor(a)" : "Equipe"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              🌟 {totalCriancas} crianças
            </Badge>
          </div>
        </div>
      </div>

      {/* Quick action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          size="lg"
          className="h-16 rounded-2xl text-base font-bold shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => setScannerOpen(true)}
        >
          <QrCode className="w-6 h-6 mr-2" />
          Check-in
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-16 rounded-2xl text-base font-bold shadow-lg border-2 border-primary text-primary hover:bg-primary/10"
          onClick={() => window.open("/cadastro", "_blank")}
        >
          <Baby className="w-6 h-6 mr-2" />
          Cadastro
        </Button>
      </div>

      {/* Turmas cards - top section */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Turmas</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {turmaMenuItems.map((item) => (
            <Card
              key={item.id}
              className="cursor-pointer active:scale-[0.97] hover:shadow-md transition-all duration-150 overflow-hidden"
              style={{ borderTopColor: item.color, borderTopWidth: 3 }}
              onClick={() => setActiveSection(item.id)}
            >
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold" style={{ color: item.color }}>
                  {item.badge}
                </p>
                <p className="text-xs font-medium text-foreground">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.subtitle}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Module cards */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Módulos</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {visibleMenuItems.map((item) => (
            <Card
              key={item.id}
              className="cursor-pointer active:scale-[0.97] hover:shadow-md transition-all duration-150 border-border/60 overflow-hidden group"
              onClick={() => setActiveSection(item.id)}
            >
              <CardContent className="p-0">
                <div className="flex flex-col items-center text-center py-4 px-3 relative">
                  <div
                    className="absolute top-0 left-0 right-0 h-1 opacity-80"
                    style={{ backgroundColor: item.color }}
                  />
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${item.color}15` }}
                  >
                    <item.icon className="w-5 h-5" style={{ color: item.color }} />
                  </div>
                  <p className="text-sm font-semibold text-foreground leading-tight">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.subtitle}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* QR Scanner Dialog */}
      <QrScannerDialog
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={async (decodedText) => {
          setScannerOpen(false);
          // Extract token from URL or use raw text
          const match = decodedText.match(/\/kids\/scan\/([a-zA-Z0-9_-]+)/);
          const token = match ? match[1] : decodedText;

          try {
            // Look up checkin by token
            const { data: checkin, error: fetchError } = await supabase
              .from("kids_checkins")
              .select("*")
              .eq("token", token)
              .single();

            if (fetchError || !checkin) {
              toast({ variant: "destructive", title: "Token inválido", description: "QR code não reconhecido." });
              return;
            }

            if (!checkin.check_me_at) {
              toast({ variant: "destructive", title: "Check-me pendente", description: `${checkin.crianca_nome} ainda não fez o check-me.` });
              return;
            }

            if (checkin.check_in_at) {
              toast({ title: "Já registrado", description: `${checkin.crianca_nome} já fez check-in.` });
              return;
            }

            // Perform check-in
            const { error: updateError } = await supabase
              .from("kids_checkins")
              .update({
                check_in_at: new Date().toISOString(),
                check_in_by: memberId,
              })
              .eq("id", checkin.id);

            if (updateError) throw updateError;

            // Find turma config for color/name
            const turma = turmasConfig?.find(t => t.turma === checkin.turma);

            toast({
              title: `✅ Check-in: ${checkin.crianca_nome}`,
              description: `Entrada confirmada na turma ${turma?.nome_exibicao || checkin.turma}.`,
            });

            queryClient.invalidateQueries({ queryKey: ["kids-checkins"] });
          } catch (err: any) {
            toast({ variant: "destructive", title: "Erro no check-in", description: err.message });
          }
        }}
      />
    </div>
  );
};
