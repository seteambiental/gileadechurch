import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { Home, MapPin, ExternalLink, Users, Calendar, Filter } from "lucide-react";

interface CasaRefugio {
  id: string;
  name: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  numero?: string;
  dias?: string;
  frequencia?: string;
  condominio?: string;
  lider?: { full_name: string } | null;
  lider_esposa?: { full_name: string } | null;
  anfitriao?: { full_name: string } | null;
  anfitriao_esposa?: { full_name: string } | null;
}

const HomepageCasasRefugioTab = () => {
  const navigate = useNavigate();
  const [bairroFilter, setBairroFilter] = useState<string>("all");

  const { data: casas, isLoading } = useQuery({
    queryKey: ["casas-refugio-homepage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casas_refugio")
        .select(`
          *,
          lider:members!casas_refugio_lider_id_fkey(full_name),
          lider_esposa:members!casas_refugio_lider_esposa_id_fkey(full_name),
          anfitriao:members!casas_refugio_anfitriao_id_fkey(full_name),
          anfitriao_esposa:members!casas_refugio_anfitriao_esposa_id_fkey(full_name)
        `)
        .order("name", { ascending: true });
      if (error) throw error;
      return data as CasaRefugio[];
    },
  });

  // Extrair bairros únicos
  const bairros = useMemo(() => {
    if (!casas) return [];
    const uniqueBairros = [...new Set(casas.map(c => c.neighborhood).filter(Boolean))];
    return uniqueBairros.sort();
  }, [casas]);

  // Filtrar casas pelo bairro selecionado
  const casasFiltradas = useMemo(() => {
    if (!casas) return [];
    if (bairroFilter === "all") return casas;
    return casas.filter(c => c.neighborhood === bairroFilter);
  }, [casas, bairroFilter]);

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-heading font-bold">Casas Refúgio</h2>
          <p className="text-sm text-muted-foreground">
            As casas refúgio são exibidas com mapa e filtro por bairro na homepage
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/ministerio/casas-refugio")}>
          <ExternalLink className="w-4 h-4 mr-2" />
          Gerenciar Casas Refúgio
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Mapa e Filtros
          </CardTitle>
          <CardDescription>
            Na homepage, os visitantes poderão ver um mapa com a localização de todas as casas 
            e filtrar por bairro para encontrar a mais próxima. As informações vêm diretamente 
            do cadastro das Casas Refúgio.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Filtro de Bairro */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtrar por bairro:</span>
        </div>
        <Select value={bairroFilter} onValueChange={setBairroFilter}>
          <SelectTrigger className="w-64">
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
        <Badge variant="secondary">
          {casasFiltradas.length} casa{casasFiltradas.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Lista de Casas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {casasFiltradas.map((casa) => (
          <Card key={casa.id}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
                  <Home className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold truncate">{casa.name}</h4>
                  {(casa.lider || casa.lider_esposa) && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Users className="w-3 h-3" />
                      {[casa.lider?.full_name, casa.lider_esposa?.full_name].filter(Boolean).join(" e ")}
                    </p>
                  )}
                  {casa.neighborhood && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {casa.neighborhood}
                      {casa.city && ` - ${casa.city}`}
                    </p>
                  )}
                  {casa.dias && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3" />
                      {casa.dias} {casa.frequencia && `(${casa.frequencia.toLowerCase()})`}
                    </p>
                  )}
                  {casa.condominio && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      {casa.condominio}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {casasFiltradas.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Home className="w-12 h-12 mx-auto mb-4 opacity-50" />
            {bairroFilter !== "all" 
              ? "Nenhuma casa refúgio neste bairro"
              : "Nenhuma casa refúgio cadastrada"
            }
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HomepageCasasRefugioTab;
