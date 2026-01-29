import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onApply: () => void;
  onClear: () => void;
}

export const DateRangeFilter = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onApply,
  onClear,
}: DateRangeFilterProps) => {
  const hasFilter = startDate || endDate;

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Filtrar por Período</span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">De:</span>
          <DateInput
            value={startDate}
            onChange={(value) => onStartDateChange(value)}
            className="w-[140px] h-9"
            maxDate={undefined}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Até:</span>
          <DateInput
            value={endDate}
            onChange={(value) => onEndDateChange(value)}
            className="w-[140px] h-9"
            maxDate={undefined}
          />
        </div>
        <Button variant="secondary" size="sm" onClick={onApply}>
          Aplicar
        </Button>
        {hasFilter && (
          <Button variant="ghost" size="sm" onClick={onClear} className="text-destructive">
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
};
