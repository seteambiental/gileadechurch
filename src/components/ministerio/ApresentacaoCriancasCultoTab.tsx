import { useState } from "react";
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
import { Loader2, Baby, Copy, Trash2, Calendar, MapPin, User, Check, Award, Clock, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate, todayDateStr } from "@/lib/date-utils";
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
  neighborhood: string | null;
  city: string | null;
  observacoes: string | null;
  status: string;
  data_apresentacao: string | null;
  certificado_emitido: boolean;
  created_at: string;
}

const ApresentacaoCriancasCultoTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [certInscricao, setCertInscricao] = useState<Apresentacao | null>(null);
  const [editInscricao, setEditInscricao] = useState<Apresentacao | null>(null);

  const linkPublico = `${window.location.origin}/apresentacao`;

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

  const pendentes = inscricoes.filter((i) => i.status !== "aprovado");
  const apresentadas = inscricoes.filter((i) => i.status === "aprovado");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["apresentacao-criancas-culto"] });

  const aprovarMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("apresentacao_criancas")
        .update({ status: "aprovado", data_apresentacao: todayDateStr() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Inscrição aprovada", description: "A criança foi movida para Apresentadas." });
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

  const Cartao = ({ i, aprovada }: { i: Apresentacao; aprovada: boolean }) => (
    <Card>
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-start gap-3">
          {i.crianca_photo_url ? (
            <img src={i.crianca_photo_url} alt={i.crianca_nome} className="w-14 h-14 rounded-full object-cover border" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <Baby className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{i.crianca_nome}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              <Badge variant={i.familia_membro ? "default" : "outline"} className="text-[10px]">
                {i.familia_membro ? "Membro Gileade" : "Não membro"}
              </Badge>
              {i.crianca_genero && (
                <Badge variant="secondary" className="text-[10px] capitalize">{i.crianca_genero}</Badge>
              )}
              {aprovada && i.certificado_emitido && (
                <Badge className="text-[10px] bg-green-600 hover:bg-green-600">Certificado emitido</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="text-sm text-muted-foreground space-y-1">
          {i.crianca_data_nascimento && (
            <p className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              {format(parseLocalDate(i.crianca_data_nascimento), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          )}
          <p className="flex items-center gap-2">
            <User className="w-3.5 h-3.5" />
            Pai: {i.pai_nao_identificado ? "Não identificado" : i.pai_nome || "—"}
          </p>
          <p className="flex items-center gap-2">
            <User className="w-3.5 h-3.5" />
            Mãe: {i.mae_nao_identificado ? "Não identificado" : i.mae_nome || "—"}
          </p>
          {(i.neighborhood || i.city) && (
            <p className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" />
              {[i.neighborhood, i.city].filter(Boolean).join(", ")}
            </p>
          )}
          {aprovada && i.data_apresentacao && (
            <p className="flex items-center gap-2 text-green-700">
              <Check className="w-3.5 h-3.5" />
              Apresentada em {format(parseLocalDate(i.data_apresentacao), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          )}
          {i.observacoes && <p className="text-xs italic pt-1">"{i.observacoes}"</p>}
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          {!aprovada && (
            <Button size="sm" onClick={() => aprovarMutation.mutate(i.id)} disabled={aprovarMutation.isPending}>
              <Check className="w-4 h-4 mr-1" /> Aprovar
            </Button>
          )}
          {aprovada && (
            <Button size="sm" variant="outline" onClick={() => setCertInscricao(i)}>
              <Award className="w-4 h-4 mr-1" /> Certificado
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive">
                <Trash2 className="w-4 h-4 mr-1" /> Excluir
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
        </div>
      </CardContent>
    </Card>
  );

  const TabelaApresentadas = ({ itens }: { itens: Apresentacao[] }) => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      );
    }
    if (itens.length === 0) {
      return <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma criança apresentada ainda.</p>;
    }
    const nomePai = (i: Apresentacao) => (i.pai_nao_identificado ? "Não identificado" : i.pai_nome || "—");
    const nomeMae = (i: Apresentacao) => (i.mae_nao_identificado ? "Não identificado" : i.mae_nome || "—");
    return (
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Criança</TableHead>
              <TableHead>Gênero</TableHead>
              <TableHead>Nascimento</TableHead>
              <TableHead>Pai</TableHead>
              <TableHead>Mãe</TableHead>
              <TableHead>Apresentação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itens.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.crianca_nome}</TableCell>
                <TableCell className="capitalize">{i.crianca_genero || "—"}</TableCell>
                <TableCell>
                  {i.crianca_data_nascimento
                    ? format(parseLocalDate(i.crianca_data_nascimento), "dd/MM/yyyy", { locale: ptBR })
                    : "—"}
                </TableCell>
                <TableCell>{nomePai(i)}</TableCell>
                <TableCell>{nomeMae(i)}</TableCell>
                <TableCell>
                  {i.data_apresentacao
                    ? format(parseLocalDate(i.data_apresentacao), "dd/MM/yyyy", { locale: ptBR })
                    : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" title="Editar" onClick={() => setEditInscricao(i)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Certificado" onClick={() => setCertInscricao(i)}>
                      <Award className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="text-destructive" title="Excluir">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            O registro de <strong>{i.crianca_nome}</strong> será removido permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => excluirMutation.mutate(i.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const Lista = ({ itens, aprovada, vazio }: { itens: Apresentacao[]; aprovada: boolean; vazio: string }) => {
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
      <div className="grid gap-4 sm:grid-cols-2">
        {itens.map((i) => (
          <Cartao key={i.id} i={i} aprovada={aprovada} />
        ))}
      </div>
    );
  };

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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pendentes" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Pendentes
            {pendentes.length > 0 && <Badge variant="destructive" className="ml-1">{pendentes.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="apresentadas" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            Apresentadas
            {apresentadas.length > 0 && <Badge variant="secondary" className="ml-1">{apresentadas.length}</Badge>}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pendentes" className="mt-4">
          <Lista itens={pendentes} aprovada={false} vazio="Nenhuma inscrição pendente." />
        </TabsContent>
        <TabsContent value="apresentadas" className="mt-4">
          <TabelaApresentadas itens={apresentadas} />
        </TabsContent>
      </Tabs>

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
                  <Input
                    type="date"
                    value={editInscricao.crianca_data_nascimento || ""}
                    onChange={(e) => setEditInscricao({ ...editInscricao, crianca_data_nascimento: e.target.value || null })}
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
                <Input
                  type="date"
                  value={editInscricao.data_apresentacao || ""}
                  onChange={(e) => setEditInscricao({ ...editInscricao, data_apresentacao: e.target.value || null })}
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
