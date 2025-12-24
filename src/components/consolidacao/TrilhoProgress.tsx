import { Check, Circle } from "lucide-react";

interface TrilhoProgressProps {
  convertido: {
    tipo_conversao?: string | null;
    batizado?: boolean;
    participou_impacto?: boolean;
    participou_manaim?: boolean;
    participou_culto_membresia?: boolean;
    frequenta_casa_refugio?: boolean;
    tornou_membro?: boolean;
  };
}

const steps = [
  { key: "tipo_conversao", label: "Decisão" },
  { key: "batizado", label: "Batismo" },
  { key: "participou_impacto", label: "Impacto" },
  { key: "participou_manaim", label: "Manaim" },
  { key: "frequenta_casa_refugio", label: "Casa Refúgio" },
  { key: "participou_culto_membresia", label: "Membresia" },
];

export const TrilhoProgress = ({ convertido }: TrilhoProgressProps) => {
  const getStepCompleted = (key: string) => {
    if (key === "tipo_conversao") {
      return !!convertido.tipo_conversao;
    }
    return !!(convertido as any)[key];
  };

  const completedSteps = steps.filter((step) => getStepCompleted(step.key)).length;
  const progress = (completedSteps / steps.length) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Progresso no Trilho</span>
        <span className="font-medium text-foreground">{completedSteps}/{steps.length}</span>
      </div>
      
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-destructive to-secondary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="flex justify-between">
        {steps.map((step) => {
          const completed = getStepCompleted(step.key);
          return (
            <div key={step.key} className="flex flex-col items-center gap-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                  completed
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {completed ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Circle className="w-3 h-3" />
                )}
              </div>
              <span className={`text-[10px] text-center ${completed ? "text-foreground" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {convertido.tornou_membro && (
        <div className="mt-2 p-2 bg-green-500/10 rounded-lg text-center">
          <span className="text-sm font-medium text-green-600">✓ Tornou-se Membro!</span>
        </div>
      )}
    </div>
  );
};
