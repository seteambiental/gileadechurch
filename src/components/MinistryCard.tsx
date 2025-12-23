import { LucideIcon } from "lucide-react";

interface MinistryCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  onClick?: () => void;
  delay?: number;
}

const MinistryCard = ({ icon: Icon, title, description, onClick, delay = 0 }: MinistryCardProps) => {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-card border border-border hover:border-secondary transition-all duration-300 hover:shadow-gold hover:-translate-y-1 opacity-0 animate-fade-in min-h-[140px]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-navy text-primary-foreground group-hover:bg-gradient-gold group-hover:text-secondary-foreground transition-all duration-300 shadow-elegant">
        <Icon className="w-8 h-8" strokeWidth={1.5} />
      </div>
      <span className="font-heading font-semibold text-sm text-center text-foreground group-hover:text-secondary transition-colors">
        {title}
      </span>
      {description && (
        <span className="text-xs text-muted-foreground text-center line-clamp-2">
          {description}
        </span>
      )}
      
      {/* Hover glow effect */}
      <div className="absolute inset-0 rounded-2xl bg-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </button>
  );
};

export default MinistryCard;
