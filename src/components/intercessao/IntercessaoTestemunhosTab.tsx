import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, User, UserX, CheckCircle, Clock, Trash2, Quote } from "lucide-react";
import TestemunhoFormDialog from "./TestemunhoFormDialog";

const IntercessaoTestemunhosTab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);

  const { data: testemunhos, isLoading } = useQuery({
    queryKey: ["testemunhos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testemunhos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const aproveMutation = useMutation({
    mutationFn: async ({ id, aprovado }: { id: string; aprovado: boolean }) => {
      const { error } = await supabase
        .from("testemunhos")
        .update({ aprovado })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Testemunho atualizado!");
      queryClient.invalidateQueries({ queryKey: ["testemunhos"] });
    },
    onError: () => {
      toast.error("Erro ao atualizar testemunho");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("testemunhos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Testemunho removido!");
      queryClient.invalidateQueries({ queryKey: ["testemunhos"] });
    },
    onError: () => {
      toast.error("Erro ao remover testemunho");
    },
  });

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  const testemunhosAprovados = testemunhos?.filter((t) => t.aprovado) || [];
  const testemunhosPendentes = testemunhos?.filter((t) => !t.aprovado) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-heading font-bold">Mural de Testemunhos</h2>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Compartilhar Testemunho
        </Button>
      </div>

      {user && testemunhosPendentes.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Pendentes de Aprovação ({testemunhosPendentes.length})
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {testemunhosPendentes.map((testemunho) => (
              <Card key={testemunho.id} className="border-dashed">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        {testemunho.foto_url && !testemunho.anonimo ? (
                          <AvatarImage src={testemunho.foto_url} />
                        ) : null}
                        <AvatarFallback>
                          {testemunho.anonimo ? <UserX className="w-4 h-4" /> : <User className="w-4 h-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">
                        {testemunho.anonimo ? "Anônimo" : testemunho.nome || "Não informado"}
                      </span>
                    </div>
                    <Badge variant="outline">Pendente</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm italic text-foreground">"{testemunho.testemunho}"</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(testemunho.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => aproveMutation.mutate({ id: testemunho.id, aprovado: true })}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(testemunho.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {user && testemunhosPendentes.length > 0 && (
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            Testemunhos Aprovados
          </h3>
        )}

        {testemunhosAprovados.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum testemunho publicado ainda.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {testemunhosAprovados.map((testemunho) => (
              <Card key={testemunho.id} className="relative overflow-hidden">
                <Quote className="absolute top-2 right-2 w-8 h-8 text-muted-foreground/20" />
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      {testemunho.foto_url && !testemunho.anonimo ? (
                        <AvatarImage src={testemunho.foto_url} />
                      ) : null}
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {testemunho.anonimo ? (
                          <UserX className="w-5 h-5" />
                        ) : testemunho.nome ? (
                          testemunho.nome.charAt(0).toUpperCase()
                        ) : (
                          <User className="w-5 h-5" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="font-medium">
                        {testemunho.anonimo ? "Anônimo" : testemunho.nome || "Não informado"}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(testemunho.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm italic text-foreground">"{testemunho.testemunho}"</p>
                  
                  {user && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => aproveMutation.mutate({ id: testemunho.id, aprovado: false })}
                      >
                        Despublicar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteMutation.mutate(testemunho.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <TestemunhoFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
};

export default IntercessaoTestemunhosTab;
