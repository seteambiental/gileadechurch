interface SectionTitleProps {
  title: string;
  subtitle?: string;
  centered?: boolean;
  light?: boolean;
}

const SectionTitle = ({ title, subtitle, centered = false, light = false }: SectionTitleProps) => {
  return (
    <div className={`mb-10 ${centered ? "text-center" : ""}`}>
      <h2 className={`font-heading font-bold text-3xl md:text-4xl mb-3 ${
        light ? "text-primary-foreground" : "text-foreground"
      }`}>
        {title}
      </h2>
      {subtitle && (
        <p className={`text-lg ${
          light ? "text-primary-foreground/80" : "text-muted-foreground"
        }`}>
          {subtitle}
        </p>
      )}
      <div className={`mt-4 h-1 w-20 rounded-full bg-secondary ${
        centered ? "mx-auto" : ""
      }`} />
    </div>
  );
};

export default SectionTitle;
