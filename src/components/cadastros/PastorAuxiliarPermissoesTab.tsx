import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, UserCog, CheckCircle2 } from "lucide-react";
import {
  usePastorAuxiliarPermissoes,
  MODULOS_DISPONIVEIS,
} from "@/hooks/usePastorAuxiliarPermissoes";

const PastorAuxiliarPermissoesTab = () => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Buscar todos os pastores auxiliares
  const { data: pastoresAuxiliares, isLoading: loadingPastores } = useQuery({
    queryKey: ["pastores-auxiliares-list"],
    queryFn: async () => {
      // Buscar user_ids com role pastor_auxiliar
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "pastor_auxiliar");
      if (rolesError || !roles?.length) return [];

      const userIds = roles.map((r) => r.user_id);

      // Buscar nomes dos membros vinculados
      const { data: members } = await supabase
        .from("members")
        .select("id, full_name, user_id, photo_url")
        .in("user_id", userIds);

      return members || [];
    },
  });

  const { permissoes, isLoading: loadingPerms, togglePermissao } =
    usePastorAuxiliarPermissoes(selectedUserId || undefined);

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  const isModuloAtivo = (modulo: string) => {
    return permissoes?.find((p) => p.modulo === modulo)?.ativo ?? false;
  };

  if (loadingPastores) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pastoresAuxiliares?.length) {
    return (
      <div className="text-center py-12">
        <UserCog className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
        <h3 className="font-medium text-foreground">Nenhum Pastor Auxiliar cadastrado</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Adicione a role "pastor_auxiliar" a um usuário na aba Aprovações.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-heading font-bold text-foreground flex items-center gap-2">
          <Shield className="w-5 h-5 text-secondary" />
          Permissões do Pastor Auxiliar
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure quais módulos cada Pastor Auxiliar pode acessar.
        </p>
      </div>

      {/* Lista de pastores auxiliares */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {pastoresAuxiliares.map((pastor) => (
          <Card
            key={pastor.user_id}
            className={`cursor-pointer transition-all ${
              selectedUserId === pastor.user_id
                ? "border-secondary ring-2 ring-secondary/20"
                : "hover:border-muted-foreground/30"
            }`}
            onClick={() => setSelectedUserId(pastor.user_id)}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-secondary/20 text-secondary text-sm">
                  {getInitials(pastor.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{pastor.full_name}</p>
                <Badge variant="outline" className="text-[10px]">
                  Pastor Auxiliar
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Painel de permissões */}
      {selectedUserId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Módulos autorizados para{" "}
              {pastoresAuxiliares.find((p) => p.user_id === selectedUserId)?.full_name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPerms ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {MODULOS_DISPONIVEIS.map((modulo) => (
                  <div
                    key={modulo.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg border border-border"
                  >
                    <div>
                      <p className="font-medium text-sm text-foreground">{modulo.label}</p>
                      <p className="text-xs text-muted-foreground">{modulo.description}</p>
                    </div>
                    <Switch
                      checked={isModuloAtivo(modulo.id)}
                      onCheckedChange={(checked) =>
                        togglePermissao.mutate({ modulo: modulo.id, ativo: checked })
                      }
                      disabled={togglePermissao.isPending}
                    />
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-3 text-xs text-muted-foreground border-t border-border">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  As alterações são salvas automaticamente ao clicar em cada opção.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PastorAuxiliarPermissoesTab;
