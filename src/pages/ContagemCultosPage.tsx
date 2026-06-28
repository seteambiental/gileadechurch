import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  LogIn,
  LogOut,
  Plus,
  RotateCcw,
  Power,
  Users,
  Copy,
} from "lucide-react";
import CounterDisplay from "@/components/contagem/CounterDisplay";

interface Sessao {
  id: string;
  titulo: string;
  tipo_culto: string;
  data: string;
  entradas: number;
  saidas: number;
  ativo: boolean;
  token: string;
}

const ContagemCultosPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [novoTitulo, setNovoTitulo] = useState("Culto de Domingo");
  const [novoTipo, setNovoTipo] = useState("domingo");

  const { data: sessoes = [], isLoading } = useQuery({
    queryKey: ["contagem-cultos"],
    queryFn: async (): Promise<Sessao[]> => {
      const { data, error } = await supabase
        .from("contagem_cultos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data as Sessao[];
    },
  });

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("contagem-cultos-admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contagem_cultos" },
        () => queryClient.invalidateQueries({ queryKey: ["contagem-cultos"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const sessaoAtiva = useMemo(() => sessoes.find((s) => s.ativo), [sessoes]);
  const historico = useMemo(() => sessoes.filter((s) => !s.ativo), [sessoes]);

  const criarSessao = async () => {
    // Encerra sessões ativas antes de criar nova
    await supabase.from("contagem_cultos").update({ ativo: false }).eq("ativo", true);
    const { error } = await supabase.from("contagem_cultos").insert({
      titulo: novoTitulo || "Culto",
      tipo_culto: novoTipo,
      created_by: user?.id ?? null,
    });
    if (error) {
      toast.error("Erro ao criar sessão: " + error.message);
      return;
    }
    toast.success("Sessão de contagem iniciada");
    queryClient.invalidateQueries({ queryKey: ["contagem-cultos"] });
  };

  const ajustar = async (s: Sessao, campo: "entradas" | "saidas", delta: number) => {
    const novoValor = Math.max(0, (s[campo] ?? 0) + delta);
    const { error } = await supabase
      .from("contagem_cultos")
      .update({ [campo]: novoValor })
      .eq("id", s.id);
    if (error) toast.error(error.message);
  };

  const resetar = async (s: Sessao) => {
    if (!confirm("Zerar a contagem desta sessão?")) return;
    const { error } = await supabase
      .from("contagem_cultos")
      .update({ entradas: 0, saidas: 0 })
      .eq("id", s.id);
    if (error) toast.error(error.message);
    else toast.success("Contagem zerada");
  };

  const encerrar = async (s: Sessao) => {
    if (!confirm("Encerrar esta sessão de contagem?")) return;
    const { error } = await supabase
      .from("contagem_cultos")
      .update({ ativo: false })
      .eq("id", s.id);
    if (error) toast.error(error.message);
    else toast.success("Sessão encerrada");
  };

  const abrirPainel = (s: Sessao) => {
    window.open(
      `/contagem/painel?id=${s.id}`,
      "PainelContagem",
      "width=1280,height=720,menubar=no,toolbar=no,location=no,status=no",
    );
  };

  const copiarEndpoint = (s: Sessao) => {
    const base = import.meta.env.VITE_SUPABASE_URL;
    const url = `${base}/functions/v1/contagem-culto?token=${s.token}&tipo=entrada`;
    navigator.clipboard.writeText(url);
    toast.success("Endpoint da câmera copiado");
  };

  const pessoasDe = (s: Sessao) => Math.max(0, (s.entradas ?? 0) - (s.saidas ?? 0));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-surfaceInverse text-primary-foreground">
        <div className="container mx-auto px-4 h-16 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/app")}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <h1 className="font-heading font-bold text-lg">Contagem de Cultos</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-3xl">
        {/* Sessão ativa */}
        {sessaoAtiva ? (
          <Card className="border-secondary/30">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-lg">{sessaoAtiva.titulo}</CardTitle>
                <span className="text-xs font-semibold text-secondary uppercase tracking-wide flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" /> Ao vivo
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-xl bg-muted/40 py-6 px-4 border">
                <CounterDisplay pessoas={pessoasDe(sessaoAtiva)} compact />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-2">Entradas</p>
                  <p className="text-2xl font-bold text-foreground mb-2">{sessaoAtiva.entradas}</p>
                  <div className="flex gap-2 justify-center">
                    <Button size="sm" variant="outline" onClick={() => ajustar(sessaoAtiva, "entradas", -1)}>−</Button>
                    <Button size="sm" className="gap-1" onClick={() => ajustar(sessaoAtiva, "entradas", 1)}>
                      <LogIn className="w-4 h-4" /> +1
                    </Button>
                  </div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-2">Saídas</p>
                  <p className="text-2xl font-bold text-foreground mb-2">{sessaoAtiva.saidas}</p>
                  <div className="flex gap-2 justify-center">
                    <Button size="sm" variant="outline" onClick={() => ajustar(sessaoAtiva, "saidas", -1)}>−</Button>
                    <Button size="sm" variant="secondary" className="gap-1" onClick={() => ajustar(sessaoAtiva, "saidas", 1)}>
                      <LogOut className="w-4 h-4" /> +1
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => abrirPainel(sessaoAtiva)} className="gap-2 flex-1">
                  <ExternalLink className="w-4 h-4" /> Abrir painel no telão
                </Button>
                <Button variant="outline" onClick={() => copiarEndpoint(sessaoAtiva)} className="gap-2">
                  <Copy className="w-4 h-4" /> Câmera
                </Button>
                <Button variant="outline" onClick={() => resetar(sessaoAtiva)} className="gap-2">
                  <RotateCcw className="w-4 h-4" /> Zerar
                </Button>
                <Button variant="destructive" onClick={() => encerrar(sessaoAtiva)} className="gap-2">
                  <Power className="w-4 h-4" /> Encerrar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Nova contagem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Título do culto</Label>
                <Input value={novoTitulo} onChange={(e) => setNovoTitulo(e.target.value)} placeholder="Culto de Domingo" />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={novoTipo} onValueChange={setNovoTipo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="domingo">Domingo</SelectItem>
                    <SelectItem value="quarta">Quarta-feira</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={criarSessao} className="gap-2 w-full">
                <Plus className="w-4 h-4" /> Iniciar contagem
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Histórico (indicadores) */}
        <div>
          <h2 className="font-heading font-bold text-lg mb-3">Histórico</h2>
          {historico.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma contagem anterior.</p>
          ) : (
            <div className="space-y-2">
              {historico.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div>
                    <p className="font-semibold text-sm">{s.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.data + "T00:00:00").toLocaleDateString("pt-BR")} · {s.tipo_culto}
                    </p>
                  </div>
                  <span className="text-2xl font-heading font-bold text-secondary tabular-nums">{pessoasDe(s)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ContagemCultosPage;