import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter, FilterX } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  options: string[];
  selected: string[]; // [] = no filter
  onChange: (vals: string[]) => void;
  align?: "start" | "center" | "end";
  className?: string;
}

/**
 * Funnel-style column filter (Excel autofilter):
 * - Popover with searchable checkbox list of unique values
 * - Empty selection = "Todos" (no filter)
 */
export function ColumnFilter({ label, options, selected, onChange, align = "start", className }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const unique = useMemo(
    () => Array.from(new Set(options.map((o) => (o ?? "").toString()))).sort((a, b) =>
      a.localeCompare(b, "pt-BR", { numeric: true })
    ),
    [options]
  );
  const visible = unique.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );
  const active = selected.length > 0;

  const isChecked = (v: string) => selected.length === 0 || selected.includes(v);

  const toggle = (v: string) => {
    if (selected.length === 0) {
      // start from all, uncheck this one
      onChange(unique.filter((u) => u !== v));
    } else if (selected.includes(v)) {
      const next = selected.filter((s) => s !== v);
      onChange(next);
    } else {
      const next = [...selected, v];
      onChange(next.length === unique.length ? [] : next);
    }
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span className="truncate">{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-6 w-6 shrink-0", active && "text-primary")}
            aria-label={`Filtrar ${label}`}
          >
            {active ? <FilterX className="w-3.5 h-3.5" /> : <Filter className="w-3.5 h-3.5" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent align={align} className="w-60 p-2">
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-xs mb-2"
          />
          <div className="max-h-60 overflow-y-auto space-y-0.5">
            <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 rounded px-1.5 py-1">
              <Checkbox
                checked={selected.length === 0}
                onCheckedChange={() => onChange([])}
              />
              <span className="font-medium">(Selecionar todos)</span>
            </label>
            {visible.map((v) => (
              <label key={v || "__empty__"} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 rounded px-1.5 py-1">
                <Checkbox
                  checked={isChecked(v)}
                  onCheckedChange={() => toggle(v)}
                />
                <span className="truncate">{v === "" ? "(vazio)" : v}</span>
              </label>
            ))}
            {visible.length === 0 && (
              <p className="text-xs text-muted-foreground p-2 text-center">Nenhuma opção</p>
            )}
          </div>
          {active && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 h-7 text-xs"
              onClick={() => { onChange([]); setSearch(""); }}
            >
              Limpar filtro
            </Button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}