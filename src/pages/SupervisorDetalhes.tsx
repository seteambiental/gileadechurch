import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isAuthBypassed } from "@/lib/auth-bypass";
import { ArrowLeft, Loader2, UserCheck, Users, Package, DollarSign, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import logoGileade from "@/assets/logo-gileade.jpeg";
import { parseISO, isWithinInterval } from "date-fns";
import { DateRangeFilter } from "@/components/casas-refugio/DateRangeFilter";
import { EncontrosCharts } from "@/components/casas-refugio/EncontrosCharts";

const SupervisorDetalhes = () => {
  const { nome } = useParams<{ nome: string }>();
  const supervisorNome = decodeURIComponent(nome || "");
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const bypass = isAuthBypassed();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (!authLoading && !user && !bypass) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate, bypass]);

  const { data: casas = [], isLoading: loadingCasas } = useQuery({
    queryKey: ["casas-supervisor", supervisorNome],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casas_refugio")
        .select("*")
        .eq("supervisores", supervisorNome)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!supervisorNome,
  });

  const casaIds = useMemo(() => casas.map(c => c.id), [casas]);

  const { data: encontros = [], isLoading: loadingEncontros } = useQuery({
    queryKey: ["encontros-supervisor", casaIds],
    queryFn: async () => {
      if (casaIds.length === 0) return [];
      const { data, error } = await supabase
        .from("encontros_casa_refugio")
        .select("*")
        .in("casa_refugio_id", casaIds)
        .order("data_encontro", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: casaIds.length > 0,
  });

  // Filter encontros by date range
  const filteredEncontros = useMemo(() => {
    if (!startDate && !endDate) return encontros;
    
    return encontros.filter((encontro) => {
      const encontroDate = parseISO(encontro.data_encontro);
      
      if (startDate && endDate) {
        return isWithinInterval(encontroDate, {
          start: parseISO(startDate),
          end: parseISO(endDate),
        });
      }
      
      if (startDate) {
        return encontroDate >= parseISO(startDate);
      }
      
      if (endDate) {
        return encontroDate <= parseISO(endDate);
      }
      
      return true;
    });
  }, [encontros, startDate, endDate]);

  // Calculate indicators
  const totalCasas = casas.length;
  const totalEncontros = filteredEncontros.length;
  const totalLideres = filteredEncontros.reduce((acc, e) => acc + (e.qtd_lideres || 0), 0);
  const totalMembros = filteredEncontros.reduce((acc, e) => acc + (e.qtd_membros || 0), 0);
  const totalCriancas = filteredEncontros.reduce((acc, e) => acc + (e.qtd_criancas || 0), 0);
  const totalVisitantes = filteredEncontros.reduce((acc, e) => acc + (e.qtd_visitantes || 0), 0);
  const totalPessoas = totalLideres + totalMembros + totalCriancas + totalVisitantes;
  const totalKilos = filteredEncontros.reduce((acc, e) => acc + Number(e.kilos_arrecadados || 0), 0);
  const totalOfertas = filteredEncontros.reduce((acc, e) => acc + Number(e.ofertas || 0), 0);
  const mediaPessoas = totalEncontros > 0 ? Math.round(totalPessoas / totalEncontros) : 0;

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-destructive animate-spin" />
      </div>
    );
  }

  if (!user && !bypass) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoGileade} alt="Gileade" className="w-10 h-10 rounded-full object-cover shadow-red" />
            <div>
              <h1 className="font-heading font-bold text-lg text-foreground">{supervisorNome}</h1>
              <p className="text-xs text-muted-foreground">Supervisor(a)</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Supervisor Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <UserCheck className="w-10 h-10 text-destructive" />
          </div>
        </div>

        {/* Date Filter */}
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onApply={() => {}}
          onClear={clearFilters}
        />

        {/* Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-foreground">{totalCasas}</p>
              <p className="text-xs text-muted-foreground">Casas Refúgio</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-foreground">{totalEncontros}</p>
              <p className="text-xs text-muted-foreground">Encontros</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-foreground">{mediaPessoas}</p>
              <p className="text-xs text-muted-foreground">Média/Encontro</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-foreground">{totalPessoas}</p>
              <p className="text-xs text-muted-foreground">Total Pessoas</p>
            </CardContent>
          </Card>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-blue-500/10 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-blue-600">{totalLideres}</p>
            <p className="text-xs text-muted-foreground">Líderes</p>
          </div>
          <div className="bg-green-500/10 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-green-600">{totalMembros}</p>
            <p className="text-xs text-muted-foreground">Membros</p>
          </div>
          <div className="bg-amber-500/10 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-amber-600">{totalCriancas}</p>
            <p className="text-xs text-muted-foreground">Crianças</p>
          </div>
          <div className="bg-purple-500/10 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-purple-600">{totalVisitantes}</p>
            <p className="text-xs text-muted-foreground">Visitantes</p>
          </div>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-amber-500/10 border-amber-500/20">
            <CardContent className="pt-4 pb-4 text-center">
              <Package className="w-5 h-5 mx-auto mb-1 text-amber-600" />
              <p className="text-xl font-bold text-amber-600">{totalKilos} kg</p>
              <p className="text-xs text-muted-foreground">Kilos Arrecadados</p>
            </CardContent>
          </Card>
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="pt-4 pb-4 text-center">
              <DollarSign className="w-5 h-5 mx-auto mb-1 text-green-600" />
              <p className="text-xl font-bold text-green-600">R$ {totalOfertas.toFixed(2).replace(".", ",")}</p>
              <p className="text-xs text-muted-foreground">Ofertas Totais</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <EncontrosCharts encontros={filteredEncontros} />

        {/* Casas List */}
        <div>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Home className="w-4 h-4" />
            Casas Refúgio ({totalCasas})
          </h3>
          {loadingCasas ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-destructive animate-spin" />
            </div>
          ) : casas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma casa refúgio encontrada
            </div>
          ) : (
            <div className="space-y-2">
              {casas.map((casa) => {
                const casaEncontros = filteredEncontros.filter(e => e.casa_refugio_id === casa.id);
                const casaTotal = casaEncontros.reduce((acc, e) => 
                  acc + (e.qtd_lideres || 0) + (e.qtd_membros || 0) + (e.qtd_criancas || 0) + (e.qtd_visitantes || 0), 0);
                return (
                  <div
                    key={casa.id}
                    className="bg-card border border-border rounded-lg p-4 hover:border-destructive/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/casa-refugio/${casa.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                          <Home className="w-5 h-5 text-destructive" />
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">{casa.name}</h4>
                          <p className="text-xs text-muted-foreground">{casa.lideres}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">{casaEncontros.length} encontros</p>
                        <p className="text-xs text-muted-foreground">{casaTotal} pessoas</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SupervisorDetalhes;
