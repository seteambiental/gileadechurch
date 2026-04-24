import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, MessageSquare, Search, Filter, RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserAccess } from "@/hooks/useUserAccess";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
};

const TIPO_LABELS: Record<string, string> = {
  inscricao_recebida: "Inscrição Recebida",
  cadastro_aprovado: "Cadastro Aprovado",
  flyer_homepage: "Flyer Homepage",
  segmentado: "Segmentado",
  manual: "Manual",
  individual: "Individual",
  massa: "Em Massa",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  enviado: "default",
  sucesso: "default",
  erro: "destructive",
  falhou: "destructive",
  pendente: "secondary",
};

const ComunicacaoAuditoriaPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isStrictAdmin, loading: accessLoading } = useUserAccess(user?.id);

  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [segmentoFiltro, setSegmentoFiltro] = useState<string>("todos");
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");

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
      if (statusFiltro !== "todos" && (e.status || "") !== statusFiltro) return false;
      if (segmentoFiltro !== "todos" && (e.segmento || "") !== segmentoFiltro) return false;
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
  }, [envios, busca, tipoFiltro, statusFiltro, segmentoFiltro]);

  const stats = useMemo(() => {
    const total = filtrados.length;
    const sucesso = filtrados.filter((e) => ["enviado", "sucesso"].includes(e.status || "")).length;
    const erro = filtrados.filter((e) => ["erro", "falhou"].includes(e.status || "")).length;
    const pendente = filtrados.filter((e) => e.status === "pendente").length;
    return { total, sucesso, erro, pendente };
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
    if (["enviado", "sucesso"].includes(status || "")) return <CheckCircle2 className="h-4 w-4 text-green-600" />;
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
            <div className="flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-bold">Auditoria de WhatsApp</h1>
                <p className="text-xs text-muted-foreground">Histórico de envios automáticos e manuais</p>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
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
              <p className="text-xs text-muted-foreground">Enviados</p>
              <p className="text-2xl font-bold text-green-600">{stats.sucesso}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Erros</p>
              <p className="text-2xl font-bold text-destructive">{stats.erro}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Pendentes</p>
              <p className="text-2xl font-bold text-muted-foreground">{stats.pendente}</p>
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
                <SelectItem value="enviado">Enviado</SelectItem>
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
                              {envio.status || "—"}
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ComunicacaoAuditoriaPage;