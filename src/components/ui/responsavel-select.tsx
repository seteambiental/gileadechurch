import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Check, ChevronsUpDown, X, Users, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
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
      // Usa members_safe para acesso público (cadastro sem autenticação)
      const { data, error } = await supabase
        .from("members_safe")
        .select("id, full_name, whatsapp")
        .order("full_name", { ascending: true });
      
      if (error) throw error;
      return (data || []).filter((m): m is Member => m.id !== null && m.full_name !== null) as Member[];
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

  // Handle selection with immediate close - use callback for performance
  const handleSelect = useCallback((memberId: string) => {
    onChange(memberId);
    setOpen(false);
    setSearch("");
  }, [onChange]);

  // Handle clear
  const handleClear = useCallback(() => {
    onChange(null);
  }, [onChange]);

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
            type="button"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando...
              </span>
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
        <PopoverContent className="w-[min(320px,calc(100vw-2rem))] p-0" align="start">
          <div className="p-2 border-b">
            <Input
              placeholder="Buscar responsável..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9"
              autoFocus={false}
            />
          </div>
          <ScrollArea className="h-[250px]">
            {filteredMembers.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Nenhum membro encontrado.
              </div>
            ) : (
              <div className="p-1">
                {filteredMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => handleSelect(member.id)}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      handleSelect(member.id);
                    }}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus:bg-accent focus:text-accent-foreground",
                      "active:bg-accent/80",
                      value === member.id && "bg-accent"
                    )}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === member.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{member.full_name}</span>
                      {member.whatsapp && (
                        <span className="text-xs text-muted-foreground">
                          {member.whatsapp.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
      {value && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleClear}
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
