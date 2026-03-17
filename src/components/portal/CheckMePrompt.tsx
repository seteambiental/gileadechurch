import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, MapPin, X, Baby } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { format, differenceInYears } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { kidsAgeForTurma } from "@/lib/age-utils";
import { toast } from "sonner";
import logoChurchKids from "@/assets/pg-church-kids.png";
import kidsLogoPG from "@/assets/kids-logo-pg.png";

interface CheckMePromptProps {
  memberId: string;
  memberName: string;
  onDismiss: () => void;
}

export const CheckMePrompt = ({ memberId, memberName, onDismiss }: CheckMePromptProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showChildren, setShowChildren] = useState(false);
  const [checkedChild, setCheckedChild] = useState<any>(null);
  const hoje = format(new Date(), "yyyy-MM-dd");
  const baseUrl = window.location.origin;

  const { data: filhos, isLoading } = useQuery({
    queryKey: ["checkme-filhos", memberId],
    queryFn: async () => {
      const { data: vinculos } = await supabase
        .from("kids_responsaveis")
        .select(`
          crianca_member_id,
          crianca_novo_convertido_id,
          crianca_member:members!kids_responsaveis_crianca_member_id_fkey(id, full_name, birth_date, photo_url, genero, kids_turma_override),
          crianca_nc:novos_convertidos!kids_responsaveis_crianca_novo_convertido_id_fkey(id, full_name, data_nascimento, photo_url, genero, kids_turma_override)
        `)
        .eq("responsavel_member_id", memberId);

      const allChildren: any[] = [];
      const addedIds = new Set<string>();

      vinculos?.forEach(v => {
        const child = v.crianca_member || v.crianca_nc;
        if (!child) return;
        const id = (child as any).id;
        if (addedIds.has(id)) return;
        addedIds.add(id);
        const birthDate = (child as any).birth_date || (child as any).data_nascimento;
        if (!birthDate) return;
        const idade = differenceInYears(new Date(), parseLocalDate(birthDate));
        const idadeTurma = kidsAgeForTurma(birthDate);
        if (idadeTurma > 12) return;
        allChildren.push({
          id,
          nome: (child as any).full_name,
          foto: (child as any).photo_url,
          genero: (child as any).genero,
          idade,
          birthDate,
          turmaOverride: (child as any).kids_turma_override,
          tipo: v.crianca_member_id ? "membro" : "novo_convertido",
        });
      });

      return allChildren;
    },
    enabled: showChildren,
  });

  const { data: turmasConfig } = useQuery({
    queryKey: ["kids-turmas-config-checkme-prompt"],
    queryFn: async () => {
      const { data } = await supabase.from("kids_turmas_config").select("*").order("idade_minima");
      return data;
    },
    enabled: showChildren,
  });

  const { data: todayCheckins } = useQuery({
    queryKey: ["kids-checkins-prompt", hoje, memberId],
    queryFn: async () => {
      const { data } = await supabase
        .from("kids_checkins")
        .select("*")
        .eq("data_culto", hoje)
        .eq("responsavel_member_id", memberId);
      return data;
    },
    enabled: showChildren,
  });

  const getTurma = (child: any) => {
    if (child.turmaOverride) return turmasConfig?.find(t => t.turma === child.turmaOverride);
    return turmasConfig?.find(t => child.idade >= t.idade_minima && child.idade <= t.idade_maxima);
  };

  const isAlreadyChecked = (childId: string) =>
    todayCheckins?.some(c => c.crianca_member_id === childId || c.crianca_novo_convertido_id === childId);

  const getExisting = (childId: string) =>
    todayCheckins?.find(c => c.crianca_member_id === childId || c.crianca_novo_convertido_id === childId);

  const checkMeMutation = useMutation({
    mutationFn: async (child: any) => {
      const turmaConfig = getTurma(child);
      if (!turmaConfig) throw new Error("Turma não encontrada");
      const token = crypto.randomUUID().replace(/-/g, "").substring(0, 16);
      const { data, error } = await supabase
        .from("kids_checkins")
        .insert({
          crianca_member_id: child.tipo === "membro" ? child.id : null,
          crianca_novo_convertido_id: child.tipo === "novo_convertido" ? child.id : null,
          turma: turmaConfig.turma as any,
          data_culto: hoje,
          token,
          responsavel_member_id: memberId,
          responsavel_nome: memberName,
          crianca_nome: child.nome,
          check_me_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return { ...data, token, turmaConfig };
    },
    onSuccess: (data) => {
      setCheckedChild(data);
      toast.success("Check-me realizado!");
      queryClient.invalidateQueries({ queryKey: ["kids-checkins"] });
      queryClient.invalidateQueries({ queryKey: ["kids-checkins-prompt"] });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  // Etiqueta gerada
  if (checkedChild) {
    const tc = checkedChild.turmaConfig || turmasConfig?.find((t: any) => t.turma === checkedChild.turma);
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-xl">✅ Etiqueta Gerada</h2>
            <Button variant="ghost" size="icon" onClick={onDismiss}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <Card className="border-2" style={{ borderColor: tc?.cor_hex }}>
            <CardContent className="py-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <img src={logoChurchKids} alt="Logo" className="w-8 h-8 object-contain" />
                  <span className="font-bold text-sm">PG Kids</span>
                </div>
                <Badge style={{ backgroundColor: tc?.cor_hex, color: "white" }}>
                  {tc?.nome_exibicao}
                </Badge>
              </div>
              <div className="flex items-center gap-4">
                <QRCodeSVG
                  value={`${baseUrl}/kids/scan/${checkedChild.token}`}
                  size={100}
                  level="H"
                  fgColor={tc?.cor_hex || "#000"}
                />
                <div>
                  <h3 className="font-bold text-lg">{checkedChild.crianca_nome}</h3>
                  <p className="text-sm text-muted-foreground">
                    Resp: {checkedChild.responsavel_nome}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => window.print()}>Imprimir</Button>
            <Button variant="outline" className="flex-1" onClick={() => { setCheckedChild(null); }}>
              Outro filho
            </Button>
          </div>
          <Button variant="ghost" className="w-full" onClick={onDismiss}>
            Continuar para o Portal →
          </Button>
        </div>
      </div>
    );
  }

  // Lista de filhos
  if (showChildren) {
    if (isLoading) {
      return (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
        </div>
      );
    }

    const childrenWithTurma = (filhos || []).map(child => ({
      ...child,
      turmaConfig: getTurma(child),
    })).filter(c => c.turmaConfig);

    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur overflow-y-auto">
        <div className="container max-w-md mx-auto px-4 py-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={kidsLogoPG} alt="PG Kids" className="h-12 object-contain" />
              <h2 className="font-heading font-bold text-lg">Check-me Kids</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onDismiss}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Selecione o(a) filho(a) para registrar presença:
          </p>

          {childrenWithTurma.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Baby className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhum filho(a) cadastrado no PG Kids.</p>
              </CardContent>
            </Card>
          ) : (
            childrenWithTurma.map(child => {
              const checked = isAlreadyChecked(child.id);
              const existing = getExisting(child.id);
              const tc = child.turmaConfig;
              return (
                <Card
                  key={child.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  style={{ borderLeftWidth: 4, borderLeftColor: tc?.cor_hex }}
                  onClick={() => {
                    if (checked && existing) {
                      setCheckedChild({ ...existing, turmaConfig: tc });
                    } else {
                      checkMeMutation.mutate(child);
                    }
                  }}
                >
                  <CardContent className="py-4 flex items-center gap-4">
                    <Avatar className="w-14 h-14 border-2" style={{ borderColor: tc?.cor_hex }}>
                      <AvatarImage src={child.foto || undefined} />
                      <AvatarFallback className="text-lg font-bold">{child.nome.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-bold">{child.nome}</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" style={{ borderColor: tc?.cor_hex, color: tc?.cor_hex }}>
                          {tc?.nome_exibicao}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{child.idade} anos</span>
                      </div>
                    </div>
                    {checked ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
                    ) : (
                      <Button size="sm" disabled={checkMeMutation.isPending}>
                        {checkMeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check-me"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}

          <Button variant="ghost" className="w-full" onClick={onDismiss}>
            Pular e ir ao Portal →
          </Button>
        </div>
      </div>
    );
  }

  // Initial prompt
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-purple-900/95 via-indigo-900/95 to-blue-900/95 backdrop-blur flex items-center justify-center p-4">
      <Card className="max-w-sm w-full shadow-2xl border-0 bg-gradient-to-b from-card to-card/95 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500" />
        <CardContent className="py-8 text-center space-y-5">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center shadow-lg shadow-green-200/50">
              <MapPin className="h-10 w-10 text-green-600" />
            </div>
          </div>

          <div>
            <h2 className="font-heading font-bold text-xl mb-1">
              Você está na Igreja! 🎉
            </h2>
            <p className="text-sm text-muted-foreground">
              Deseja fazer o <strong>Check-me</strong> do seu filho(a)?
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button className="w-full" size="lg" onClick={() => setShowChildren(true)}>
              <Baby className="h-4 w-4 mr-2" />
              Sim, fazer Check-me
            </Button>
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={onDismiss}>
              Não, obrigado
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
