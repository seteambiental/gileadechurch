import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Calendar, MapPin, Users, Trash2, Edit, Eye } from "lucide-react";
import ImpactoEventoFormDialog from "./ImpactoEventoFormDialog";
import ImpactoEventoDetalhesDialog from "./ImpactoEventoDetalhesDialog";

const TIPOS_IMPACTO: Record<string, { label: string; color: string }> = {
  mulheres: { label: "Mulheres", color: "bg-pink-500" },
  homens: { label: "Homens", color: "bg-blue-500" },
  criancas: { label: "Crianças", color: "bg-yellow-500" },
  jovens: { label: "Jovens", color: "bg-purple-500" },
  adolescentes: { label: "Adolescentes", color: "bg-orange-500" },
  casais: { label: "Casais", color: "bg-red-500" },
};

const ImpactoEventosTab = () => {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvento, setEditingEvento] = useState<any>(null);
  const [selectedEvento, setSelectedEvento] = useState<any>(null);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());

  const { data: eventos, isLoading } = useQuery({
    queryKey: ["impacto-eventos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impacto_eventos")
        .select("*")
        .order("data_inicio", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Buscar eventos da agenda que necessitam inscrição
  const { data: eventosAgenda = [] } = useQuery({
    queryKey: ["agenda-eventos-inscricao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_igreja")
        .select("id, titulo, descricao, data_evento, data_fim, hora_inicio, hora_fim, local, tipo_evento, cor, flyer_url, limite_vagas, ativo, necessita_inscricao")
        .eq("necessita_inscricao", true)
        .eq("recorrente", false)
        .order("data_evento", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: inscricoesCount } = useQuery({
    queryKey: ["impacto-inscricoes-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impacto_inscricoes")
        .select("evento_id");
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach((i) => {
        counts[i.evento_id] = (counts[i.evento_id] || 0) + 1;
      });
      return counts;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("impacto_eventos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evento removido!");
      queryClient.invalidateQueries({ queryKey: ["impacto-eventos"] });
    },
    onError: () => {
      toast.error("Erro ao remover evento");
    },
  });

  const years = Array.from(
    new Set(eventos?.map((e) => new Date(e.data_inicio).getFullYear()) || [])
  ).sort((a, b) => b - a);

  const filteredEventos = eventos?.filter(
    (e) => new Date(e.data_inicio).getFullYear().toString() === yearFilter
  );

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Eventos da Agenda com inscrição */}
      {eventosAgenda.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-heading font-bold">Eventos com Inscrição</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {eventosAgenda.map((evento) => (
              <Card key={evento.id} className="relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: evento.cor || "hsl(var(--destructive))" }} />
                {evento.flyer_url && (
                  <div className="aspect-[16/9] overflow-hidden">
                    <img src={evento.flyer_url} alt={evento.titulo} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{evento.titulo}</CardTitle>
                    <Badge variant={evento.ativo ? "outline" : "secondary"}>
                      {evento.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {format(new Date(evento.data_evento), "dd/MM/yyyy", { locale: ptBR })}
                      {evento.data_fim && ` - ${format(new Date(evento.data_fim), "dd/MM/yyyy", { locale: ptBR })}`}
                    </span>
                  </div>
                  {evento.local && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{evento.local}</span>
                    </div>
                  )}
                  {evento.limite_vagas && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{evento.limite_vagas} vagas</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-heading font-bold">Agenda de Impactos</h2>
        <div className="flex gap-2">
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.length === 0 ? (
                <SelectItem value={new Date().getFullYear().toString()}>
                  {new Date().getFullYear()}
                </SelectItem>
              ) : (
                years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Impacto
          </Button>
        </div>
      </div>

      {filteredEventos?.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum evento de impacto registrado para {yearFilter}.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEventos?.map((evento) => {
            const tipoInfo = TIPOS_IMPACTO[evento.tipo] || { label: evento.tipo, color: "bg-gray-500" };
            const inscritos = inscricoesCount?.[evento.id] || 0;

            return (
              <Card key={evento.id} className="relative overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-1 ${tipoInfo.color}`} />
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{evento.titulo}</CardTitle>
                    <Badge variant="secondary">{tipoInfo.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {format(new Date(evento.data_inicio), "dd/MM/yyyy", { locale: ptBR })}
                      {evento.data_fim && ` - ${format(new Date(evento.data_fim), "dd/MM/yyyy", { locale: ptBR })}`}
                    </span>
                  </div>

                  {evento.local && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{evento.local}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {inscritos} inscritos
                      {evento.limite_vagas && ` / ${evento.limite_vagas} vagas`}
                    </span>
                  </div>

                  {evento.valor_inscricao > 0 && (
                    <p className="text-sm font-medium">
                      Inscrição: R$ {evento.valor_inscricao.toFixed(2)}
                    </p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedEvento(evento)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Detalhes
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingEvento(evento);
                        setFormOpen(true);
                      }}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(evento.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ImpactoEventoFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingEvento(null);
        }}
        evento={editingEvento}
      />

      {selectedEvento && (
        <ImpactoEventoDetalhesDialog
          open={!!selectedEvento}
          onOpenChange={(open) => !open && setSelectedEvento(null)}
          evento={selectedEvento}
        />
      )}
    </div>
  );
};

export default ImpactoEventosTab;
