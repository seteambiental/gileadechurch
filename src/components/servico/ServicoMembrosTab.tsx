import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  MessageCircle, 
  Loader2,
  CheckCircle,
  Clock,
} from "lucide-react";
import { includesNormalized } from "@/lib/text-utils";

export function ServicoMembrosTab() {
  const [search, setSearch] = useState("");

  // Buscar voluntários que já participaram de tarefas
  const { data: voluntariosAtivos = [], isLoading } = useQuery({
    queryKey: ["servico-membros-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("servico_tarefa_voluntarios")
        .select(`
          member_id,
          status,
          member:member_id(id, full_name, photo_url, whatsapp)
        `)
        .eq("status", "confirmado");
      
      if (error) throw error;
      
      // Agrupar por membro e contar participações
      const membrosMap: Record<string, { member: any; participacoes: number }> = {};
      
      (data || []).forEach((v: any) => {
        if (v.member && !membrosMap[v.member.id]) {
          membrosMap[v.member.id] = { member: v.member, participacoes: 0 };
        }
        if (v.member) {
          membrosMap[v.member.id].participacoes++;
        }
      });
      
      return Object.values(membrosMap).sort((a, b) => b.participacoes - a.participacoes);
    },
  });

  // Buscar membros com candidaturas aprovadas para o ministério
  const { data: membrosMinisterio = [] } = useQuery({
    queryKey: ["servico-membros-ministerio"],
    queryFn: async () => {
      // Buscar o ministério de serviços
      const { data: ministry, error: ministryError } = await supabase
        .from("ministries")
        .select("id")
        .ilike("name", "%servi%")
        .limit(1)
        .single();
      
      if (ministryError || !ministry) return [];
      
      // Buscar membros vinculados ao ministério
      const { data, error } = await supabase
        .from("member_functions")
        .select(`
          member_id,
          member:member_id(id, full_name, photo_url, whatsapp)
        `)
        .eq("ministry_id", ministry.id);
      
      if (error) throw error;
      return data || [];
    },
  });

  const todosMembros = useMemo(() => {
    const membrosSet = new Map<string, { member: any; participacoes: number; isMinisterio: boolean }>();
    
    // Adicionar membros do ministério
    membrosMinisterio.forEach((m: any) => {
      if (m.member) {
        membrosSet.set(m.member.id, { 
          member: m.member, 
          participacoes: 0, 
          isMinisterio: true 
        });
      }
    });
    
    // Adicionar voluntários ativos
    voluntariosAtivos.forEach((v) => {
      if (membrosSet.has(v.member.id)) {
        membrosSet.get(v.member.id)!.participacoes = v.participacoes;
      } else {
        membrosSet.set(v.member.id, { 
          member: v.member, 
          participacoes: v.participacoes, 
          isMinisterio: false 
        });
      }
    });
    
    return Array.from(membrosSet.values())
      .filter((m) => includesNormalized(m.member.full_name, search))
      .sort((a, b) => {
        if (a.isMinisterio && !b.isMinisterio) return -1;
        if (!a.isMinisterio && b.isMinisterio) return 1;
        return b.participacoes - a.participacoes;
      });
  }, [voluntariosAtivos, membrosMinisterio, search]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Membros do Ministério</h2>
        <p className="text-sm text-muted-foreground">
          Voluntários que já participaram de tarefas
        </p>
      </div>

      <SearchInput
        placeholder="Buscar por nome..."
        value={search}
        onChange={setSearch}
      />

      {todosMembros.length === 0 ? (
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
            <CardTitle className="text-base">
              {todosMembros.length} membro(s)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {todosMembros.map((item) => (
                <div
                  key={item.member.id}
                  className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarImage src={item.member.photo_url || undefined} />
                      <AvatarFallback className="bg-muted text-xs">
                        {getInitials(item.member.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.member.full_name}</span>
                        {item.isMinisterio && (
                          <Badge variant="default" className="text-xs">
                            Membro
                          </Badge>
                        )}
                        {!item.isMinisterio && item.participacoes > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            Voluntário
                          </Badge>
                        )}
                      </div>
                      {item.participacoes > 0 && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          <span>{item.participacoes} participação(ões)</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {item.member.whatsapp && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const url = `https://wa.me/55${item.member.whatsapp?.replace(/\D/g, "")}`;
                        window.open(url, "_blank");
                      }}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
