import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, ArrowLeft, Printer, Baby } from "lucide-react";
import { format, differenceInYears } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { kidsAgeForTurma } from "@/lib/age-utils";
import logoPG from "@/assets/logo-pg.png";
import logoChurchKids from "@/assets/pg-church-kids.png";

const KidsCheckMePage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [checkedInChild, setCheckedInChild] = useState<any>(null);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  const hoje = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/auth?redirect=/kids/checkme`);
    }
  }, [user, authLoading, navigate]);

  // Buscar member_id do usuário logado
  const { data: memberProfile } = useQuery({
    queryKey: ["member-profile-checkme", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Buscar todas turmas config
  const { data: allTurmas } = useQuery({
    queryKey: ["kids-turmas-config-all-checkme"],
    queryFn: async () => {
      const { data, error } = await supabase.from("kids_turmas_config").select("*").order("idade_minima");
      if (error) throw error;
      return data;
    },
  });

  // Buscar filhos do responsável (todas turmas)
  const { data: filhos, isLoading: loadingFilhos } = useQuery({
    queryKey: ["kids-filhos-checkme", memberProfile?.id],
    queryFn: async () => {
      const { data: vinculos, error } = await supabase
        .from("kids_responsaveis")
        .select(`
          crianca_member_id,
          crianca_novo_convertido_id,
          crianca_member:members!kids_responsaveis_crianca_member_id_fkey(id, full_name, birth_date, photo_url, genero, kids_turma_override),
          crianca_nc:novos_convertidos!kids_responsaveis_crianca_novo_convertido_id_fkey(id, full_name, data_nascimento, photo_url, genero, kids_turma_override)
        `)
        .eq("responsavel_member_id", memberProfile!.id);

      if (error) throw error;

      const { data: directChildren } = await supabase
        .from("members")
        .select("id, full_name, birth_date, photo_url, genero, kids_turma_override")
        .eq("responsavel_id", memberProfile!.id)
        .not("birth_date", "is", null);

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
        allChildren.push({
          id,
          nome: (child as any).full_name,
          foto: (child as any).photo_url,
          genero: (child as any).genero,
          idade,
          turmaOverride: (child as any).kids_turma_override,
          tipo: v.crianca_member_id ? "membro" : "novo_convertido",
        });
      });

      directChildren?.forEach(child => {
        if (addedIds.has(child.id)) return;
        addedIds.add(child.id);
        if (!child.birth_date) return;
        const idade = differenceInYears(new Date(), parseLocalDate(child.birth_date));
        allChildren.push({
          id: child.id,
          nome: child.full_name,
          foto: child.photo_url,
          genero: child.genero,
          idade,
          turmaOverride: child.kids_turma_override,
          tipo: "membro",
        });
      });

      return allChildren;
    },
    enabled: !!memberProfile?.id,
  });

  // Buscar checkins já feitos hoje
  const { data: todayCheckins } = useQuery({
    queryKey: ["kids-checkins-today-checkme", hoje, memberProfile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kids_checkins")
        .select("*")
        .eq("data_culto", hoje)
        .eq("responsavel_member_id", memberProfile!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!memberProfile?.id,
  });

  // Determinar turma da criança
  const getTurmaForChild = (child: any) => {
    if (child.turmaOverride) {
      return allTurmas?.find(t => t.turma === child.turmaOverride);
    }
    return allTurmas?.find(t => child.idade >= t.idade_minima && child.idade <= t.idade_maxima);
  };

  // Check-me mutation
  const checkMeMutation = useMutation({
    mutationFn: async (child: any) => {
      const turmaConfig = getTurmaForChild(child);
      if (!turmaConfig) throw new Error("Turma não encontrada para esta criança.");
      const token = crypto.randomUUID().replace(/-/g, "").substring(0, 16);
      const { data, error } = await supabase
        .from("kids_checkins")
        .insert({
          crianca_member_id: child.tipo === "membro" ? child.id : null,
          crianca_novo_convertido_id: child.tipo === "novo_convertido" ? child.id : null,
          turma: turmaConfig.turma as any,
          data_culto: hoje,
          token,
          responsavel_member_id: memberProfile!.id,
          responsavel_nome: memberProfile!.full_name,
          crianca_nome: child.nome,
          check_me_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return { ...data, token, turmaConfig };
    },
    onSuccess: (data) => {
      setCheckedInChild(data);
      setGeneratedToken(data.token);
      toast({ title: "Check-me realizado!", description: "Etiqueta gerada com sucesso." });
      queryClient.invalidateQueries({ queryKey: ["kids-checkins"] });
      queryClient.invalidateQueries({ queryKey: ["kids-checkins-today-checkme"] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    },
  });

  const isAlreadyCheckedIn = (childId: string) =>
    todayCheckins?.some(c => c.crianca_member_id === childId || c.crianca_novo_convertido_id === childId);

  const getExistingCheckin = (childId: string) =>
    todayCheckins?.find(c => c.crianca_member_id === childId || c.crianca_novo_convertido_id === childId);

  if (authLoading || loadingFilhos) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  if (!user) return null;

  const baseUrl = window.location.origin;

  // Etiqueta view after check-me
  if (checkedInChild && generatedToken) {
    const turmaConfig = checkedInChild.turmaConfig || allTurmas?.find(t => t.turma === checkedInChild.turma);
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-md mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => { setCheckedInChild(null); setGeneratedToken(null); }}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-heading font-bold text-xl">Etiqueta Gerada</h1>
          </div>

          <div id="etiqueta-print" className="bg-white rounded-xl border-2 p-6 space-y-4" style={{ borderColor: turmaConfig?.cor_hex }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={logoChurchKids} alt="Logo" className="w-8 h-8 object-contain" />
                <span className="font-bold text-sm">PG Kids</span>
              </div>
              <Badge style={{ backgroundColor: turmaConfig?.cor_hex, color: "white" }}>
                {turmaConfig?.nome_exibicao}
              </Badge>
            </div>

            <div className="flex items-center gap-4">
              <QRCodeSVG
                value={`${baseUrl}/kids/scan/${generatedToken}`}
                size={120}
                level="H"
                fgColor={turmaConfig?.cor_hex || "#000"}
              />
              <div className="flex-1">
                <h2 className="font-bold text-lg">{checkedInChild.crianca_nome}</h2>
                <p className="text-sm text-muted-foreground">
                  Responsável: {checkedInChild.responsavel_nome}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(), "dd/MM/yyyy HH:mm")}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <Button className="flex-1" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir Etiqueta
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => { setCheckedInChild(null); setGeneratedToken(null); }}>
              Voltar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Filter children that match any kids turma
  const childrenWithTurma = (filhos || []).map(child => ({
    ...child,
    turmaConfig: getTurmaForChild(child),
  })).filter(c => c.turmaConfig);

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <img src={logoPG} alt="Logo PG" className="w-10 h-10 object-contain" />
          <div>
            <h1 className="font-heading font-bold text-xl">Check-me Kids</h1>
            <p className="text-sm text-muted-foreground">
              Confirme a presença do seu filho(a)
            </p>
          </div>
          <img src={logoChurchKids} alt="PG Kids" className="ml-auto w-8 h-8 object-contain" />
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Olá, <strong>{memberProfile?.full_name?.split(" ")[0]}</strong>! Selecione seu filho(a) para registrar a presença:
        </p>

        {childrenWithTurma.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Baby className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">
                Nenhum filho(a) encontrado no cadastro do PG Kids.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Verifique se o cadastro está correto no seu perfil.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {childrenWithTurma.map(child => {
              const alreadyChecked = isAlreadyCheckedIn(child.id);
              const existing = getExistingCheckin(child.id);
              const tc = child.turmaConfig;
              return (
                <Card
                  key={child.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${alreadyChecked ? "opacity-60" : ""}`}
                  style={{ borderLeftWidth: 4, borderLeftColor: tc?.cor_hex }}
                  onClick={() => {
                    if (alreadyChecked && existing) {
                      setCheckedInChild({ ...existing, turmaConfig: tc });
                      setGeneratedToken(existing.token);
                    } else if (!alreadyChecked) {
                      checkMeMutation.mutate(child);
                    }
                  }}
                >
                  <CardContent className="py-4 flex items-center gap-4">
                    <Avatar className="w-16 h-16 border-2" style={{ borderColor: tc?.cor_hex }}>
                      <AvatarImage src={child.foto || undefined} />
                      <AvatarFallback className="text-lg font-bold">
                        {child.nome.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{child.nome}</h3>
                      <p className="text-sm text-muted-foreground">
                        {child.idade} anos • {child.genero === "masculino" ? "Menino" : child.genero === "feminino" ? "Menina" : ""}
                      </p>
                      <Badge variant="outline" className="mt-1 text-[10px]" style={{ borderColor: tc?.cor_hex, color: tc?.cor_hex }}>
                        {tc?.nome_exibicao}
                      </Badge>
                    </div>
                    {alreadyChecked ? (
                      <div className="flex flex-col items-center">
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                        <span className="text-[10px] text-green-600">Check-me feito</span>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        disabled={checkMeMutation.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          checkMeMutation.mutate(child);
                        }}
                      >
                        {checkMeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check-me"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-6 text-center">
          <Button variant="ghost" size="sm" onClick={() => navigate("/portal")}>
            ← Voltar ao Portal
          </Button>
        </div>
      </div>
    </div>
  );
};

export default KidsCheckMePage;
