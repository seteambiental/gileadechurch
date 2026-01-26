import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { TermsAndPrivacyDialog } from "./TermsAndPrivacyDialog";

interface TermsCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  error?: string;
}

export const TermsCheckbox = ({ checked, onCheckedChange, error }: TermsCheckboxProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [defaultTab, setDefaultTab] = useState<"terms" | "privacy">("terms");

  const openDialog = (tab: "terms" | "privacy") => {
    setDefaultTab(tab);
    setDialogOpen(true);
  };

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
          <Checkbox
            id="acceptTerms"
            checked={checked}
            onCheckedChange={(value) => onCheckedChange(value === true)}
            className="mt-0.5"
          />
          <div className="flex-1">
            <Label
              htmlFor="acceptTerms"
              className="text-sm font-normal text-foreground cursor-pointer leading-relaxed"
            >
              Li e concordo com os{" "}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  openDialog("terms");
                }}
                className="text-secondary hover:underline font-medium"
              >
                Termos de Uso
              </button>{" "}
              e a{" "}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  openDialog("privacy");
                }}
                className="text-secondary hover:underline font-medium"
              >
                Política de Privacidade
              </button>
              , incluindo a{" "}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  openDialog("privacy");
                }}
                className="text-secondary hover:underline font-medium"
              >
                autorização de uso de imagem
              </button>
              .
            </Label>
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <TermsAndPrivacyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultTab={defaultTab}
      />
    </>
  );
};
