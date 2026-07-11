import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Baby, Copy, Trash2, Calendar, MapPin, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/date-utils";

interface Apresentacao {
  id: string;
  familia_membro: boolean;
  pai_nome: string | null;
  pai_nao_identificado: boolean;
  mae_nome: string | null;
  mae_nao_identificado: boolean;
  crianca_nome: string;
  crianca_cpf: string | null;
  crianca_data_nascimento: string | null;
  crianca_genero: string | null;
  crianca_photo_url: string | null;
  neighborhood: string | null;
  city: string | null;
  observacoes: string | null;
  created_at: string;
}

const ApresentacaoCriancasCultoTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const linkPublico = `${window.location.origin}/apresentacao-de-criancas`;

  const { data: inscricoes = [], isLoading } = useQuery({
    queryKey: ["apresentacao-criancas-culto"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("apresentacao_criancas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Apresentacao[];
    },
  });

  const excluirMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("apresentacao_criancas")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apresentacao-criancas-culto"] });
      toast({ title: "Inscrição excluída" });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: err instanceof Error ? err.message : String(err),
      });
    },
  });

  const copiarLink = () => {
    navigator.clipboard.writeText(linkPublico);
    toast({ title: "Link copiado!", description: linkPublico });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Baby className="w-5 h-5" /> Link de inscrição
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Compartilhe este link para que as famílias inscrevam suas crianças para apresentação.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <code className="flex-1 px-3 py-2 rounded-md bg-muted text-xs break-all">
              {linkPublico}
            </code>
            <Button onClick={copiarLink} variant="outline">
              <Copy className="w-4 h-4 mr-2" /> Copiar link
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="font-heading font-semibold text-lg mb-3 flex items-center gap-2">
          Inscrições recebidas
          <Badge variant="secondary">{inscricoes.length}</Badge>
        </h3>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : inscricoes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhuma inscrição recebida ainda.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {inscricoes.map((i) => (
              <Card key={i.id}>
                <CardContent className="pt-5 space-y-3">
                  <div className="flex items-start gap-3">
                    {i.crianca_photo_url ? (
                      <img
                        src={i.crianca_photo_url}
                        alt={i.crianca_nome}
                        className="w-14 h-14 rounded-full object-cover border"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                        <Baby className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{i.crianca_nome}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant={i.familia_membro ? "default" : "outline"} className="text-[10px]">
                          {i.familia_membro ? "Membro Gileade" : "Não membro"}
                        </Badge>
                        {i.crianca_genero && (
                          <Badge variant="secondary" className="text-[10px] capitalize">
                            {i.crianca_genero}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground space-y-1">
                    {i.crianca_data_nascimento && (
                      <p className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(parseLocalDate(i.crianca_data_nascimento), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    )}
                    <p className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5" />
                      Pai: {i.pai_nao_identificado ? "Não identificado" : i.pai_nome || "—"}
                    </p>
                    <p className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5" />
                      Mãe: {i.mae_nao_identificado ? "Não identificado" : i.mae_nome || "—"}
                    </p>
                    {(i.neighborhood || i.city) && (
                      <p className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5" />
                        {[i.neighborhood, i.city].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {i.observacoes && (
                      <p className="text-xs italic pt-1">"{i.observacoes}"</p>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-1" /> Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir inscrição?</AlertDialogTitle>
                          <AlertDialogDescription>
                            A inscrição de <strong>{i.crianca_nome}</strong> será removida permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => excluirMutation.mutate(i.id)}>
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApresentacaoCriancasCultoTab;
