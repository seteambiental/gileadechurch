import { MapPin, Users, Clock } from "lucide-react";

interface CellGroupCardProps {
  name: string;
  leader: string;
  location: string;
  dayTime: string;
  members?: number;
  delay?: number;
}

const CellGroupCard = ({
  name,
  leader,
  location,
  dayTime,
  members,
  delay = 0,
}: CellGroupCardProps) => {
  return (
    <div
      className="group p-5 rounded-2xl bg-card border border-border hover:border-secondary transition-all duration-300 hover:shadow-gold opacity-0 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-heading font-bold text-lg text-foreground group-hover:text-secondary transition-colors">
          {name}
        </h3>
        {members && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            <Users className="w-3 h-3" />
            <span>{members}</span>
          </div>
        )}
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        Líder: <span className="font-medium text-foreground">{leader}</span>
      </p>
      
      <div className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-secondary" />
          <span>{location}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-secondary" />
          <span>{dayTime}</span>
        </div>
      </div>
    </div>
  );
};

export default CellGroupCard;
