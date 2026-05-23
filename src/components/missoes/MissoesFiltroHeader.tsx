import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Props {
  mesRef: string; // YYYY-MM-DD (1º dia do mês)
  onMesRefChange: (v: string) => void;
  cotacao: number;
  onCotacaoChange: (v: number) => void;
}

export function MissoesFiltroHeader({ mesRef, onMesRefChange, cotacao, onCotacaoChange }: Props) {
  const mesInput = mesRef.slice(0, 7); // YYYY-MM
  const [refreshing, setRefreshing] = useState(false);

  const { data: cotacaoCache, refetch } = useQuery({
    queryKey: ["mm-cotacao-auto"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("obter-cotacao-mzn");
      if (error) throw error;
      return data as { cotacao: number; fonte: string; consultado_em: string; cached: boolean };
    },
    staleTime: 30 * 60 * 1000,
  });

  useEffect(() => {
    if (cotacaoCache?.cotacao && !cotacao) {
      onCotacaoChange(cotacaoCache.cotacao);
    }
  }, [cotacaoCache?.cotacao]);

  const handleAtualizar = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("obter-cotacao-mzn", {
        body: { force: true },
      });
      if (error) throw error;
      if (data?.cotacao) {
        onCotacaoChange(Number(data.cotacao));
        toast.success(`Cotação atualizada: 1 BRL = ${Number(data.cotacao).toFixed(2)} MZN`);
      }
      refetch();
    } catch (e) {
      toast.error("Não foi possível atualizar a cotação agora.");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Card className="mb-4">
      <CardContent className="py-4 flex flex-col md:flex-row gap-4 md:items-end justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div>
            <Label className="text-xs text-muted-foreground">Mês de Referência</Label>
            <Input
              type="month"
              value={mesInput}
              onChange={(e) => onMesRefChange(e.target.value + "-01")}
              className="w-44"
            />
            <div className="text-xs text-muted-foreground mt-1">
              {format(new Date(mesRef), "MMMM 'de' yyyy", { locale: ptBR })}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Cotação BRL → MZN
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.0001"
                value={cotacao || ""}
                onChange={(e) => onCotacaoChange(parseFloat(e.target.value) || 0)}
                className="w-28"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleAtualizar}
                disabled={refreshing}
                title="Atualizar cotação automaticamente"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
            {cotacaoCache?.consultado_em && (
              <div className="text-xs text-muted-foreground mt-1">
                Última consulta: {format(new Date(cotacaoCache.consultado_em), "dd/MM HH:mm")}
                {cotacaoCache.fonte && ` · ${cotacaoCache.fonte}`}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}