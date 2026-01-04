import * as React from "react";

export interface SectionTitleProps {
  title: string;
  subtitle?: string;
  centered?: boolean;
  light?: boolean;
  className?: string;
}

const SectionTitle = React.forwardRef<HTMLDivElement, SectionTitleProps>(
  ({ title, subtitle, centered = false, light = false, className }, ref) => {
    return (
      <div
        ref={ref}
        className={`mb-10 ${centered ? "text-center" : ""} ${className ?? ""}`}
      >
        <h2
          className={`font-heading font-bold text-3xl md:text-4xl mb-3 ${
            light ? "text-primary-foreground" : "text-foreground"
          }`}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className={`text-lg ${
              light ? "text-primary-foreground/80" : "text-muted-foreground"
            }`}
          >
            {subtitle}
          </p>
        )}
        <div
          className={`mt-4 h-1 w-20 rounded-full bg-secondary ${
            centered ? "mx-auto" : ""
          }`}
        />
      </div>
    );
  }
);
SectionTitle.displayName = "SectionTitle";

export default SectionTitle;

