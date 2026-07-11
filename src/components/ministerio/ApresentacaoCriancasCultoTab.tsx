import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MaskedInput } from "@/components/ui/masked-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Baby, Copy, Trash2, Check, Award, Clock, Pencil, CalendarClock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate, todayDateStr } from "@/lib/date-utils";
import { dateInputToISO, isoToDateInput } from "@/lib/masks";
import { dispararMensagemApresentacaoPais } from "@/lib/whatsapp-notifications";
import ApresentacaoCertificadoDialog from "./ApresentacaoCertificadoDialog";

interface Apresentacao {
  id: string;
  familia_membro: boolean;
  pai_nome: string | null;
  pai_nao_identificado: boolean;
  mae_nome: string | null;
  mae_nao_identificado: boolean;
  crianca_nome: string;
  crianca_cpf: string | null;
  crianca_data_nascimento: string | null;
  crianca_genero: string | null;
  crianca_photo_url: string | null;
  contato_whatsapp: string | null;
  neighborhood: string | null;
  city: string | null;
  observacoes: string | null;
  status: string;
  data_apresentacao: string | null;
  certificado_emitido: boolean;
  created_at: string;
}

const nomePai = (i: Apresentacao) => (i.pai_nao_identificado ? "Não identificado" : i.pai_nome || "—");
const nomeMae = (i: Apresentacao) => (i.mae_nao_identificado ? "Não identificado" : i.mae_nome || "—");
const fmtData = (d: string | null) => (d ? format(parseLocalDate(d), "dd/MM/yyyy", { locale: ptBR }) : "—");

type ColKey = "crianca" | "genero" | "nascimento" | "pai" | "mae" | "familia" | "apresentacao";

const ApresentacaoCriancasCultoTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [certInscricao, setCertInscricao] = useState<Apresentacao | null>(null);
  const [editInscricao, setEditInscricao] = useState<Apresentacao | null>(null);
  const [aprovarInscricao, setAprovarInscricao] = useState<Apresentacao | null>(null);
  const [dataAprovacao, setDataAprovacao] = useState("");

  const linkPublico = "https://gileadechurch.lovable.app/apresentacao";

  const { data: inscricoes = [], isLoading } = useQuery({
    queryKey: ["apresentacao-criancas-culto"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("apresentacao_criancas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Apresentacao[];
    },
  });

  const hoje = todayDateStr();

  const pendentes = useMemo(
    () => inscricoes.filter((i) => i.status !== "aprovado"),
    [inscricoes]
  );
  const paraApresentar = useMemo(
    () =>
      inscricoes
        .filter((i) => i.status === "aprovado" && i.data_apresentacao && i.data_apresentacao >= hoje)
        .sort((a, b) => (a.data_apresentacao || "").localeCompare(b.data_apresentacao || "")),
    [inscricoes, hoje]
  );
  const apresentadas = useMemo(
    () =>
      inscricoes
        .filter((i) => i.status === "aprovado" && (!i.data_apresentacao || i.data_apresentacao < hoje))
        .sort((a, b) => (b.data_apresentacao || b.created_at).localeCompare(a.data_apresentacao || a.created_at)),
    [inscricoes, hoje]
  );

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["apresentacao-criancas-culto"] });

  const aprovarMutation = useMutation({
    mutationFn: async ({ id, dataISO }: { id: string; dataISO: string }) => {
      const { error } = await (supabase as any)
        .from("apresentacao_criancas")
        .update({ status: "aprovado", data_apresentacao: dataISO })
        .eq("id", id);
      if (error) throw error;
      // Mensagem de confirmação de data aos pais/contato (best-effort)
      await dispararMensagemApresentacaoPais({ apresentacaoId: id, tipo: "confirmacao" });
    },
    onSuccess: () => {
      invalidate();
      setAprovarInscricao(null);
      setDataAprovacao("");
      toast({ title: "Inscrição aprovada", description: "Mensagem de confirmação enviada aos pais." });
    },
    onError: (err) =>
      toast({ variant: "destructive", title: "Erro ao aprovar", description: err instanceof Error ? err.message : String(err) }),
  });

  const excluirMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("apresentacao_criancas")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Inscrição excluída" });
    },
    onError: (err) =>
      toast({ variant: "destructive", title: "Erro ao excluir", description: err instanceof Error ? err.message : String(err) }),
  });

  const editarMutation = useMutation({
    mutationFn: async (i: Apresentacao) => {
      const { error } = await (supabase as any)
        .from("apresentacao_criancas")
        .update({
          crianca_nome: i.crianca_nome,
          crianca_genero: i.crianca_genero,
          crianca_data_nascimento: i.crianca_data_nascimento,
          pai_nome: i.pai_nome,
          pai_nao_identificado: i.pai_nao_identificado,
          mae_nome: i.mae_nome,
          mae_nao_identificado: i.mae_nao_identificado,
          data_apresentacao: i.data_apresentacao,
        })
        .eq("id", i.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setEditInscricao(null);
      toast({ title: "Dados atualizados" });
    },
    onError: (err) =>
      toast({ variant: "destructive", title: "Erro ao salvar", description: err instanceof Error ? err.message : String(err) }),
  });

  const copiarLink = () => {
    navigator.clipboard.writeText(linkPublico);
    toast({ title: "Link copiado!", description: linkPublico });
  };

  const confirmarAprovacao = () => {
    if (!aprovarInscricao) return;
    const iso = dateInputToISO(dataAprovacao);
    if (!iso) {
      toast({ variant: "destructive", title: "Data inválida", description: "Informe a data no formato dd/mm/aaaa." });
      return;
    }
    aprovarMutation.mutate({ id: aprovarInscricao.id, dataISO: iso });
  };

  // ---- Tabela com filtros por coluna ----
  const cellValue = (i: Apresentacao, col: ColKey): string => {
    switch (col) {
      case "crianca": return i.crianca_nome || "";
      case "genero": return i.crianca_genero || "";
      case "nascimento": return fmtData(i.crianca_data_nascimento);
      case "pai": return nomePai(i);
      case "mae": return nomeMae(i);
      case "familia": return i.familia_membro ? "Membro Gileade" : "Não membro";
      case "apresentacao": return fmtData(i.data_apresentacao);
    }
  };

  const FilterableTable = ({
    itens,
    columns,
    acoes,
    vazio,
  }: {
    itens: Apresentacao[];
    columns: { key: ColKey; label: string }[];
    acoes: (i: Apresentacao) => JSX.Element;
    vazio: string;
  }) => {
    const [filtros, setFiltros] = useState<Record<string, string>>({});

    const filtradas = useMemo(() => {
      return itens.filter((i) =>
        columns.every((c) => {
          const f = (filtros[c.key] || "").trim().toLowerCase();
          if (!f) return true;
          return cellValue(i, c.key).toLowerCase().includes(f);
        })
      );
    }, [itens, filtros, columns]);

    if (isLoading) {
      return (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      );
    }
    if (itens.length === 0) {
      return <p className="text-sm text-muted-foreground py-6 text-center">{vazio}</p>;
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key} className="align-top">
                  <div className="space-y-1">
                    <span>{c.label}</span>
                    <Input
                      value={filtros[c.key] || ""}
                      onChange={(e) => setFiltros((p) => ({ ...p, [c.key]: e.target.value }))}
                      placeholder="Filtrar..."
                      className="h-7 text-xs font-normal"
                    />
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="text-center text-sm text-muted-foreground py-6">
                  Nenhum resultado para os filtros aplicados.
                </TableCell>
              </TableRow>
            ) : (
              filtradas.map((i) => (
                <TableRow key={i.id}>
                  {columns.map((c) => (
                    <TableCell key={c.key} className={c.key === "crianca" ? "font-medium" : c.key === "genero" || c.key === "familia" ? "capitalize" : ""}>
                      {c.key === "crianca" ? (
                        <div className="flex items-center gap-2">
                          {i.crianca_photo_url ? (
                            <img src={i.crianca_photo_url} alt={i.crianca_nome} className="w-8 h-8 rounded-full object-cover border" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <Baby className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <span>{i.crianca_nome}</span>
                        </div>
                      ) : (
                        cellValue(i, c.key)
                      )}
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="flex justify-end gap-1">{acoes(i)}</div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  const botaoExcluir = (i: Apresentacao) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="icon" variant="ghost" className="text-destructive" title="Excluir">
          <Trash2 className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir inscrição?</AlertDialogTitle>
          <AlertDialogDescription>
            A inscrição de <strong>{i.crianca_nome}</strong> será removida permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => excluirMutation.mutate(i.id)}>Excluir</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Baby className="w-5 h-5" /> Link de inscrição para apresentação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Compartilhe este link com as famílias ou cole-o no campo de link de inscrição ao criar um evento.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <code className="flex-1 px-3 py-2 rounded-md bg-muted text-xs break-all">{linkPublico}</code>
            <Button onClick={copiarLink} variant="outline">
              <Copy className="w-4 h-4 mr-2" /> Copiar link
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="pendentes">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pendentes" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Pendentes
            {pendentes.length > 0 && <Badge variant="destructive" className="ml-1">{pendentes.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="para-apresentar" className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4" />
            Para apresentar
            {paraApresentar.length > 0 && <Badge variant="secondary" className="ml-1">{paraApresentar.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="apresentadas" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            Apresentadas
            {apresentadas.length > 0 && <Badge variant="secondary" className="ml-1">{apresentadas.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pendentes" className="mt-4">
          <FilterableTable
            itens={pendentes}
            vazio="Nenhuma inscrição pendente."
            columns={[
              { key: "crianca", label: "Criança" },
              { key: "genero", label: "Gênero" },
              { key: "nascimento", label: "Nascimento" },
              { key: "pai", label: "Pai" },
              { key: "mae", label: "Mãe" },
              { key: "familia", label: "Família" },
            ]}
            acoes={(i) => (
              <>
                <Button size="icon" variant="ghost" title="Aprovar" onClick={() => { setAprovarInscricao(i); setDataAprovacao(isoToDateInput(i.data_apresentacao)); }}>
                  <Check className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" title="Editar" onClick={() => setEditInscricao(i)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                {botaoExcluir(i)}
              </>
            )}
          />
        </TabsContent>

        <TabsContent value="para-apresentar" className="mt-4">
          <FilterableTable
            itens={paraApresentar}
            vazio="Nenhuma criança agendada para apresentação."
            columns={[
              { key: "crianca", label: "Criança" },
              { key: "genero", label: "Gênero" },
              { key: "nascimento", label: "Nascimento" },
              { key: "pai", label: "Pai" },
              { key: "mae", label: "Mãe" },
              { key: "apresentacao", label: "Apresentação" },
            ]}
            acoes={(i) => (
              <>
                <Button size="icon" variant="ghost" title="Editar" onClick={() => setEditInscricao(i)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" title="Certificado" onClick={() => setCertInscricao(i)}>
                  <Award className="w-4 h-4" />
                </Button>
                {botaoExcluir(i)}
              </>
            )}
          />
        </TabsContent>

        <TabsContent value="apresentadas" className="mt-4">
          <FilterableTable
            itens={apresentadas}
            vazio="Nenhuma criança apresentada ainda."
            columns={[
              { key: "crianca", label: "Criança" },
              { key: "genero", label: "Gênero" },
              { key: "nascimento", label: "Nascimento" },
              { key: "pai", label: "Pai" },
              { key: "mae", label: "Mãe" },
              { key: "apresentacao", label: "Apresentação" },
            ]}
            acoes={(i) => (
              <>
                <Button size="icon" variant="ghost" title="Editar" onClick={() => setEditInscricao(i)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" title="Certificado" onClick={() => setCertInscricao(i)}>
                  <Award className="w-4 h-4" />
                </Button>
                {botaoExcluir(i)}
              </>
            )}
          />
        </TabsContent>
      </Tabs>

      {/* Dialog de aprovação com data */}
      <Dialog open={!!aprovarInscricao} onOpenChange={(open) => { if (!open) { setAprovarInscricao(null); setDataAprovacao(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Aprovar apresentação</DialogTitle>
          </DialogHeader>
          {aprovarInscricao && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Informe a data em que <strong>{aprovarInscricao.crianca_nome}</strong> poderá ser apresentada.
                Ao salvar, uma mensagem de confirmação será enviada no WhatsApp dos pais/contato.
              </p>
              <div className="space-y-1">
                <Label>Data da apresentação</Label>
                <MaskedInput mask="date" value={dataAprovacao} onChange={setDataAprovacao} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAprovarInscricao(null); setDataAprovacao(""); }}>Cancelar</Button>
            <Button onClick={confirmarAprovacao} disabled={aprovarMutation.isPending}>
              {aprovarMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Aprovar e enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ApresentacaoCertificadoDialog
        open={!!certInscricao}
        onOpenChange={(open) => !open && setCertInscricao(null)}
        inscricao={certInscricao}
      />

      <Dialog open={!!editInscricao} onOpenChange={(open) => !open && setEditInscricao(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar dados da criança</DialogTitle>
          </DialogHeader>
          {editInscricao && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Nome da criança</Label>
                <Input
                  value={editInscricao.crianca_nome}
                  onChange={(e) => setEditInscricao({ ...editInscricao, crianca_nome: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Gênero</Label>
                  <Select
                    value={editInscricao.crianca_genero || "__none__"}
                    onValueChange={(v) => setEditInscricao({ ...editInscricao, crianca_genero: v === "__none__" ? null : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="feminino">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Nascimento</Label>
                  <MaskedInput
                    mask="date"
                    value={isoToDateInput(editInscricao.crianca_data_nascimento)}
                    onChange={(v) => setEditInscricao({ ...editInscricao, crianca_data_nascimento: dateInputToISO(v) })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Pai</Label>
                <Input
                  value={editInscricao.pai_nome || ""}
                  disabled={editInscricao.pai_nao_identificado}
                  onChange={(e) => setEditInscricao({ ...editInscricao, pai_nome: e.target.value })}
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={editInscricao.pai_nao_identificado}
                    onChange={(e) => setEditInscricao({ ...editInscricao, pai_nao_identificado: e.target.checked })}
                  />
                  Não identificado
                </label>
              </div>
              <div className="space-y-1">
                <Label>Mãe</Label>
                <Input
                  value={editInscricao.mae_nome || ""}
                  disabled={editInscricao.mae_nao_identificado}
                  onChange={(e) => setEditInscricao({ ...editInscricao, mae_nome: e.target.value })}
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={editInscricao.mae_nao_identificado}
                    onChange={(e) => setEditInscricao({ ...editInscricao, mae_nao_identificado: e.target.checked })}
                  />
                  Não identificado
                </label>
              </div>
              <div className="space-y-1">
                <Label>Data da apresentação</Label>
                <MaskedInput
                  mask="date"
                  value={isoToDateInput(editInscricao.data_apresentacao)}
                  onChange={(v) => setEditInscricao({ ...editInscricao, data_apresentacao: dateInputToISO(v) })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditInscricao(null)}>Cancelar</Button>
            <Button onClick={() => editInscricao && editarMutation.mutate(editInscricao)} disabled={editarMutation.isPending}>
              {editarMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApresentacaoCriancasCultoTab;
