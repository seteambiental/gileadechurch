import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Loader2, Send, Calendar } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface EnviarMensagemButtonProps {
  convertido: {
    id: string;
    full_name: string;
    whatsapp?: string | null;
    mensagem_boas_vindas_enviada?: boolean;
    mensagens_enviadas?: number;
    genero?: string | null;
    data_nascimento?: string | null;
  };
}

export const EnviarMensagemButton = ({ convertido }: EnviarMensagemButtonProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [showEventos, setShowEventos] = useState(false);
  const [loadingEventoId, setLoadingEventoId] = useState<string | null>(null);

  const { data: eventos = [], isLoading: loadingEventos } = useQuery({
    queryKey: ["eventos-disponiveis", convertido.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("enviar-whatsapp", {
        body: { action: "listar_eventos_disponiveis", convertidoId: convertido.id },
      });
      if (error) throw error;
      return data.eventos || [];
    },
    enabled: showEventos,
  });

  const enviarBoasVindas = async () => {
    if (!convertido.whatsapp) {
      toast({ variant: "destructive", title: "WhatsApp não cadastrado" });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("enviar-whatsapp", {
        body: { action: "boas_vindas", convertidoId: convertido.id },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({ title: "Mensagem de boas-vindas enviada!" });
      queryClient.invalidateQueries({ queryKey: ["novos-convertidos"] });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const enviarConvite = async (eventoId: string) => {
    setLoadingEventoId(eventoId);
    try {
      const { data, error } = await supabase.functions.invoke("enviar-whatsapp", {
        body: { action: "convite_evento", convertidoId: convertido.id, eventoId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({ title: "Convite enviado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["novos-convertidos"] });
      setShowEventos(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setLoadingEventoId(null);
    }
  };

  const podeEnviarMensagem = (convertido.mensagens_enviadas || 0) < 5;

  if (!podeEnviarMensagem) {
    return (
      <Button size="sm" variant="ghost" disabled className="text-muted-foreground">
        <MessageCircle className="w-4 h-4 mr-1" />
        Limite atingido
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" disabled={isLoading || !convertido.whatsapp}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <MessageCircle className="w-4 h-4 mr-1" />
            )}
            Enviar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!convertido.mensagem_boas_vindas_enviada && (
            <>
              <DropdownMenuItem onClick={enviarBoasVindas}>
                <Send className="w-4 h-4 mr-2" />
                Boas-Vindas
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={() => setShowEventos(true)}>
            <Calendar className="w-4 h-4 mr-2" />
            Convidar para Evento
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showEventos} onOpenChange={setShowEventos}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar para Evento</DialogTitle>
          </DialogHeader>
          
          {loadingEventos ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : eventos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Nenhum evento disponível</p>
              <p className="text-xs">Cadastre eventos na Agenda da Igreja</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {eventos.map((evento: any) => (
                <div
                  key={evento.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{evento.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(evento.data_evento).toLocaleDateString("pt-BR", {
                        day: "numeric",
                        month: "short",
                      })}
                      {evento.hora_inicio && ` às ${evento.hora_inicio.substring(0, 5)}`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => enviarConvite(evento.id)}
                    disabled={loadingEventoId === evento.id}
                  >
                    {loadingEventoId === evento.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
