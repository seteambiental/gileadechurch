import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ColumnFilterPopoverProps {
  title: string;
  options: string[];
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
}

export function ColumnFilterPopover({ title, options, selected, onChange }: ColumnFilterPopoverProps) {
  const [search, setSearch] = useState("");
  const hasFilter = selected.size > 0 && selected.size < options.length;

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return options.filter((o) =>
      o.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(q)
    );
  }, [options, search]);

  const toggleAll = () => {
    if (selected.size === options.length) {
      onChange(new Set());
    } else {
      onChange(new Set(options));
    }
  };

  const toggle = (value: string) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  };

  const clearFilter = () => {
    onChange(new Set(options));
  };

  return (
    <div className="flex items-center gap-1">
      <span>{title}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-5 w-5 p-0", hasFilter && "text-primary")}
          >
            <Filter className={cn("h-3 w-3", hasFilter && "fill-primary")} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Filtrar {title}</span>
              {hasFilter && (
                <Button variant="ghost" size="sm" className="h-5 px-1 text-xs" onClick={clearFilter}>
                  <X className="h-3 w-3 mr-0.5" /> Limpar
                </Button>
              )}
            </div>
            {options.length > 8 && (
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-7 text-xs"
              />
            )}
            <div className="flex items-center gap-2 pb-1 border-b">
              <Checkbox
                checked={selected.size === options.length}
                onCheckedChange={toggleAll}
                id="col-filter-all"
              />
              <label htmlFor="col-filter-all" className="text-xs cursor-pointer">
                {selected.size === options.length ? "Desmarcar todos" : "Selecionar todos"}
              </label>
            </div>
            <ScrollArea className="max-h-48">
              <div className="space-y-1">
                {filtered.map((opt) => (
                  <div key={opt} className="flex items-center gap-2">
                    <Checkbox
                      checked={selected.has(opt)}
                      onCheckedChange={() => toggle(opt)}
                      id={`col-filter-${opt}`}
                    />
                    <label htmlFor={`col-filter-${opt}`} className="text-xs cursor-pointer truncate">
                      {opt || "(vazio)"}
                    </label>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">Nenhum resultado</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
