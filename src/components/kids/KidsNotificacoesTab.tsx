import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bell, CheckCircle2, XCircle, Clock } from "lucide-react";
import { ExportButton } from "@/components/ui/export-button";

export const KidsNotificacoesTab = () => {
  // Buscar log de notificações
  const { data: notificacoes, isLoading } = useQuery({
    queryKey: ["kids-notificacoes-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kids_notificacoes_log")
        .select(`
          *,
          crianca_member:members!kids_notificacoes_log_crianca_member_id_fkey(full_name),
          crianca_nc:novos_convertidos!kids_notificacoes_log_crianca_novo_convertido_id_fkey(full_name),
          responsavel:members!kids_notificacoes_log_responsavel_member_id_fkey(full_name)
        `)
        .order("enviada_em", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "enviada":
        return (
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Enviada
          </Badge>
        );
      case "erro":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Erro
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
    }
  };

  const getTurmaNome = (turma: string) => {
    const nomes: Record<string, string> = {
      laranja: "Laranja",
      amarelo: "Amarelo",
      verde: "Verde",
      azul: "Azul",
    };
    return nomes[turma] || turma;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Histórico de Notificações
          </h2>
          <p className="text-sm text-muted-foreground">
            Acompanhe as notificações de ausência enviadas aos responsáveis
          </p>
        </div>
        <ExportButton
          data={notificacoes || []}
          columns={[
            { header: "Data/Hora", accessor: (r) => format(new Date(r.enviada_em), "dd/MM/yyyy HH:mm", { locale: ptBR }) },
            { header: "Criança", accessor: (r) => r.crianca_member?.full_name || r.crianca_nc?.full_name || "-" },
            { header: "Turma", accessor: (r) => getTurmaNome(r.turma || "") },
            { header: "Responsável", accessor: (r) => r.responsavel?.full_name || "-" },
            { header: "WhatsApp", accessor: "whatsapp_destino" },
            { header: "Status", accessor: (r) => r.status === "enviada" ? "Enviada" : r.status === "erro" ? "Erro" : "Pendente" },
          ]}
          filename="kids-notificacoes"
          title="Histórico de Notificações Kids"
          sheetName="Notificações"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Últimas Notificações</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Carregando...</p>
          ) : !notificacoes || notificacoes.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Nenhuma notificação enviada ainda
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Criança</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notificacoes.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell className="text-sm">
                        {format(new Date(n.enviada_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {n.crianca_member?.full_name || n.crianca_nc?.full_name || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTurmaNome(n.turma || "")}</Badge>
                      </TableCell>
                      <TableCell>{n.responsavel?.full_name || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {n.whatsapp_destino || "-"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(n.status || "pendente")}
                        {n.erro_mensagem && (
                          <p className="text-xs text-destructive mt-1">{n.erro_mensagem}</p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
