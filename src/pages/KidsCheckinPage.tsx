import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, ArrowLeft, Printer, Baby } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { differenceInYears } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { kidsAgeForTurma } from "@/lib/age-utils";
import logoGileade from "@/assets/logo-gileade.jpeg";

const KidsCheckinPage = () => {
  const { turma } = useParams<{ turma: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [checkedInChild, setCheckedInChild] = useState<any>(null);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  const hoje = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/auth?redirect=/kids/checkin/${turma}`);
    }
  }, [user, authLoading, navigate, turma]);

  // Buscar config da turma
  const { data: turmaConfig } = useQuery({
    queryKey: ["kids-turma-config", turma],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kids_turmas_config")
        .select("*")
        .eq("turma", turma as any)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!turma,
  });

  // Buscar member_id do usuário logado
  const { data: memberProfile } = useQuery({
    queryKey: ["member-profile-checkin", user?.id],
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

  // Buscar filhos do responsável nesta turma
  const { data: filhos, isLoading: loadingFilhos } = useQuery({
    queryKey: ["kids-filhos-checkin", memberProfile?.id, turma],
    queryFn: async () => {
      // Buscar vínculos do responsável
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

      // Also check direct responsavel_id on members
      const { data: directChildren } = await supabase
        .from("members")
        .select("id, full_name, birth_date, photo_url, genero, kids_turma_override")
        .eq("responsavel_id", memberProfile!.id)
        .not("birth_date", "is", null);

      const allChildren: any[] = [];
      const addedIds = new Set<string>();

      // From kids_responsaveis
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
        const override = (child as any).kids_turma_override;
        const childTurma = override || null;

        allChildren.push({
          id,
          nome: (child as any).full_name,
          foto: (child as any).photo_url,
          genero: (child as any).genero,
          idade,
          birthDate,
          turmaOverride: childTurma,
          tipo: v.crianca_member_id ? "membro" : "novo_convertido",
        });
      });

      // Direct children
      directChildren?.forEach(child => {
        if (addedIds.has(child.id)) return;
        addedIds.add(child.id);
        if (!child.birth_date) return;
        const idade = differenceInYears(new Date(), parseLocalDate(child.birth_date));
        const idadeTurma = kidsAgeForTurma(child.birth_date);
        allChildren.push({
          id: child.id,
          nome: child.full_name,
          foto: child.photo_url,
          genero: child.genero,
          idade,
          birthDate: child.birth_date,
          turmaOverride: child.kids_turma_override,
          tipo: "membro",
        });
      });

      return allChildren;
    },
    enabled: !!memberProfile?.id && !!turma,
  });

  // Buscar turmas config para matching por idade
  const { data: allTurmas } = useQuery({
    queryKey: ["kids-turmas-config-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("kids_turmas_config").select("*").order("idade_minima");
      if (error) throw error;
      return data;
    },
  });

  // Buscar checkins já feitos hoje
  const { data: todayCheckins } = useQuery({
    queryKey: ["kids-checkins-today", hoje, memberProfile?.id],
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

  // Filtrar filhos que pertencem a esta turma
  const filhosDaTurma = filhos?.filter(child => {
    if (child.turmaOverride) return child.turmaOverride === turma;
    const idadeTurmaChild = kidsAgeForTurma(child.birthDate);
    const matchedTurma = allTurmas?.find(t => idadeTurmaChild >= t.idade_minima && idadeTurmaChild <= t.idade_maxima);
    return matchedTurma?.turma === turma;
  }) || [];

  // Check-me mutation
  const checkMeMutation = useMutation({
    mutationFn: async (child: any) => {
      const token = crypto.randomUUID().replace(/-/g, "").substring(0, 16);
      const { data, error } = await supabase
        .from("kids_checkins")
        .insert({
          crianca_member_id: child.tipo === "membro" ? child.id : null,
          crianca_novo_convertido_id: child.tipo === "novo_convertido" ? child.id : null,
          turma: turma as any,
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
      return { ...data, token };
    },
    onSuccess: (data) => {
      setCheckedInChild(data);
      setGeneratedToken(data.token);
      toast({ title: "Check-me realizado!", description: "Etiqueta gerada com sucesso." });
      queryClient.invalidateQueries({ queryKey: ["kids-checkins"] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    },
  });

  const isAlreadyCheckedIn = (childId: string) => {
    return todayCheckins?.some(c => c.crianca_member_id === childId || c.crianca_novo_convertido_id === childId);
  };

  const getExistingCheckin = (childId: string) => {
    return todayCheckins?.find(c => c.crianca_member_id === childId || c.crianca_novo_convertido_id === childId);
  };

  const handlePrintEtiqueta = () => {
    window.print();
  };

  if (authLoading || loadingFilhos) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  if (!user) return null;

  const baseUrl = window.location.origin;

  // Show etiqueta after check-me
  if (checkedInChild && generatedToken) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-md mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => { setCheckedInChild(null); setGeneratedToken(null); }}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-heading font-bold text-xl">Etiqueta Gerada</h1>
          </div>

          {/* Etiqueta para impressão */}
          <div id="etiqueta-print" className="bg-white rounded-xl border-2 p-6 space-y-4" style={{ borderColor: turmaConfig?.cor_hex }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={logoGileade} alt="Logo" className="w-8 h-8 rounded-full" />
                <span className="font-bold text-sm">Kids</span>
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
            <Button className="flex-1" onClick={handlePrintEtiqueta}>
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <img src={logoGileade} alt="Logo" className="w-10 h-10 rounded-full shadow" />
          <div>
            <h1 className="font-heading font-bold text-xl">Check-in Kids</h1>
            <p className="text-sm text-muted-foreground">
              Turma {turmaConfig?.nome_exibicao}
            </p>
          </div>
          {turmaConfig && (
            <div className="ml-auto w-6 h-6 rounded-full" style={{ backgroundColor: turmaConfig.cor_hex }} />
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Olá, <strong>{memberProfile?.full_name?.split(" ")[0]}</strong>! Selecione seu filho(a) para fazer o check-me:
        </p>

        {filhosDaTurma.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Baby className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">
                Nenhum filho(a) encontrado na turma {turmaConfig?.nome_exibicao}.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Verifique se o cadastro está correto ou se esta é a turma certa.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filhosDaTurma.map(child => {
              const alreadyChecked = isAlreadyCheckedIn(child.id);
              const existing = getExistingCheckin(child.id);
              return (
                <Card
                  key={child.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${alreadyChecked ? "opacity-60" : ""}`}
                  style={{ borderLeftWidth: 4, borderLeftColor: turmaConfig?.cor_hex }}
                  onClick={() => {
                    if (alreadyChecked) {
                      // Show existing etiqueta
                      if (existing) {
                        setCheckedInChild(existing);
                        setGeneratedToken(existing.token);
                      }
                    } else {
                      checkMeMutation.mutate(child);
                    }
                  }}
                >
                  <CardContent className="py-4 flex items-center gap-4">
                    <Avatar className="w-16 h-16 border-2" style={{ borderColor: turmaConfig?.cor_hex }}>
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

export default KidsCheckinPage;
