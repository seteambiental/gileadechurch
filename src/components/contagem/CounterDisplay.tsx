interface CounterDisplayProps {
  pessoas: number;
  titulo?: string;
  compact?: boolean;
}

/**
 * Mostra o contador com a inscrição oficial.
 * "Agora somos 2 ou 3 ou mais. Somos na verdade, XXXX pessoas que vieram para adorar ao Senhor."
 */
const CounterDisplay = ({ pessoas, titulo, compact }: CounterDisplayProps) => {
  return (
    <div className="flex flex-col items-center justify-center text-center w-full">
      {titulo && !compact && (
        <p className="text-secondary font-heading font-semibold uppercase tracking-widest mb-4 text-[clamp(1rem,3vw,2rem)]">
          {titulo}
        </p>
      )}
      <p className="font-heading font-bold leading-tight text-foreground text-[clamp(1.5rem,5vw,4rem)] max-w-[90%]">
        Agora somos 2 ou 3 ou mais.
      </p>
      <p className="font-heading font-bold leading-tight text-foreground text-[clamp(1.25rem,4vw,3rem)] max-w-[90%] mt-2">
        Somos na verdade,
      </p>
      <span className="text-gradient-red font-heading font-bold leading-none my-4 text-[clamp(5rem,22vw,18rem)] tabular-nums">
        {pessoas.toLocaleString("pt-BR")}
      </span>
      <p className="font-heading font-bold leading-tight text-foreground text-[clamp(1.25rem,4vw,3rem)] max-w-[90%]">
        pessoas que vieram para adorar ao Senhor.
      </p>
    </div>
  );
};

export default CounterDisplay;