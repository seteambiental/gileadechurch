import * as React from "react";
import { Input } from "@/components/ui/input";
import { isoDateToManual, manualDateToISO, maskManualDate } from "@/lib/manual-date";

interface ManualDateInputProps extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type" | "min" | "max"> {
  value: string;
  onChange?: (value: string) => void;
  min?: string;
  max?: string;
}

export function ManualDateInput({ value, onChange, min, max, ...props }: ManualDateInputProps) {
  const [draft, setDraft] = React.useState(() => isoDateToManual(value));
  const emitted = React.useRef(value);
  React.useEffect(() => {
    if (value !== emitted.current) {
      setDraft(isoDateToManual(value));
      emitted.current = value;
    }
  }, [value]);

  return <Input {...props} type="text" inputMode="numeric" placeholder="DD/MM/AAAA"
    maxLength={10} value={draft}
    onChange={(event) => {
      const next = maskManualDate(event.target.value);
      const iso = manualDateToISO(next);
      const outsideRange = iso && ((min && iso < min) || (max && iso > max));
      event.target.setCustomValidity(next && (!iso || outsideRange) ? "Informe uma data válida no formato DD/MM/AAAA." : "");
      setDraft(next);
      emitted.current = iso && !outsideRange ? iso : "";
      onChange?.(emitted.current);
    }} />;
}