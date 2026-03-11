import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AgendaCalendar } from "@/components/agenda/AgendaCalendar";
import { Loader2 } from "lucide-react";

export const PortalAgendaTab = ({ incluirSomenteConvidados = false }: { incluirSomenteConvidados?: boolean }) => {
  // Buscar eventos recorrentes (programação)
  const { data: eventosRecorrentes = [], isLoading: loadingRecorrentes } = useQuery({
    queryKey: ["portal-agenda-recorrentes", incluirSomenteConvidados],
    queryFn: async () => {
      let query = supabase
        .from("agenda_igreja")
        .select("*")
        .eq("ativo", true)
        .eq("recorrente", true)
        .eq("status", "aprovado");
      if (!incluirSomenteConvidados) {
        query = query.neq("genero_alvo", "somente_convidados");
      }
      const { data, error } = await query.order("dia_semana", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Buscar eventos únicos
  const { data: eventosUnicos = [], isLoading: loadingUnicos } = useQuery({
    queryKey: ["portal-agenda-eventos", incluirSomenteConvidados],
    queryFn: async () => {
      let query = supabase
        .from("agenda_igreja")
        .select("*")
        .eq("recorrente", false)
        .eq("status", "aprovado")
        .eq("ativo", true);
      if (!incluirSomenteConvidados) {
        query = query.neq("genero_alvo", "somente_convidados");
      }
      const { data, error } = await query.order("data_evento", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const eventosCalendario = [...eventosRecorrentes, ...eventosUnicos];
  const isLoading = loadingRecorrentes || loadingUnicos;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-xl">Agenda da Igreja</h2>
        <p className="text-sm text-muted-foreground">
          Veja os eventos e atividades programadas
        </p>
      </div>

      <AgendaCalendar
        eventos={eventosCalendario}
        isLoading={isLoading}
        defaultView="semana"
      />
    </div>
  );
};
