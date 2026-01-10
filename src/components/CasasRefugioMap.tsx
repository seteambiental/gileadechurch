import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Calendar, Filter, Home } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Leaflet with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface CasaRefugio {
  id: string;
  name: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  numero?: string;
  lideres?: string;
  anfitrioes?: string;
  dias?: string;
  frequencia?: string;
  latitude?: number;
  longitude?: number;
}

const CasasRefugioMap = () => {
  const [cidadeFilter, setCidadeFilter] = useState<string>("all");
  const [bairroFilter, setBairroFilter] = useState<string>("all");
  const [selectedCasaId, setSelectedCasaId] = useState<string | null>(null);

  const { data: casas, isLoading } = useQuery({
    queryKey: ["casas-refugio-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casas_refugio")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as CasaRefugio[];
    },
  });

  // Extrair cidades e bairros únicos
  const cidades = useMemo(() => {
    if (!casas) return [];
    return [...new Set(casas.map(c => c.city).filter(Boolean))].sort();
  }, [casas]);

  const bairros = useMemo(() => {
    if (!casas) return [];
    let filtered = casas;
    if (cidadeFilter !== "all") {
      filtered = casas.filter(c => c.city === cidadeFilter);
    }
    return [...new Set(filtered.map(c => c.neighborhood).filter(Boolean))].sort();
  }, [casas, cidadeFilter]);

  // Filtrar casas
  const casasFiltradas = useMemo(() => {
    if (!casas) return [];
    return casas.filter(c => {
      if (cidadeFilter !== "all" && c.city !== cidadeFilter) return false;
      if (bairroFilter !== "all" && c.neighborhood !== bairroFilter) return false;
      return true;
    });
  }, [casas, cidadeFilter, bairroFilter]);

  // Casas com coordenadas para o mapa
  const casasComCoordenadas = useMemo(() => {
    return casasFiltradas.filter(c => c.latitude && c.longitude);
  }, [casasFiltradas]);

  // Reset bairro filter when cidade changes
  useEffect(() => {
    setBairroFilter("all");
    setSelectedCasaId(null);
  }, [cidadeFilter]);

  // Reset selected casa when bairro changes
  useEffect(() => {
    setSelectedCasaId(null);
  }, [bairroFilter]);

  // Verificar se deve mostrar a lista (filtro aplicado ou casa selecionada)
  const shouldShowList = useMemo(() => {
    return cidadeFilter !== "all" || bairroFilter !== "all" || selectedCasaId !== null;
  }, [cidadeFilter, bairroFilter, selectedCasaId]);

  // Lista a exibir (casa selecionada ou todas filtradas)
  const casasParaExibir = useMemo(() => {
    if (selectedCasaId) {
      return casasFiltradas.filter(c => c.id === selectedCasaId);
    }
    return casasFiltradas;
  }, [casasFiltradas, selectedCasaId]);

  // Centro do mapa baseado nas casas ou Curitiba como padrão
  const mapCenter = useMemo(() => {
    if (casasComCoordenadas.length > 0) {
      const avgLat = casasComCoordenadas.reduce((sum, c) => sum + (c.latitude || 0), 0) / casasComCoordenadas.length;
      const avgLng = casasComCoordenadas.reduce((sum, c) => sum + (c.longitude || 0), 0) / casasComCoordenadas.length;
      return [avgLat, avgLng] as [number, number];
    }
    return [-25.4372, -49.2700] as [number, number]; // Curitiba
  }, [casasComCoordenadas]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-muted/50 rounded-xl">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="w-4 h-4" />
          Filtrar:
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={cidadeFilter} onValueChange={setCidadeFilter}>
            <SelectTrigger className="w-48 bg-card">
              <SelectValue placeholder="Todas as cidades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as cidades</SelectItem>
              {cidades.map((cidade) => (
                <SelectItem key={cidade} value={cidade || ""}>
                  {cidade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={bairroFilter} onValueChange={setBairroFilter}>
            <SelectTrigger className="w-48 bg-card">
              <SelectValue placeholder="Todos os bairros" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os bairros</SelectItem>
              {bairros.map((bairro) => (
                <SelectItem key={bairro} value={bairro || ""}>
                  {bairro}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Badge variant="secondary" className="h-10 px-4 flex items-center">
            {casasFiltradas.length} casa{casasFiltradas.length !== 1 ? "s" : ""} encontrada{casasFiltradas.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </div>

      {/* Mapa */}
      <div className="rounded-2xl overflow-hidden shadow-elegant border border-border">
        {casasComCoordenadas.length > 0 ? (
          <MapContainer
            center={mapCenter}
            zoom={12}
            style={{ height: "400px", width: "100%" }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {casasComCoordenadas.map((casa) => (
              <Marker
                key={casa.id}
                position={[casa.latitude!, casa.longitude!]}
                eventHandlers={{
                  click: () => setSelectedCasaId(casa.id),
                }}
              >
                <Popup>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm">{casa.name}</h4>
                    {casa.lideres && (
                      <p className="text-xs text-muted-foreground">
                        <strong>Líderes:</strong> {casa.lideres}
                      </p>
                    )}
                    {casa.dias && (
                      <p className="text-xs text-muted-foreground">
                        <strong>Dia:</strong> {casa.dias} ({casa.frequencia?.toLowerCase()})
                      </p>
                    )}
                    {casa.address && (
                      <p className="text-xs text-muted-foreground">
                        {casa.address}, {casa.numero}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        ) : (
          <div className="h-96 bg-muted/50 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>As coordenadas das casas refúgio ainda não foram cadastradas</p>
              <p className="text-sm mt-1">Veja a lista abaixo para encontrar uma casa perto de você</p>
            </div>
          </div>
        )}
      </div>

      {/* Lista de Casas - só aparece quando há filtro ou casa selecionada */}
      {shouldShowList && (
        <>
          {selectedCasaId && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="h-8 px-3">
                Casa selecionada no mapa
              </Badge>
              <button 
                onClick={() => setSelectedCasaId(null)}
                className="text-xs text-secondary hover:underline"
              >
                Limpar seleção
              </button>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {casasParaExibir.map((casa) => (
              <Card key={casa.id} className="hover:border-secondary transition-all">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-secondary/10 text-secondary flex-shrink-0">
                      <Home className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-heading font-semibold text-sm truncate">{casa.name}</h4>
                      {casa.lideres && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Users className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{casa.lideres}</span>
                        </p>
                      )}
                      {casa.neighborhood && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span>{casa.neighborhood}</span>
                          {casa.city && <span className="text-muted-foreground/70">- {casa.city}</span>}
                        </p>
                      )}
                      {casa.dias && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          <span>{casa.dias}</span>
                          {casa.frequencia && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                              {casa.frequencia.toLowerCase()}
                            </Badge>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {casasParaExibir.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Home className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma casa refúgio encontrada com os filtros selecionados</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Mensagem quando lista está escondida */}
      {!shouldShowList && (
        <p className="text-center text-sm text-muted-foreground">
          Clique em uma marcação no mapa ou utilize os filtros acima para visualizar as casas refúgio
        </p>
      )}
    </div>
  );
};

export default CasasRefugioMap;
