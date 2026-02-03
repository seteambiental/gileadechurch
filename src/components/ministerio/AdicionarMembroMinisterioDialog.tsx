import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SearchInput } from "@/components/ui/search-input";
import { MaskedInput } from "@/components/ui/masked-input";
import { toast } from "sonner";
import { Loader2, UserPlus, User, Users } from "lucide-react";
import { includesNormalized } from "@/lib/text-utils";

// Roles que têm acesso completo
const ADMIN_ROLES = ["admin", "pastor_geral", "pastor_auxiliar"];

interface AdicionarMembroMinisterioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ministryId: string;
  ministryName: string;
  funcoes: { id: string; nome: string }[];
  onSuccess?: () => void;
}

type TipoParticipacao = "membro" | "lider" | "equipe";

export function AdicionarMembroMinisterioDialog({
  open,
  onOpenChange,
  ministryId,
  ministryName,
  funcoes,
  onSuccess,
}: AdicionarMembroMinisterioDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"membro" | "visitante">("membro");
  const [search, setSearch] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedFuncaoId, setSelectedFuncaoId] = useState("");
  const [tipoParticipacao, setTipoParticipacao] = useState<TipoParticipacao>("membro");
  
  // Visitante fields
  const [visitanteNome, setVisitanteNome] = useState("");
  const [visitanteWhatsapp, setVisitanteWhatsapp] = useState("");

  // Verificar se usuário tem acesso total (Admin/Pastor)
  const { data: hasFullAccess = false } = useQuery({
    queryKey: ["user-has-full-access", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      return data?.some(r => ADMIN_ROLES.includes(r.role)) || false;
    },
    enabled: !!user?.id && open,
  });

  // Buscar todos os membros (para Admin/Pastor) ou apenas os do ministério
  const { data: allMembers = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["all-members-for-ministry", ministryId, hasFullAccess],
    queryFn: async () => {
      if (hasFullAccess) {
        // Admin/Pastor pode ver todos os membros
        const { data, error } = await supabase
          .from("members")
          .select("id, full_name, photo_url")
          .order("full_name");
        if (error) throw error;
        return data;
      } else {
        // Outros usuários só veem membros que escolheram o ministério
        const { data, error } = await supabase
          .from("member_functions")
          .select("member_id, member:members(id, full_name, photo_url)")
          .eq("ministry_id", ministryId)
          .in("function_type", ["integrante_ministerio", "lider_ministerio"]);
        if (error) throw error;
        
        const uniqueMembers = new Map();
        data.forEach((item: any) => {
          if (item.member && !uniqueMembers.has(item.member.id)) {
            uniqueMembers.set(item.member.id, item.member);
          }
        });
        return Array.from(uniqueMembers.values()).sort((a: any, b: any) => 
          a.full_name.localeCompare(b.full_name)
        );
      }
    },
    enabled: open,
  });

  // Filtrar membros pela busca
  const filteredMembers = useMemo(() => {
    if (!search) return allMembers;
    return allMembers.filter((m: any) => includesNormalized(m.full_name, search));
  }, [allMembers, search]);

  // Adicionar membro ao ministério
  const addMemberMutation = useMutation({
    mutationFn: async () => {
      // Determinar function_type baseado no tipo de participação
      const functionType = tipoParticipacao === "lider" 
        ? "lider_ministerio" 
        : "integrante_ministerio";
      
      // Primeiro, criar o registro em ministerio_integrantes
      const { error: integranteError } = await supabase
        .from("ministerio_integrantes")
        .insert({
          ministry_id: ministryId,
          member_id: selectedMemberId,
          funcao_id: selectedFuncaoId,
        });
      if (integranteError) throw integranteError;
      
      // Depois, criar/atualizar o registro em member_functions
      // Verificar se já existe
      const { data: existingFunction } = await supabase
        .from("member_functions")
        .select("id")
        .eq("member_id", selectedMemberId)
        .eq("ministry_id", ministryId)
        .eq("function_type", functionType)
        .maybeSingle();
      
      if (!existingFunction) {
        // Criar nova função com subfunção
        const subfuncao = tipoParticipacao === "equipe" 
          ? `Equipe de ${ministryName}`
          : tipoParticipacao === "lider"
            ? `Líder do ${ministryName}`
            : null;
        
        const { error: functionError } = await supabase
          .from("member_functions")
          .insert({
            member_id: selectedMemberId,
            ministry_id: ministryId,
            function_type: functionType,
            subfuncao: subfuncao,
          });
        if (functionError) throw functionError;
      } else if (tipoParticipacao !== "membro") {
        // Atualizar subfunção se for líder ou equipe
        const subfuncao = tipoParticipacao === "equipe" 
          ? `Equipe de ${ministryName}`
          : `Líder do ${ministryName}`;
        
        await supabase
          .from("member_functions")
          .update({ subfuncao })
          .eq("id", existingFunction.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministerio-integrantes"] });
      queryClient.invalidateQueries({ queryKey: ["member-functions"] });
      toast.success("Membro adicionado ao ministério!");
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error("Erro ao adicionar membro:", error);
      toast.error(error.message?.includes("duplicate") 
        ? "Membro já está no ministério" 
        : "Erro ao adicionar membro"
      );
    },
  });

  // Adicionar visitante
  const addVisitanteMutation = useMutation({
    mutationFn: async () => {
      // Criar visitante em novos_convertidos
      const { data: visitante, error: visitanteError } = await supabase
        .from("novos_convertidos")
        .insert({
          full_name: visitanteNome,
          whatsapp: visitanteWhatsapp.replace(/\D/g, ""),
          observacoes: `Visitante ${ministryName}`,
          tornou_membro: false,
        })
        .select()
        .single();
      
      if (visitanteError) throw visitanteError;
      return visitante;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitantes-ministerio"] });
      toast.success("Visitante cadastrado!");
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: () => toast.error("Erro ao cadastrar visitante"),
  });

  const resetForm = () => {
    setSearch("");
    setSelectedMemberId("");
    setSelectedFuncaoId("");
    setTipoParticipacao("membro");
    setVisitanteNome("");
    setVisitanteWhatsapp("");
    setActiveTab("membro");
  };

  const handleSubmit = () => {
    if (activeTab === "membro") {
      if (!selectedMemberId || !selectedFuncaoId) {
        toast.error("Selecione um membro e uma função");
        return;
      }
      addMemberMutation.mutate();
    } else {
      if (!visitanteNome.trim()) {
        toast.error("Digite o nome do visitante");
        return;
      }
      addVisitanteMutation.mutate();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const isPending = addMemberMutation.isPending || addVisitanteMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Adicionar Participante
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "membro" | "visitante")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="membro" className="gap-2">
              <Users className="w-4 h-4" />
              Membro
            </TabsTrigger>
            <TabsTrigger value="visitante" className="gap-2">
              <User className="w-4 h-4" />
              Visitante
            </TabsTrigger>
          </TabsList>

          <TabsContent value="membro" className="space-y-4 mt-4">
            {/* Busca de membros */}
            <div className="space-y-2">
              <Label>Buscar membro</Label>
              <SearchInput
                placeholder="Digite o nome..."
                value={search}
                onChange={setSearch}
              />
            </div>

            {/* Lista de membros */}
            <div className="border rounded-md max-h-48 overflow-y-auto">
              {loadingMembers ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {search ? "Nenhum membro encontrado" : "Nenhum membro disponível"}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredMembers.slice(0, 50).map((member: any) => (
                    <div
                      key={member.id}
                      className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                        selectedMemberId === member.id
                          ? "bg-secondary/20"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedMemberId(member.id)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.photo_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(member.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate flex-1">
                        {member.full_name}
                      </span>
                      {selectedMemberId === member.id && (
                        <Badge variant="default" className="text-xs">
                          Selecionado
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tipo de participação */}
            <div className="space-y-2">
              <Label>Tipo de participação</Label>
              <Select value={tipoParticipacao} onValueChange={(v) => setTipoParticipacao(v as TipoParticipacao)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="membro">Membro</SelectItem>
                  <SelectItem value="lider">Líder</SelectItem>
                  <SelectItem value="equipe">Equipe</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {tipoParticipacao === "lider" && "Será registrado como Líder do ministério no cadastro"}
                {tipoParticipacao === "equipe" && "Será registrado como Equipe do ministério no cadastro"}
              </p>
            </div>

            {/* Função no ministério */}
            <div className="space-y-2">
              <Label>Função no ministério</Label>
              <Select value={selectedFuncaoId} onValueChange={setSelectedFuncaoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  {funcoes.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="visitante" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                placeholder="Nome completo"
                value={visitanteNome}
                onChange={(e) => setVisitanteNome(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>WhatsApp (opcional)</Label>
              <MaskedInput
                mask="phone"
                placeholder="(00) 00000-0000"
                value={visitanteWhatsapp}
                onChange={setVisitanteWhatsapp}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isPending || (activeTab === "membro" && funcoes.length === 0)}
          >
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
