import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Send,
  Phone,
  Server,
  Loader2,
  Activity,
} from "lucide-react";
import { toast } from "sonner";

interface StatusResponse {
  provider: string;
  configured: boolean;
  connected: boolean;
  state?: string;
  instance_name?: string;
  api_host?: string;
  owner_number?: string | null;
  owner_number_masked?: string | null;
  owner_name?: string | null;
  profile_picture_url?: string | null;
  latency_ms?: number;
  last_response_status?: number;
  last_response_body?: any;
  missing?: string[];
  message?: string;
  error?: string;
  checked_at: string;
}

interface TestResult {
  ok: boolean;
  at: string;
  status?: number;
  message: string;
  raw?: any;
}

function formatPhone(p?: string | null) {
  if (!p) return "—";
  const d = p.replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) {
    const ddd = d.slice(2, 4);
    const num = d.slice(4);
    if (num.length === 9) return `+55 (${ddd}) ${num.slice(0, 5)}-${num.slice(5)}`;
    if (num.length === 8) return `+55 (${ddd}) ${num.slice(0, 4)}-${num.slice(4)}`;
  }
  return p;
}

export default function WhatsappConfiguracaoPage() {
  const navigate = useNavigate();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [testTelefone, setTestTelefone] = useState("");
  const [testMensagem, setTestMensagem] = useState(
    "🔧 Teste de conexão Gileade Church.\n\nSe você recebeu esta mensagem, a integração está funcionando! ✅",
  );
  const [testando, setTestando] = useState(false);
  const [historico, setHistorico] = useState<TestResult[]>([]);

  const {
    data: status,
    isLoading,
    isFetching,
    refetch,
    error,
  } = useQuery<StatusResponse>({
    queryKey: ["whatsapp-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("whatsapp-status", {
        body: {},
      });
      if (error) throw error;
      return data as StatusResponse;
    },
    refetchInterval: autoRefresh ? 15_000 : false,
    refetchOnWindowFocus: false,
  });

  // Métricas da fila (últimas 24h)
  const { data: filaStats } = useQuery({
    queryKey: ["whatsapp-fila-stats"],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("comunicacao_envios")
        .select("status")
        .gte("created_at", since);
      if (error) throw error;
      const arr = data || [];
      const enviados = arr.filter((r: any) =>
        ["enviado", "sucesso"].includes(r.status || ""),
      ).length;
      const erros = arr.filter((r: any) =>
        ["erro", "falhou"].includes(r.status || ""),
      ).length;
      const pendentes = arr.filter((r: any) =>
        ["pendente", "processando"].includes(r.status || ""),
      ).length;
      return { total: arr.length, enviados, erros, pendentes };
    },
    refetchInterval: autoRefresh ? 15_000 : false,
  });

  async function handleTeste() {
    const telefone = testTelefone.replace(/\D/g, "");
    if (telefone.length < 10) {
      toast.error("Informe um telefone válido (com DDD).");
      return;
    }
    if (!testMensagem.trim()) {
      toast.error("Mensagem vazia.");
      return;
    }
    setTestando(true);
    const startedAt = new Date().toISOString();
    try {
      const { data, error } = await supabase.functions.invoke("enviar-whatsapp", {
        body: {
          action: "mensagem_direta",
          telefone,
          mensagem: testMensagem,
        },
      });
      if (error) throw error;
      const ok = !!data?.success;
      const result: TestResult = {
        ok,
        at: startedAt,
        status: 200,
        message: ok
          ? "Mensagem enviada com sucesso para o WhatsApp."
          : data?.error || "Falha ao enviar — verifique o painel abaixo.",
        raw: data,
      };
      setHistorico((h) => [result, ...h].slice(0, 10));
      if (ok) toast.success("Mensagem de teste enviada");
      else toast.error(result.message);
    } catch (err: any) {
      const result: TestResult = {
        ok: false,
        at: startedAt,
        message: err?.message || "Erro desconhecido",
        raw: err,
      };
      setHistorico((h) => [result, ...h].slice(0, 10));
      toast.error(result.message);
    } finally {
      setTestando(false);
    }
  }

  const statusBadge = useMemo(() => {
    if (isLoading) {
      return (
        <Badge variant="secondary" className="gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" />
          Verificando…
        </Badge>
      );
    }
    if (!status?.configured) {
      return (
        <Badge className="gap-1.5 bg-amber-500 hover:bg-amber-500/90 text-white">
          <AlertTriangle className="w-3 h-3" />
          Não configurado
        </Badge>
      );
    }
    if (status.connected) {
      return (
        <Badge className="gap-1.5 bg-green-600 hover:bg-green-600/90 text-white">
          <CheckCircle2 className="w-3 h-3" />
          Conectado
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="gap-1.5">
        <XCircle className="w-3 h-3" />
        Desconectado
      </Badge>
    );
  }, [isLoading, status]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Configuração do WhatsApp</h1>
            <p className="text-sm text-muted-foreground">
              Provedor de envio, status da conexão e teste em tempo real
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
            />
            Atualizar
          </Button>
        </div>

        {/* Status principal */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-600" />
                Status da conexão
              </CardTitle>
              {statusBadge}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <strong>Falha ao consultar status:</strong>{" "}
                {(error as Error)?.message || "Erro desconhecido"}
              </div>
            )}

            {status && !status.configured && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                <p className="font-medium mb-1">Variáveis de ambiente faltando</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  {(status.missing || []).map((m) => (
                    <li key={m}>
                      <code>{m}</code>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">
                  Configure os secrets em Lovable Cloud para habilitar a
                  integração.
                </p>
              </div>
            )}

            {status && status.configured && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow
                  icon={<Server className="w-4 h-4" />}
                  label="Provedor"
                  value={status.provider}
                />
                <InfoRow
                  icon={<Server className="w-4 h-4" />}
                  label="Servidor"
                  value={status.api_host || "—"}
                  mono
                />
                <InfoRow
                  icon={<Server className="w-4 h-4" />}
                  label="Instância"
                  value={status.instance_name || "—"}
                  mono
                />
                <InfoRow
                  icon={<Phone className="w-4 h-4" />}
                  label="Número remetente"
                  value={
                    status.owner_number
                      ? formatPhone(status.owner_number)
                      : status.connected
                        ? "—"
                        : "(indisponível: desconectado)"
                  }
                  mono={!!status.owner_number}
                />
                <InfoRow
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  label="Estado bruto"
                  value={status.state || "—"}
                  mono
                />
                <InfoRow
                  icon={<Activity className="w-4 h-4" />}
                  label="Latência"
                  value={
                    status.latency_ms !== undefined
                      ? `${status.latency_ms} ms`
                      : "—"
                  }
                />
              </div>
            )}

            <Separator />

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                Última verificação:{" "}
                {status?.checked_at
                  ? new Date(status.checked_at).toLocaleString("pt-BR")
                  : "—"}
              </span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                Atualizar automaticamente (15s)
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Métricas 24h */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Envios 24h" value={filaStats?.total ?? "—"} />
          <StatCard
            label="Sucesso"
            value={filaStats?.enviados ?? "—"}
            tone="success"
          />
          <StatCard
            label="Erros"
            value={filaStats?.erros ?? "—"}
            tone="destructive"
          />
          <StatCard
            label="Pendentes"
            value={filaStats?.pendentes ?? "—"}
            tone="warning"
          />
        </div>

        {/* Teste de envio */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-green-600" />
              Enviar mensagem de teste
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-1 space-y-2">
                <Label htmlFor="tel">Telefone (com DDD)</Label>
                <Input
                  id="tel"
                  placeholder="11999999999"
                  value={testTelefone}
                  onChange={(e) => setTestTelefone(e.target.value)}
                  inputMode="numeric"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="msg">Mensagem</Label>
                <Textarea
                  id="msg"
                  rows={3}
                  value={testMensagem}
                  onChange={(e) => setTestMensagem(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleTeste}
                disabled={testando || !status?.connected}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                {testando ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Enviar teste
              </Button>
            </div>

            {!status?.connected && (
              <p className="text-xs text-muted-foreground">
                O envio de teste é desabilitado enquanto a integração não está
                conectada.
              </p>
            )}

            {historico.length > 0 && (
              <div className="space-y-2">
                <Label>Resultados recentes</Label>
                <div className="space-y-2 max-h-72 overflow-auto">
                  {historico.map((h, i) => (
                    <div
                      key={i}
                      className={`rounded-md border p-2.5 text-xs ${
                        h.ok
                          ? "border-green-500/30 bg-green-500/5"
                          : "border-destructive/40 bg-destructive/5"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="flex items-center gap-1.5 font-medium">
                          {h.ok ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-destructive" />
                          )}
                          {h.ok ? "Sucesso" : "Falha"}
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(h.at).toLocaleTimeString("pt-BR")}
                        </span>
                      </div>
                      <p className="text-muted-foreground break-words">
                        {h.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detalhes técnicos */}
        {status?.last_response_body && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-sm">Resposta bruta do provedor</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-[11px] bg-muted/40 rounded-md p-3 overflow-auto max-h-72">
                {JSON.stringify(status.last_response_body, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`truncate ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "success" | "destructive" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "text-green-600"
      : tone === "destructive"
        ? "text-destructive"
        : tone === "warning"
          ? "text-amber-600"
          : "text-foreground";
  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${toneClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}