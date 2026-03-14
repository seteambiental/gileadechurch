import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Award, FileText } from "lucide-react";
import { CertificadoGraduacaoDialog } from "./CertificadoGraduacaoDialog";

const FAIXAS = ["Branca", "Azul", "Roxa", "Marrom", "Preta"];

export function JiuJitsuGraduacaoTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [certGraduacao, setCertGraduacao] = useState<any>(null);

  const [alunoId, setAlunoId] = useState("");
  const [faixaNova, setFaixaNova] = useState("");
  const [graus, setGraus] = useState(0);
  const [dataGraduacao, setDataGraduacao] = useState("");
  const [professor, setProfessor] = useState("");

  const { data: alunos = [] } = useQuery({
    queryKey: ["jiujitsu_alunos"],
    queryFn: async () => {
      const { data } = await supabase.from("jiujitsu_alunos").select("*").eq("ativo", true).order("nome");
      return (data || []) as any[];
    },
  });

  const { data: graduacoes = [] } = useQuery({
    queryKey: ["jiujitsu_graduacoes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("jiujitsu_graduacoes")
        .select("*, jiujitsu_alunos(nome, faixa)")
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  });

  const handleSave = async () => {
    if (!alunoId || !faixaNova || !dataGraduacao) {
      toast({ title: "Preencha aluno, faixa e data", variant: "destructive" });
      return;
    }

    const aluno = alunos.find((a: any) => a.id === alunoId);
    const faixaAnterior = aluno?.faixa || "Branca";

    const { error: gradError } = await supabase.from("jiujitsu_graduacoes").insert({
      aluno_id: alunoId,
      faixa_anterior: faixaAnterior,
      faixa_nova: faixaNova,
      graus,
      data_graduacao: dataGraduacao,
      professor,
    });

    if (gradError) {
      toast({ title: "Erro ao registrar graduação", variant: "destructive" });
      return;
    }

    // Update the student's belt
    await supabase.from("jiujitsu_alunos").update({ faixa: faixaNova, graus }).eq("id", alunoId);

    toast({ title: "Graduação registrada!" });
    queryClient.invalidateQueries({ queryKey: ["jiujitsu_graduacoes"] });
    queryClient.invalidateQueries({ queryKey: ["jiujitsu_alunos"] });
    setFormOpen(false);
    setAlunoId(""); setFaixaNova(""); setGraus(0); setDataGraduacao(""); setProfessor("");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nova Graduação
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>De</TableHead>
              <TableHead>Para</TableHead>
              <TableHead>Graus</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Professor</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {graduacoes.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma graduação registrada</TableCell></TableRow>
            ) : (
              graduacoes.map((g: any) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.jiujitsu_alunos?.nome}</TableCell>
                  <TableCell>{g.faixa_anterior || "—"}</TableCell>
                  <TableCell>
                    <Badge>{g.faixa_nova}</Badge>
                  </TableCell>
                  <TableCell>{g.graus}</TableCell>
                  <TableCell>{g.data_graduacao}</TableCell>
                  <TableCell>{g.professor || "—"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setCertGraduacao(g)}>
                      <FileText className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Graduação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Aluno</Label>
              <Select value={alunoId} onValueChange={setAlunoId}>
                <SelectTrigger><SelectValue placeholder="Selecione o aluno" /></SelectTrigger>
                <SelectContent>
                  {alunos.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nome} ({a.faixa})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nova Faixa</Label>
                <Select value={faixaNova} onValueChange={setFaixaNova}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {FAIXAS.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Graus</Label>
                <Input type="number" min={0} max={4} value={graus} onChange={(e) => setGraus(Number(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data da Graduação</Label>
                <Input type="date" value={dataGraduacao} onChange={(e) => setDataGraduacao(e.target.value)} />
              </div>
              <div>
                <Label>Professor</Label>
                <Input value={professor} onChange={(e) => setProfessor(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Registrar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <CertificadoGraduacaoDialog
        open={!!certGraduacao}
        onOpenChange={(o) => !o && setCertGraduacao(null)}
        graduacao={certGraduacao}
      />
    </div>
  );
}
