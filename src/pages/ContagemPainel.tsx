import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import CounterDisplay from "@/components/contagem/CounterDisplay";

/**
 * Painel "destacável" para o telão da igreja.
 * Aberto em uma nova janela (window.open) que pode ser arrastada para o projetor.
 * Atualiza em tempo real conforme a contagem muda.
 */
const ContagemPainel = () => {
  const [params] = useSearchParams();
  const id = params.get("id");
  const [sessao, setSessao] = useState<{ titulo: string; entradas: number; saidas: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchSessao = async () => {
      const { data } = await supabase
        .from("contagem_cultos")
        .select("titulo, entradas, saidas")
        .eq("id", id)
        .maybeSingle();
      if (data) setSessao(data);
      setLoading(false);
    };
    fetchSessao();

    const channel = supabase
      .channel(`painel-contagem-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contagem_cultos", filter: `id=eq.${id}` },
        (payload) => {
          const row = payload.new as any;
          if (row) setSessao({ titulo: row.titulo, entradas: row.entradas, saidas: row.saidas });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-secondary animate-spin" />
      </div>
    );
  }

  if (!sessao) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8 text-center">
        <p className="text-muted-foreground text-xl">Sessão de contagem não encontrada.</p>
      </div>
    );
  }

  const pessoas = Math.max(0, (sessao.entradas ?? 0) - (sessao.saidas ?? 0));

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <CounterDisplay pessoas={pessoas} titulo={sessao.titulo} />
    </div>
  );
};

export default ContagemPainel;