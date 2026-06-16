import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { KeyRound, UserPlus, Loader2, ShieldCheck, ShieldOff, Search, Copy, RefreshCw, Eye, EyeOff } from "lucide-react";

type AcessoMembro = {
  member_id: string;
  full_name: string;
  email: string | null;
  whatsapp: string | null;
  cpf: string | null;
  user_id: string | null;
  login_email: string | null;
  last_sign_in_at: string | null;
  user_created_at: string | null;
  has_access: boolean;
};

function gerarSenhaPadrao(fullName: string, cpf: string | null): string | null {
  if (!fullName) return null;
  const cpfDigits = (cpf || "").replace(/\D/g, "");
  if (cpfDigits.length < 6) return null;
  const partes = fullName.trim().split(/\s+/);
  if (partes.length < 2) return null;
  const primeira = partes[0][0]?.toUpperCase() || "";
  const ultima = partes[partes.length - 1][0]?.toLowerCase() || "";
  if (!primeira || !ultima) return null;
  return primeira + ultima + cpfDigits.slice(0, 6);
}

function gerarSenhaAleatoria(length = 12): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%";
  const all = upper + lower + digits + symbols;
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  const pick = (set: string, b: number) => set[b % set.length];
  const out = [pick(upper, bytes[0]), pick(lower, bytes[1]), pick(digits, bytes[2]), pick(symbols, bytes[3])];
  for (let i = out.length; i < length; i++) out.push(pick(all, bytes[i]));
  for (let i = out.length - 1; i > 0; i--) {
    const j = bytes[i] % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join("");
}

// Extrai a mensagem real de erro retornada por uma Edge Function.
// O supabase-js encapsula respostas não-2xx em FunctionsHttpError com a
// resposta crua em `error.context`, escondendo a mensagem do servidor.
async function extrairErro(e: any): Promise<string> {
  try {
    const ctx = e?.context;
    if (ctx && typeof ctx.json === "function") {
      const body = await ctx.json();
      const err = body?.error;
      if (typeof err === "string") return err;
      if (err && typeof err === "object") {
        const msgs = Object.values(err).flat().filter(Boolean);
        if (msgs.length) return msgs.join(" ");
      }
    }
  } catch {
    // ignora falha ao ler o corpo
  }
  return e?.message || "Falha na operação";
}

const AcessosTab = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [resetTarget, setResetTarget] = useState<AcessoMembro | null>(null);
  const [createTarget, setCreateTarget] = useState<AcessoMembro | null>(null);
  const [resetMode, setResetMode] = useState<"manual" | "auto">("manual");
  const [newPassword, setNewPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Create dialog state
  const [createMode, setCreateMode] = useState<"auto" | "manual">("auto");
  const [createEmail, setCreateEmail] = useState("");
  const [createPwd, setCreatePwd] = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["acessos-membros"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("listar-acessos-membros", {
        body: {},
      });
      if (error) throw error;
      return (data?.data || []) as AcessoMembro[];
    },
  });

  const filtered = useMemo(() => {
    const list = data || [];
    const s = search.trim().toLowerCase();
    if (!s) return list;
    return list.filter(
      (m) =>
        m.full_name?.toLowerCase().includes(s) ||
        m.email?.toLowerCase().includes(s) ||
        m.login_email?.toLowerCase().includes(s) ||
        m.cpf?.includes(s)
    );
  }, [data, search]);

  const stats = useMemo(() => {
    const list = data || [];
    return {
      total: list.length,
      com: list.filter((m) => m.has_access).length,
      sem: list.filter((m) => !m.has_access).length,
    };
  }, [data]);

  const copiar = async (txt: string) => {
    try {
      await navigator.clipboard.writeText(txt);
      toast({ title: "Copiado", description: txt });
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  const openReset = (m: AcessoMembro) => {
    setResetTarget(m);
    setResetMode("manual");
    setNewPassword("");
    setShowPwd(true);
  };

  const handleReset = async () => {
    if (!resetTarget?.user_id) return;
    if (newPassword.length < 6) {
      toast({ title: "Senha muito curta", description: "Mínimo de 6 caracteres", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("atualizar-senha-usuario", {
        body: { user_id: resetTarget.user_id, password: newPassword },
      });
      if (error) throw error;
      toast({
        title: "Senha redefinida",
        description: `Nova senha para ${resetTarget.full_name}: ${newPassword}`,
      });
      setResetTarget(null);
    } catch (e: any) {
      const msg = await extrairErro(e);
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const openCreate = (m: AcessoMembro) => {
    setCreateTarget(m);
    setCreateMode("auto");
    setCreateEmail(m.email || "");
    const sugerida = gerarSenhaPadrao(m.full_name, m.cpf) || gerarSenhaAleatoria(12);
    setCreatePwd(sugerida);
  };

  const handleCreate = async () => {
    if (!createTarget) return;
    setSubmitting(true);
    try {
      // 1) Criar conta com fluxo padrão (gera senha padrão e envia WhatsApp)
      const { data: created, error } = await supabase.functions.invoke("criar-usuario-membro", {
        body: {
          email: createTarget.email,
          member_id: createTarget.member_id,
          perfil: "membro",
        },
      });
      if (error) throw error;
      const userId = created?.user_id;

      // 2) Se modo manual, sobrescreve com senha/email definidos
      if (createMode === "manual" && userId) {
        if (createPwd.length < 6) {
          toast({ title: "Senha muito curta", variant: "destructive" });
          setSubmitting(false);
          return;
        }
        const { error: pErr } = await supabase.functions.invoke("atualizar-senha-usuario", {
          body: { user_id: userId, password: createPwd },
        });
        if (pErr) throw pErr;
      }

      toast({
        title: "Acesso criado",
        description:
          createMode === "manual"
            ? `Login: ${createEmail || createTarget.email} | Senha: ${createPwd}`
            : `Conta criada para ${createTarget.full_name}. Senha padrão enviada por WhatsApp.`,
      });
      setCreateTarget(null);
      await qc.invalidateQueries({ queryKey: ["acessos-membros"] });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message || "Falha ao criar usuário", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Card className="px-4 py-3 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Com acesso</p>
            <p className="text-lg font-semibold">{stats.com}</p>
          </div>
        </Card>
        <Card className="px-4 py-3 flex items-center gap-3">
          <ShieldOff className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Sem acesso</p>
            <p className="text-lg font-semibold">{stats.sem}</p>
          </div>
        </Card>
        <Card className="px-4 py-3 flex items-center gap-3">
          <UserPlus className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Total membros</p>
            <p className="text-lg font-semibold">{stats.total}</p>
          </div>
        </Card>
        <div className="ml-auto flex gap-2 items-center">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou CPF..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membro</TableHead>
                <TableHead>Login (e-mail de acesso)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último acesso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin inline" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum resultado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((m) => (
                  <TableRow key={m.member_id}>
                    <TableCell>
                      <div className="font-medium">{m.full_name}</div>
                      {m.email && <div className="text-xs text-muted-foreground">{m.email}</div>}
                    </TableCell>
                    <TableCell>
                      {m.login_email ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{m.login_email}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => copiar(m.login_email!)}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {m.has_access ? (
                        <Badge variant="default">Ativo</Badge>
                      ) : (
                        <Badge variant="outline">Sem conta</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {m.last_sign_in_at
                        ? new Date(m.last_sign_in_at).toLocaleString("pt-BR")
                        : "Nunca"}
                    </TableCell>
                    <TableCell className="text-right">
                      {m.has_access ? (
                        <Button size="sm" variant="outline" onClick={() => openReset(m)}>
                          <KeyRound className="w-4 h-4 mr-2" />
                          Redefinir senha
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => openCreate(m)}>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Criar acesso
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Reset Senha Dialog */}
      <AlertDialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Redefinir senha</AlertDialogTitle>
            <AlertDialogDescription>
              Por segurança, senhas existentes não podem ser visualizadas. Defina uma nova senha
              para <strong>{resetTarget?.full_name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-muted-foreground">Login: </span>
              <span className="font-medium">{resetTarget?.login_email}</span>
            </div>
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showPwd ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowPwd((s) => !s)}
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNewPassword(gerarSenhaAleatoria(12))}
                >
                  Gerar
                </Button>
              </div>
              {resetTarget && gerarSenhaPadrao(resetTarget.full_name, resetTarget.cpf) && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="px-0 h-auto"
                  onClick={() =>
                    setNewPassword(
                      gerarSenhaPadrao(resetTarget.full_name, resetTarget.cpf) || ""
                    )
                  }
                >
                  Usar senha padrão (Inicial+Sobrenome+CPF)
                </Button>
              )}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Redefinir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Criar Acesso Dialog */}
      <Dialog open={!!createTarget} onOpenChange={(o) => !o && setCreateTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar acesso</DialogTitle>
            <DialogDescription>
              Criar usuário e senha para <strong>{createTarget?.full_name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={createMode === "auto" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setCreateMode("auto")}
              >
                Automático
              </Button>
              <Button
                type="button"
                variant={createMode === "manual" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setCreateMode("manual")}
              >
                Manual
              </Button>
            </div>

            {createMode === "auto" ? (
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  Será gerado automaticamente:
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Login: <strong>{createTarget?.email || "(usar CPF se e-mail em uso)"}</strong></li>
                  <li>Senha: <strong>Inicial+Sobrenome+6 dígitos do CPF</strong></li>
                  <li>Notificação enviada por WhatsApp</li>
                </ul>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>E-mail de login</Label>
                  <Input
                    type="email"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Observação: o sistema usa o e-mail do cadastro do membro como login. Para alterar
                    o login, edite o e-mail do membro antes.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={createPwd}
                      onChange={(e) => setCreatePwd(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreatePwd(gerarSenhaAleatoria(12))}
                    >
                      Gerar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTarget(null)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar acesso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AcessosTab;