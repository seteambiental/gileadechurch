import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, CheckCircle2, XCircle, UserPlus, Phone, Baby } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import { useToast } from "@/hooks/use-toast";
import { includesNormalized } from "@/lib/text-utils";
import { formatPhone } from "@/lib/masks";
import { needsResponsible, kidsAgeForTurma, getAgeString } from "@/lib/age-utils";
import { dispararMensagemCadastroAprovado } from "@/lib/whatsapp-notifications";

interface TurmaConfig {
  id: string;
  turma: string;
  nome_exibicao: string;
  cor_hex: string;
  idade_minima: number;
  idade_maxima: number;
}

interface KidsInscricoesTabProps {
  turmasConfig: TurmaConfig[];
}

interface Req {
  id: string;
  full_name: string;
  whatsapp: string | null;
  email: string | null;
  genero: string | null;
  birth_date: string | null;
  cpf: string | null;
  photo_url: string | null;
  responsavel_id: string | null;
  parent_request_id: string | null;
  tipo_dependente: string | null;
  created_at: string;
  cep: string | null;
  address: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  estado_civil: string | null;
}

function suggestTurma(birthDate: string | null, turmas: TurmaConfig[]): string | null {
  if (!birthDate || turmas.length === 0) return null;
  const age = kidsAgeForTurma(birthDate);
  const t = turmas.find((tu) => age >= tu.idade_minima && age <= tu.idade_maxima);
  return t?.turma || null;
}

export function KidsInscricoesTab({ turmasConfig }: KidsInscricoesTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedTurma, setSelectedTurma] = useState<Record<string, string>>({});

  const maxIdade = useMemo(
    () => turmasConfig.reduce((m, t) => Math.max(m, t.idade_maxima), 0),
    [turmasConfig]
  );

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["kids-inscricoes-pendentes", maxIdade],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_requests")
        .select("*")
        .eq("status", "pendente")
        .not("birth_date", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data as Req[]) || []).filter((r) => {
        if (!r.birth_date) return false;
        return kidsAgeForTurma(r.birth_date) <= maxIdade;
      });
    },
    enabled: maxIdade > 0,
    refetchInterval: 30000,
  });

  const filtered = requests.filter((r) => includesNormalized(r.full_name, search));

  const approveMutation = useMutation({
    mutationFn: async ({ request, turma }: { request: Req; turma: string | null }) => {
      const suggested = suggestTurma(request.birth_date, turmasConfig);

      // Resolver responsável
      let responsavelId = request.responsavel_id || null;
      if (request.tipo_dependente === "filho" && request.parent_request_id) {
        const { data: parent } = await supabase
          .from("member_requests")
          .select("member_id")
          .eq("id", request.parent_request_id)
          .single();
        if (parent?.member_id) responsavelId = parent.member_id;
      }

      const { data: newMember, error: mErr } = await supabase
        .from("members")
        .insert({
          full_name: request.full_name,
          email: request.email,
          whatsapp: request.whatsapp,
          genero: request.genero,
          estado_civil: request.estado_civil || null,
          birth_date: request.birth_date,
          cep: request.cep,
          address: request.address,
          number: request.number,
          complement: request.complement,
          neighborhood: request.neighborhood,
          city: request.city,
          state: request.state,
          cpf: request.cpf,
          photo_url: request.photo_url,
          responsavel_id: responsavelId,
          kids_turma_override: turma && turma !== suggested ? turma : null,
        })
        .select()
        .single();
      if (mErr) throw mErr;

      if (responsavelId && needsResponsible(request.birth_date)) {
        await supabase.from("kids_responsaveis").insert({
          crianca_member_id: newMember.id,
          responsavel_member_id: responsavelId,
          parentesco: "responsavel",
          principal: true,
          notificar_ausencia: true,
        });
      }

      await supabase
        .from("member_requests")
        .update({
          status: "aprovado",
          aprovado_em: new Date().toISOString(),
          member_id: newMember.id,
        })
        .eq("id", request.id);

      try {
        await dispararMensagemCadastroAprovado({
          telefone: request.whatsapp,
          nome: request.full_name,
          memberId: newMember.id,
        });
      } catch (e) {
        console.warn("[kids-inscricoes] whatsapp falhou:", e);
      }

      return newMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kids-inscricoes-pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["member-requests"] });
      queryClient.invalidateQueries({ queryKey: ["members-kids"] });
      queryClient.invalidateQueries({ queryKey: ["pending-kids-dashboard"] });
      toast({ title: "Inscrição aprovada", description: "Criança adicionada ao PG selecionado." });
    },
    onError: (err) => {
      toast({ title: "Erro ao aprovar", description: String(err), variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("member_requests")
        .update({ status: "rejeitado", motivo_rejeicao: "Rejeitado no módulo Kids" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kids-inscricoes-pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["pending-kids-dashboard"] });
      toast({ title: "Inscrição rejeitada" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Baby className="w-5 h-5 text-pink-500" />
            Novas Inscrições ({filtered.length})
          </h3>
          <p className="text-sm text-muted-foreground">
            Crianças cadastradas no formulário de membros aguardando aprovação para o PG.
          </p>
        </div>
        <SearchInput
          placeholder="Buscar por nome..."
          value={search}
          onChange={setSearch}
          className="w-full sm:w-64"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p>Nenhuma inscrição pendente no momento.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((r) => {
            const suggested = suggestTurma(r.birth_date, turmasConfig);
            const current = selectedTurma[r.id] ?? suggested ?? "";
            const currentCfg = turmasConfig.find((t) => t.turma === current);
            return (
              <Card key={r.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{r.full_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.birth_date
                          ? `${format(new Date(r.birth_date), "dd/MM/yyyy", { locale: ptBR })} • ${getAgeString(r.birth_date)}`
                          : "Sem data de nascimento"}
                      </div>
                      {r.whatsapp && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3" />
                          {formatPhone(r.whatsapp)}
                        </div>
                      )}
                    </div>
                    {r.tipo_dependente === "filho" && (
                      <Badge variant="outline" className="text-xs">👶 Filho(a)</Badge>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      PG sugerido: {suggested ? turmasConfig.find((t) => t.turma === suggested)?.nome_exibicao : "—"}
                    </label>
                    <Select
                      value={current}
                      onValueChange={(v) => setSelectedTurma((s) => ({ ...s, [r.id]: v }))}
                    >
                      <SelectTrigger
                        style={currentCfg ? { borderColor: currentCfg.cor_hex, borderWidth: 2 } : undefined}
                      >
                        <SelectValue placeholder="Selecione o PG" />
                      </SelectTrigger>
                      <SelectContent>
                        {turmasConfig.map((t) => (
                          <SelectItem key={t.turma} value={t.turma}>
                            <span className="inline-flex items-center gap-2">
                              <span
                                className="inline-block w-3 h-3 rounded-full"
                                style={{ backgroundColor: t.cor_hex }}
                              />
                              {t.nome_exibicao} ({t.idade_minima}-{t.idade_maxima} anos)
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2 justify-end pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => rejectMutation.mutate(r.id)}
                      disabled={rejectMutation.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Rejeitar
                    </Button>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                      disabled={!current || approveMutation.isPending}
                      onClick={() => approveMutation.mutate({ request: r, turma: current })}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Aprovar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default KidsInscricoesTab;