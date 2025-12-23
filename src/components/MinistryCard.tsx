import { LucideIcon } from "lucide-react";

interface MinistryCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  onClick?: () => void;
  delay?: number;
  variant?: "default" | "ministry";
}

const MinistryCard = ({ icon: Icon, title, description, onClick, delay = 0, variant = "default" }: MinistryCardProps) => {
  const isMinistry = variant === "ministry";
  
  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-card border border-border transition-all duration-300 hover:-translate-y-1 opacity-0 animate-fade-in min-h-[140px] ${
        isMinistry 
          ? "hover:border-destructive hover:shadow-red" 
          : "hover:border-foreground hover:shadow-elegant"
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`flex items-center justify-center w-16 h-16 rounded-xl transition-all duration-300 shadow-elegant ${
        isMinistry
          ? "bg-destructive text-destructive-foreground group-hover:bg-destructive/90"
          : "bg-foreground text-background group-hover:bg-foreground/90"
      }`}>
        <Icon className="w-8 h-8" strokeWidth={1.5} />
      </div>
      <span className={`font-heading font-semibold text-sm text-center transition-colors ${
        isMinistry
          ? "text-foreground group-hover:text-destructive"
          : "text-foreground group-hover:text-foreground"
      }`}>
        {title}
      </span>
      {description && (
        <span className="text-xs text-muted-foreground text-center line-clamp-2">
          {description}
        </span>
      )}
      
      {/* Hover glow effect */}
      <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${
        isMinistry ? "bg-destructive/5" : "bg-foreground/5"
      }`} />
    </button>
  );
};

export default MinistryCard;
