import { useNavigate, useLocation } from "react-router-dom";
import { Home, Calendar, Users, ChevronRight, UserCheck, Building } from "lucide-react";
import { Button } from "@/components/ui/button";

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

interface CasaRefugioRowProps {
  casa: CasaRefugio;
  onOpenEncontro: () => void;
}

export const CasaRefugioRow = ({ casa, onOpenEncontro }: CasaRefugioRowProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleCasaClick = () => {
    // Preserve current search params for return navigation
    navigate(`/casa-refugio/${casa.id}${location.search}`);
  };

  const handleSupervisorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (casa.supervisores) {
      navigate(`/supervisor/${encodeURIComponent(casa.supervisores)}`);
    }
  };

  const handleCondominioClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (casa.condominio) {
      navigate(`/condominio/${encodeURIComponent(casa.condominio)}`);
    }
  };

  const handleEncontroClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenEncontro();
  };

  return (
    <div 
      className="bg-card border border-border rounded-lg p-4 hover:border-destructive/50 transition-colors cursor-pointer"
      onClick={handleCasaClick}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Icon and Name */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
            <Home className="w-5 h-5 text-destructive" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground truncate">{casa.name}</h3>
            <p className="text-xs text-muted-foreground truncate">
              {casa.lideres || "Sem líder definido"}
            </p>
          </div>
        </div>

        {/* Supervisor - clickable */}
        <div className="hidden lg:flex items-center gap-1">
          <button
            onClick={handleSupervisorClick}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
          >
            <UserCheck className="w-3 h-3" />
            <span className="truncate max-w-[120px]">{casa.supervisores || "—"}</span>
          </button>
        </div>

        {/* Condomínio Badge - clickable (hidden on mobile, shown on sm+) */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={handleCondominioClick}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <Building className="w-3 h-3" />
            {casa.condominio || "—"}
          </button>
        </div>

        {/* Dias */}
        <div className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span className="truncate max-w-[100px]">{casa.dias || "—"}</span>
        </div>

        {/* Frequência */}
        <div className="hidden xl:block">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            casa.frequencia === "SEMANAL" 
              ? "bg-green-500/10 text-green-600" 
              : "bg-amber-500/10 text-amber-600"
          }`}>
            {casa.frequencia || "—"}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleEncontroClick}
            className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <Users className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Encontro</span>
          </Button>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>

      {/* Mobile extra info */}
      <div className="mt-3 pt-3 border-t border-border sm:hidden">
        <div className="flex items-center justify-between text-xs">
          <button
            onClick={handleCondominioClick}
            className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
          >
            {casa.condominio || "—"}
          </button>
          <button
            onClick={handleSupervisorClick}
            className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium truncate max-w-[120px]"
          >
            {casa.supervisores || "—"}
          </button>
        </div>
        <div className="text-xs text-muted-foreground text-center mt-2">
          {casa.dias} • {casa.frequencia}
        </div>
      </div>
    </div>
  );
};
