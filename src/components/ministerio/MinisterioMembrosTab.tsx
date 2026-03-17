import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Users, 
  MessageCircle, 
  Loader2, 
  UserCheck, 
  UserPlus,
  Send,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { differenceInYears } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { toast } from "sonner";
import { VisitanteFormDialog } from "./VisitanteFormDialog";
import { ExportButton } from "@/components/ui/export-button";
import { includesNormalized } from "@/lib/text-utils";

interface MinisterioMembrosTabProps {
  ministerioSlug: string;
  ministerioTitle: string;
  idadeMinima?: number;
  idadeMaxima?: number;
  generoFiltro?: "masculino" | "feminino" | null;
  estadoCivilFiltro?: "solteiro" | "casado" | null;
}

interface Membro {
  id: string;
  full_name: string;
  birth_date: string | null;
  whatsapp: string | null;
  photo_url: string | null;
  genero: string | null;
  tipo: "membro" | "visitante";
  idade?: number;
}

export const MinisterioMembrosTab = ({ 
  ministerioSlug, 
  ministerioTitle,
  idadeMinima = 0,
  idadeMaxima = 120,
  generoFiltro = null,
  estadoCivilFiltro = null,
}: MinisterioMembrosTabProps) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [showMensagemInput, setShowMensagemInput] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "membro" | "visitante">("todos");

  // Buscar membros da tabela members
  const { data: membros = [], isLoading: loadingMembros } = useQuery({
    queryKey: ["membros-ministerio", ministerioSlug, generoFiltro, estadoCivilFiltro],
    queryFn: async () => {
      let query = supabase
        .from("members")
        .select("id, full_name, birth_date, whatsapp, photo_url, genero, estado_civil");
      
      if (generoFiltro) {
        query = query.eq("genero", generoFiltro);
      }
      
      if (estadoCivilFiltro) {
        query = query.eq("estado_civil", estadoCivilFiltro);
      }
      
      const { data, error } = await query.order("full_name");
      if (error) throw error;
      
      const hoje = new Date();
      
      return (data || [])
        .map((m) => {
          const idade = m.birth_date 
            ? differenceInYears(hoje, parseLocalDate(m.birth_date))
            : null;
          // Use year-based age for turma boundary filtering (kids/teens)
          const idadeTurma = m.birth_date
            ? (hoje.getFullYear() - parseInt(m.birth_date.split("-")[0]))
            : null;
          return {
            ...m,
            tipo: "membro" as const,
            idade,
            idadeTurma,
          };
        })
        .filter((m) => {
          const ageForFilter = m.idadeTurma ?? m.idade;
          if (ageForFilter === null) return false;
          return ageForFilter >= idadeMinima && ageForFilter <= idadeMaxima;
        });
    },
  });

  // Buscar visitantes (novos_convertidos) do ministério
  const { data: visitantes = [], isLoading: loadingVisitantes } = useQuery({
    queryKey: ["visitantes-ministerio", ministerioSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("novos_convertidos")
        .select("id, full_name, data_nascimento, whatsapp, photo_url, genero, observacoes")
        .eq("tornou_membro", false)
        .order("full_name");
      
      if (error) throw error;
      
      const hoje = new Date();
      const visitantesFiltrados = (data || []).filter((v: any) => 
        v.observacoes?.includes(`Visitante ${ministerioTitle}`)
      );
      
      return visitantesFiltrados
        .map((v: any) => {
          const idade = v.data_nascimento 
            ? differenceInYears(hoje, parseLocalDate(v.data_nascimento))
            : null;
          return {
            id: v.id,
            full_name: v.full_name,
            birth_date: v.data_nascimento,
            whatsapp: v.whatsapp,
            photo_url: v.photo_url,
            genero: v.genero,
            tipo: "visitante" as const,
            idade,
          };
        })
        .filter((v: any) => {
          if (v.idade === null) return true; // Incluir se não tiver idade
          return v.idade >= idadeMinima && v.idade <= idadeMaxima;
        });
    },
  });

  // Converter visitante em membro
  const converterMutation = useMutation({
    mutationFn: async (visitanteId: string) => {
      const visitante = visitantes.find((v) => v.id === visitanteId);
      if (!visitante) throw new Error("Visitante não encontrado");

      // Criar membro
      const { data: novoMembro, error: memberError } = await supabase
        .from("members")
        .insert({
          full_name: visitante.full_name,
          birth_date: visitante.birth_date,
          whatsapp: visitante.whatsapp,
          photo_url: visitante.photo_url,
          genero: visitante.genero,
        })
        .select()
        .single();

      if (memberError) throw memberError;

      // Marcar como tornou_membro
      await supabase
        .from("novos_convertidos")
        .update({ tornou_membro: true, member_id: novoMembro.id })
        .eq("id", visitanteId);

      return novoMembro;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membros-ministerio", ministerioSlug] });
      queryClient.invalidateQueries({ queryKey: ["visitantes-ministerio", ministerioSlug] });
      toast.success("Visitante convertido em membro!");
    },
    onError: (error) => {
      console.error("Erro ao converter:", error);
      toast.error("Erro ao converter visitante");
    },
  });

  // Combinar e filtrar membros + visitantes
  const todosMembros = useMemo(() => {
    const todos = [...membros, ...visitantes];
    
    return todos
      .filter((m) => {
        const matchSearch = includesNormalized(m.full_name, search);
        const matchTipo = filtroTipo === "todos" || m.tipo === filtroTipo;
        return matchSearch && matchTipo;
      })
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [membros, visitantes, search, filtroTipo]);

  // Enviar mensagem em lote
  const enviarMensagemLote = async () => {
    if (selectedMembers.length === 0) {
      toast.error("Selecione pelo menos um membro");
      return;
    }
    if (!mensagem.trim()) {
      toast.error("Digite uma mensagem");
      return;
    }

    setIsSending(true);
    try {
      const membrosParaEnviar = todosMembros.filter(
        (m) => selectedMembers.includes(m.id) && m.whatsapp
      );

      if (membrosParaEnviar.length === 0) {
        toast.error("Nenhum membro selecionado possui WhatsApp");
        return;
      }

      for (const membro of membrosParaEnviar) {
        await supabase.functions.invoke("enviar-whatsapp", {
          body: {
            action: "mensagem_livre",
            telefone: membro.whatsapp,
            mensagem: mensagem,
          },
        });
      }

      toast.success(`Mensagem enviada para ${membrosParaEnviar.length} pessoa(s)!`);
      setSelectedMembers([]);
      setMensagem("");
      setShowMensagemInput(false);
    } catch (error) {
      console.error("Erro ao enviar mensagens:", error);
      toast.error("Erro ao enviar mensagens");
    } finally {
      setIsSending(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedMembers.length === todosMembros.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(todosMembros.map((m) => m.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const isLoading = loadingMembros || loadingVisitantes;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h2 className="font-heading font-bold text-xl">Membros - {ministerioTitle}</h2>
          <p className="text-sm text-muted-foreground">
            {membros.length} membros • {visitantes.length} visitantes
          </p>
        </div>
        
        <div className="flex gap-2">
          <ExportButton
            data={todosMembros}
            columns={[
              { header: "Nome", accessor: "full_name" },
              { header: "Idade", accessor: (r) => r.idade ? `${r.idade} anos` : "-" },
              { header: "Gênero", accessor: (r) => r.genero === "masculino" ? "Masculino" : r.genero === "feminino" ? "Feminino" : "-" },
              { header: "WhatsApp", accessor: "whatsapp" },
              { header: "Tipo", accessor: (r) => r.tipo === "membro" ? "Membro" : "Visitante" },
            ]}
            filename={`membros-${ministerioSlug}`}
            title={`Membros - ${ministerioTitle}`}
            sheetName="Membros"
          />
          <VisitanteFormDialog 
            ministerioSlug={ministerioSlug} 
            ministerioTitle={ministerioTitle} 
          />
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          placeholder="Buscar por nome..."
          value={search}
          onChange={setSearch}
          className="flex-1"
        />
        
        <div className="flex gap-2">
          <Button
            variant={filtroTipo === "todos" ? "default" : "outline"}
            size="sm"
            onClick={() => setFiltroTipo("todos")}
          >
            Todos
          </Button>
          <Button
            variant={filtroTipo === "membro" ? "default" : "outline"}
            size="sm"
            onClick={() => setFiltroTipo("membro")}
            className="gap-1"
          >
            <UserCheck className="w-4 h-4" />
            Membros
          </Button>
          <Button
            variant={filtroTipo === "visitante" ? "default" : "outline"}
            size="sm"
            onClick={() => setFiltroTipo("visitante")}
            className="gap-1"
          >
            <UserPlus className="w-4 h-4" />
            Visitantes
          </Button>
        </div>
      </div>

      {/* Ações em lote */}
      {selectedMembers.length > 0 && (
        <Card className="bg-secondary/10 border-secondary">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <span className="text-sm font-medium">
                {selectedMembers.length} selecionado(s)
              </span>
              
              {showMensagemInput ? (
                <div className="flex flex-col sm:flex-row gap-2 flex-1 sm:ml-4">
                  <Input
                    placeholder="Digite a mensagem..."
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    className="flex-1"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowMensagemInput(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={enviarMensagemLote}
                      disabled={isSending}
                      className="gap-1"
                    >
                      {isSending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Enviar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setShowMensagemInput(true)}
                  className="gap-1"
                >
                  <MessageCircle className="w-4 h-4" />
                  Enviar Mensagem em Lote
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Membros */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-secondary animate-spin" />
        </div>
      ) : todosMembros.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              Nenhum membro encontrado
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Lista de Participantes</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSelectAll}
                className="text-xs"
              >
                {selectedMembers.length === todosMembros.length
                  ? "Desmarcar todos"
                  : "Selecionar todos"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {todosMembros.map((membro) => (
                <div
                  key={membro.id}
                  className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedMembers.includes(membro.id)}
                    onCheckedChange={() => toggleSelect(membro.id)}
                  />
                  
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarImage src={membro.photo_url || undefined} />
                    <AvatarFallback className="bg-muted text-xs">
                      {getInitials(membro.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{membro.full_name}</span>
                      <Badge
                        variant={membro.tipo === "membro" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {membro.tipo === "membro" ? (
                          <>
                            <UserCheck className="w-3 h-3 mr-1" />
                            Membro
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3 h-3 mr-1" />
                            Visitante
                          </>
                        )}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {membro.idade !== undefined && membro.idade !== null && (
                        <span>{membro.idade} anos</span>
                      )}
                      {membro.whatsapp && (
                        <span className="ml-2">• {membro.whatsapp}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    {membro.tipo === "visitante" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => converterMutation.mutate(membro.id)}
                        disabled={converterMutation.isPending}
                        className="text-xs gap-1"
                      >
                        {converterMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <UserCheck className="w-3 h-3" />
                        )}
                        Converter
                      </Button>
                    )}
                    {membro.whatsapp && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const url = `https://wa.me/55${membro.whatsapp?.replace(/\D/g, "")}`;
                          window.open(url, "_blank");
                        }}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
