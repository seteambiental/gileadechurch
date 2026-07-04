import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { includesNormalized } from "@/lib/text-utils";
import { Loader2, CalendarDays, MapPin, Phone, ChevronRight, Users } from "lucide-react";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { ptBR } from "date-fns/locale";

interface PortalLideresInscricoesEventosProps {
  memberId: string;
  onSubNavChange?: (backFn: (() => void) | null) => void;
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pendente: { label: "A pagar", variant: "secondary" },
  confirmado: { label: "Pago", variant: "default" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};

const tipoInscricaoLabels: Record<string, string> = {
  membro: "Membro",
  nao_membro: "Não Membro",
  familia: "Líderes e Anfitriões",
  equipe: "Equipe",
};

export const PortalLideresInscricoesEventos = ({
  memberId,
  onSubNavChange,
}: PortalLideresInscricoesEventosProps) => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventTitle, setSelectedEventTitle] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");

  // Eventos aos quais o membro tem acesso
  const { data: eventos = [], isLoading: loadingEventos } = useQuery({
    queryKey: ["portal-lideres-acesso-eventos", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evento_inscricoes_acessos")
        .select("evento_id, agenda_igreja(id, titulo, data_evento, local, tipo_evento, cor)")
        .eq("member_id", memberId);
      if (error) throw error;
      return (data || [])
        .map((r: any) => r.agenda_igreja)
        .filter(Boolean)
        .sort((a: any, b: any) =>
          (b.data_evento || "").localeCompare(a.data_evento || "")
        );
    },
    enabled: !!memberId,
  });

  // Inscrições do evento selecionado (somente leitura)
  const { data: inscricoes = [], isLoading: loadingInscricoes } = useQuery({
    queryKey: ["portal-lideres-inscricoes", selectedEventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscricoes_eventos")
        .select("id, nome_participante, telefone_contato, genero, status_pagamento, tipo_inscricao, lista_espera, created_at")
        .eq("evento_id", selectedEventId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedEventId,
  });

  // Register back handler for header
  useEffect(() => {
    if (selectedEventId) {
      onSubNavChange?.(() => setSelectedEventId(null));
    } else {
      onSubNavChange?.(null);
    }
    return () => onSubNavChange?.(null);
  }, [selectedEventId, onSubNavChange]);

  const inscricoesFiltradas = useMemo(() => {
    return inscricoes
      .filter((i: any) => {
        const matchSearch = includesNormalized(i.nome_participante, searchTerm);
        const matchStatus = filterStatus === "todos" || i.status_pagamento === filterStatus;
        return matchSearch && matchStatus;
      })
      .sort((a: any, b: any) => a.nome_participante.localeCompare(b.nome_participante, "pt-BR"));
  }, [inscricoes, searchTerm, filterStatus]);

  const totais = useMemo(() => {
    const ativas = inscricoes.filter((i: any) => !i.lista_espera && i.status_pagamento !== "cancelado");
    const espera = inscricoes.filter((i: any) => i.lista_espera);
    return { ativas: ativas.length, espera: espera.length, total: inscricoes.length };
  }, [inscricoes]);

  if (loadingEventos) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  // Lista de eventos
  if (!selectedEventId) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="font-heading font-bold text-lg">Inscrições de Eventos</h2>
          <p className="text-sm text-muted-foreground">
            Eventos aos quais você tem acesso para acompanhar as inscrições
          </p>
        </div>

        {eventos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarDays className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                Você ainda não tem acesso a inscrições de nenhum evento.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {eventos.map((evento: any) => (
              <Card
                key={evento.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                style={{ borderLeft: `4px solid ${evento.cor || "hsl(var(--secondary))"}` }}
                onClick={() => {
                  setSelectedEventId(evento.id);
                  setSelectedEventTitle(evento.titulo);
                  setSearchTerm("");
                  setFilterStatus("todos");
                }}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm leading-tight truncate">{evento.titulo}</h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      {evento.data_evento && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {format(parseLocalDate(evento.data_evento), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      )}
                      {evento.local && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{evento.local}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Detalhe das inscrições (somente leitura)
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading font-bold text-lg leading-tight">{selectedEventTitle}</h2>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Badge variant="outline" className="text-xs">
            <Users className="w-3 h-3 mr-1" />
            {totais.ativas} inscritos
          </Badge>
          {totais.espera > 0 && (
            <Badge variant="secondary" className="text-xs">
              {totais.espera} na lista de espera
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por nome..."
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="confirmado">Pago</SelectItem>
            <SelectItem value="pendente">A pagar</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loadingInscricoes ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-secondary animate-spin" />
        </div>
      ) : inscricoesFiltradas.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground text-sm">Nenhuma inscrição encontrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {inscricoesFiltradas.map((i: any) => {
            const status = statusLabels[i.status_pagamento] || { label: i.status_pagamento, variant: "outline" as const };
            return (
              <Card key={i.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm leading-tight">{i.nome_participante}</p>
                      {i.telefone_contato && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          {i.telefone_contato}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant={status.variant} className="text-[10px]">
                        {status.label}
                      </Badge>
                      {i.lista_espera && (
                        <Badge variant="secondary" className="text-[10px]">Lista de espera</Badge>
                      )}
                    </div>
                  </div>
                  {i.tipo_inscricao && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {tipoInscricaoLabels[i.tipo_inscricao] || i.tipo_inscricao}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
