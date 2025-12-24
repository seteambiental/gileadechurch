import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isAuthBypassed } from "@/lib/auth-bypass";
import { ArrowLeft, Loader2, Home, Users, Package, DollarSign, Calendar, MapPin, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import logoGileade from "@/assets/logo-gileade.jpeg";
import { format, parseISO, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRangeFilter } from "@/components/casas-refugio/DateRangeFilter";
import { EncontrosCharts } from "@/components/casas-refugio/EncontrosCharts";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

const CasaRefugioDetalhes = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const bypass = isAuthBypassed();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user && !bypass) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate, bypass]);

  const { data: casa, isLoading: loadingCasa } = useQuery({
    queryKey: ["casa-refugio", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casas_refugio")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: encontros = [], isLoading: loadingEncontros } = useQuery({
    queryKey: ["encontros-casa", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("encontros_casa_refugio")
        .select("*")
        .eq("casa_refugio_id", id)
        .order("data_encontro", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
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

  // Calculate indicators from filtered data
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

  if (authLoading || loadingCasa) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-destructive animate-spin" />
      </div>
    );
  }

  if (!user && !bypass) return null;

  if (!casa) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground mb-4">Casa Refúgio não encontrada</h1>
          <Button onClick={() => navigate("/ministerio/casas-refugio")}>Voltar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoGileade} alt="Gileade" className="w-10 h-10 rounded-full object-cover shadow-red" />
            <div>
              <h1 className="font-heading font-bold text-lg text-foreground">{casa.name}</h1>
              <p className="text-xs text-muted-foreground">{casa.condominio}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/ministerio/casas-refugio")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Info Card */}
        <Card className="bg-card border-border">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                <Home className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h2 className="font-bold text-foreground">{casa.name}</h2>
                <p className="text-sm text-muted-foreground">{casa.lideres}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Anfitriões:</span> {casa.anfitrioes || "—"}</div>
              <div><span className="text-muted-foreground">Supervisores:</span> {casa.supervisores || "—"}</div>
              <div><span className="text-muted-foreground">Dias:</span> {casa.dias || "—"}</div>
              <div><span className="text-muted-foreground">Frequência:</span> {casa.frequencia || "—"}</div>
            </div>
            {casa.address && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground pt-2 border-t border-border">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{casa.address}, {casa.numero} - {casa.neighborhood}, {casa.city}/{casa.state} - CEP: {casa.cep}</span>
              </div>
            )}
          </CardContent>
        </Card>

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
              <p className="text-2xl font-bold text-foreground">{totalKilos}</p>
              <p className="text-xs text-muted-foreground">Kilos Total</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-foreground">R$ {totalOfertas.toFixed(2).replace(".", ",")}</p>
              <p className="text-xs text-muted-foreground">Ofertas Total</p>
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

        {/* Charts */}
        <EncontrosCharts encontros={filteredEncontros} />

        {/* Encontros List */}
        <div>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Histórico de Encontros ({filteredEncontros.length})
          </h3>
          {loadingEncontros ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-destructive animate-spin" />
            </div>
          ) : filteredEncontros.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum encontro registrado
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEncontros.map((encontro) => {
                const total = (encontro.qtd_lideres || 0) + (encontro.qtd_membros || 0) + (encontro.qtd_criancas || 0) + (encontro.qtd_visitantes || 0);
                return (
                  <div key={encontro.id} className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-foreground">
                        {format(new Date(encontro.data_encontro), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
                      <div className="flex items-center gap-2">
                        {encontro.photo_url && (
                          <button
                            onClick={() => setSelectedPhoto(encontro.photo_url)}
                            className="p-1 rounded hover:bg-muted"
                          >
                            <Image className="w-4 h-4 text-muted-foreground" />
                          </button>
                        )}
                        <span className="text-sm text-muted-foreground">{total} pessoas</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs text-center">
                      <div><span className="text-blue-600 font-medium">{encontro.qtd_lideres}</span> líd.</div>
                      <div><span className="text-green-600 font-medium">{encontro.qtd_membros}</span> memb.</div>
                      <div><span className="text-amber-600 font-medium">{encontro.qtd_criancas}</span> cri.</div>
                      <div><span className="text-purple-600 font-medium">{encontro.qtd_visitantes}</span> vis.</div>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Package className="w-3 h-3" />{encontro.kilos_arrecadados || 0} kg</span>
                      <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />R$ {Number(encontro.ofertas || 0).toFixed(2).replace(".", ",")}</span>
                    </div>
                    {encontro.photo_url && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <img
                          src={encontro.photo_url}
                          alt="Foto do encontro"
                          className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setSelectedPhoto(encontro.photo_url)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Photo Modal */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-3xl p-2">
          {selectedPhoto && (
            <img
              src={selectedPhoto}
              alt="Foto do encontro"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CasaRefugioDetalhes;
