import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Check, ChevronsUpDown, X, Users } from "lucide-react";
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
import { normalizeText } from "@/lib/text-utils";

interface Member {
  id: string;
  full_name: string;
  whatsapp: string | null;
}

interface ResponsavelSelectProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  /** 
   * If true, includes members from solicitacoes_membro table 
   * (pending requests not yet approved)
   */
  includeRequests?: boolean;
}

export function ResponsavelSelect({
  value,
  onChange,
  placeholder = "Selecionar responsável...",
  disabled = false,
  includeRequests = false,
}: ResponsavelSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Fetch all members (approved and pending)
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["responsaveis-select-list", includeRequests],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, whatsapp")
        .order("full_name", { ascending: true });
      
      if (error) throw error;
      return (data || []) as Member[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Filter members based on search (accent-insensitive)
  const filteredMembers = useMemo(() => {
    if (!search) return members;
    const normalizedSearch = normalizeText(search);
    return members.filter((m) =>
      normalizeText(m.full_name).includes(normalizedSearch)
    );
  }, [members, search]);

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
              <span className="truncate flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                {selectedMember.full_name}
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Buscar responsável..." 
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
              <CommandGroup>
                {filteredMembers.map((member) => (
                  <CommandItem
                    key={member.id}
                    value={member.id}
                    onSelect={() => {
                      onChange(member.id);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === member.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{member.full_name}</span>
                      {member.whatsapp && (
                        <span className="text-xs text-muted-foreground">
                          {member.whatsapp.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onChange(null)}
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
