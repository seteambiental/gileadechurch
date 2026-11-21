import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";

export default function WhatsappDesconectadoAlerta() {
  const { data } = useQuery({
    queryKey: ["whatsapp-status-alerta"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("whatsapp-status", { method: "GET" });
      if (error) return null;
      return data as { configured?: boolean; connected?: boolean } | null;
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  });

  if (!data || data.connected !== false) return null;

  return (
    <div className="container mx-auto px-4 pt-4">
      <div role="alert" className="flex gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-foreground">
        <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <div className="text-sm space-y-1">
          <p className="font-semibold text-destructive">WhatsApp da igreja desconectado</p>
          <p>Nenhuma mensagem está sendo enviada (aniversários, inscrições e envios em lote ficam parados).</p>
          <p>
            Para reconectar: entre no painel do WasenderAPI (wasenderapi.com), abra a sessão e clique em conectar.
            No celular da igreja, abra o WhatsApp → Aparelhos conectados → Conectar aparelho e leia o QR Code.
          </p>
        </div>
      </div>
    </div>
  );
}
