import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  Users,
  Calendar,
  MapPin,
  ChevronRight,
  Loader2,
  Package,
  DollarSign,
} from "lucide-react";
import { PortalAccess } from "@/hooks/useMemberPortal";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PortalCasaRefugioTabProps {
  portalAccess: PortalAccess | null;
  memberCasasRefugio: { id: string; name: string; isLider: boolean }[];
}

export const PortalCasaRefugioTab = ({
  portalAccess,
  memberCasasRefugio,
}: PortalCasaRefugioTabProps) => {
  const [selectedCasa, setSelectedCasa] = useState<string | null>(null);

  // Determinar IDs das casas que o usuário pode ver
  const getCasaIds = () => {
    if (!portalAccess) return memberCasasRefugio.map((c) => c.id);

    // Pastor geral vê tudo
    if (portalAccess.role === "pastor_geral") return null; // null = todas

    // Líder vê suas casas
    if (portalAccess.casasRefugioIds) {
      return portalAccess.casasRefugioIds;
    }

    return memberCasasRefugio.map((c) => c.id);
  };

  const casaIds = getCasaIds();

  const { data: casas = [], isLoading: loadingCasas } = useQuery({
    queryKey: ["portal-casas-refugio", casaIds],
    queryFn: async () => {
      let query = supabase
        .from("casas_refugio")
        .select("*")
        .order("name");

      if (casaIds && casaIds.length > 0) {
        query = query.in("id", casaIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Buscar estatísticas da casa selecionada
  const { data: encontros = [], isLoading: loadingEncontros } = useQuery({
    queryKey: ["portal-encontros-casa", selectedCasa],
    queryFn: async () => {
      if (!selectedCasa) return [];
      const { data, error } = await supabase
        .from("encontros_casa_refugio")
        .select("*")
        .eq("casa_refugio_id", selectedCasa)
        .order("data_encontro", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCasa,
  });

  // Calcular estatísticas
  const stats = {
    totalEncontros: encontros.length,
    totalPessoas: encontros.reduce(
      (acc, e) =>
        acc + (e.qtd_lideres || 0) + (e.qtd_membros || 0) + (e.qtd_criancas || 0) + (e.qtd_visitantes || 0),
      0
    ),
    totalKilos: encontros.reduce((acc, e) => acc + Number(e.kilos_arrecadados || 0), 0),
    totalOfertas: encontros.reduce((acc, e) => acc + Number(e.ofertas || 0), 0),
  };

  const casaSelecionada = casas.find((c) => c.id === selectedCasa);

  if (loadingCasas) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  if (casas.length === 0) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Home className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">Nenhuma Casa Refúgio vinculada</p>
          <p className="text-sm">
            Você ainda não está vinculado a nenhuma Casa Refúgio
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-xl">Casas Refúgio</h2>
        <p className="text-sm text-muted-foreground">
          {portalAccess?.role === "pastor_geral"
            ? "Todas as casas refúgio"
            : `${casas.length} casa(s) vinculada(s)`}
        </p>
      </div>

      {!selectedCasa ? (
        // Lista de Casas
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {casas.map((casa) => {
            const isLider = memberCasasRefugio.some(
              (c) => c.id === casa.id && c.isLider
            );
            return (
              <Card
                key={casa.id}
                className="cursor-pointer hover:border-secondary transition-colors"
                onClick={() => setSelectedCasa(casa.id)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                        <Home className="w-5 h-5 text-secondary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{casa.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {casa.condominio || "Sem condomínio"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                  {isLider && (
                    <Badge className="mt-3" variant="secondary">
                      Líder
                    </Badge>
                  )}
                  {casa.lideres && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {casa.lideres}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        // Detalhes da Casa Selecionada
        <div className="space-y-6">
          <Button variant="outline" onClick={() => setSelectedCasa(null)}>
            ← Voltar
          </Button>

          {casaSelecionada && (
            <>
              {/* Info Card */}
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                      <Home className="w-6 h-6 text-secondary" />
                    </div>
                    <div>
                      <h2 className="font-bold text-foreground">
                        {casaSelecionada.name}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {casaSelecionada.lideres}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Dias:</span>{" "}
                      {casaSelecionada.dias || "—"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Frequência:</span>{" "}
                      {casaSelecionada.frequencia || "—"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Supervisores:</span>{" "}
                      {casaSelecionada.supervisores || "—"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Condomínio:</span>{" "}
                      {casaSelecionada.condominio || "—"}
                    </div>
                  </div>
                  {casaSelecionada.address && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground pt-2 border-t border-border">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>
                        {casaSelecionada.address}
                        {casaSelecionada.numero && `, ${casaSelecionada.numero}`} -{" "}
                        {casaSelecionada.neighborhood}, {casaSelecionada.city}/
                        {casaSelecionada.state}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Indicadores */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="pt-4 pb-4 text-center">
                    <Calendar className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-2xl font-bold">{stats.totalEncontros}</p>
                    <p className="text-xs text-muted-foreground">Encontros</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4 text-center">
                    <Users className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-2xl font-bold">{stats.totalPessoas}</p>
                    <p className="text-xs text-muted-foreground">Pessoas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4 text-center">
                    <Package className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-2xl font-bold">{stats.totalKilos}</p>
                    <p className="text-xs text-muted-foreground">Kilos</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4 text-center">
                    <DollarSign className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-2xl font-bold">
                      R$ {stats.totalOfertas.toFixed(0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Ofertas</p>
                  </CardContent>
                </Card>
              </div>

              {/* Últimos Encontros */}
              <div>
                <h3 className="font-semibold mb-3">Últimos Encontros</h3>
                {loadingEncontros ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 text-secondary animate-spin" />
                  </div>
                ) : encontros.length === 0 ? (
                  <Card className="bg-muted/30">
                    <CardContent className="py-8 text-center text-muted-foreground">
                      Nenhum encontro registrado
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {encontros.map((encontro) => {
                      const total =
                        (encontro.qtd_lideres || 0) +
                        (encontro.qtd_membros || 0) +
                        (encontro.qtd_criancas || 0) +
                        (encontro.qtd_visitantes || 0);
                      return (
                        <Card key={encontro.id}>
                          <CardContent className="py-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">
                                  {format(
                                    parseISO(encontro.data_encontro),
                                    "dd 'de' MMMM, yyyy",
                                    { locale: ptBR }
                                  )}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {total} pessoas • {encontro.kilos_arrecadados || 0}{" "}
                                  kg • R${" "}
                                  {Number(encontro.ofertas || 0).toFixed(2)}
                                </p>
                              </div>
                              {encontro.photo_url && (
                                <img
                                  src={encontro.photo_url}
                                  alt="Foto do encontro"
                                  className="w-12 h-12 rounded object-cover"
                                />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
