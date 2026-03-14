import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Database, GitBranch, AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ContingenciaDashboard() {
  const { data: ultimoBackup } = useQuery({
    queryKey: ["contingencia-ultimo-backup"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contingencia_backups")
        .select("*")
        .order("data_inicio", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: ultimaVersao } = useQuery({
    queryKey: ["contingencia-ultima-versao"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contingencia_versoes")
        .select("*")
        .eq("estavel", true)
        .order("data_deploy", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: incidentesAbertos } = useQuery({
    queryKey: ["contingencia-incidentes-abertos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contingencia_incidentes")
        .select("*")
        .in("status", ["aberto", "em_andamento", "contido"])
        .order("hora_inicio", { ascending: false });
      return data || [];
    },
  });

  const { data: statsBackups } = useQuery({
    queryKey: ["contingencia-stats-backups"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contingencia_backups")
        .select("status")
        .order("data_inicio", { ascending: false })
        .limit(10);
      const total = data?.length || 0;
      const sucesso = data?.filter((b) => b.status === "sucesso").length || 0;
      return { total, sucesso, falha: total - sucesso };
    },
  });

  const severidadeColor: Record<string, string> = {
    critica: "bg-red-600 text-white",
    alta: "bg-orange-500 text-white",
    media: "bg-yellow-500 text-black",
    baixa: "bg-blue-500 text-white",
  };

  const statusIcon = (status: string) => {
    if (status === "sucesso") return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (status === "falha") return <XCircle className="h-5 w-5 text-red-500" />;
    return <Clock className="h-5 w-5 text-yellow-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Indicadores principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Último Backup
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ultimoBackup ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {statusIcon(ultimoBackup.status)}
                  <span className="font-semibold capitalize">{ultimoBackup.status}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(ultimoBackup.data_inicio), { addSuffix: true, locale: ptBR })}
                </p>
                <p className="text-xs text-muted-foreground capitalize">{ultimoBackup.tipo}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum backup registrado</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-primary" />
              Versão Estável
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ultimaVersao ? (
              <div className="space-y-1">
                <p className="font-semibold">{ultimaVersao.versao}</p>
                <p className="text-xs text-muted-foreground">
                  Deploy: {format(new Date(ultimaVersao.data_deploy), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
                {ultimaVersao.rollback_disponivel && (
                  <Badge variant="outline" className="text-xs">Rollback disponível</Badge>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma versão registrada</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Incidentes Abertos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{incidentesAbertos?.length || 0}</p>
            {incidentesAbertos && incidentesAbertos.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {incidentesAbertos.map((inc) => (
                  <Badge key={inc.id} className={severidadeColor[inc.severidade] || ""}>
                    {inc.severidade}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Backups (últimos 10)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsBackups ? (
              <div className="space-y-1">
                <div className="flex gap-4">
                  <span className="text-green-600 font-semibold">{statsBackups.sucesso} ✓</span>
                  <span className="text-red-600 font-semibold">{statsBackups.falha} ✗</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Taxa: {statsBackups.total > 0 ? Math.round((statsBackups.sucesso / statsBackups.total) * 100) : 0}% sucesso
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Incidentes abertos detalhados */}
      {incidentesAbertos && incidentesAbertos.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Incidentes em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {incidentesAbertos.map((inc) => (
                <div key={inc.id} className="border rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{inc.titulo}</span>
                    <div className="flex gap-2">
                      <Badge className={severidadeColor[inc.severidade]}>{inc.severidade}</Badge>
                      <Badge variant="outline">{inc.status.replace("_", " ")}</Badge>
                    </div>
                  </div>
                  {inc.descricao && <p className="text-sm text-muted-foreground">{inc.descricao}</p>}
                  <p className="text-xs text-muted-foreground">
                    Início: {format(new Date(inc.hora_inicio), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    {inc.rto_minutos && ` | RTO: ${inc.rto_minutos}min`}
                    {inc.rpo_minutos && ` | RPO: ${inc.rpo_minutos}min`}
                  </p>
                  {/* Checklist progress */}
                  <div className="flex gap-2 flex-wrap mt-1">
                    {[
                      { key: "checklist_identificacao", label: "Identificação" },
                      { key: "checklist_contencao", label: "Contenção" },
                      { key: "checklist_recuperacao", label: "Recuperação" },
                      { key: "checklist_validacao", label: "Validação" },
                      { key: "checklist_encerramento", label: "Encerramento" },
                    ].map(({ key, label }) => (
                      <Badge key={key} variant={(inc as any)[key] ? "default" : "outline"} className="text-xs">
                        {(inc as any)[key] ? "✓" : "○"} {label}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
