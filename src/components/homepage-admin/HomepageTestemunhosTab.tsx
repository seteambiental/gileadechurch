import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { MessageSquare, ExternalLink, User, UserX, Quote, CheckCircle, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const HomepageTestemunhosTab = () => {
  const navigate = useNavigate();

  const { data: testemunhos, isLoading } = useQuery({
    queryKey: ["testemunhos-homepage-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testemunhos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  const now = new Date();
  const testemunhosAtivos = testemunhos?.filter((t) => {
    if (!t.aprovado || t.arquivado) return false;
    const daysSinceCreated = differenceInDays(now, new Date(t.created_at));
    return daysSinceCreated <= 15;
  }) || [];

  const testemunhosPendentes = testemunhos?.filter((t) => !t.aprovado && !t.arquivado) || [];

  const getDaysRemaining = (createdAt: string) => {
    const days = 15 - differenceInDays(now, new Date(createdAt));
    return Math.max(0, days);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-heading font-bold">Testemunhos</h2>
          <p className="text-sm text-muted-foreground">
            Os testemunhos aprovados aparecem automaticamente na homepage por 15 dias
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/ministerio/intercessao")}>
          <ExternalLink className="w-4 h-4 mr-2" />
          Gerenciar Testemunhos
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Como funciona
          </CardTitle>
          <CardDescription>
            Os testemunhos são gerenciados na aba de Intercessão. Quando aprovados, eles ficam 
            visíveis na homepage por 15 dias automaticamente. Após esse período, são arquivados.
          </CardDescription>
        </CardHeader>
      </Card>

      {testemunhosPendentes.length > 0 && (
        <Card className="border-orange-500/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              Pendentes de Aprovação ({testemunhosPendentes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" onClick={() => navigate("/ministerio/intercessao")}>
              Aprovar Testemunhos
            </Button>
          </CardContent>
        </Card>
      )}

      <div>
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          Testemunhos Ativos na Homepage ({testemunhosAtivos.length})
        </h3>

        {testemunhosAtivos.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Quote className="w-12 h-12 mx-auto mb-4 opacity-50" />
              Nenhum testemunho ativo no momento
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {testemunhosAtivos.map((testemunho) => (
              <Card key={testemunho.id} className="relative overflow-hidden">
                <Quote className="absolute top-2 right-2 w-8 h-8 text-muted-foreground/20" />
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="w-10 h-10">
                      {testemunho.foto_url && !testemunho.anonimo ? (
                        <AvatarImage src={testemunho.foto_url} />
                      ) : null}
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {testemunho.anonimo ? (
                          <UserX className="w-4 h-4" />
                        ) : testemunho.nome ? (
                          testemunho.nome.charAt(0).toUpperCase()
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="font-medium text-sm">
                        {testemunho.anonimo ? "Anônimo" : testemunho.nome || "Não informado"}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(testemunho.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {getDaysRemaining(testemunho.created_at)} dias
                    </Badge>
                  </div>
                  <p className="text-sm italic text-foreground line-clamp-3">
                    "{testemunho.testemunho}"
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomepageTestemunhosTab;
