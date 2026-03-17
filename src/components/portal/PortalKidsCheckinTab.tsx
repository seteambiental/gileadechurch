import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Baby, CheckCircle2, LogIn, LogOut, Clock, QrCode, ExternalLink, Loader2 } from "lucide-react";
import { format, differenceInYears } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { kidsAgeForTurma } from "@/lib/age-utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface PortalKidsCheckinTabProps {
  memberId: string;
  memberName: string;
}

export const PortalKidsCheckinTab = ({ memberId, memberName }: PortalKidsCheckinTabProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hoje = format(new Date(), "yyyy-MM-dd");
  const baseUrl = window.location.origin;

  // Buscar filhos do responsável
  const { data: filhos, isLoading } = useQuery({
    queryKey: ["portal-kids-filhos", memberId],
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

      const { data: directChildren } = await supabase
        .from("members")
        .select("id, full_name, birth_date, photo_url, genero, kids_turma_override")
        .eq("responsavel_id", memberId)
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
        if (idade > 12) return;
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
        const idadeTurma = kidsAgeForTurma(child.birth_date);
        if (idadeTurma > 12) return;
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
  });

  // Buscar turmas config
  const { data: turmasConfig } = useQuery({
    queryKey: ["kids-turmas-config-portal"],
    queryFn: async () => {
      const { data, error } = await supabase.from("kids_turmas_config").select("*").order("idade_minima");
      if (error) throw error;
      return data;
    },
  });

  // Buscar checkins de hoje dos filhos
  const { data: todayCheckins } = useQuery({
    queryKey: ["kids-checkins-portal", hoje, memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kids_checkins")
        .select("*")
        .eq("data_culto", hoje)
        .eq("responsavel_member_id", memberId);
      if (error) throw error;
      return data;
    },
  });

  const getTurmaForChild = (child: any) => {
    if (child.turmaOverride) return turmasConfig?.find(t => t.turma === child.turmaOverride);
    return turmasConfig?.find(t => child.idade >= t.idade_minima && child.idade <= t.idade_maxima);
  };

  const getCheckinForChild = (childId: string) => {
    return todayCheckins?.find(c => c.crianca_member_id === childId || c.crianca_novo_convertido_id === childId);
  };

  // Check-me mutation
  const checkMeMutation = useMutation({
    mutationFn: async (child: any) => {
      const turmaConfig = getTurmaForChild(child);
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
      return data;
    },
    onSuccess: () => {
      toast.success("Check-me realizado!");
      queryClient.invalidateQueries({ queryKey: ["kids-checkins-portal"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Check-out mutation
  const checkOutMutation = useMutation({
    mutationFn: async (checkinId: string) => {
      const { error } = await supabase
        .from("kids_checkins")
        .update({ check_out_at: new Date().toISOString() })
        .eq("id", checkinId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Check-out realizado! Criança entregue ao responsável.");
      queryClient.invalidateQueries({ queryKey: ["kids-checkins-portal"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (!filhos?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Baby className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <h3 className="font-bold text-lg mb-2">Check-me PG Kids</h3>
          <p className="text-muted-foreground">
            Nenhum filho(a) cadastrado no ministério Kids.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Check-me PG Kids
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            <strong>Fluxo:</strong> Check-me (presença) → Check-in (entrada na sala pelo professor) → Check-out (retirada pelo responsável)
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Para fazer o check-me, escaneie o QR Code da turma ou clique no botão abaixo.
          </p>

          <div className="space-y-3">
            {filhos.map(child => {
              const turma = getTurmaForChild(child);
              const checkin = getCheckinForChild(child.id);
              const hasCheckMe = !!checkin?.check_me_at;
              const hasCheckIn = !!checkin?.check_in_at;
              const hasCheckOut = !!checkin?.check_out_at;

              return (
                <Card key={child.id} className="border-l-4" style={{ borderLeftColor: turma?.cor_hex }}>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-14 h-14 border-2" style={{ borderColor: turma?.cor_hex }}>
                        <AvatarImage src={child.foto || undefined} />
                        <AvatarFallback className="text-lg font-bold">{child.nome.charAt(0)}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <h3 className="font-bold">{child.nome}</h3>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            style={{ borderColor: turma?.cor_hex, color: turma?.cor_hex }}
                          >
                            {turma?.nome_exibicao || "Sem turma"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{child.idade} anos</span>
                        </div>

                        {/* Status badges */}
                        {checkin && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {hasCheckMe && (
                              <Badge className="bg-amber-100 text-amber-700 text-[10px]">
                                <CheckCircle2 className="h-3 w-3 mr-0.5" />
                                Check-me {format(new Date(checkin.check_me_at!), "HH:mm")}
                              </Badge>
                            )}
                            {hasCheckIn && (
                              <Badge className="bg-green-100 text-green-700 text-[10px]">
                                <LogIn className="h-3 w-3 mr-0.5" />
                                Entrada {format(new Date(checkin.check_in_at!), "HH:mm")}
                              </Badge>
                            )}
                            {hasCheckOut && (
                              <Badge className="bg-blue-100 text-blue-700 text-[10px]">
                                <LogOut className="h-3 w-3 mr-0.5" />
                                Saída {format(new Date(checkin.check_out_at!), "HH:mm")}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-1">
                        {/* Botão Check-me: se ainda não tem checkin */}
                        {!checkin && turma && (
                          <Button
                            size="sm"
                            onClick={() => checkMeMutation.mutate(child)}
                            disabled={checkMeMutation.isPending}
                          >
                            {checkMeMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                            )}
                            Check-me
                          </Button>
                        )}
                        {/* Ver etiqueta */}
                        {checkin && !hasCheckOut && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/kids/scan/${checkin.token}`)}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Etiqueta
                          </Button>
                        )}
                        {/* Botão Check-out: após check-in, antes de check-out */}
                        {checkin && hasCheckIn && !hasCheckOut && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => checkOutMutation.mutate(checkin.id)}
                            disabled={checkOutMutation.isPending}
                          >
                            {checkOutMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <LogOut className="h-4 w-4 mr-1" />
                            )}
                            Check-out
                          </Button>
                        )}
                        {/* Aguardando check-in */}
                        {checkin && hasCheckMe && !hasCheckIn && !hasCheckOut && (
                          <span className="text-[10px] text-muted-foreground text-center">
                            Aguardando entrada
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mini etiqueta com QR se já fez check-me */}
                    {checkin && !hasCheckOut && (
                      <div className="mt-3 pt-3 border-t flex items-center gap-3 bg-muted/30 rounded-lg p-3">
                        <QRCodeSVG
                          value={`${baseUrl}/kids/scan/${checkin.token}`}
                          size={60}
                          level="H"
                          fgColor={turma?.cor_hex || "#000"}
                        />
                        <div className="text-xs text-muted-foreground">
                          <p>Mostre este QR ao professor para <strong>entrada na sala</strong>.</p>
                          <p>Faça o <strong>check-out</strong> ao buscar a criança.</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
