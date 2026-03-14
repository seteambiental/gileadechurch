import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calculateAge } from "@/lib/age-utils";

const CATEGORIAS_IDADE = [
  { label: "Kids (4-15)", min: 4, max: 15, icon: "👦" },
  { label: "Adulto (16-30)", min: 16, max: 30, icon: "🧑" },
  { label: "Master (30+)", min: 31, max: 999, icon: "🧔" },
];

const FAIXAS = ["Branca", "Azul", "Roxa", "Marrom", "Preta"];
const FAIXA_COLORS: Record<string, string> = {
  Branca: "bg-gray-100 text-gray-800",
  Azul: "bg-blue-100 text-blue-800",
  Roxa: "bg-purple-100 text-purple-800",
  Marrom: "bg-amber-100 text-amber-800",
  Preta: "bg-gray-900 text-white",
};

function getCategoria(dataNascimento: string | null) {
  if (!dataNascimento) return "Sem data";
  const { years } = calculateAge(dataNascimento);
  const cat = CATEGORIAS_IDADE.find((c) => years >= c.min && years <= c.max);
  return cat?.label || "Sem categoria";
}

export function JiuJitsuTurmasTab() {
  const { data: alunos = [] } = useQuery({
    queryKey: ["jiujitsu_alunos"],
    queryFn: async () => {
      const { data } = await supabase.from("jiujitsu_alunos").select("*").eq("ativo", true).order("nome");
      return (data || []) as any[];
    },
  });

  const turmas = useMemo(() => {
    const groups: Record<string, Record<string, any[]>> = {};

    for (const cat of CATEGORIAS_IDADE) {
      groups[cat.label] = {};
      for (const f of FAIXAS) {
        groups[cat.label][f] = [];
      }
    }

    for (const aluno of alunos) {
      const cat = getCategoria(aluno.data_nascimento);
      if (groups[cat]) {
        const faixa = aluno.faixa || "Branca";
        if (!groups[cat][faixa]) groups[cat][faixa] = [];
        groups[cat][faixa].push(aluno);
      }
    }

    return groups;
  }, [alunos]);

  return (
    <div className="space-y-6">
      {CATEGORIAS_IDADE.map((cat) => {
        const faixas = turmas[cat.label] || {};
        const totalCategoria = Object.values(faixas).reduce((s, arr) => s + arr.length, 0);
        if (totalCategoria === 0) return null;

        return (
          <Card key={cat.label}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span>{cat.icon}</span> {cat.label}
                <Badge variant="secondary" className="ml-auto">{totalCategoria} alunos</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {FAIXAS.map((faixa) => {
                const alunosFaixa = faixas[faixa] || [];
                if (alunosFaixa.length === 0) return null;

                return (
                  <div key={faixa}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${FAIXA_COLORS[faixa]}`}>
                        {faixa}
                      </span>
                      <span className="text-sm text-muted-foreground">({alunosFaixa.length})</span>
                    </div>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Graus</TableHead>
                            <TableHead>Tipo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {alunosFaixa.map((a: any) => (
                            <TableRow key={a.id}>
                              <TableCell className="font-medium">{a.nome}</TableCell>
                              <TableCell>{a.graus || 0}</TableCell>
                              <TableCell>
                                <Badge variant={a.tipo === "membro" ? "default" : "secondary"}>
                                  {a.tipo === "membro" ? "Membro" : "Visitante"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {alunos.length === 0 && (
        <p className="text-center py-8 text-muted-foreground">Nenhum aluno cadastrado ainda.</p>
      )}
    </div>
  );
}
