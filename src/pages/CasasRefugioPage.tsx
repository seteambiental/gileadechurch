import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isAuthBypassed } from "@/lib/auth-bypass";
import { ArrowLeft, Loader2, Home, Filter, X, Calendar, Users, FileBarChart, Sparkles, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchInput } from "@/components/ui/search-input";
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
import { EncontrosReportDialog } from "@/components/casas-refugio/EncontrosReportDialog";
import { CrExpressTab } from "@/components/casas-refugio/CrExpressTab";
import { includesNormalized } from "@/lib/text-utils";
import { exportGenericToExcel, ExportColumn } from "@/lib/export";
import { differenceInYears } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { toast } from "sonner";
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
  ativo: boolean | null;
  lider?: { full_name: string } | null;
  lider_esposa?: { full_name: string } | null;
}

interface CasaRefugioExtended extends CasaRefugio {
  supervisor?: { full_name: string } | null;
  supervisor_esposa?: { full_name: string } | null;
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
  const casaFilter = searchParams.get("casa") || "all";

  const [encontroDialogOpen, setEncontroDialogOpen] = useState(false);
  const [selectedCasa, setSelectedCasa] = useState<CasaRefugio | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
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
  const setCasaFilter = (value: string) => updateSearchParams("casa", value);

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
        .select(`
          *,
          lider:members!casas_refugio_lider_id_fkey(full_name),
          lider_esposa:members!casas_refugio_lider_esposa_id_fkey(full_name),
          supervisor:members!casas_refugio_supervisor_id_fkey(full_name),
          supervisor_esposa:members!casas_refugio_supervisor_esposa_id_fkey(full_name)
        `)
        .order("name");
      if (error) throw error;
      return data as CasaRefugioExtended[];
    },
  });

  // Fetch member count per casa refúgio
  const { data: membrosPorCasa = [] } = useQuery({
    queryKey: ["membros-por-casa-refugio"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("casa_refugio_id")
        .not("casa_refugio_id", "is", null)
        .neq("excluido", true);
      if (error) throw error;
      return data || [];
    },
  });

  // Total de membros cadastrados (não excluídos)
  const { data: totalMembros = 0 } = useQuery({
    queryKey: ["total-membros-ativos"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("members")
        .select("id", { count: "exact", head: true })
        .neq("excluido", true);
      if (error) throw error;
      return count || 0;
    },
  });

  const [exportingSemCR, setExportingSemCR] = useState(false);

  const handleExportSemCR = async () => {
    try {
      setExportingSemCR(true);
      const { data, error } = await supabase
        .from("members")
        .select("full_name, address, neighborhood, city, state, cep, whatsapp, birth_date")
        .is("casa_refugio_id", null)
        .neq("excluido", true)
        .order("full_name");
      if (error) throw error;
      if (!data || data.length === 0) {
        toast.info("Todos os membros já estão vinculados a uma Casa Refúgio.");
        return;
      }
      const today = new Date();
      const rows = data.map((m: any) => {
        const enderecoPartes = [m.address, m.neighborhood, m.city, m.state, m.cep].filter(Boolean);
        let idade: number | string = "";
        if (m.birth_date) {
          try {
            idade = differenceInYears(today, parseLocalDate(m.birth_date));
          } catch {
            idade = "";
          }
        }
        return {
          full_name: m.full_name || "",
          endereco: enderecoPartes.join(", "),
          whatsapp: m.whatsapp || "",
          idade,
        };
      });
      const columns: ExportColumn[] = [
        { header: "Nome", accessor: "full_name" },
        { header: "Endereço Completo", accessor: "endereco" },
        { header: "WhatsApp", accessor: "whatsapp" },
        { header: "Idade", accessor: "idade" },
      ];
      await exportGenericToExcel(
        rows,
        columns,
        `membros-sem-casa-refugio-${new Date().toISOString().slice(0, 10)}.xlsx`,
        "Sem Casa Refúgio"
      );
      toast.success(`Relatório gerado com ${rows.length} membro(s).`);
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao gerar relatório: " + (e?.message || "desconhecido"));
    } finally {
      setExportingSemCR(false);
    }
  };

  // Helper para obter o nome do supervisor de uma casa
  const getSupervisorName = (casa: CasaRefugioExtended) => {
    return casa.supervisor?.full_name || casa.supervisores || null;
  };

  const condominios = useMemo(() => {
    const unique = [...new Set(casas.map((c) => c.condominio).filter(Boolean))];
    return unique.sort();
  }, [casas]);

  // Lista de nomes de casas filtrada por condomínio e supervisor
  const casasNomes = useMemo(() => {
    let filtered = casas;
    if (condominioFilter !== "all") {
      filtered = filtered.filter(c => c.condominio === condominioFilter);
    }
    if (supervisorFilter !== "all") {
      filtered = filtered.filter(c => getSupervisorName(c) === supervisorFilter);
    }
    return filtered.map(c => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [casas, condominioFilter, supervisorFilter]);

  // Criar lista de supervisores filtrada pelo condomínio selecionado
  const supervisoresMap = useMemo(() => {
    const map = new Map<string, string>();
    const casasFiltradas = condominioFilter === "all" 
      ? casas 
      : casas.filter(c => c.condominio === condominioFilter);
    
    casasFiltradas.forEach((casa) => {
      if (casa.supervisor?.full_name) {
        map.set(casa.supervisor.full_name, casa.supervisor.full_name);
      }
    });
    return Array.from(map.values()).sort();
  }, [casas, condominioFilter]);

  // Reset supervisor filter when condomínio changes
  useEffect(() => {
    setSupervisorFilter("all");
    setCasaFilter("all");
  }, [condominioFilter]);

  // Reset casa filter when supervisor changes
  useEffect(() => {
    setCasaFilter("all");
  }, [supervisorFilter]);


  const filteredCasas = useMemo(() => {
    return casas.filter((casa) => {
      const matchesSearch =
        includesNormalized(casa.name, searchTerm) ||
        includesNormalized(casa.lideres || "", searchTerm) ||
        includesNormalized(casa.anfitrioes || "", searchTerm) ||
        includesNormalized(getSupervisorName(casa) || "", searchTerm);

      const matchesCondominio =
        condominioFilter === "all" || casa.condominio === condominioFilter;

      const supervisorName = getSupervisorName(casa);
      const matchesSupervisor =
        supervisorFilter === "all" || supervisorName === supervisorFilter;

      const matchesCasa =
        casaFilter === "all" || casa.id === casaFilter;

      return matchesSearch && matchesCondominio && matchesSupervisor && matchesCasa;
    });
  }, [casas, searchTerm, condominioFilter, supervisorFilter, casaFilter]);

  // Map for report dialog
  const casasNomesMap = useMemo(() => {
    const map = new Map<string, string>();
    casas.forEach((casa) => map.set(casa.id, casa.name));
    return map;
  }, [casas]);
  const hasActiveFilters =
    condominioFilter !== "all" || supervisorFilter !== "all" || casaFilter !== "all" || searchTerm !== "";

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

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/app")} className="text-muted-foreground hover:text-foreground">
              <Home className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="casas" className="space-y-4">
          <TabsList>
            <TabsTrigger value="casas" className="gap-1.5">
              <Home className="w-4 h-4" />
              Casas Refúgio
            </TabsTrigger>
            <TabsTrigger value="cr-express" className="gap-1.5">
              <Sparkles className="w-4 h-4" />
              CR Express
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cr-express">
            <CrExpressTab />
          </TabsContent>

          <TabsContent value="casas">
        {/* Stats Cards */}
        {(() => {
          const filteredIds = new Set(filteredCasas.map(c => c.id));
          const filteredCondominios = new Set(filteredCasas.map(c => c.condominio).filter(Boolean));
          const filteredSupervisores = new Set(filteredCasas.map(c => getSupervisorName(c)).filter(Boolean));
          const filteredMembros = membrosPorCasa.filter(m => filteredIds.has(m.casa_refugio_id)).length;
          const totalEmCR = membrosPorCasa.length;
          const percentualEmCR = totalMembros > 0 ? (totalEmCR / totalMembros) * 100 : 0;
          const semCR = Math.max(totalMembros - totalEmCR, 0);
          return (
            <>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-3">
              <div className="bg-card border border-border rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{filteredCasas.filter(c => c.ativo).length}</p>
                <p className="text-xs text-muted-foreground">Ativas</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{filteredCasas.filter(c => !c.ativo).length}</p>
                <p className="text-xs text-muted-foreground">Inativas</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{filteredCondominios.size}</p>
                <p className="text-xs text-muted-foreground">Condomínios</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{filteredSupervisores.size}</p>
                <p className="text-xs text-muted-foreground">Supervisores</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{filteredMembros}</p>
                <p className="text-xs text-muted-foreground">Membros</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-primary">{percentualEmCR.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">
                  Em CR ({totalEmCR}/{totalMembros})
                </p>
              </div>
            </div>
            <div className="flex justify-end mb-6">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportSemCR}
                disabled={exportingSemCR}
                className="gap-2"
              >
                {exportingSemCR ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4" />
                )}
                Membros sem CR ({semCR})
              </Button>
            </div>
            </>
          );
        })()}

        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          <SearchInput
            placeholder="Buscar por nome, líder ou anfitrião..."
            value={searchTerm}
            onChange={setSearchTerm}
            className="bg-card border-border max-w-sm"
          />

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
                {supervisoresMap.map((sup) => (
                  <SelectItem key={sup} value={sup}>
                    {sup}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={casaFilter} onValueChange={setCasaFilter}>
              <SelectTrigger className="w-[220px] bg-card border-border">
                <SelectValue placeholder="Casa Refúgio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Casas</SelectItem>
                {casasNomes.map((casa) => (
                  <SelectItem key={casa.id} value={casa.id}>
                    {casa.name}
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

            <div className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReportDialogOpen(true)}
                className="gap-2"
              >
                <FileBarChart className="w-4 h-4" />
                Relatório Encontros
              </Button>
            </div>
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
              />
            ))}
          </div>
        )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Encontro Dialog */}
      <EncontroFormDialog
        open={encontroDialogOpen}
        onOpenChange={setEncontroDialogOpen}
        casa={selectedCasa}
      />

      {/* Report Dialog */}
      <EncontrosReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
      />
    </div>
  );
};

export default CasasRefugioPage;
