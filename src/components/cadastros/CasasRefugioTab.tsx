import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit2, Trash2, Loader2, MapPin, Users, Calendar, Filter, X, Navigation, CheckCircle, XCircle, Power, PowerOff } from "lucide-react";
import { formatLeaderNames, includesNormalized } from "@/lib/text-utils";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CasaRefugioFormDialog from "./CasaRefugioFormDialog";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExportButton } from "@/components/ui/export-button";

interface CasaRefugio {
  id: string;
  name: string;
  anfitrioes: string | null;
  condominio: string | null;
  lideres: string | null;
  supervisores: string | null;
  dias: string | null;
  frequencia: string | null;
  data_inicio_cr: string | null;
  cep: string | null;
  address: string | null;
  numero: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  ativo: boolean;
  lider?: { full_name: string } | null;
  lider_esposa?: { full_name: string } | null;
  supervisor?: { full_name: string } | null;
  supervisor_esposa?: { full_name: string } | null;
  anfitriao?: { full_name: string } | null;
  anfitriao_esposa?: { full_name: string } | null;
}

interface GeocodingResult {
  id: string;
  name: string;
  success: boolean;
}

const CasasRefugioTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [condominioFilter, setCondominioFilter] = useState<string>("all");
  const [supervisorFilter, setSupervisorFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CasaRefugio | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingResults, setGeocodingResults] = useState<GeocodingResult[] | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["casas_refugio"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casas_refugio")
        .select(`
          *,
          lider:members!casas_refugio_lider_id_fkey(full_name),
          lider_esposa:members!casas_refugio_lider_esposa_id_fkey(full_name),
          supervisor:members!casas_refugio_supervisor_id_fkey(full_name),
          supervisor_esposa:members!casas_refugio_supervisor_esposa_id_fkey(full_name),
          anfitriao:members!casas_refugio_anfitriao_id_fkey(full_name),
          anfitriao_esposa:members!casas_refugio_anfitriao_esposa_id_fkey(full_name)
        `)
        .order("name");
      if (error) throw error;
      return data as CasaRefugio[];
    },
  });

  // Extract unique condominios for filter
  const condominios = useMemo(() => {
    const condSet = new Set<string>();
    items.forEach((item) => {
      if (item.condominio) condSet.add(item.condominio);
    });
    return Array.from(condSet).sort();
  }, [items]);

  // Extract supervisores filtered by selected condomínio
  const supervisores = useMemo(() => {
    const supSet = new Set<string>();
    const filteredItems = condominioFilter === "all" 
      ? items 
      : items.filter(item => item.condominio === condominioFilter);
    
    filteredItems.forEach((item) => {
      const supervisorName = item.supervisor?.full_name || item.supervisores;
      if (supervisorName) supSet.add(supervisorName);
    });
    return Array.from(supSet).sort();
  }, [items, condominioFilter]);

  // Helper to get supervisor name from relational or legacy field
  const getSupervisorName = (item: CasaRefugio) => {
    return item.supervisor?.full_name || item.supervisores || null;
  };

  // Helper to get anfitriao name from relational or legacy field
  const getAnfitriaoNames = (item: CasaRefugio) => {
    return formatLeaderNames(item.anfitriao?.full_name, item.anfitriao_esposa?.full_name, "Anfitrião") || item.anfitrioes || null;
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("casas_refugio").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["casas_refugio"] });
      toast({ title: "Casa Refúgio excluída com sucesso!" });
      setDeletingId(null);
    },
    onError: () => {
      toast({ title: "Erro ao excluir Casa Refúgio", variant: "destructive" });
    },
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("casas_refugio")
        .update({ ativo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["casas_refugio"] });
      toast({
        title: variables.ativo
          ? "Casa Refúgio reativada com sucesso!"
          : "Casa Refúgio inativada com sucesso!",
      });
    },
    onError: () => {
      toast({ title: "Erro ao alterar status da Casa Refúgio", variant: "destructive" });
    },
  });

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Text search
      const matchesSearch =
        searchTerm === "" ||
        includesNormalized(item.name, searchTerm) ||
        includesNormalized(item.condominio || "", searchTerm) ||
        includesNormalized(item.lideres || "", searchTerm) ||
        includesNormalized(getSupervisorName(item) || "", searchTerm);

      // Condomínio filter
      const matchesCondominio =
        condominioFilter === "all" || item.condominio === condominioFilter;

      // Supervisor filter - compare with relational name
      const supervisorName = getSupervisorName(item);
      const matchesSupervisor =
        supervisorFilter === "all" || supervisorName === supervisorFilter;

      // Status filter
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "ativa" && item.ativo !== false) ||
        (statusFilter === "inativa" && item.ativo === false);

      return matchesSearch && matchesCondominio && matchesSupervisor && matchesStatus;
    });
  }, [items, searchTerm, condominioFilter, supervisorFilter, statusFilter]);

  // Reset supervisor filter when condomínio changes
  const handleCondominioChange = (value: string) => {
    setCondominioFilter(value);
    setSupervisorFilter("all");
  };

  const hasActiveFilters =
    condominioFilter !== "all" || supervisorFilter !== "all" || statusFilter !== "all";

  // Contar casas sem coordenadas
  const casasSemCoordenadas = useMemo(() => {
    return items.filter((item) => !item.latitude || !item.longitude).length;
  }, [items]);

  const clearFilters = () => {
    setCondominioFilter("all");
    setSupervisorFilter("all");
    setStatusFilter("all");
    setSearchTerm("");
  };

  const handleGeocodingAll = async () => {
    setIsGeocoding(true);
    try {
      const { data, error } = await supabase.functions.invoke("geocoding", {
        body: { action: "geocode_all" },
      });

      if (error) throw error;

      if (data.success) {
        setGeocodingResults(data.results);
        toast({
          title: "Geocodificação concluída!",
          description: `${data.successCount} casas encontradas, ${data.failCount} não encontradas`,
        });
        queryClient.invalidateQueries({ queryKey: ["casas_refugio"] });
      } else {
        throw new Error(data.error);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast({ title: "Erro ao geocodificar", description: message, variant: "destructive" });
    } finally {
      setIsGeocoding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <SearchInput
            placeholder="Buscar por nome, condomínio ou líder..."
            value={searchTerm}
            onChange={setSearchTerm}
            className="flex-1 max-w-md"
          />
          <div className="flex gap-2 flex-wrap">
            <ExportButton
              data={filteredItems}
              columns={[
                { header: "Nome", accessor: "name" },
                { header: "Condomínio", accessor: "condominio" },
                { header: "Líderes", accessor: (r) => formatLeaderNames(r.lider?.full_name, r.lider_esposa?.full_name) || r.lideres || "-" },
                { header: "Anfitriões", accessor: (r) => formatLeaderNames(r.anfitriao?.full_name, r.anfitriao_esposa?.full_name, "Anfitrião") || r.anfitrioes || "-" },
                { header: "Supervisores", accessor: (r) => formatLeaderNames(r.supervisor?.full_name, r.supervisor_esposa?.full_name, "Supervisor") || r.supervisores || "-" },
                { header: "Dias", accessor: "dias" },
                { header: "Frequência", accessor: "frequencia" },
                { header: "Endereço Completo", accessor: (r) => [
                  [r.address, r.numero].filter(Boolean).join(", "),
                  r.neighborhood,
                  [r.city, r.state].filter(Boolean).join(" - "),
                  r.cep,
                ].filter(Boolean).join(" - ") || "-" },
                { header: "Bairro", accessor: "neighborhood" },
                { header: "Cidade", accessor: "city" },
                { header: "Estado", accessor: "state" },
                { header: "Status", accessor: (r) => (r.ativo === false ? "Inativa" : "Ativa") },
              ]}
              filename="casas-refugio"
              title="Casas Refúgio"
              sheetName="Casas"
              selectableColumns
            />
            {casasSemCoordenadas > 0 && (
              <Button
                variant="outline"
                onClick={handleGeocodingAll}
                disabled={isGeocoding}
              >
                {isGeocoding ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4 mr-2" />
                    Geocodificar ({casasSemCoordenadas})
                  </>
                )}
              </Button>
            )}
            <Button onClick={() => setIsFormOpen(true)} className="bg-secondary hover:bg-secondary/90">
              <Plus className="w-4 h-4 mr-2" />
              Nova Casa Refúgio
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="w-4 h-4" />
            <span>Filtros:</span>
          </div>

          <Select value={condominioFilter} onValueChange={handleCondominioChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Condomínio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os condomínios</SelectItem>
              {condominios.map((cond) => (
                <SelectItem key={cond} value={cond}>
                  {cond}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={supervisorFilter} onValueChange={setSupervisorFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Supervisor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os supervisores</SelectItem>
              {supervisores.map((sup) => (
                <SelectItem key={sup} value={sup}>
                  {sup}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
              <X className="w-4 h-4 mr-1" />
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>Total: {items.length} casas refúgio</span>
        {(searchTerm || hasActiveFilters) && (
          <span>• Exibindo: {filteredItems.length}</span>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-secondary animate-spin" />
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            {searchTerm || hasActiveFilters
              ? "Nenhuma casa refúgio encontrada com os filtros selecionados"
              : "Nenhuma casa refúgio cadastrada"}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <Card key={item.id} className="bg-card border-border hover:border-secondary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
                      {item.latitude && item.longitude ? (
                        <span title="Coordenadas cadastradas">
                          <Navigation className="w-3 h-3 text-green-500 shrink-0" />
                        </span>
                      ) : (
                        <span title="Sem coordenadas">
                          <Navigation className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                        </span>
                      )}
                    </div>
                    {item.condominio && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        {item.condominio}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingItem(item);
                        setIsFormOpen(true);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeletingId(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm text-muted-foreground">
                  {(item.lider || item.lider_esposa || item.lideres) && (
                    <p className="flex items-center gap-1.5 truncate">
                      <Users className="w-3 h-3 shrink-0" />
                      <span className="truncate">
                        {formatLeaderNames(item.lider?.full_name, item.lider_esposa?.full_name) || `Líderes: ${item.lideres}`}
                      </span>
                    </p>
                  )}
                  {item.dias && item.frequencia && (
                    <p className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 shrink-0" />
                      <span>{item.dias} - {item.frequencia}</span>
                    </p>
                  )}
                  {(item.neighborhood || item.city) && (
                    <p className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">
                        {item.neighborhood && `${item.neighborhood}, `}
                        {item.city} {item.state && `- ${item.state}`}
                      </span>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <CasaRefugioFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingItem(null);
        }}
        item={editingItem}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta Casa Refúgio? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Geocoding Results Dialog */}
      <Dialog open={!!geocodingResults} onOpenChange={() => setGeocodingResults(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resultado da Geocodificação</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {geocodingResults?.map((result) => (
              <div
                key={result.id}
                className={`flex items-center gap-2 p-2 rounded-lg ${
                  result.success ? "bg-green-500/10" : "bg-destructive/10"
                }`}
              >
                {result.success ? (
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-destructive shrink-0" />
                )}
                <span className="text-sm truncate">{result.name}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CasasRefugioTab;
