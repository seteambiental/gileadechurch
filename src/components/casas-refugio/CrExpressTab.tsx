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
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import logoGileade from "@/assets/logo-gileade.jpeg";

// Componente do documento formatado como o template
const CrExpressDocument = ({
  numero,
  tema,
  pastor,
  textoBase,
  introducao,
  desenvolvimento,
  conclusao,
  avisos_importantes,
  logoUrl,
  igrejaEndereco,
}: {
  numero: string;
  tema: string;
  pastor: string;
  textoBase: string;
  introducao: string;
  desenvolvimento: string;
  conclusao: string;
  avisos_importantes: string | Record<string, any>;
  logoUrl?: string;
  igrejaEndereco?: string;
}) => (
  <div id="cr-express-preview" className="bg-white text-black rounded-lg border shadow-sm overflow-hidden">
    {/* Header com logo */}
    <div className="flex items-center justify-between px-6 pt-6 pb-3 border-b">
      <img
        src={logoUrl || logoGileade}
        alt="Logo"
        className="w-16 h-16 rounded-full object-cover"
      />
      <h2 className="font-bold text-lg text-center flex-1 px-4">
        CASA REFÚGIO EXPRESS – NRO. {numero}
      </h2>
      <div className="w-16" /> {/* Spacer */}
    </div>

    {/* Body */}
    <div className="px-6 py-4 space-y-4 text-sm leading-relaxed">
      <div className="space-y-1">
        <p><span className="font-bold">Tema da Ministração:</span> {tema}</p>
        <p><span className="font-bold">Pastor / Ministrador:</span> {pastor}</p>
        <p><span className="font-bold">Texto Base:</span> {textoBase}</p>
      </div>

      <div>
        <h4 className="font-bold mb-1">Introdução:</h4>
        <p className="whitespace-pre-wrap">{introducao}</p>
      </div>

      <div>
        <h4 className="font-bold mb-1">Desenvolvimento</h4>
        <p className="whitespace-pre-wrap">{desenvolvimento}</p>
      </div>

      <div>
        <h4 className="font-bold mb-1">Conclusão (prática)</h4>
        <p className="whitespace-pre-wrap">{conclusao}</p>
      </div>

      <div className="italic text-center text-xs text-gray-500 py-1">
        Uma nova igreja, a mesma essência!
      </div>

      {(() => {
        // Normalize: parse JSON string into object if needed
        let avisosData: any = avisos_importantes;
        if (typeof avisosData === "string") {
          try {
            const parsed = JSON.parse(avisosData);
            if (typeof parsed === "object" && parsed !== null) {
              avisosData = parsed;
            }
          } catch {
            // Not JSON, keep as string
          }
        }

        return (
          <div>
            <h4 className="font-bold mb-1">Avisos importantes:</h4>
            {typeof avisosData === "string" ? (
              <p className="whitespace-pre-wrap">{avisosData}</p>
            ) : avisosData && typeof avisosData === "object" ? (
              <div className="space-y-3 text-sm">
                {Array.isArray(avisosData.programacao_igreja) && avisosData.programacao_igreja.length > 0 && (
                  <div>
                    <p className="font-semibold mb-1">Programação da Igreja:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {avisosData.programacao_igreja.map((item: any, i: number) => (
                        <li key={i}>
                          {item.evento}
                          {item.data ? ` – ${item.data.split("-").reverse().join("/")}` : ""}
                          {item.hora ? ` às ${item.hora.substring(0, 5)}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {Array.isArray(avisosData.proximos_eventos_agenda) && avisosData.proximos_eventos_agenda.length > 0 && (
                  <div>
                    <p className="font-semibold mb-1">Próximos Eventos:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {avisosData.proximos_eventos_agenda.map((item: any, i: number) => (
                        <li key={i}>
                          {item.evento}
                          {item.data ? ` – ${item.data.split("-").reverse().join("/")}` : ""}
                          {item.hora ? ` às ${item.hora.substring(0, 5)}` : ""}
                          {item.local ? ` (${item.local})` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!Array.isArray(avisosData.proximos_eventos_agenda) && Array.isArray(avisosData.proximos_eventos) && avisosData.proximos_eventos.length > 0 && (
                  <div>
                    <p className="font-semibold mb-1">Próximos Eventos:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {avisosData.proximos_eventos.map((item: any, i: number) => (
                        <li key={i}>
                          {typeof item === "string" ? item : `${item.evento || ""}${item.data ? ` – ${item.data.split("-").reverse().join("/")}` : ""}${item.hora ? ` às ${item.hora.substring(0, 5)}` : ""}${item.local ? ` (${item.local})` : ""}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {Array.isArray(avisosData.lembretes_fixos) && avisosData.lembretes_fixos.length > 0 && (
                  <div>
                    <p className="font-semibold mb-1">Lembretes:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {avisosData.lembretes_fixos.map((item: string, i: number) => (
                        <li key={i}>{typeof item === "string" ? item : JSON.stringify(item)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        );
      })()}
    </div>

    {/* Footer */}
    <div className="px-6 py-3 border-t bg-gray-50 text-center text-xs text-gray-500">
      {igrejaEndereco || "Ministério Gileade – Rua Araçás, 103 – Uberaba – Curitiba – PR"}
    </div>
  </div>
);

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

  // Fetch church config for logo and address
  const { data: igrejaConfig } = useQuery({
    queryKey: ["igreja-config-cr-express"],
    queryFn: async () => {
      const { data } = await supabase
        .from("igreja_config")
        .select("logo_dark_url, nome_fantasia, address, number, neighborhood, city, state")
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const logoUrl = igrejaConfig?.logo_dark_url || logoGileade;
  const igrejaEndereco = igrejaConfig
    ? `${igrejaConfig.nome_fantasia} – ${igrejaConfig.address || ""}, ${igrejaConfig.number || ""} – ${igrejaConfig.neighborhood || ""} – ${igrejaConfig.city || ""} – ${igrejaConfig.state || ""}`
    : undefined;

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

  const handleDownload = async (cr: any) => {
    const el = document.getElementById("cr-express-preview");
    if (!el) return;

    try {
      toast.info("Gerando PDF...");
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`CR-Express-${cr.numero}.pdf`);
      toast.success("PDF baixado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF");
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-green-600"
                        onClick={() => handleAprovar(cr.id)}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setDeletingId(cr.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
              <CrExpressDocument
                numero={generatedContent.numero}
                tema={tema}
                pastor={pastor}
                textoBase={textoBase}
                introducao={generatedContent.introducao}
                desenvolvimento={generatedContent.desenvolvimento}
                conclusao={generatedContent.conclusao}
                avisos_importantes={generatedContent.avisos_importantes}
                logoUrl={logoUrl}
                igrejaEndereco={igrejaEndereco}
              />

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
              {showPreviewDialog?.data_culto && format(parseISO(showPreviewDialog.data_culto), "dd/MM/yyyy")}
            </DialogDescription>
          </DialogHeader>
          {showPreviewDialog && (
            <div className="space-y-4">
              <CrExpressDocument
                numero={showPreviewDialog.numero}
                tema={showPreviewDialog.tema}
                pastor={showPreviewDialog.pastor_ministrador}
                textoBase={showPreviewDialog.texto_base}
                introducao={showPreviewDialog.introducao || ""}
                desenvolvimento={showPreviewDialog.desenvolvimento || ""}
                conclusao={showPreviewDialog.conclusao || ""}
                avisos_importantes={showPreviewDialog.avisos_importantes || ""}
                logoUrl={logoUrl}
                igrejaEndereco={igrejaEndereco}
              />
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Status:</span>
                  {getStatusBadge(showPreviewDialog.status)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(showPreviewDialog)}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download PDF
                </Button>
              </div>
              {!readOnly && (
                <DialogFooter className="gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => { setDeletingId(showPreviewDialog.id); setShowPreviewDialog(null); }}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Excluir
                  </Button>
                  {showPreviewDialog.status === "pendente" && (
                    <Button onClick={() => handleAprovar(showPreviewDialog.id)}>
                      <Check className="w-4 h-4 mr-1" />
                      Aprovar
                    </Button>
                  )}
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
