import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/masks";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Archive, ChevronDown, ChevronRight, Users, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const TIPOS_LABELS: Record<string, string> = {
  membro: "Membro",
  nao_membro: "Não membro",
  familia: "Líderes e Anfitriões",
  equipe: "Equipe",
};

const EventosFinalizadosTab = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ["impacto-eventos-finalizados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impacto_eventos")
        .select("id, titulo, data_inicio, data_fim, tipo, finalizado_em")
        .eq("finalizado", true)
        .order("finalizado_em", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: inscricoes = [], isLoading: loadingInscricoes } = useQuery({
    queryKey: ["impacto-inscricoes-finalizados", expandedId],
    queryFn: async () => {
      if (!expandedId) return [];
      const { data, error } = await supabase
        .from("impacto_inscricoes")
        .select("id, nome, genero, tipo_inscricao, valor_inscricao, valor_pago, status_pagamento, referencia")
        .eq("evento_id", expandedId)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
    enabled: !!expandedId,
  });

  const resolveGenero = (g: string | null) => {
    if (!g) return "—";
    const lower = g.toLowerCase();
    if (lower === "m" || lower === "masculino") return "Masculino";
    if (lower === "f" || lower === "feminino") return "Feminino";
    return g;
  };

  const filteredEventos = useMemo(() => {
    if (!search.trim()) return eventos;
    const q = search.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return eventos.filter((e: any) =>
      (e.titulo || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(q)
    );
  }, [eventos, search]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // Stats per expanded event
  const stats = useMemo(() => {
    if (!inscricoes.length) return { total: 0, masc: 0, fem: 0, receita: 0, recebido: 0 };
    let masc = 0, fem = 0, receita = 0, recebido = 0;
    inscricoes.forEach((i: any) => {
      const g = (i.genero || "").toLowerCase();
      if (g === "m" || g === "masculino") masc++;
      else if (g === "f" || g === "feminino") fem++;
      receita += parseFloat(i.valor_inscricao) || 0;
      recebido += parseFloat(i.valor_pago) || 0;
    });
    return { total: inscricoes.length, masc, fem, receita, recebido };
  }, [inscricoes]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-heading font-bold">Eventos Finalizados</h2>
        <p className="text-sm text-muted-foreground">
          Eventos encerrados e arquivados com seus dados consolidados
        </p>
      </div>

      {eventos.length > 3 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar evento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {filteredEventos.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Archive className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">Nenhum evento finalizado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Eventos finalizados nas abas Inscrições ou Financeiro aparecerão aqui
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredEventos.map((evento: any) => {
            const isExpanded = expandedId === evento.id;
            return (
              <Card key={evento.id}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(evento.id)}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                        <div className="text-left">
                          <p className="font-medium">{evento.titulo}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseLocalDate(evento.data_inicio), "dd/MM/yyyy", { locale: ptBR })}
                            {evento.data_fim && evento.data_fim !== evento.data_inicio
                              ? ` → ${format(parseLocalDate(evento.data_fim), "dd/MM/yyyy", { locale: ptBR })}`
                              : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {evento.finalizado_em && (
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            Finalizado em {format(new Date(evento.finalizado_em), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        )}
                        <Badge variant="secondary" className="gap-1">
                          <Archive className="w-3 h-3" />
                          Arquivado
                        </Badge>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t px-4 pb-4 pt-3 space-y-4">
                      {loadingInscricoes ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : inscricoes.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhuma inscrição registrada para este evento.
                        </p>
                      ) : (
                        <>
                          {/* Summary cards */}
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                            <div className="bg-muted/50 rounded-lg p-3 text-center">
                              <p className="text-xs text-muted-foreground">Total</p>
                              <p className="text-lg font-bold">{stats.total}</p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-3 text-center">
                              <p className="text-xs text-muted-foreground">Masculino</p>
                              <p className="text-lg font-bold">{stats.masc}</p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-3 text-center">
                              <p className="text-xs text-muted-foreground">Feminino</p>
                              <p className="text-lg font-bold">{stats.fem}</p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-3 text-center">
                              <p className="text-xs text-muted-foreground">Receita</p>
                              <p className="text-lg font-bold">{formatCurrency(stats.receita)}</p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-3 text-center">
                              <p className="text-xs text-muted-foreground">Recebido</p>
                              <p className="text-lg font-bold">{formatCurrency(stats.recebido)}</p>
                            </div>
                          </div>

                          {/* Participants table */}
                          <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Ref.</TableHead>
                                  <TableHead>Nome</TableHead>
                                  <TableHead>Tipo</TableHead>
                                  <TableHead>Gênero</TableHead>
                                  <TableHead>Valor</TableHead>
                                  <TableHead>Pago</TableHead>
                                  <TableHead>Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {inscricoes.map((insc: any) => (
                                  <TableRow key={insc.id}>
                                    <TableCell className="text-xs font-mono text-muted-foreground">
                                      {insc.referencia || "—"}
                                    </TableCell>
                                    <TableCell className="font-medium">{insc.nome}</TableCell>
                                    <TableCell className="text-sm">
                                      {TIPOS_LABELS[insc.tipo_inscricao] || insc.tipo_inscricao || "—"}
                                    </TableCell>
                                    <TableCell className="text-sm">{resolveGenero(insc.genero)}</TableCell>
                                    <TableCell className="text-sm">
                                      {insc.valor_inscricao ? formatCurrency(parseFloat(insc.valor_inscricao)) : "—"}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {parseFloat(insc.valor_pago) > 0 ? formatCurrency(parseFloat(insc.valor_pago)) : "—"}
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant={insc.status_pagamento === "pago" ? "default" : "secondary"}
                                        className={insc.status_pagamento === "pago" ? "bg-green-600 text-white" : ""}
                                      >
                                        {insc.status_pagamento === "pago" ? "Pago" : insc.status_pagamento === "parcial" ? "Parcial" : "Pendente"}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EventosFinalizadosTab;
