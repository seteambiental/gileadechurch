import { LucideIcon, Users } from "lucide-react";

interface MinistryCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  leaderNames?: string;
  onClick?: () => void;
  delay?: number;
  variant?: "default" | "ministry" | "kids";
  color?: string; // hex color for the ministry
}

const MinistryCard = ({ icon: Icon, title, description, leaderNames, onClick, delay = 0, variant = "default", color }: MinistryCardProps) => {
  const isKids = variant === "kids";
  
  const iconBg = color
    ? { background: color }
    : isKids
      ? undefined
      : undefined;

  const iconClass = color
    ? "text-white group-hover:scale-110"
    : isKids
      ? "bg-gradient-to-br from-pink-400 via-purple-400 to-cyan-400 text-white group-hover:scale-110"
      : "bg-destructive text-destructive-foreground group-hover:bg-destructive/90";

  const hoverBorder = color
    ? { borderColor: color } as React.CSSProperties
    : {};

  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center justify-center gap-2 p-5 rounded-2xl bg-card border border-border transition-all duration-300 hover:-translate-y-1 opacity-0 animate-fade-in min-h-[160px] ${
        isKids
          ? "hover:border-pink-400 hover:shadow-lg hover:shadow-pink-200/50"
          : color
            ? "hover:shadow-lg"
            : "hover:border-destructive hover:shadow-red"
      }`}
      style={{
        animationDelay: `${delay}ms`,
        ...(color ? { '--ministry-color': color } as React.CSSProperties : {}),
      }}
      onMouseEnter={(e) => {
        if (color) {
          (e.currentTarget as HTMLElement).style.borderColor = color;
          (e.currentTarget as HTMLElement).style.boxShadow = `0 10px 25px -5px ${color}30`;
        }
      }}
      onMouseLeave={(e) => {
        if (color) {
          (e.currentTarget as HTMLElement).style.borderColor = '';
          (e.currentTarget as HTMLElement).style.boxShadow = '';
        }
      }}
    >
      <div
        className={`flex items-center justify-center w-14 h-14 rounded-xl transition-all duration-300 shadow-elegant ${iconClass}`}
        style={iconBg}
      >
        <Icon className="w-7 h-7" strokeWidth={1.5} />
      </div>
      <span className="font-heading font-semibold text-sm text-center text-foreground leading-tight">
        {title}
      </span>
      {description && (
        <span className="text-[11px] text-muted-foreground text-center line-clamp-1">
          {description}
        </span>
      )}
      {leaderNames && (
        <span className="text-[10px] text-muted-foreground/80 text-center line-clamp-1 flex items-center gap-1 mt-auto">
          <Users className="w-3 h-3 shrink-0" />
          {leaderNames}
        </span>
      )}
      
      {/* Hover glow effect */}
      <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${
        isKids
          ? "bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-cyan-500/5"
          : !color
            ? "bg-destructive/5"
            : ""
      }`}
        style={color ? { backgroundColor: `${color}08` } : {}}
      />
    </button>
  );
};

export default MinistryCard;
