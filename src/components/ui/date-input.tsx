import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Função para formatar data digitada (DD/MM/AAAA)
const formatDateInput = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
  return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
};

// Converter DD/MM/AAAA para YYYY-MM-DD
const convertToISODate = (dateStr: string): string | null => {
  const parsed = parse(dateStr, "dd/MM/yyyy", new Date());
  if (isValid(parsed)) {
    return format(parsed, "yyyy-MM-dd");
  }
  return null;
};

// Converter YYYY-MM-DD para DD/MM/AAAA
const convertToDisplayDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const parsed = parse(dateStr, "yyyy-MM-dd", new Date());
  if (isValid(parsed)) {
    return format(parsed, "dd/MM/yyyy");
  }
  return dateStr;
};

interface DateInputProps {
  value?: string; // YYYY-MM-DD format
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

export function DateInput({
  value = "",
  onChange,
  placeholder = "DD/MM/AAAA",
  disabled = false,
  className,
  id,
  required = false,
  minDate,
  maxDate = new Date(),
}: DateInputProps) {
  const [displayValue, setDisplayValue] = React.useState(() => 
    convertToDisplayDate(value)
  );
  const [calendarOpen, setCalendarOpen] = React.useState(false);

  // Sync display value when external value changes
  React.useEffect(() => {
    setDisplayValue(convertToDisplayDate(value));
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDateInput(e.target.value);
    setDisplayValue(formatted);

    // Se a data estiver completa (DD/MM/AAAA), converter para ISO
    if (formatted.length === 10) {
      const isoDate = convertToISODate(formatted);
      if (isoDate) {
        onChange?.(isoDate);
      }
    } else {
      onChange?.("");
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      const isoDate = format(date, "yyyy-MM-dd");
      const displayDate = format(date, "dd/MM/yyyy");
      setDisplayValue(displayDate);
      onChange?.(isoDate);
      setCalendarOpen(false);
    }
  };

  const selectedDate = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;

  return (
    <div className={cn("flex gap-2", className)}>
      <Input
        id={id}
        placeholder={placeholder}
        value={displayValue}
        onChange={handleInputChange}
        maxLength={10}
        disabled={disabled}
        required={required}
        className="flex-1"
      />
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            disabled={disabled}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={selectedDate && isValid(selectedDate) ? selectedDate : undefined}
            onSelect={handleCalendarSelect}
            disabled={(date) => {
              if (maxDate && date > maxDate) return true;
              if (minDate && date < minDate) return true;
              return false;
            }}
            initialFocus
            locale={ptBR}
            captionLayout="dropdown-buttons"
            fromYear={1920}
            toYear={new Date().getFullYear()}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
