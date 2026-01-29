import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Member {
  id: string;
  full_name: string;
}

interface MemberSelectProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MemberSelect({
  value,
  onChange,
  placeholder = "Selecionar membro...",
  disabled = false,
}: MemberSelectProps) {
  const [open, setOpen] = useState(false);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members-select-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return data as Member[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const selectedMember = useMemo(
    () => members.find((m) => m.id === value),
    [members, value]
  );

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
            disabled={disabled || isLoading}
          >
            {isLoading ? (
              "Carregando..."
            ) : selectedMember ? (
              <span className="truncate">{selectedMember.full_name}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar membro..." />
            <CommandList>
              <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
              <CommandGroup>
                {members.map((member) => (
                  <CommandItem
                    key={member.id}
                    value={member.full_name}
                    onSelect={() => {
                      onChange(member.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === member.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {member.full_name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
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
