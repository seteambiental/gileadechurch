import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Sparkles, Send, Loader2, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { includesNormalized } from "@/lib/text-utils";

interface Visitante {
  id: string;
  full_name: string;
  whatsapp: string | null;
  created_at: string;
}

const VisitantesTab = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVisitante, setSelectedVisitante] = useState<Visitante | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch visitantes (novos_convertidos com tipo_conversao = 'visitante' ou sem tipo)
  const { data: visitantes, isLoading } = useQuery({
    queryKey: ["visitantes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("novos_convertidos")
        .select("id, full_name, whatsapp, created_at")
        .or("tipo_conversao.eq.visitante,tipo_conversao.is.null")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Visitante[];
    },
  });

  const filteredVisitantes = visitantes?.filter((v) =>
    includesNormalized(v.full_name, searchTerm)
  );

  const openMessageDialog = (visitante: Visitante) => {
    setSelectedVisitante(visitante);
    setMensagem("");
    setDialogOpen(true);
  };

  const gerarMensagemIA = async () => {
    if (!selectedVisitante) return;

    setIsGenerating(true);
    try {
      const primeiroNome = selectedVisitante.full_name.split(" ")[0];
      
      const response = await supabase.functions.invoke("gerar-mensagem-visitante", {
        body: { nome: primeiroNome },
      });

      if (response.error) throw response.error;

      setMensagem(response.data.mensagem);
      toast({
        title: "Mensagem gerada!",
        description: "A mensagem foi criada com IA. Você pode editá-la antes de enviar.",
      });
    } catch (error) {
      console.error("Erro ao gerar mensagem:", error);
      // Fallback para mensagem padrão
      const primeiroNome = selectedVisitante.full_name.split(" ")[0];
      setMensagem(
        `Olá, ${primeiroNome}! 🙏\n\nFoi uma alegria ter você conosco em nossa igreja! Esperamos que tenha se sentido acolhido(a).\n\nFique à vontade para voltar quando quiser. Você sempre terá um lugar especial aqui!\n\nCom carinho,\nIgreja Gileade 💙`
      );
      toast({
        title: "Mensagem padrão gerada",
        description: "Usamos um modelo padrão. Você pode editá-la.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const enviarMensagem = async () => {
    if (!selectedVisitante?.whatsapp || !mensagem.trim()) return;

    setIsSending(true);
    try {
      // Formata o número de WhatsApp
      const numero = selectedVisitante.whatsapp.replace(/\D/g, "");
      const numeroFormatado = numero.startsWith("55") ? numero : `55${numero}`;

      // Abre o WhatsApp com a mensagem
      const mensagemEncoded = encodeURIComponent(mensagem);
      window.open(`https://wa.me/${numeroFormatado}?text=${mensagemEncoded}`, "_blank");

      toast({
        title: "WhatsApp aberto!",
        description: "A mensagem está pronta para ser enviada.",
      });

      setDialogOpen(false);
      setSelectedVisitante(null);
      setMensagem("");
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast({
        title: "Erro",
        description: "Não foi possível abrir o WhatsApp.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-heading font-bold text-foreground">Visitantes</h2>
          <p className="text-sm text-muted-foreground">
            {filteredVisitantes?.length || 0} visitante(s) cadastrado(s)
          </p>
        </div>

        <SearchInput
          placeholder="Buscar visitante..."
          value={searchTerm}
          onChange={setSearchTerm}
          className="w-full sm:w-64"
        />
      </div>

      {/* Lista de visitantes */}
      {filteredVisitantes?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhum visitante cadastrado ainda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredVisitantes?.map((visitante) => (
            <Card key={visitante.id} className="hover:border-secondary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-secondary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{visitante.full_name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {visitante.whatsapp && (
                          <span>{visitante.whatsapp}</span>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {format(new Date(visitante.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openMessageDialog(visitante)}
                    disabled={!visitante.whatsapp}
                    className="w-full sm:w-auto"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Enviar Mensagem
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de envio de mensagem */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Enviar Mensagem de Agradecimento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Para:</Label>
              <p className="font-medium">{selectedVisitante?.full_name}</p>
              <p className="text-sm text-muted-foreground">{selectedVisitante?.whatsapp}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="mensagem">Mensagem</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={gerarMensagemIA}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Gerar com IA
                </Button>
              </div>
              <Textarea
                id="mensagem"
                placeholder="Digite sua mensagem de agradecimento ou clique em 'Gerar com IA'..."
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                rows={6}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={enviarMensagem}
              disabled={!mensagem.trim() || isSending}
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Enviar via WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VisitantesTab;
