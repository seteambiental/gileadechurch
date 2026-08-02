import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QrScannerDialog } from "@/components/kids/QrScannerDialog";
import { SearchInput } from "@/components/ui/search-input";
import { includesNormalized } from "@/lib/text-utils";
import { formatCPF } from "@/lib/masks";
import { Loader2, QrCode, LogOut, CheckCircle2, RefreshCw, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import logoGileade from "@/assets/logo-gileade.jpeg";

interface TurmaConfig {
  turma: string;
  nome_exibicao: string;
  cor_hex: string;
}

const STORAGE_KEY = "kids-scanner-cpf";

const KidsScannerPage = () => {
  const { toast } = useToast();
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);
  const [member, setMember] = useState<{ id: string; full_name: string } | null>(null);
  const [turmas, setTurmas] = useState<TurmaConfig[]>([]);
  const [turma, setTurma] = useState<string>("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [buscaRoster, setBuscaRoster] = useState("");
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const call = async (payload: Record<string, unknown>, cpfOverride?: string) => {
    const { data, error } = await supabase.functions.invoke("kids-scanner", {
      body: { cpf: cpfOverride ?? cpf, ...payload },
    });
    if (error) {
      const msg = (data as any)?.error || "Não foi possível completar a operação.";
      throw new Error(msg);
    }
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  };

  const login = async (cpfValue: string) => {
    setLoading(true);
    try {
      const data = await call({ action: "login" }, cpfValue);
      setCpf(cpfValue);
      setMember(data.member);
      setTurmas(data.turmas || []);
      setTurma(data.turmas?.[0]?.turma ?? "");
      localStorage.setItem(STORAGE_KEY, cpfValue);
    } catch (e: any) {
      localStorage.removeItem(STORAGE_KEY);
      toast({ variant: "destructive", title: "Acesso negado", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) login(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const carregarLista = async (t = turma) => {
    if (!t) return;
    try {
      const data = await call({ action: "list", turma: t });
      setCheckins(data.checkins || []);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    }
  };

  const carregarRoster = async (t = turma) => {
    if (!t) return;
    setLoadingRoster(true);
    try {
      const data = await call({ action: "roster", turma: t });
      setRoster(data.criancas || []);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    } finally {
      setLoadingRoster(false);
    }
  };

  const marcarPresenca = async (c: any, presente: boolean) => {
    setSavingId(c.id);
    setRoster((prev) => prev.map((r) => (r.id === c.id ? { ...r, presente } : r)));
    try {
      await call({ action: "presenca", turma, id: c.id, tipo: c.tipo, presente });
    } catch (e: any) {
      setRoster((prev) => prev.map((r) => (r.id === c.id ? { ...r, presente: !presente } : r)));
      toast({ variant: "destructive", title: "Erro", description: e.message });
    } finally {
      setSavingId(null);
    }
  };

  useEffect(() => {
    if (member && turma) {
      carregarLista(turma);
      carregarRoster(turma);
      setBuscaRoster("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member, turma]);

  const handleScan = async (decoded: string) => {
    setScannerOpen(false);
    try {
      const data = await call({ action: "scan", turma, token: decoded });
      toast({
        title: data.already ? "Já registrado" : "Check-in realizado!",
        description: `${data.checkin.crianca_nome} — ${data.already ? "presença já confirmada" : "entrada confirmada"}.`,
      });
      carregarLista();
      carregarRoster();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro na leitura", description: e.message });
    }
  };

  const sair = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMember(null);
    setCpf("");
    setCheckins([]);
    setRoster([]);
  };

  const turmaAtual = turmas.find((t) => t.turma === turma);
  const rosterFiltrado = roster.filter((c) => includesNormalized(c.nome, buscaRoster));
  const presentesManual = roster.filter((c) => c.presente).length;

  if (!member) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center space-y-3">
            <img src={logoGileade} alt="Gileade Church" className="w-16 h-16 rounded-full mx-auto shadow" />
            <CardTitle className="font-heading">Chamada Kids</CardTitle>
            <p className="text-sm text-muted-foreground">
              Acesso exclusivo da equipe do Ministério Kids
            </p>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                login(cpf);
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-md mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <img src={logoGileade} alt="Logo" className="w-10 h-10 rounded-full shadow" />
          <div className="flex-1 min-w-0">
            <h1 className="font-heading font-bold text-lg leading-tight">Chamada Kids</h1>
            <p className="text-xs text-muted-foreground truncate">{member.full_name}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={sair} title="Sair">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>Turma</Label>
              <Select value={turma} onValueChange={setTurma}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  {turmas.map((t) => (
                    <SelectItem key={t.turma} value={t.turma}>
                      {t.nome_exibicao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full h-14 text-lg"
              disabled={!turma}
              onClick={() => setScannerOpen(true)}
              style={turmaAtual ? { backgroundColor: turmaAtual.cor_hex } : undefined}
            >
              <QrCode className="h-5 w-5 mr-2" />
              Ler QR Code
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Chamada manual ({presentesManual}/{roster.length})
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => carregarRoster()} disabled={loadingRoster}>
              {loadingRoster ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <SearchInput value={buscaRoster} onChange={setBuscaRoster} placeholder="Buscar criança..." />
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {!loadingRoster && rosterFiltrado.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma criança encontrada nesta turma.</p>
              )}
              {rosterFiltrado.map((c) => (
                <button
                  key={`${c.tipo}-${c.id}`}
                  type="button"
                  onClick={() => marcarPresenca(c, !c.presente)}
                  disabled={savingId === c.id}
                  className="w-full flex items-center justify-between border rounded-lg px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{c.nome}</p>
                    {c.tipo === "novo_convertido" && (
                      <p className="text-xs text-muted-foreground">Visitante</p>
                    )}
                  </div>
                  {savingId === c.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : c.presente ? (
                    <Badge className="bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Presente
                    </Badge>
                  ) : (
                    <Badge variant="outline">Marcar</Badge>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Presentes hoje ({checkins.filter((c) => c.check_in_at).length})</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => carregarLista()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {checkins.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma etiqueta gerada nesta turma hoje.</p>
            )}
            {checkins.map((c) => (
              <div key={c.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{c.crianca_nome}</p>
                  <p className="text-xs text-muted-foreground truncate">Resp.: {c.responsavel_nome}</p>
                </div>
                {c.check_out_at ? (
                  <Badge variant="secondary">Saiu {format(new Date(c.check_out_at), "HH:mm")}</Badge>
                ) : c.check_in_at ? (
                  <Badge className="bg-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {format(new Date(c.check_in_at), "HH:mm")}
                  </Badge>
                ) : (
                  <Badge variant="outline">Pendente</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <QrScannerDialog open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleScan} />
    </div>
  );
};

export default KidsScannerPage;
