import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Award, DollarSign, AlertTriangle } from "lucide-react";

const FAIXAS = ["Branca", "Azul", "Roxa", "Marrom", "Preta"];
const FAIXA_COLORS: Record<string, string> = {
  Branca: "bg-gray-100 text-gray-800 border-gray-300",
  Azul: "bg-blue-100 text-blue-800 border-blue-300",
  Roxa: "bg-purple-100 text-purple-800 border-purple-300",
  Marrom: "bg-amber-900/20 text-amber-900 border-amber-700",
  Preta: "bg-gray-900 text-white border-gray-700",
};

export function JiuJitsuDashboard() {
  const { data: alunos = [] } = useQuery({
    queryKey: ["jiujitsu_alunos"],
    queryFn: async () => {
      const { data } = await supabase.from("jiujitsu_alunos").select("*").eq("ativo", true);
      return (data || []) as any[];
    },
  });

  const { data: pagamentos = [] } = useQuery({
    queryKey: ["jiujitsu_pagamentos"],
    queryFn: async () => {
      const { data } = await supabase.from("jiujitsu_pagamentos").select("*");
      return (data || []) as any[];
    },
  });

  const totalAlunos = alunos.length;
  const membros = alunos.filter((a) => a.tipo === "membro").length;
  const visitantes = alunos.filter((a) => a.tipo === "visitante").length;
  const pagosNoMes = pagamentos.filter((p) => p.status === "pago").length;
  const pendentes = pagamentos.filter((p) => p.status === "pendente").length;
  const atrasados = pagamentos.filter((p) => p.status === "atrasado").length;

  const faixaCount = FAIXAS.map((f) => ({
    faixa: f,
    count: alunos.filter((a) => a.faixa === f).length,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Total de Alunos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalAlunos}</p>
            <p className="text-xs text-muted-foreground">{membros} membros · {visitantes} visitantes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{pagosNoMes}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">{pendentes}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Atrasados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{atrasados}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5" /> Alunos por Faixa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {faixaCount.map(({ faixa, count }) => (
              <div
                key={faixa}
                className={`rounded-lg border p-4 text-center ${FAIXA_COLORS[faixa]}`}
              >
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-sm font-medium">{faixa}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
