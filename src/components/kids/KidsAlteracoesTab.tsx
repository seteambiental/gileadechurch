import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle2, XCircle, ArrowRight, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { calculateAge } from "@/lib/age-utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TurmaConfig {
  id: string;
  turma: string;
  nome_exibicao: string;
  cor_hex: string;
  idade_minima: number;
  idade_maxima: number;
}

interface KidsAlteracoesTabProps {
  turmasConfig: TurmaConfig[];
}

interface TransicaoDetectada {
  id: string;
  nome: string;
  foto: string | null;
  tipo: "membro" | "novo_convertido";
  idadeCompleta: number;
  birthDate: string;
  turmaAtualKey: string;
  turmaAtualNome: string;
  turmaAtualCor: string;
  turmaNovaKey: string;
  turmaNovaNome: string;
  turmaNovaCor: string;
  tipoTransicao: "promocao" | "graduacao_gt";
}

export const KidsAlteracoesTab = ({ turmasConfig }: KidsAlteracoesTabProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Check coordinator access
  const { data: canApprove = false } = useQuery({
    queryKey: ["kids-can-approve", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.rpc("can_access_kids_data");
      return !!data;
    },
  });

  // Fetch members
  const { data: members } = useQuery({
    queryKey: ["members-kids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, birth_date, photo_url, kids_turma_override")
        .not("birth_date", "is", null)
        .or("excluido.is.null,excluido.eq.false");
      if (error) throw error;
      return data;
    },
  });

  // Fetch novos convertidos
  const { data: novosConvertidos } = useQuery({
    queryKey: ["novos-convertidos-kids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("novos_convertidos")
        .select("id, full_name, data_nascimento, photo_url")
        .not("data_nascimento", "is", null);
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing pending transitions
  const { data: transicoesPendentes } = useQuery({
    queryKey: ["kids-transicoes-pendentes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kids_transicoes")
        .select("*")
        .eq("status", "pendente");
      if (error) throw error;
      return data;
    },
  });

  // Detect children that need turma change
  const transicoesDetectadas = useMemo(() => {
    if (!turmasConfig || !members) return [];

    const resultado: TransicaoDetectada[] = [];
    const pendentesIds = new Set(
      (transicoesPendentes || []).map(t => t.crianca_member_id || t.crianca_novo_convertido_id)
    );

    const getTurmaForAge = (age: number) =>
      turmasConfig.find(t => age >= t.idade_minima && age <= t.idade_maxima);

    const processChild = (
      id: string,
      nome: string,
      foto: string | null,
      birthDate: string,
      override: string | null,
      tipo: "membro" | "novo_convertido"
    ) => {
      const { years } = calculateAge(birthDate);
      const turmaCorreta = getTurmaForAge(years);
      
      // Current assigned turma
      const turmaAtual = override
        ? turmasConfig.find(t => t.turma === override)
        : getTurmaForAge(years);

      if (!turmaAtual) return;

      // Skip if already has a pending transition
      if (pendentesIds.has(id)) return;

      // Case 1: Child completed 12 years - should go to GT
      if (years >= 12 && override) {
        const currentTurma = turmasConfig.find(t => t.turma === override);
        if (currentTurma) {
          resultado.push({
            id, nome, foto, tipo,
            idadeCompleta: years,
            birthDate,
            turmaAtualKey: currentTurma.turma,
            turmaAtualNome: currentTurma.nome_exibicao,
            turmaAtualCor: currentTurma.cor_hex,
            turmaNovaKey: "gt_adolescentes",
            turmaNovaNome: "GT Adolescentes",
            turmaNovaCor: "#8b5cf6",
            tipoTransicao: "graduacao_gt",
          });
        }
        return;
      }

      // Case 2: Child's age suggests different turma than override
      if (override && turmaCorreta && turmaCorreta.turma !== override) {
        const currentTurma = turmasConfig.find(t => t.turma === override);
        if (currentTurma) {
          resultado.push({
            id, nome, foto, tipo,
            idadeCompleta: years,
            birthDate,
            turmaAtualKey: currentTurma.turma,
            turmaAtualNome: currentTurma.nome_exibicao,
            turmaAtualCor: currentTurma.cor_hex,
            turmaNovaKey: turmaCorreta.turma,
            turmaNovaNome: turmaCorreta.nome_exibicao,
            turmaNovaCor: turmaCorreta.cor_hex,
            tipoTransicao: "promocao",
          });
        }
      }
    };

    members?.forEach(m => {
      if (!m.birth_date) return;
      const override = (m as Record<string, unknown>).kids_turma_override as string | null;
      processChild(m.id, m.full_name, m.photo_url, m.birth_date, override, "membro");
    });

    novosConvertidos?.forEach(nc => {
      if (!nc.data_nascimento) return;
      const override = (nc as Record<string, unknown>).kids_turma_override as string | null;
      processChild(nc.id, nc.full_name, nc.photo_url || null, nc.data_nascimento, override || null, "novo_convertido");
    });

    return resultado.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [turmasConfig, members, novosConvertidos, transicoesPendentes]);

  // Approve transition
  const approveMutation = useMutation({
    mutationFn: async (t: TransicaoDetectada) => {
      // Insert transition record
      const insertData: Record<string, unknown> = {
        turma_atual: t.turmaAtualKey,
        turma_nova: t.turmaNovaKey,
        tipo: t.tipoTransicao,
        status: "aprovada",
        aprovado_por: user?.id,
      };
      if (t.tipo === "membro") {
        insertData.crianca_member_id = t.id;
      } else {
        insertData.crianca_novo_convertido_id = t.id;
      }

      const { error: insErr } = await supabase
        .from("kids_transicoes")
        .insert(insertData as never);
      if (insErr) throw insErr;

      // Update the override
      if (t.tipoTransicao === "graduacao_gt") {
        // Remove from Kids - clear override so they don't appear
        if (t.tipo === "membro") {
          const { error } = await supabase
            .from("members")
            .update({ kids_turma_override: null } as never)
            .eq("id", t.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("novos_convertidos")
            .update({ kids_turma_override: null } as never)
            .eq("id", t.id);
          if (error) throw error;
        }
      } else {
        // Move to new turma
        if (t.tipo === "membro") {
          const { error } = await supabase
            .from("members")
            .update({ kids_turma_override: t.turmaNovaKey } as never)
            .eq("id", t.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("novos_convertidos")
            .update({ kids_turma_override: t.turmaNovaKey } as never)
            .eq("id", t.id);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members-kids"] });
      queryClient.invalidateQueries({ queryKey: ["novos-convertidos-kids"] });
      queryClient.invalidateQueries({ queryKey: ["kids-transicoes-pendentes"] });
      toast.success("Transição aprovada com sucesso!");
    },
    onError: () => toast.error("Erro ao aprovar transição"),
  });

  // Generate pending transitions for detected ones
  const generatePendingMutation = useMutation({
    mutationFn: async () => {
      const inserts = transicoesDetectadas.map(t => {
        const rec: Record<string, unknown> = {
          turma_atual: t.turmaAtualKey,
          turma_nova: t.turmaNovaKey,
          tipo: t.tipoTransicao,
          status: "pendente",
        };
        if (t.tipo === "membro") rec.crianca_member_id = t.id;
        else rec.crianca_novo_convertido_id = t.id;
        return rec;
      });

      if (inserts.length === 0) return;

      const { error } = await supabase
        .from("kids_transicoes")
        .insert(inserts as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kids-transicoes-pendentes"] });
      toast.success("Transições registradas como pendentes!");
    },
    onError: () => toast.error("Erro ao registrar transições"),
  });

  // Fetch approved/rejected history
  const { data: historicoTransicoes } = useQuery({
    queryKey: ["kids-transicoes-historico"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kids_transicoes")
        .select("*")
        .neq("status", "pendente")
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const getTurmaLabel = (key: string) => {
    if (key === "gt_adolescentes") return "GT Adolescentes";
    return turmasConfig.find(t => t.turma === key)?.nome_exibicao || key;
  };

  const getTurmaCor = (key: string) => {
    if (key === "gt_adolescentes") return "#8b5cf6";
    return turmasConfig.find(t => t.turma === key)?.cor_hex || "#666";
  };

  return (
    <div className="space-y-6">
      {/* Detected transitions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Alterações Detectadas
            </CardTitle>
            <Badge variant="outline" className="text-lg px-3">
              {transicoesDetectadas.length}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Crianças cuja idade completa indica mudança de turma. Aprove individualmente ou registre como pendentes.
          </p>
        </CardHeader>
        <CardContent>
          {transicoesDetectadas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma alteração de turma detectada no momento.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Criança</TableHead>
                      <TableHead>Idade</TableHead>
                      <TableHead>Turma Atual</TableHead>
                      <TableHead></TableHead>
                      <TableHead>Turma Sugerida</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transicoesDetectadas.map((t) => (
                      <TableRow key={`${t.tipo}-${t.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={t.foto || undefined} />
                              <AvatarFallback>{t.nome.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{t.nome}</span>
                          </div>
                        </TableCell>
                        <TableCell>{t.idadeCompleta} anos</TableCell>
                        <TableCell>
                          <Badge style={{ backgroundColor: `${t.turmaAtualCor}20`, color: t.turmaAtualCor, borderColor: t.turmaAtualCor }} variant="outline">
                            {t.turmaAtualNome}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell>
                          <Badge style={{ backgroundColor: `${t.turmaNovaCor}20`, color: t.turmaNovaCor, borderColor: t.turmaNovaCor }} variant="outline">
                            {t.turmaNovaNome}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={t.tipoTransicao === "graduacao_gt" ? "destructive" : "default"}>
                            {t.tipoTransicao === "graduacao_gt" ? "Graduação GT" : "Promoção"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {canApprove && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" className="gap-1">
                                  <CheckCircle2 className="h-4 w-4" />
                                  Aprovar
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar transição</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Deseja mover <strong>{t.nome}</strong> de{" "}
                                    <strong>{t.turmaAtualNome}</strong> para{" "}
                                    <strong>{t.turmaNovaNome}</strong>?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => approveMutation.mutate(t)}>
                                    Aprovar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pending transitions from DB */}
      {(transicoesPendentes?.length || 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-500" />
              Transições Pendentes Registradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Criança</TableHead>
                    <TableHead>De</TableHead>
                    <TableHead></TableHead>
                    <TableHead>Para</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transicoesPendentes?.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs font-mono">
                        {(t.crianca_member_id || t.crianca_novo_convertido_id || "").slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" style={{ color: getTurmaCor(t.turma_atual) }}>
                          {getTurmaLabel(t.turma_atual)}
                        </Badge>
                      </TableCell>
                      <TableCell><ArrowRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                      <TableCell>
                        <Badge variant="outline" style={{ color: getTurmaCor(t.turma_nova) }}>
                          {getTurmaLabel(t.turma_nova)}
                        </Badge>
                      </TableCell>
                      <TableCell>{t.tipo}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
