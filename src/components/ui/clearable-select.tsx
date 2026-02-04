import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: string;
}

interface ClearableSelectProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  emptyLabel?: string;
  className?: string;
}

export function ClearableSelect({
  value,
  onChange,
  options,
  placeholder = "Selecionar...",
  disabled = false,
  emptyLabel = "Nenhum",
  className,
}: ClearableSelectProps) {
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={cn("flex gap-2", className)}>
      <Select
        value={value || "none"}
        onValueChange={(v) => onChange(v === "none" ? null : v)}
        disabled={disabled}
      >
        <SelectTrigger className="w-full bg-background">
          <SelectValue placeholder={placeholder}>
            {selectedOption ? selectedOption.label : placeholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-popover border-border z-50">
          <SelectItem value="none">{emptyLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onChange(null)}
          disabled={disabled}
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
