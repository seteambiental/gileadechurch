import { Calendar, Clock, MapPin } from "lucide-react";

interface AnnouncementCardProps {
  title: string;
  description: string;
  date?: string;
  time?: string;
  location?: string;
  type?: "info" | "event" | "urgent";
  delay?: number;
}

const AnnouncementCard = ({
  title,
  description,
  date,
  time,
  location,
  type = "info",
  delay = 0,
}: AnnouncementCardProps) => {
  const typeStyles = {
    info: "border-l-secondary",
    event: "border-l-navy",
    urgent: "border-l-destructive",
  };

  return (
    <div
      className={`relative p-5 rounded-xl bg-card border border-border border-l-4 ${typeStyles[type]} shadow-elegant hover:shadow-elegant-lg transition-all duration-300 opacity-0 animate-fade-in`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <h3 className="font-heading font-semibold text-lg text-foreground mb-2">
        {title}
      </h3>
      <p className="text-muted-foreground text-sm leading-relaxed mb-3">
        {description}
      </p>
      
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {date && (
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-secondary" />
            <span>{date}</span>
          </div>
        )}
        {time && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-secondary" />
            <span>{time}</span>
          </div>
        )}
        {location && (
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-secondary" />
            <span>{location}</span>
          </div>
        )}
      </div>
      
      {type === "urgent" && (
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
          Urgente
        </div>
      )}
    </div>
  );
};

export default AnnouncementCard;
