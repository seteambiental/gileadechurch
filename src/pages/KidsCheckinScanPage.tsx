import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogIn, LogOut, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import logoGileade from "@/assets/logo-gileade.jpeg";

const KidsCheckinScanPage = () => {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [actionDone, setActionDone] = useState<string | null>(null);

  // Buscar checkin pelo token
  const { data: checkin, isLoading, error } = useQuery({
    queryKey: ["kids-checkin-token", token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kids_checkins")
        .select("*")
        .eq("token", token!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!token,
  });

  // Buscar turma config
  const { data: turmaConfig } = useQuery({
    queryKey: ["kids-turma-config-scan", checkin?.turma],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kids_turmas_config")
        .select("*")
        .eq("turma", checkin!.turma)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!checkin?.turma,
  });

  // Buscar member_id do user logado
  const { data: memberProfile } = useQuery({
    queryKey: ["member-profile-scan", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name")
        .eq("user_id", user!.id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!user,
  });

  // CHECK-IN mutation (professor/monitor)
  const checkInMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("kids_checkins")
        .update({
          check_in_at: new Date().toISOString(),
          check_in_by: memberProfile?.id || null,
        })
        .eq("id", checkin!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setActionDone("check-in");
      toast({ title: "Check-in realizado!", description: `${checkin?.crianca_nome} entrou na sala.` });
      queryClient.invalidateQueries({ queryKey: ["kids-checkin-token", token] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    },
  });

  // CHECK-OUT mutation (responsável obrigatório)
  const checkOutMutation = useMutation({
    mutationFn: async () => {
      // Verificar se é o responsável
      if (checkin?.responsavel_member_id !== memberProfile?.id) {
        throw new Error("Apenas o responsável pode realizar o check-out.");
      }
      const { error } = await supabase
        .from("kids_checkins")
        .update({
          check_out_at: new Date().toISOString(),
          check_out_by: memberProfile?.id || null,
        })
        .eq("id", checkin!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setActionDone("check-out");
      toast({ title: "Check-out realizado!", description: `${checkin?.crianca_nome} foi retirado(a).` });
      queryClient.invalidateQueries({ queryKey: ["kids-checkin-token", token] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    },
  });

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  if (error || !checkin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive" />
            <h2 className="font-bold text-lg mb-2">Token inválido</h2>
            <p className="text-muted-foreground">Este QR code não é válido ou já expirou.</p>
            <Button className="mt-4" onClick={() => navigate("/")}>Voltar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine current status and available actions
  const hasCheckMe = !!checkin.check_me_at;
  const hasCheckIn = !!checkin.check_in_at;
  const hasCheckOut = !!checkin.check_out_at;
  const isResponsavel = memberProfile?.id === checkin.responsavel_member_id;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <img src={logoGileade} alt="Logo" className="w-10 h-10 rounded-full shadow" />
          <div>
            <h1 className="font-heading font-bold text-xl">Kids Check-in</h1>
            <p className="text-sm text-muted-foreground">Escaneamento de etiqueta</p>
          </div>
        </div>

        {/* Criança info */}
        <Card className="border-2" style={{ borderColor: turmaConfig?.cor_hex }}>
          <CardContent className="py-6">
            <div className="text-center space-y-3">
              <div className="w-10 h-10 rounded-full mx-auto" style={{ backgroundColor: turmaConfig?.cor_hex }} />
              <h2 className="font-bold text-2xl">{checkin.crianca_nome}</h2>
              <Badge style={{ backgroundColor: turmaConfig?.cor_hex, color: "white" }}>
                {turmaConfig?.nome_exibicao}
              </Badge>
              <p className="text-sm text-muted-foreground">
                Responsável: <strong>{checkin.responsavel_nome}</strong>
              </p>
            </div>

            {/* Timeline */}
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${hasCheckMe ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Check-me</p>
                  <p className="text-xs text-muted-foreground">
                    {hasCheckMe ? format(new Date(checkin.check_me_at!), "HH:mm") : "Pendente"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${hasCheckIn ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                  <LogIn className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Check-in (Entrada)</p>
                  <p className="text-xs text-muted-foreground">
                    {hasCheckIn ? format(new Date(checkin.check_in_at!), "HH:mm") : "Aguardando professor"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${hasCheckOut ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground"}`}>
                  <LogOut className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Check-out (Saída)</p>
                  <p className="text-xs text-muted-foreground">
                    {hasCheckOut ? format(new Date(checkin.check_out_at!), "HH:mm") : "Aguardando responsável"}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-3">
              {actionDone === "check-in" && (
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <p className="font-bold text-green-700">Check-in confirmado!</p>
                  <p className="text-sm text-green-600">{checkin.crianca_nome} está na sala.</p>
                </div>
              )}

              {actionDone === "check-out" && (
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <p className="font-bold text-blue-700">Check-out confirmado!</p>
                  <p className="text-sm text-blue-600">{checkin.crianca_nome} foi retirado(a) com segurança.</p>
                </div>
              )}

              {!actionDone && !hasCheckIn && hasCheckMe && (
                <>
                  {!user ? (
                    <Button className="w-full" onClick={() => navigate(`/auth?redirect=/kids/scan/${token}`)}>
                      Fazer login para Check-in
                    </Button>
                  ) : (
                    <Button
                      className="w-full h-14 text-lg"
                      onClick={() => checkInMutation.mutate()}
                      disabled={checkInMutation.isPending}
                      style={{ backgroundColor: turmaConfig?.cor_hex }}
                    >
                      {checkInMutation.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      ) : (
                        <LogIn className="h-5 w-5 mr-2" />
                      )}
                      CHECK-IN (Entrada)
                    </Button>
                  )}
                </>
              )}

              {!actionDone && hasCheckIn && !hasCheckOut && (
                <>
                  {!user ? (
                    <Button className="w-full" onClick={() => navigate(`/auth?redirect=/kids/scan/${token}`)}>
                      Fazer login para Check-out
                    </Button>
                  ) : isResponsavel ? (
                    <Button
                      className="w-full h-14 text-lg"
                      variant="outline"
                      onClick={() => checkOutMutation.mutate()}
                      disabled={checkOutMutation.isPending}
                    >
                      {checkOutMutation.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      ) : (
                        <LogOut className="h-5 w-5 mr-2" />
                      )}
                      CHECK-OUT (Retirar criança)
                    </Button>
                  ) : (
                    <div className="p-4 bg-amber-50 rounded-lg text-center">
                      <AlertCircle className="h-6 w-6 mx-auto mb-2 text-amber-600" />
                      <p className="text-sm text-amber-700">
                        Apenas o responsável ({checkin.responsavel_nome}) pode realizar o check-out.
                      </p>
                    </div>
                  )}
                </>
              )}

              {hasCheckOut && !actionDone && (
                <div className="p-4 bg-muted rounded-lg text-center">
                  <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Ciclo completo. Criança já foi retirada.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default KidsCheckinScanPage;
