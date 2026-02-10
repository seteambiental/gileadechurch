import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Loader2,
  Sparkles,
  FileText,
  Check,
  X,
  Eye,
  Trash2,
  Upload,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CrExpressTabProps {
  readOnly?: boolean;
}

export const CrExpressTab = ({ readOnly = false }: CrExpressTabProps) => {
  const queryClient = useQueryClient();
  const [showGerarDialog, setShowGerarDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  // Form state
  const [tema, setTema] = useState("");
  const [pastor, setPastor] = useState("");
  const [textoBase, setTextoBase] = useState("");
  const [dataCulto, setDataCulto] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);

  // Generated content state
  const [generatedContent, setGeneratedContent] = useState<any>(null);

  const { data: crExpressList = [], isLoading } = useQuery({
    queryKey: ["cr-express-list"],
    queryFn: async () => {
      let query = supabase
        .from("cr_express")
        .select("*, gerado_por_member:members!cr_express_gerado_por_fkey(full_name), aprovado_por_member:members!cr_express_aprovado_por_fkey(full_name)")
        .order("data_culto", { ascending: false });
      if (readOnly) {
        query = query.eq("status", "aprovado");
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const totalPages = Math.ceil(crExpressList.length / PER_PAGE);
  const paginatedList = crExpressList.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const saveMutation = useMutation({
    mutationFn: async (crData: any) => {
      const { error } = await supabase.from("cr_express").insert(crData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cr-express-list"] });
      toast.success("CR Express salvo com sucesso!");
      resetForm();
    },
    onError: () => toast.error("Erro ao salvar CR Express"),
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, memberId }: { id: string; memberId?: string }) => {
      const { error } = await supabase
        .from("cr_express")
        .update({ status: "aprovado", aprovado_por: memberId, aprovado_em: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cr-express-list"] });
      toast.success("CR Express aprovado!");
      setShowPreviewDialog(null);
    },
    onError: () => toast.error("Erro ao aprovar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cr_express").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cr-express-list"] });
      toast.success("CR Express excluído!");
      setDeletingId(null);
    },
    onError: () => toast.error("Erro ao excluir"),
  });

  const resetForm = () => {
    setTema("");
    setPastor("");
    setTextoBase("");
    setDataCulto("");
    setArquivo(null);
    setGeneratedContent(null);
    setShowGerarDialog(false);
  };

  const handleGerar = async () => {
    if (!tema || !pastor || !textoBase || !dataCulto) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setGenerating(true);
    try {
      let arquivoPath: string | null = null;

      // Upload file if provided
      if (arquivo) {
        const fileExt = arquivo.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("cr-express-files")
          .upload(fileName, arquivo);
        if (uploadError) throw uploadError;
        arquivoPath = fileName;
      }

      const { data, error } = await supabase.functions.invoke("gerar-cr-express", {
        body: { tema, pastor, textoBase, arquivoPath, dataCulto },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setGeneratedContent({
        numero: data.numero,
        introducao: data.introducao,
        desenvolvimento: data.desenvolvimento,
        conclusao: data.conclusao,
        avisos_importantes: data.avisos_importantes,
        arquivo_url: arquivoPath,
      });

      toast.success("CR Express gerado com sucesso!");
    } catch (err: any) {
      console.error("Error generating:", err);
      toast.error(err.message || "Erro ao gerar CR Express");
    } finally {
      setGenerating(false);
    }
  };

  const handleSalvar = async () => {
    if (!generatedContent) return;

    // Get current member id
    const { data: { user } } = await supabase.auth.getUser();
    let memberId: string | undefined;
    if (user) {
      const { data: member } = await supabase
        .from("members")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      memberId = member?.id;
    }

    saveMutation.mutate({
      numero: generatedContent.numero,
      data_culto: dataCulto,
      tema,
      pastor_ministrador: pastor,
      texto_base: textoBase,
      introducao: generatedContent.introducao,
      desenvolvimento: generatedContent.desenvolvimento,
      conclusao: generatedContent.conclusao,
      avisos_importantes: generatedContent.avisos_importantes,
      arquivo_url: generatedContent.arquivo_url,
      status: "pendente",
      gerado_por: memberId,
    });
  };

  const handleAprovar = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    let memberId: string | undefined;
    if (user) {
      const { data: member } = await supabase
        .from("members")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      memberId = member?.id;
    }
    approveMutation.mutate({ id, memberId });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "aprovado":
        return <Badge className="bg-green-500/10 text-green-600 border-green-200">Aprovado</Badge>;
      case "rejeitado":
        return <Badge variant="destructive">Rejeitado</Badge>;
      default:
        return <Badge variant="outline" className="border-amber-300 text-amber-600 bg-amber-50">Pendente</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-secondary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-heading font-bold text-lg">Casa Refúgio Express</h3>
          <p className="text-sm text-muted-foreground">
            Resumo semanal da palavra do culto para as Casas Refúgio
          </p>
        </div>
        {!readOnly && (
          <Button onClick={() => setShowGerarDialog(true)}>
            <Sparkles className="w-4 h-4 mr-2" />
            Gerar CR Express
          </Button>
        )}
      </div>

      {/* List */}
      {crExpressList.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Nenhum CR Express gerado</p>
            <p className="text-sm">Clique em "Gerar CR Express" para criar o primeiro</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {paginatedList.map((cr: any) => (
            <Card key={cr.id} className="hover:border-secondary/50 transition-colors">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-secondary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">
                        CR Express Nro. {cr.numero}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {cr.tema} • {cr.pastor_ministrador} •{" "}
                        {format(parseISO(cr.data_culto), "dd/MM/yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getStatusBadge(cr.status)}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPreviewDialog(cr)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {!readOnly && cr.status === "pendente" && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600"
                          onClick={() => handleAprovar(cr.id)}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setDeletingId(cr.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Generate Dialog */}
      <Dialog open={showGerarDialog} onOpenChange={(open) => { if (!open) resetForm(); else setShowGerarDialog(true); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-secondary" />
              Gerar Casa Refúgio Express
            </DialogTitle>
            <DialogDescription>
              Preencha as informações da ministração e anexe o arquivo da mensagem
            </DialogDescription>
          </DialogHeader>

          {!generatedContent ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="dataCulto">Data do Culto *</Label>
                <Input
                  id="dataCulto"
                  type="date"
                  value={dataCulto}
                  onChange={(e) => setDataCulto(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="tema">Tema da Mensagem *</Label>
                <Input
                  id="tema"
                  value={tema}
                  onChange={(e) => setTema(e.target.value)}
                  placeholder="Ex: A fé que move montanhas"
                />
              </div>
              <div>
                <Label htmlFor="pastor">Pastor / Ministrador *</Label>
                <Input
                  id="pastor"
                  value={pastor}
                  onChange={(e) => setPastor(e.target.value)}
                  placeholder="Ex: Pr. João Silva"
                />
              </div>
              <div>
                <Label htmlFor="textoBase">Texto Base *</Label>
                <Input
                  id="textoBase"
                  value={textoBase}
                  onChange={(e) => setTextoBase(e.target.value)}
                  placeholder="Ex: Hebreus 11:1-6"
                />
              </div>
              <div>
                <Label htmlFor="arquivo">Arquivo da Mensagem (PDF, Word, PPT, Imagem)</Label>
                <div className="mt-1">
                  <label
                    htmlFor="arquivo"
                    className="flex items-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer hover:border-secondary transition-colors"
                  >
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {arquivo ? arquivo.name : "Clique para anexar arquivo"}
                    </span>
                  </label>
                  <input
                    id="arquivo"
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
                    onChange={(e) => setArquivo(e.target.files?.[0] || null)}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button onClick={handleGerar} disabled={generating}>
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Gerar CR Express
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                <h3 className="font-bold text-center text-lg">
                  CASA REFÚGIO EXPRESS – NRO. {generatedContent.numero}
                </h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Tema da Ministração:</strong> {tema}</p>
                  <p><strong>Pastor / Ministrador:</strong> {pastor}</p>
                  <p><strong>Texto Base:</strong> {textoBase}</p>
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-1">Introdução:</h4>
                  <p className="text-sm whitespace-pre-wrap">{generatedContent.introducao}</p>
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-1">Desenvolvimento:</h4>
                  <p className="text-sm whitespace-pre-wrap">{generatedContent.desenvolvimento}</p>
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-1">Conclusão (prática):</h4>
                  <p className="text-sm whitespace-pre-wrap">{generatedContent.conclusao}</p>
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-1">Avisos Importantes:</h4>
                  <p className="text-sm whitespace-pre-wrap">{generatedContent.avisos_importantes}</p>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setGeneratedContent(null)}>
                  Refazer
                </Button>
                <Button
                  variant="destructive"
                  onClick={resetForm}
                >
                  <X className="w-4 h-4 mr-1" />
                  Descartar
                </Button>
                <Button onClick={handleSalvar} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Salvar para Aprovação
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!showPreviewDialog} onOpenChange={() => setShowPreviewDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              CR Express Nro. {showPreviewDialog?.numero}
            </DialogTitle>
            <DialogDescription>
              {showPreviewDialog?.data_culto && format(parseISO(showPreviewDialog.data_culto), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>
          {showPreviewDialog && (
            <div className="space-y-4">
              <div className="space-y-1 text-sm">
                <p><strong>Tema:</strong> {showPreviewDialog.tema}</p>
                <p><strong>Pastor/Ministrador:</strong> {showPreviewDialog.pastor_ministrador}</p>
                <p><strong>Texto Base:</strong> {showPreviewDialog.texto_base}</p>
              </div>
              <div>
                <h4 className="font-bold text-sm mb-1">Introdução:</h4>
                <p className="text-sm whitespace-pre-wrap">{showPreviewDialog.introducao}</p>
              </div>
              <div>
                <h4 className="font-bold text-sm mb-1">Desenvolvimento:</h4>
                <p className="text-sm whitespace-pre-wrap">{showPreviewDialog.desenvolvimento}</p>
              </div>
              <div>
                <h4 className="font-bold text-sm mb-1">Conclusão (prática):</h4>
                <p className="text-sm whitespace-pre-wrap">{showPreviewDialog.conclusao}</p>
              </div>
              <div>
                <h4 className="font-bold text-sm mb-1">Avisos Importantes:</h4>
                <p className="text-sm whitespace-pre-wrap">{showPreviewDialog.avisos_importantes}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Status:</span>
                {getStatusBadge(showPreviewDialog.status)}
              </div>
              {!readOnly && showPreviewDialog.status === "pendente" && (
                <DialogFooter className="gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => { setDeletingId(showPreviewDialog.id); setShowPreviewDialog(null); }}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Excluir
                  </Button>
                  <Button onClick={() => handleAprovar(showPreviewDialog.id)}>
                    <Check className="w-4 h-4 mr-1" />
                    Aprovar
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir CR Express?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
