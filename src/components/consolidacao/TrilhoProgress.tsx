import { Check, X, Heart } from "lucide-react";

interface TrilhoProgressProps {
  convertido: {
    tipo_conversao?: string | null;
    batizado?: boolean;
    datas_impacto?: string[] | null;
    participou_manaim?: boolean;
    participou_culto_membresia?: boolean;
    frequenta_casa_refugio?: boolean;
    tornou_membro?: boolean;
    mensagens_enviadas?: number;
  };
}

const steps = [
  { key: "tipo_conversao", label: "Decisão" },
  { key: "batizado", label: "Batismo" },
  { key: "impacto_completo", label: "2 Impactos" },
  { key: "participou_manaim", label: "Manaim" },
  { key: "frequenta_casa_refugio", label: "Casa Refúgio" },
  { key: "participou_culto_membresia", label: "Membresia" },
];

export const TrilhoProgress = ({ convertido }: TrilhoProgressProps) => {
  const getStepCompleted = (key: string) => {
    if (key === "tipo_conversao") {
      return !!convertido.tipo_conversao;
    }
    if (key === "impacto_completo") {
      const datas = convertido.datas_impacto || [];
      return datas.length >= 2 && datas[0] && datas[1];
    }
    return !!(convertido as any)[key];
  };

  const completedSteps = steps.filter((step) => getStepCompleted(step.key)).length;
  const progress = (completedSteps / steps.length) * 100;
  const mensagensEnviadas = convertido.mensagens_enviadas || 0;
  const maxMensagens = 5;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Progresso no Trilho</span>
        <span className="font-medium text-foreground">{completedSteps}/{steps.length}</span>
      </div>
      
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
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
                    ? "bg-green-500 text-white"
                    : "bg-destructive/20 text-destructive"
                }`}
              >
                {completed ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <X className="w-3 h-3" />
                )}
              </div>
              <span className={`text-[10px] text-center ${completed ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mensagens enviadas - Corações */}
      <div className="pt-2 border-t">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">Mensagens Enviadas</span>
          <span className="font-medium text-foreground">{mensagensEnviadas}/{maxMensagens}</span>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: maxMensagens }).map((_, index) => (
            <Heart
              key={index}
              className={`w-5 h-5 transition-all ${
                index < mensagensEnviadas
                  ? "text-red-500 fill-red-500"
                  : "text-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      </div>

      {convertido.tornou_membro && (
        <div className="mt-2 p-2 bg-green-500/10 rounded-lg text-center">
          <span className="text-sm font-medium text-green-600">✓ Tornou-se Membro!</span>
        </div>
      )}
    </div>
  );
};
