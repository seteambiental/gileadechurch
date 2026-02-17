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
import { DollarSign, Check, Clock, TrendingUp, Users } from "lucide-react";

const TIPOS_INSCRICAO_LABELS: Record<string, string> = {
  membro: "Membro",
  nao_membro: "Não membro",
  familia: "Família",
  equipe: "Equipe",
};

const ImpactoFinanceiroTab = () => {
  const [selectedEventoId, setSelectedEventoId] = useState("");

  const { data: eventos } = useQuery({
    queryKey: ["impacto-eventos-financeiro"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impacto_eventos")
        .select("id, titulo, data_inicio, data_fim, tipo, valor_inscricao, valores_por_tipo, tipos_inscricao, tem_custo")
        .order("data_inicio", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: inscricoes, isLoading } = useQuery({
    queryKey: ["impacto-inscricoes-financeiro", selectedEventoId],
    queryFn: async () => {
      if (!selectedEventoId) return [];
      const { data, error } = await supabase
        .from("impacto_inscricoes")
        .select("id, nome, tipo_inscricao, valor_inscricao, valor_pago, status_pagamento, forma_pagamento, pagamentos, created_at")
        .eq("evento_id", selectedEventoId)
        .order("nome");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedEventoId,
  });

  const selectedEvento = eventos?.find((e) => e.id === selectedEventoId);

  const totalInscritos = inscricoes?.length || 0;

  // Calculate real totals from inscription data
  const totalPrevisao = inscricoes?.reduce((sum, i) => sum + (i.valor_inscricao || 0), 0) || 0;
  const totalPago = inscricoes?.reduce((sum, i) => sum + (i.valor_pago || 0), 0) || 0;
  const totalAReceber = Math.max(0, totalPrevisao - totalPago);

  // Count by status
  const pagos = inscricoes?.filter((i) => i.status_pagamento === "pago").length || 0;
  const parciais = inscricoes?.filter((i) => i.status_pagamento === "parcial").length || 0;
  const pendentes = inscricoes?.filter((i) => i.status_pagamento === "pendente").length || 0;

  // Count by type
  const countByType = inscricoes?.reduce((acc, i) => {
    const tipo = i.tipo_inscricao || "membro";
    acc[tipo] = (acc[tipo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "pago":
        return <Badge className="bg-green-600"><Check className="w-3 h-3 mr-1" />Pago</Badge>;
      case "parcial":
        return <Badge className="bg-yellow-600"><Clock className="w-3 h-3 mr-1" />Parcial</Badge>;
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
                {format(new Date(e.data_inicio), "dd/MM", { locale: ptBR })} — {e.titulo}
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
                <CardTitle className="text-sm font-medium">Inscrições</CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalInscritos}</div>
                <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                  {Object.entries(countByType).map(([tipo, count]) => (
                    <div key={tipo}>{TIPOS_INSCRICAO_LABELS[tipo] || tipo}: {count}</div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Previsão de Valores</CardTitle>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ {totalPrevisao.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  Soma dos valores de inscrição
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Valor Já Pago</CardTitle>
                <DollarSign className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">R$ {totalPago.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  {pagos} pagos{parciais > 0 ? `, ${parciais} parciais` : ""}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Valor a Receber</CardTitle>
                <Clock className="w-4 h-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">R$ {totalAReceber.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  {pendentes} pendentes
                </p>
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
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor Inscrição</TableHead>
                    <TableHead>Valor Pago</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Forma Pgto</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inscricoes?.map((inscricao) => {
                    const valorInsc = inscricao.valor_inscricao || 0;
                    const valorPg = inscricao.valor_pago || 0;
                    const saldo = Math.max(0, valorInsc - valorPg);
                    return (
                      <TableRow key={inscricao.id}>
                        <TableCell className="font-medium">{inscricao.nome}</TableCell>
                        <TableCell>{TIPOS_INSCRICAO_LABELS[inscricao.tipo_inscricao || ""] || inscricao.tipo_inscricao || "—"}</TableCell>
                        <TableCell>R$ {valorInsc.toFixed(2)}</TableCell>
                        <TableCell className="text-green-600 font-medium">R$ {valorPg.toFixed(2)}</TableCell>
                        <TableCell className={saldo > 0 ? "text-yellow-600 font-medium" : "text-green-600 font-medium"}>
                          R$ {saldo.toFixed(2)}
                        </TableCell>
                        <TableCell>{inscricao.forma_pagamento || "—"}</TableCell>
                        <TableCell>{getStatusBadge(inscricao.status_pagamento)}</TableCell>
                      </TableRow>
                    );
                  })}
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
