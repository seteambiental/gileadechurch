import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Loader2, AlertTriangle, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const SEVERIDADES = [
  { value: "critica", label: "Crítica", color: "bg-red-600 text-white" },
  { value: "alta", label: "Alta", color: "bg-orange-500 text-white" },
  { value: "media", label: "Média", color: "bg-yellow-500 text-black" },
  { value: "baixa", label: "Baixa", color: "bg-blue-500 text-white" },
];

const STATUS_LIST = [
  { value: "aberto", label: "Aberto" },
  { value: "em_andamento", label: "Em Andamento" },
  { value: "contido", label: "Contido" },
  { value: "resolvido", label: "Resolvido" },
  { value: "encerrado", label: "Encerrado" },
];

const TIPOS_FALHA = [
  { value: "aplicacao", label: "Aplicação" },
  { value: "banco_dados", label: "Banco de Dados" },
  { value: "erro_humano", label: "Erro Humano" },
  { value: "integracao_externa", label: "Integração Externa" },
  { value: "infraestrutura", label: "Infraestrutura" },
];

const CHECKLIST_ITEMS = [
  { key: "checklist_identificacao", label: "Identificação" },
  { key: "checklist_contencao", label: "Contenção" },
  { key: "checklist_recuperacao", label: "Recuperação" },
  { key: "checklist_validacao", label: "Validação" },
  { key: "checklist_encerramento", label: "Encerramento" },
];

export default function ContingenciaIncidentesTab() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detalhesId, setDetalhesId] = useState<string | null>(null);
  const [acaoTexto, setAcaoTexto] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    severidade: "media",
    tipo_falha: "aplicacao",
    impacto: "",
    rto_minutos: "60",
    rpo_minutos: "30",
    plano_comunicacao: "",
  });

  const { data: incidentes, isLoading } = useQuery({
    queryKey: ["contingencia-incidentes-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contingencia_incidentes")
        .select("*")
        .order("hora_inicio", { ascending: false });
      return data || [];
    },
  });

  const incidenteDetalhe = incidentes?.find((i) => i.id === detalhesId);

  const { data: acoes } = useQuery({
    queryKey: ["contingencia-acoes", detalhesId],
    queryFn: async () => {
      if (!detalhesId) return [];
      const { data } = await supabase
        .from("contingencia_acoes")
        .select("*")
        .eq("incidente_id", detalhesId)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!detalhesId,
  });

  const handleSave = async () => {
    if (!form.titulo.trim()) { toast.error("Informe o título"); return; }
    setSaving(true);
    const { error } = await supabase.from("contingencia_incidentes").insert({
      titulo: form.titulo,
      descricao: form.descricao || null,
      severidade: form.severidade,
      tipo_falha: form.tipo_falha,
      impacto: form.impacto || null,
      rto_minutos: parseInt(form.rto_minutos) || 60,
      rpo_minutos: parseInt(form.rpo_minutos) || 30,
      plano_comunicacao: form.plano_comunicacao || null,
    });
    setSaving(false);
    if (error) { toast.error("Erro ao abrir incidente"); return; }
    toast.success("Incidente aberto");
    queryClient.invalidateQueries({ queryKey: ["contingencia-incidentes-all"] });
    queryClient.invalidateQueries({ queryKey: ["contingencia-incidentes-abertos"] });
    setDialogOpen(false);
    setForm({ titulo: "", descricao: "", severidade: "media", tipo_falha: "aplicacao", impacto: "", rto_minutos: "60", rpo_minutos: "30", plano_comunicacao: "" });
  };

  const handleChecklist = async (key: string, value: boolean) => {
    if (!detalhesId) return;
    const updateData: any = { [key]: value };
    // Auto-set timestamps
    if (key === "checklist_contencao" && value) updateData.hora_contencao = new Date().toISOString();
    if (key === "checklist_recuperacao" && value) updateData.hora_resolucao = new Date().toISOString();
    if (key === "checklist_encerramento" && value) {
      updateData.hora_encerramento = new Date().toISOString();
      updateData.status = "encerrado";
    }
    if (key === "checklist_identificacao" && value) updateData.status = "em_andamento";
    if (key === "checklist_contencao" && value) updateData.status = "contido";
    if (key === "checklist_recuperacao" && value) updateData.status = "resolvido";

    await supabase.from("contingencia_incidentes").update(updateData).eq("id", detalhesId);
    queryClient.invalidateQueries({ queryKey: ["contingencia-incidentes-all"] });
    queryClient.invalidateQueries({ queryKey: ["contingencia-incidentes-abertos"] });
  };

  const handleAddAcao = async () => {
    if (!acaoTexto.trim() || !detalhesId) return;
    await supabase.from("contingencia_acoes").insert({
      incidente_id: detalhesId,
      descricao: acaoTexto,
    });
    setAcaoTexto("");
    queryClient.invalidateQueries({ queryKey: ["contingencia-acoes", detalhesId] });
    toast.success("Ação registrada");
  };

  const sevColor = (sev: string) => SEVERIDADES.find((s) => s.value === sev)?.color || "";

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Incidentes</CardTitle>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Abrir Incidente
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : !incidentes?.length ? (
            <p className="text-muted-foreground text-center py-8">Nenhum incidente registrado</p>
          ) : (
            <div className="space-y-3">
              {incidentes.map((inc) => (
                <div
                  key={inc.id}
                  className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setDetalhesId(inc.id)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{inc.titulo}</span>
                    <div className="flex gap-2">
                      <Badge className={sevColor(inc.severidade)}>{inc.severidade}</Badge>
                      <Badge variant="outline">{inc.status.replace("_", " ")}</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(inc.hora_inicio), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    {inc.tipo_falha && ` • ${TIPOS_FALHA.find((t) => t.value === inc.tipo_falha)?.label || inc.tipo_falha}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Novo Incidente */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Abrir Incidente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Severidade</Label>
                <Select value={form.severidade} onValueChange={(v) => setForm({ ...form, severidade: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERIDADES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Falha</Label>
                <Select value={form.tipo_falha} onValueChange={(v) => setForm({ ...form, tipo_falha: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_FALHA.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Impacto</Label>
              <Input value={form.impacto} onChange={(e) => setForm({ ...form, impacto: e.target.value })} placeholder="Descreva o impacto no sistema/usuários" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>RTO (minutos)</Label>
                <Input type="number" value={form.rto_minutos} onChange={(e) => setForm({ ...form, rto_minutos: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>RPO (minutos)</Label>
                <Input type="number" value={form.rpo_minutos} onChange={(e) => setForm({ ...form, rpo_minutos: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Plano de Comunicação</Label>
              <Textarea value={form.plano_comunicacao} onChange={(e) => setForm({ ...form, plano_comunicacao: e.target.value })} placeholder="Quem notificar, como e quando" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Abrir Incidente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Detalhes Incidente */}
      <Dialog open={!!detalhesId} onOpenChange={() => setDetalhesId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {incidenteDetalhe?.titulo}
            </DialogTitle>
          </DialogHeader>
          {incidenteDetalhe && (
            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-2">
                <Badge className={sevColor(incidenteDetalhe.severidade)}>{incidenteDetalhe.severidade}</Badge>
                <Badge variant="outline">{incidenteDetalhe.status.replace("_", " ")}</Badge>
                {incidenteDetalhe.tipo_falha && (
                  <Badge variant="secondary">
                    {TIPOS_FALHA.find((t) => t.value === incidenteDetalhe.tipo_falha)?.label}
                  </Badge>
                )}
              </div>

              {incidenteDetalhe.descricao && (
                <p className="text-sm">{incidenteDetalhe.descricao}</p>
              )}
              {incidenteDetalhe.impacto && (
                <p className="text-sm"><strong>Impacto:</strong> {incidenteDetalhe.impacto}</p>
              )}
              
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Início: {format(new Date(incidenteDetalhe.hora_inicio), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</p>
                {incidenteDetalhe.hora_contencao && <p>Contenção: {format(new Date(incidenteDetalhe.hora_contencao), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</p>}
                {incidenteDetalhe.hora_resolucao && <p>Resolução: {format(new Date(incidenteDetalhe.hora_resolucao), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</p>}
                {incidenteDetalhe.hora_encerramento && <p>Encerramento: {format(new Date(incidenteDetalhe.hora_encerramento), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</p>}
                <p>RTO: {incidenteDetalhe.rto_minutos}min | RPO: {incidenteDetalhe.rpo_minutos}min</p>
              </div>

              {incidenteDetalhe.plano_comunicacao && (
                <div>
                  <p className="text-sm font-medium mb-1">Plano de Comunicação</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{incidenteDetalhe.plano_comunicacao}</p>
                </div>
              )}

              {/* Checklist de Crise */}
              <div>
                <p className="text-sm font-medium mb-2">Checklist de Crise</p>
                <div className="space-y-2">
                  {CHECKLIST_ITEMS.map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox
                        checked={(incidenteDetalhe as any)[key] || false}
                        onCheckedChange={(v) => handleChecklist(key, !!v)}
                        disabled={incidenteDetalhe.status === "encerrado"}
                      />
                      <span className="text-sm">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Log de Ações */}
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" /> Log de Ações
                </p>
                <div className="space-y-2 mb-3">
                  {acoes?.map((a) => (
                    <div key={a.id} className="border rounded p-2 text-sm">
                      <p>{a.descricao}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(a.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                      </p>
                    </div>
                  ))}
                  {!acoes?.length && <p className="text-sm text-muted-foreground">Nenhuma ação registrada</p>}
                </div>
                {incidenteDetalhe.status !== "encerrado" && (
                  <div className="flex gap-2">
                    <Input
                      value={acaoTexto}
                      onChange={(e) => setAcaoTexto(e.target.value)}
                      placeholder="Registrar ação tomada..."
                      onKeyDown={(e) => e.key === "Enter" && handleAddAcao()}
                    />
                    <Button size="sm" onClick={handleAddAcao}>Adicionar</Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
