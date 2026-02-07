import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar, MessageCircleQuestion, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";

type Step = "reuniao_aconteceu" | "justificativa_nao" | "ocorreu_no_dia" | "justificativa_mudanca";

interface EncontroPreScreenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataEncontro: string;
  casaRefugioId: string;
  onProceedToReport: (justificativaMudanca?: string) => void;
}

export const EncontroPreScreenDialog = ({
  open,
  onOpenChange,
  dataEncontro,
  casaRefugioId,
  onProceedToReport,
}: EncontroPreScreenDialogProps) => {
  const [step, setStep] = useState<Step>("reuniao_aconteceu");
  const [reuniaoAconteceu, setReuniaoAconteceu] = useState<string>("");
  const [ocorreuNoDia, setOcorreuNoDia] = useState<string>("");
  const [justificativa, setJustificativa] = useState("");
  const queryClient = useQueryClient();

  const resetState = () => {
    setStep("reuniao_aconteceu");
    setReuniaoAconteceu("");
    setOcorreuNoDia("");
    setJustificativa("");
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetState();
    }
    onOpenChange(isOpen);
  };

  // Mutation to save "reunião não aconteceu"
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("encontros_casa_refugio").insert({
        casa_refugio_id: casaRefugioId,
        data_encontro: dataEncontro,
        reuniao_realizada: false,
        justificativa: justificativa.trim(),
        qtd_lideres: 0,
        qtd_membros: 0,
        qtd_criancas: 0,
        qtd_visitantes: 0,
        kilos_arrecadados: 0,
        ofertas: 0,
        ofertas_dinheiro: 0,
        ofertas_pix: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["encontros-casa"] });
      queryClient.invalidateQueries({ queryKey: ["encontros"] });
      toast({
        title: "Registro salvo",
        description: "Reunião registrada como não realizada.",
      });
      handleOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (step === "reuniao_aconteceu") {
      if (reuniaoAconteceu === "nao") {
        setStep("justificativa_nao");
      } else if (reuniaoAconteceu === "sim") {
        setStep("ocorreu_no_dia");
      }
    } else if (step === "justificativa_nao") {
      if (!justificativa.trim()) {
        toast({
          title: "Justificativa obrigatória",
          description: "Informe o motivo da reunião não ter acontecido.",
          variant: "destructive",
        });
        return;
      }
      cancelMutation.mutate();
    } else if (step === "ocorreu_no_dia") {
      if (ocorreuNoDia === "sim") {
        handleOpenChange(false);
        onProceedToReport();
      } else if (ocorreuNoDia === "nao") {
        setJustificativa("");
        setStep("justificativa_mudanca");
      }
    } else if (step === "justificativa_mudanca") {
      if (!justificativa.trim()) {
        toast({
          title: "Justificativa obrigatória",
          description: "Informe o motivo da mudança de data.",
          variant: "destructive",
        });
        return;
      }
      handleOpenChange(false);
      onProceedToReport(justificativa.trim());
    }
  };

  const dataFormatada = (() => {
    try {
      return format(parseISO(dataEncontro), "dd/MM/yyyy");
    } catch {
      return dataEncontro;
    }
  })();

  const getStepTitle = () => {
    switch (step) {
      case "reuniao_aconteceu":
        return "Registro de Encontro";
      case "justificativa_nao":
        return "Justificativa - Reunião não realizada";
      case "ocorreu_no_dia":
        return "Data do Encontro";
      case "justificativa_mudanca":
        return "Justificativa - Mudança de data";
    }
  };

  const canProceed = () => {
    switch (step) {
      case "reuniao_aconteceu":
        return reuniaoAconteceu !== "";
      case "justificativa_nao":
        return justificativa.trim().length > 0;
      case "ocorreu_no_dia":
        return ocorreuNoDia !== "";
      case "justificativa_mudanca":
        return justificativa.trim().length > 0;
    }
  };

  const getButtonLabel = () => {
    if (step === "justificativa_nao") return "Salvar";
    if (step === "justificativa_mudanca") return "Prosseguir para o relatório";
    if (step === "ocorreu_no_dia" && ocorreuNoDia === "sim") return "Prosseguir para o relatório";
    return "Continuar";
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircleQuestion className="w-5 h-5 text-destructive" />
            {getStepTitle()}
          </DialogTitle>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Encontro agendado para {dataFormatada}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Step 1: A reunião aconteceu? */}
          {step === "reuniao_aconteceu" && (
            <div className="space-y-3">
              <Label className="text-base font-medium">A reunião aconteceu?</Label>
              <RadioGroup value={reuniaoAconteceu} onValueChange={setReuniaoAconteceu}>
                <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="sim" id="reuniao-sim" />
                  <Label htmlFor="reuniao-sim" className="cursor-pointer flex-1">
                    Sim, a reunião aconteceu
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="nao" id="reuniao-nao" />
                  <Label htmlFor="reuniao-nao" className="cursor-pointer flex-1">
                    Não, a reunião não aconteceu
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Step: Justificativa para reunião não realizada */}
          {step === "justificativa_nao" && (
            <div className="space-y-3">
              <Label className="text-base font-medium">
                Por que a reunião não aconteceu?
              </Label>
              <Textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Descreva o motivo..."
                rows={3}
                className="resize-none"
                autoFocus
              />
            </div>
          )}

          {/* Step 2: Ocorreu no dia agendado? */}
          {step === "ocorreu_no_dia" && (
            <div className="space-y-3">
              <Label className="text-base font-medium">
                A reunião ocorreu no dia agendado ({dataFormatada})?
              </Label>
              <RadioGroup value={ocorreuNoDia} onValueChange={setOcorreuNoDia}>
                <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="sim" id="dia-sim" />
                  <Label htmlFor="dia-sim" className="cursor-pointer flex-1">
                    Sim, ocorreu no dia agendado
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="nao" id="dia-nao" />
                  <Label htmlFor="dia-nao" className="cursor-pointer flex-1">
                    Não, ocorreu em outro dia
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Step: Justificativa para mudança de data */}
          {step === "justificativa_mudanca" && (
            <div className="space-y-3">
              <Label className="text-base font-medium">
                Por que a reunião não ocorreu no dia agendado?
              </Label>
              <Textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Descreva o motivo da mudança de data..."
                rows={3}
                className="resize-none"
                autoFocus
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {step !== "reuniao_aconteceu" && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (step === "justificativa_nao") {
                  setStep("reuniao_aconteceu");
                  setJustificativa("");
                } else if (step === "ocorreu_no_dia") {
                  setStep("reuniao_aconteceu");
                } else if (step === "justificativa_mudanca") {
                  setStep("ocorreu_no_dia");
                  setJustificativa("");
                }
              }}
            >
              Voltar
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-destructive hover:bg-destructive/90"
            onClick={handleNext}
            disabled={!canProceed() || cancelMutation.isPending}
          >
            {cancelMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              getButtonLabel()
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
