import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, GraduationCap, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PortalCursoCasaisTabProps {
  memberId: string;
}

export const PortalCursoCasaisTab = ({ memberId }: PortalCursoCasaisTabProps) => {
  // Buscar inscrição do membro em casais
  const { data: inscricao, isLoading: loadingInscricao } = useQuery({
    queryKey: ["portal-casais-inscricao", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casais_inscritos")
        .select(`
          *,
          turma:casais_turmas(id, nome, descricao, dia_semana, horario_inicio, horario_fim, local)
        `)
        .or(`membro_masculino_id.eq.${memberId},membro_feminino_id.eq.${memberId}`)
        .eq("status", "aprovado")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!memberId,
  });

  // Buscar materiais disponíveis (da turma do membro ou gerais)
  const { data: materiais = [], isLoading: loadingMateriais } = useQuery({
    queryKey: ["portal-casais-materiais", inscricao?.turma_id],
    queryFn: async () => {
      let query = supabase
        .from("casais_materiais")
        .select("*")
        .eq("ativo", true)
        .order("ordem");

      if (inscricao?.turma_id) {
        query = query.or(`turma_id.eq.${inscricao.turma_id},turma_id.is.null`);
      } else {
        query = query.is("turma_id", null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!memberId,
  });

  if (loadingInscricao || loadingMateriais) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
          <GraduationCap className="w-6 h-6 text-destructive" />
        </div>
        <div>
          <h2 className="font-heading font-bold text-xl">Curso de Casais</h2>
          {inscricao?.turma && (
            <p className="text-sm text-muted-foreground">
              Turma: {(inscricao.turma as any).nome}
              {(inscricao.turma as any).dia_semana && ` • ${(inscricao.turma as any).dia_semana}`}
              {(inscricao.turma as any).horario_inicio && ` às ${(inscricao.turma as any).horario_inicio}`}
            </p>
          )}
        </div>
      </div>

      {/* Turma info */}
      {inscricao?.turma && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="pt-4">
            <h3 className="font-semibold mb-2">Informações da Turma</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {(inscricao.turma as any).dia_semana && (
                <div>
                  <span className="text-muted-foreground">Dia:</span>{" "}
                  <span className="font-medium">{(inscricao.turma as any).dia_semana}</span>
                </div>
              )}
              {(inscricao.turma as any).horario_inicio && (
                <div>
                  <span className="text-muted-foreground">Horário:</span>{" "}
                  <span className="font-medium">
                    {(inscricao.turma as any).horario_inicio}
                    {(inscricao.turma as any).horario_fim && ` - ${(inscricao.turma as any).horario_fim}`}
                  </span>
                </div>
              )}
              {(inscricao.turma as any).local && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Local:</span>{" "}
                  <span className="font-medium">{(inscricao.turma as any).local}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Materiais */}
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          Materiais do Curso
        </h3>
        {materiais.length === 0 ? (
          <Card className="bg-muted/30">
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum material disponível no momento
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {materiais.map((material: any) => (
              <Card key={material.id} className="hover:bg-muted/50 transition-colors">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-medium">{material.titulo}</h4>
                      {material.descricao && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {material.descricao}
                        </p>
                      )}
                      <Badge variant="outline" className="mt-2">
                        {material.tipo || "Material"}
                      </Badge>
                    </div>
                    {material.url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(material.url, "_blank")}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
