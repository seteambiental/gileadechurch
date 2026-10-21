import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, LocateFixed, Loader2, Footprints, Car, Bus, MapPin, Calendar } from "lucide-react";
import { toast } from "sonner";

interface Casa {
  id: string;
  name: string;
  address?: string;
  numero?: string;
  neighborhood?: string;
  city?: string;
  dias?: string;
  latitude?: number;
  longitude?: number;
}

function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function CasaMaisProximaBusca({
  casas,
  onSelectCasa,
}: {
  casas: Casa[];
  onSelectCasa?: (id: string) => void;
}) {
  const [endereco, setEndereco] = useState("");
  const [loading, setLoading] = useState(false);
  const [origem, setOrigem] = useState<{ lat: number; lng: number } | null>(null);

  const proximas = origem
    ? casas
        .filter((c) => c.latitude && c.longitude)
        .map((c) => ({ ...c, dist: distanciaKm(origem.lat, origem.lng, c.latitude!, c.longitude!) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 3)
    : [];

  const buscarEndereco = async () => {
    if (endereco.trim().length < 4) {
      toast.error("Digite seu endereço (rua, número e cidade)");
      return;
    }
    setLoading(true);
    try {
      const q = /curitiba|pinhais|colombo|são josé|sao jose|araucária|araucaria|almirante|campo largo|fazenda/i.test(endereco)
        ? endereco
        : `${endereco}, Curitiba, PR`;
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=br`,
        { headers: { "Accept-Language": "pt-BR" } }
      );
      const data = await r.json();
      if (!data?.length) {
        toast.error("Endereço não encontrado. Tente incluir número e bairro.");
        return;
      }
      setOrigem({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
    } catch {
      toast.error("Não foi possível buscar o endereço agora.");
    } finally {
      setLoading(false);
    }
  };

  const usarLocalizacao = () => {
    if (!navigator.geolocation) {
      toast.error("Seu aparelho não permite localização");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setOrigem({ lat: p.coords.latitude, lng: p.coords.longitude });
        setEndereco("Minha localização atual");
        setLoading(false);
      },
      () => {
        toast.error("Permita o acesso à localização para usar esta opção");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const rota = (c: Casa, modo: "walking" | "driving" | "transit") => {
    const o = origem ? `&origin=${origem.lat},${origem.lng}` : "";
    window.open(
      `https://www.google.com/maps/dir/?api=1${o}&destination=${c.latitude},${c.longitude}&travelmode=${modo}`,
      "_blank"
    );
  };

  return (
    <Card className="border-secondary/30">
      <CardContent className="p-4 space-y-4">
        <div>
          <h3 className="font-heading font-bold text-lg">Encontre a Casa Refúgio mais perto de você</h3>
          <p className="text-sm text-muted-foreground">Digite seu endereço ou use sua localização atual</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Ex: Rua Araças, 103, Uberaba, Curitiba"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && buscarEndereco()}
            className="flex-1"
          />
          <div className="flex gap-2">
            <Button onClick={buscarEndereco} disabled={loading} className="flex-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-1" />}
              Buscar
            </Button>
            <Button variant="outline" onClick={usarLocalizacao} disabled={loading} className="flex-1">
              <LocateFixed className="w-4 h-4 mr-1" /> Minha localização
            </Button>
          </div>
        </div>

        {origem && proximas.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma casa com localização cadastrada.</p>
        )}

        {proximas.map((c, i) => (
          <div key={c.id} className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <button className="text-left" onClick={() => onSelectCasa?.(c.id)}>
                <p className="font-semibold">
                  {i === 0 && <Badge className="mr-2">Mais próxima</Badge>}
                  {c.name}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" />
                  {[c.address && `${c.address}${c.numero ? `, ${c.numero}` : ""}`, c.neighborhood, c.city]
                    .filter(Boolean)
                    .join(" - ")}
                </p>
                {c.dias && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {c.dias}
                  </p>
                )}
              </button>
              <Badge variant="secondary" className="shrink-0">
                {c.dist < 1 ? `${Math.round(c.dist * 1000)} m` : `${c.dist.toFixed(1)} km`}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button size="sm" variant="outline" onClick={() => rota(c, "walking")}>
                <Footprints className="w-4 h-4 mr-1" /> A pé
              </Button>
              <Button size="sm" variant="outline" onClick={() => rota(c, "driving")}>
                <Car className="w-4 h-4 mr-1" /> Carro
              </Button>
              <Button size="sm" variant="outline" onClick={() => rota(c, "transit")}>
                <Bus className="w-4 h-4 mr-1" /> Ônibus
              </Button>
            </div>
          </div>
        ))}
        {proximas.length > 0 && (
          <p className="text-xs text-muted-foreground">Distância em linha reta. A rota abre no Google Maps com tempo e trajeto.</p>
        )}
      </CardContent>
    </Card>
  );
}
