import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isAuthBypassed } from "@/lib/auth-bypass";
import { ArrowLeft, Loader2, Home, Search, Filter, X, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import logoGileade from "@/assets/logo-gileade.jpeg";
import { CasaRefugioRow } from "@/components/casas-refugio/CasaRefugioRow";
import { EncontroFormDialog } from "@/components/casas-refugio/EncontroFormDialog";

interface CasaRefugio {
  id: string;
  name: string;
  anfitrioes: string | null;
  condominio: string | null;
  lideres: string | null;
  supervisores: string | null;
  dias: string | null;
  frequencia: string | null;
  cep: string | null;
  address: string | null;
  numero: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
}

const CasasRefugioPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const bypass = isAuthBypassed();

  // Get filter values from URL or use defaults
  const searchTerm = searchParams.get("q") || "";
  const condominioFilter = searchParams.get("cond") || "all";
  const supervisorFilter = searchParams.get("sup") || "all";

  const [encontroDialogOpen, setEncontroDialogOpen] = useState(false);
  const [selectedCasa, setSelectedCasa] = useState<CasaRefugio | null>(null);

  // Helper to update search params without replacing
  const updateSearchParams = useCallback((key: string, value: string) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (value === "" || value === "all") {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
      return newParams;
    }, { replace: true });
  }, [setSearchParams]);

  const setSearchTerm = (value: string) => updateSearchParams("q", value);
  const setCondominioFilter = (value: string) => updateSearchParams("cond", value);
  const setSupervisorFilter = (value: string) => updateSearchParams("sup", value);

  useEffect(() => {
    if (!authLoading && !user && !bypass) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate, bypass]);

  const { data: casas = [], isLoading } = useQuery({
    queryKey: ["casas-refugio-page"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casas_refugio")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as CasaRefugio[];
    },
  });

  const condominios = useMemo(() => {
    const unique = [...new Set(casas.map((c) => c.condominio).filter(Boolean))];
    return unique.sort();
  }, [casas]);

  const supervisores = useMemo(() => {
    const unique = [...new Set(casas.map((c) => c.supervisores).filter(Boolean))];
    return unique.sort();
  }, [casas]);

  const filteredCasas = useMemo(() => {
    return casas.filter((casa) => {
      const matchesSearch =
        casa.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        casa.lideres?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        casa.anfitrioes?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCondominio =
        condominioFilter === "all" || casa.condominio === condominioFilter;

      const matchesSupervisor =
        supervisorFilter === "all" || casa.supervisores === supervisorFilter;

      return matchesSearch && matchesCondominio && matchesSupervisor;
    });
  }, [casas, searchTerm, condominioFilter, supervisorFilter]);

  const hasActiveFilters =
    condominioFilter !== "all" || supervisorFilter !== "all" || searchTerm !== "";

  const clearFilters = () => {
    setSearchParams({}, { replace: true });
  };

  const handleOpenEncontro = (casa: CasaRefugio) => {
    setSelectedCasa(casa);
    setEncontroDialogOpen(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-destructive animate-spin" />
      </div>
    );
  }

  if (!user && !bypass) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={logoGileade}
              alt="Gileade Church"
              className="w-10 h-10 rounded-full object-cover shadow-red"
            />
            <div>
              <h1 className="font-heading font-bold text-lg text-foreground">
                Casas Refúgio
              </h1>
              <p className="text-xs text-muted-foreground">Células</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/app")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{casas.length}</p>
            <p className="text-xs text-muted-foreground">Total de Casas</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{condominios.length}</p>
            <p className="text-xs text-muted-foreground">Condomínios</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{supervisores.length}</p>
            <p className="text-xs text-muted-foreground">Supervisores</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por nome, líder ou anfitrião..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filtros:</span>
            </div>

            <Select value={condominioFilter} onValueChange={setCondominioFilter}>
              <SelectTrigger className="w-[160px] bg-card border-border">
                <SelectValue placeholder="Condomínio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Condomínios</SelectItem>
                {condominios.map((cond) => (
                  <SelectItem key={cond} value={cond!}>
                    {cond}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={supervisorFilter} onValueChange={setSupervisorFilter}>
              <SelectTrigger className="w-[200px] bg-card border-border">
                <SelectValue placeholder="Supervisor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Supervisores</SelectItem>
                {supervisores.map((sup) => (
                  <SelectItem key={sup} value={sup!}>
                    {sup}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-destructive hover:text-destructive"
              >
                <X className="w-4 h-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground mb-4">
          {filteredCasas.length} casa{filteredCasas.length !== 1 ? "s" : ""} encontrada{filteredCasas.length !== 1 ? "s" : ""}
        </p>

        {/* Casa Refúgio List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-destructive animate-spin" />
          </div>
        ) : filteredCasas.length === 0 ? (
          <div className="text-center py-12">
            <Home className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma casa refúgio encontrada</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCasas.map((casa) => (
              <CasaRefugioRow
                key={casa.id}
                casa={casa}
                onOpenEncontro={() => handleOpenEncontro(casa)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Encontro Dialog */}
      <EncontroFormDialog
        open={encontroDialogOpen}
        onOpenChange={setEncontroDialogOpen}
        casa={selectedCasa}
      />
    </div>
  );
};

export default CasasRefugioPage;
