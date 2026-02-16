import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, Check, Clock, TrendingUp } from "lucide-react";

const ImpactoFinanceiroTab = () => {
  const [selectedEventoId, setSelectedEventoId] = useState("");

  const { data: eventos } = useQuery({
    queryKey: ["agenda-eventos-inscricao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_igreja")
        .select("id, titulo, data_evento, data_fim, local, limite_vagas, ativo, necessita_inscricao, valor_custo, tem_custo")
        .eq("necessita_inscricao", true)
        .eq("recorrente", false)
        .order("data_evento", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: inscricoes, isLoading } = useQuery({
    queryKey: ["inscricoes-financeiro", selectedEventoId],
    queryFn: async () => {
      if (!selectedEventoId) return [];
      const { data, error } = await supabase
        .from("inscricoes_eventos")
        .select("id, nome_participante, forma_pagamento, status_pagamento, created_at")
        .eq("evento_id", selectedEventoId)
        .order("nome_participante");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedEventoId,
  });

  const selectedEvento = eventos?.find((e) => e.id === selectedEventoId);
  const valorEvento = selectedEvento?.valor_custo || 0;

  const totalInscritos = inscricoes?.length || 0;
  const totalEsperado = totalInscritos * valorEvento;
  const confirmados = inscricoes?.filter((i) => i.status_pagamento === "confirmado").length || 0;
  const pendentes = inscricoes?.filter((i) => i.status_pagamento === "pendente").length || 0;
  const cancelados = inscricoes?.filter((i) => i.status_pagamento === "cancelado").length || 0;
  const totalRecebido = confirmados * valorEvento;

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "confirmado":
        return <Badge className="bg-green-600"><Check className="w-3 h-3 mr-1" />Confirmado</Badge>;
      case "cancelado":
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-heading font-bold">Financeiro</h2>
        <Select value={selectedEventoId} onValueChange={setSelectedEventoId}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Selecione um evento" />
          </SelectTrigger>
          <SelectContent>
            {eventos?.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {format(new Date(e.data_evento), "dd/MM", { locale: ptBR })} — {e.titulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedEventoId ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Selecione um evento para ver o financeiro.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Esperado</CardTitle>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ {totalEsperado.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  {totalInscritos} inscrições × R$ {valorEvento.toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
                <DollarSign className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">R$ {totalRecebido.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">{confirmados} pagos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pendente</CardTitle>
                <Clock className="w-4 h-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">R$ {(pendentes * valorEvento).toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">{pendentes} pendentes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
                <Check className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalInscritos > 0 ? Math.round((confirmados / totalInscritos) * 100) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">Pagamentos confirmados</p>
              </CardContent>
            </Card>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : inscricoes?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma inscrição registrada.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Forma Pgto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Inscrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inscricoes?.map((inscricao) => (
                    <TableRow key={inscricao.id}>
                      <TableCell className="font-medium">{inscricao.nome_participante}</TableCell>
                      <TableCell>R$ {valorEvento.toFixed(2)}</TableCell>
                      <TableCell>{inscricao.forma_pagamento || "—"}</TableCell>
                      <TableCell>{getStatusBadge(inscricao.status_pagamento)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(inscricao.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default ImpactoFinanceiroTab;
