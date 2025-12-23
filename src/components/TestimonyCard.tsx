import { Quote } from "lucide-react";

interface TestimonyCardProps {
  content: string;
  author: string;
  role?: string;
  delay?: number;
}

const TestimonyCard = ({ content, author, role, delay = 0 }: TestimonyCardProps) => {
  return (
    <div
      className="relative p-6 rounded-2xl bg-gradient-navy text-primary-foreground shadow-elegant hover:shadow-elegant-lg transition-all duration-300 opacity-0 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <Quote className="absolute top-4 right-4 w-8 h-8 text-secondary/40" />
      
      <p className="text-primary-foreground/90 leading-relaxed mb-4 italic">
        "{content}"
      </p>
      
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-heading font-bold text-sm">
          {author.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-heading font-semibold text-primary-foreground">{author}</p>
          {role && (
            <p className="text-xs text-primary-foreground/70">{role}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestimonyCard;
