import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, MessageSquare, Search, Filter, RefreshCw, CheckCircle2, XCircle, Clock, ListOrdered, History, RotateCcw, Play, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserAccess } from "@/hooks/useUserAccess";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type Envio = {
  id: string;
  tipo: string | null;
  segmento: string | null;
  destinatario_telefone: string | null;
  destinatario_nome: string | null;
  destinatario_member_id: string | null;
  conteudo: string | null;
  midia_url: string | null;
  status: string | null;
  erro_mensagem: string | null;
  evento_id: string | null;
  iniciado_por: string | null;
  created_at: string;
  confirmacao_solicitada?: boolean | null;
  confirmado_em?: string | null;
  confirmacao_resposta?: string | null;
  provider_message_id?: string | null;
  provider_status?: string | null;
  provider_status_code?: number | null;
  entregue_em?: string | null;
  lido_em?: string | null;
};

const TIPO_LABELS: Record<string, string> = {
  inscricao_recebida: "Inscrição Recebida",
  confirmacao_inscricao: "Inscrição Confirmada",
  cadastro_aprovado: "Cadastro Aprovado",
  flyer_homepage: "Flyer Homepage",
  segmentado: "Segmentado",
  manual: "Manual",
  individual: "Individual",
  massa: "Em Massa",
  emergencia_inicial: "Emergência (inicial)",
  emergencia_manual: "Emergência (manual)",
  emergencia_recorrente: "Emergência (recorrente)",
  admin_nova_inscricao: "Admin · Nova Inscrição",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  enviado: "default",
  sucesso: "default",
  aceito_provedor: "secondary",
  entregue: "default",
  lido: "default",
  erro: "destructive",
  falhou: "destructive",
  pendente: "secondary",
};

const STATUS_LABELS: Record<string, string> = {
  aceito_provedor: "Aceito pela API",
  enviado: "Aceito pela API",
  sucesso: "Aceito pela API",
  entregue: "Entregue",
  lido: "Lido",
  erro: "Erro",
  falhou: "Falhou",
  pendente: "Pendente",
};

const ComunicacaoAuditoriaPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isStrictAdmin, loading: accessLoading } = useUserAccess(user?.id);

  const [tab, setTab] = useState<"historico" | "fila">("historico");
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [segmentoFiltro, setSegmentoFiltro] = useState<string>("todos");
  const [confirmacaoFiltro, setConfirmacaoFiltro] = useState<string>("todos");
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  const { data: envios = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["comunicacao-envios", dataInicio, dataFim],
    queryFn: async () => {
      let query = supabase
        .from("comunicacao_envios")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (dataInicio) query = query.gte("created_at", `${dataInicio}T00:00:00`);
      if (dataFim) query = query.lte("created_at", `${dataFim}T23:59:59`);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Envio[];
    },
    enabled: !!user && (isAdmin || isStrictAdmin),
  });

  const { data: fila = [], isLoading: filaLoading, refetch: refetchFila, isRefetching: filaRefetching } = useQuery({
    queryKey: ["comunicacao-fila"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comunicacao_fila")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user && (isAdmin || isStrictAdmin),
    refetchInterval: tab === "fila" ? 10_000 : false,
  });

  const filaStats = useMemo(() => {
    return {
      pendente: fila.filter((f) => f.status === "pendente").length,
      processando: fila.filter((f) => f.status === "processando").length,
      enviado: fila.filter((f) => ["enviado", "aceito_provedor"].includes(f.status)).length,
      entregue: fila.filter((f) => ["entregue", "lido"].includes(f.status)).length,
      descartado: fila.filter((f) => f.status === "descartado").length,
    };
  }, [fila]);

  const reprocessarItem = async (id: string) => {
    const { error } = await supabase
      .from("comunicacao_fila")
      .update({
        status: "pendente",
        tentativas: 0,
        ultimo_erro: null,
        proxima_tentativa_em: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) {
      toast({ title: "Erro ao reprocessar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Item reagendado", description: "Será enviado no próximo ciclo." });
    refetchFila();
  };

  const reenviarEnvio = async (envio: Envio) => {
    if (!envio.destinatario_telefone || !envio.conteudo) {
      toast({ title: "Não é possível reenviar", description: "Telefone ou conteúdo ausente.", variant: "destructive" });
      return;
    }
    const tel = (envio.destinatario_telefone || "").replace(/\D/g, "");
    const dedupeHash = `reenvio-${envio.id}-${Date.now().toString(36)}`;
    const { error } = await supabase.from("comunicacao_fila").insert({
      tipo: envio.tipo || "manual",
      segmento: envio.segmento,
      destinatario_telefone: tel,
      destinatario_nome: envio.destinatario_nome,
      destinatario_member_id: envio.destinatario_member_id,
      conteudo: envio.conteudo,
      midia_url: envio.midia_url,
      evento_id: envio.evento_id,
      iniciado_por: envio.iniciado_por,
      dedupe_hash: dedupeHash,
      status: "pendente",
      tentativas: 0,
      max_tentativas: 3,
      proxima_tentativa_em: new Date().toISOString(),
    });
    if (error) {
      toast({ title: "Erro ao reenviar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Reenvio agendado", description: `Mensagem para ${envio.destinatario_nome || envio.destinatario_telefone} foi reenfileirada.` });
    setTab("fila");
    refetchFila();
  };

  const processarAgora = async () => {
    return processarAgoraImpl();
  };

  const confirmarManualmente = async (envio: Envio) => {
    const { error } = await supabase
      .from("comunicacao_envios")
      .update({
        confirmado_em: new Date().toISOString(),
        confirmacao_resposta: "Confirmado manualmente pelo operador",
      })
      .eq("id", envio.id);
    if (error) {
      toast({ title: "Erro ao confirmar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Confirmação registrada", description: `Mensagem para ${envio.destinatario_nome || envio.destinatario_telefone} marcada como confirmada.` });
    refetch();
  };

  const processarAgoraImpl = async () => {
    setProcessando(true);
    try {
      const { error } = await supabase.functions.invoke("processar-fila-whatsapp", { body: {} });
      if (error) throw error;
      toast({
        title: "Processamento iniciado",
        description: "A fila está sendo processada em segundo plano. Atualize em alguns instantes para ver o resultado.",
      });
      // Dá um tempo para o envio escalonado acontecer antes de atualizar.
      setTimeout(() => {
        refetchFila();
        refetch();
      }, 6000);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Falha ao processar", variant: "destructive" });
    } finally {
      setProcessando(false);
    }
  };

  const tipos = useMemo(() => {
    const set = new Set<string>();
    envios.forEach((e) => e.tipo && set.add(e.tipo));
    return Array.from(set);
  }, [envios]);

  const segmentos = useMemo(() => {
    const set = new Set<string>();
    envios.forEach((e) => e.segmento && set.add(e.segmento));
    return Array.from(set);
  }, [envios]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return envios.filter((e) => {
      if (tipoFiltro !== "todos" && e.tipo !== tipoFiltro) return false;
      if (statusFiltro !== "todos") {
        const status = e.status || "";
        if (statusFiltro === "aceito_provedor") {
          if (!["aceito_provedor", "enviado", "sucesso"].includes(status)) return false;
        } else if (status !== statusFiltro) return false;
      }
      if (segmentoFiltro !== "todos" && (e.segmento || "") !== segmentoFiltro) return false;
      if (confirmacaoFiltro === "confirmado" && !e.confirmado_em) return false;
      if (confirmacaoFiltro === "aguardando" && (!e.confirmacao_solicitada || e.confirmado_em)) return false;
      if (q) {
        const haystack = [
          e.destinatario_nome,
          e.destinatario_telefone,
          e.conteudo,
          e.tipo,
          e.segmento,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [envios, busca, tipoFiltro, statusFiltro, segmentoFiltro, confirmacaoFiltro]);

  const stats = useMemo(() => {
    const total = filtrados.length;
    const aceito = filtrados.filter((e) => ["enviado", "sucesso", "aceito_provedor"].includes(e.status || "")).length;
    const entregue = filtrados.filter((e) => ["entregue", "lido"].includes(e.status || "")).length;
    const erro = filtrados.filter((e) => ["erro", "falhou"].includes(e.status || "")).length;
    const pendente = filtrados.filter((e) => e.status === "pendente").length;
    return { total, aceito, entregue, erro, pendente };
  }, [filtrados]);

  if (authLoading || accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin && !isStrictAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Acesso restrito a administradores.</p>
            <Button className="mt-4" onClick={() => navigate("/app")}>Voltar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderStatusIcon = (status: string | null) => {
    if (["entregue", "lido"].includes(status || "")) return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (["enviado", "sucesso", "aceito_provedor"].includes(status || "")) return <Clock className="h-4 w-4 text-muted-foreground" />;
    if (["erro", "falhou"].includes(status || "")) return <XCircle className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/app")}>
              <Home className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-bold">Auditoria de WhatsApp</h1>
                <p className="text-xs text-muted-foreground">Fila, histórico e auditoria de envios</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="default" size="sm" onClick={processarAgora} disabled={processando}>
              <Play className={`h-4 w-4 mr-2 ${processando ? "animate-pulse" : ""}`} />
              Processar fila agora
            </Button>
            <Button variant="outline" size="sm" onClick={() => { refetch(); refetchFila(); }} disabled={isRefetching || filaRefetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${(isRefetching || filaRefetching) ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "historico" | "fila")}>
          <TabsList>
            <TabsTrigger value="historico"><History className="h-4 w-4 mr-2" />Histórico</TabsTrigger>
            <TabsTrigger value="fila">
              <ListOrdered className="h-4 w-4 mr-2" />Fila
              {filaStats.pendente + filaStats.processando > 0 && (
                <Badge variant="secondary" className="ml-2">{filaStats.pendente + filaStats.processando}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="historico" className="space-y-6 mt-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Aceitos pela API</p>
              <p className="text-2xl font-bold text-muted-foreground">{stats.aceito}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Entregues/Lidos</p>
              <p className="text-2xl font-bold text-green-600">{stats.entregue}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Erros</p>
              <p className="text-2xl font-bold text-destructive">{stats.erro}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" /> Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="relative md:col-span-2 lg:col-span-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone ou conteúdo..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
              <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {tipos.map((t) => (
                  <SelectItem key={t} value={t}>{TIPO_LABELS[t] || t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="aceito_provedor">Aceito pela API</SelectItem>
                <SelectItem value="entregue">Entregue</SelectItem>
                <SelectItem value="lido">Lido</SelectItem>
                <SelectItem value="enviado">Aceito pela API (antigo)</SelectItem>
                <SelectItem value="sucesso">Sucesso</SelectItem>
                <SelectItem value="erro">Erro</SelectItem>
                <SelectItem value="falhou">Falhou</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
              </SelectContent>
            </Select>
            <Select value={segmentoFiltro} onValueChange={setSegmentoFiltro}>
              <SelectTrigger><SelectValue placeholder="Segmento" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os segmentos</SelectItem>
                {segmentos.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={confirmacaoFiltro} onValueChange={setConfirmacaoFiltro}>
              <SelectTrigger><SelectValue placeholder="Confirmação" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Confirmação (todas)</SelectItem>
                <SelectItem value="confirmado">Confirmado pelo destinatário</SelectItem>
                <SelectItem value="aguardando">Aguardando confirmação</SelectItem>
              </SelectContent>
            </Select>
            <div>
              <label className="text-xs text-muted-foreground">De</label>
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Até</label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setBusca("");
                  setTipoFiltro("todos");
                  setStatusFiltro("todos");
                  setSegmentoFiltro("todos");
                  setConfirmacaoFiltro("todos");
                  setDataInicio("");
                  setDataFim("");
                }}
              >
                Limpar filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filtrados.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum envio encontrado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">Data/Hora</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Segmento</TableHead>
                      <TableHead>Destinatário</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Conteúdo</TableHead>
                      <TableHead className="w-[120px]">Status</TableHead>
                      <TableHead className="w-[160px]">Confirmação</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtrados.map((envio) => (
                      <TableRow key={envio.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {format(new Date(envio.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {TIPO_LABELS[envio.tipo || ""] || envio.tipo || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{envio.segmento || "—"}</TableCell>
                        <TableCell className="text-sm font-medium">{envio.destinatario_nome || "—"}</TableCell>
                        <TableCell className="text-xs font-mono">{envio.destinatario_telefone || "—"}</TableCell>
                        <TableCell className="max-w-[300px]">
                          <p className="text-xs text-muted-foreground truncate" title={envio.conteudo || ""}>
                            {envio.conteudo || "—"}
                          </p>
                          {envio.erro_mensagem && (
                            <p className="text-xs text-destructive truncate mt-1" title={envio.erro_mensagem}>
                              ⚠ {envio.erro_mensagem}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {renderStatusIcon(envio.status)}
                            <Badge variant={STATUS_VARIANT[envio.status || ""] || "outline"} className="text-xs">
                              {STATUS_LABELS[envio.status || ""] || envio.status || "—"}
                            </Badge>
                          </div>
                          {envio.provider_status && (
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              Wasender: {envio.provider_status}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {envio.confirmado_em ? (
                            <div className="flex items-center gap-1.5" title={envio.confirmacao_resposta || ""}>
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              <span className="text-xs text-green-700">
                                {format(new Date(envio.confirmado_em), "dd/MM HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                          ) : envio.confirmacao_solicitada ? (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span className="text-xs">Aguardando</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {["erro", "falhou"].includes(envio.status || "") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => reenviarEnvio(envio)}
                              className="text-xs h-7"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Reenviar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="fila" className="space-y-6 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold text-amber-600">{filaStats.pendente}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Processando</p>
                  <p className="text-2xl font-bold text-blue-600">{filaStats.processando}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Aceitos pela API</p>
                  <p className="text-2xl font-bold text-muted-foreground">{filaStats.enviado}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Descartados</p>
                  <p className="text-2xl font-bold text-destructive">{filaStats.descartado}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-0">
                {filaLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : fila.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Fila vazia. Tudo em dia! 🎉
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[140px]">Criado</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Destinatário</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead className="w-[80px]">Tent.</TableHead>
                          <TableHead className="w-[140px]">Próx. tentativa</TableHead>
                          <TableHead className="w-[120px]">Status</TableHead>
                          <TableHead className="w-[100px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fila.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-xs whitespace-nowrap">
                              {format(new Date(item.created_at), "dd/MM HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {TIPO_LABELS[item.tipo] || item.tipo}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm font-medium">{item.destinatario_nome || "—"}</TableCell>
                            <TableCell className="text-xs font-mono">{item.destinatario_telefone}</TableCell>
                            <TableCell className="text-xs text-center">
                              {item.tentativas}/{item.max_tentativas}
                            </TableCell>
                            <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                              {item.proxima_tentativa_em
                                ? format(new Date(item.proxima_tentativa_em), "dd/MM HH:mm", { locale: ptBR })
                                : "—"}
                              {item.ultimo_erro && (
                                <p className="text-destructive truncate max-w-[180px]" title={item.ultimo_erro}>
                                  ⚠ {item.ultimo_erro}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  ["enviado", "aceito_provedor"].includes(item.status) ? "secondary" :
                                  ["entregue", "lido"].includes(item.status) ? "default" :
                                  item.status === "descartado" ? "destructive" :
                                  item.status === "processando" ? "secondary" : "outline"
                                }
                                className="text-xs"
                              >
                                {STATUS_LABELS[item.status] || item.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {item.status === "descartado" && (
                                <Button size="sm" variant="ghost" onClick={() => reprocessarItem(item.id)}>
                                  <RotateCcw className="h-3 w-3 mr-1" /> Reenviar
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ComunicacaoAuditoriaPage;