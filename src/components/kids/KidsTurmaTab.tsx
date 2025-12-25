import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Search, Users, UserRound, Pencil, Trash2 } from "lucide-react";
import { EditarCriancaDialog } from "./EditarCriancaDialog";
import { toast } from "sonner";
interface TurmaConfig {
  id: string;
  turma: string;
  nome_exibicao: string;
  cor_hex: string;
  idade_minima: number;
  idade_maxima: number;
}

interface Crianca {
  id: string;
  nome: string;
  idade: number;
  genero: string | null;
  whatsapp: string | null;
  foto: string | null;
  tipo: "membro" | "novo_convertido";
  responsavelNome: string | null;
  responsavelWhatsapp: string | null;
}

interface KidsTurmaTabProps {
  turma: TurmaConfig;
  criancas: Crianca[];
}

export const KidsTurmaTab = ({ turma, criancas }: KidsTurmaTabProps) => {
  const [search, setSearch] = useState("");
  const [editingCrianca, setEditingCrianca] = useState<Crianca | null>(null);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (crianca: Crianca) => {
      if (crianca.tipo === "novo_convertido") {
        const { error } = await supabase
          .from("novos_convertidos")
          .delete()
          .eq("id", crianca.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("members")
          .delete()
          .eq("id", crianca.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["novos-convertidos-kids"] });
      queryClient.invalidateQueries({ queryKey: ["members-kids"] });
      toast.success("Criança excluída com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao excluir criança:", error);
      toast.error("Erro ao excluir criança");
    },
  });

  const criancasFiltradas = criancas.filter((c) =>
    c.nome.toLowerCase().includes(search.toLowerCase())
  );

  const meninos = criancas.filter((c) => c.genero === "masculino").length;
  const meninas = criancas.filter((c) => c.genero === "feminino").length;

  return (
    <div className="space-y-4">
      {/* Stats da turma */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-full" 
                style={{ backgroundColor: `${turma.cor_hex}20` }}
              >
                <Users className="h-5 w-5" style={{ color: turma.cor_hex }} />
              </div>
              <div>
                <p className="text-2xl font-bold">{criancas.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <UserRound className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{meninos}</p>
                <p className="text-xs text-muted-foreground">Meninos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-pink-100">
                <UserRound className="h-5 w-5 text-pink-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{meninas}</p>
                <p className="text-xs text-muted-foreground">Meninas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-full"
                style={{ backgroundColor: `${turma.cor_hex}20` }}
              >
                <span className="text-sm font-bold" style={{ color: turma.cor_hex }}>
                  {turma.idade_minima}-{turma.idade_maxima}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium">Faixa Etária</p>
                <p className="text-xs text-muted-foreground">anos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de crianças */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: turma.cor_hex }} 
              />
              Crianças - Turma {turma.nome_exibicao}
            </CardTitle>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar criança..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {criancasFiltradas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? "Nenhuma criança encontrada" : "Nenhuma criança nesta turma"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Idade</TableHead>
                    <TableHead>Gênero</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criancasFiltradas.map((crianca) => (
                    <TableRow key={`${crianca.tipo}-${crianca.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={crianca.foto || undefined} />
                            <AvatarFallback 
                              style={{ backgroundColor: `${turma.cor_hex}30` }}
                            >
                              {crianca.nome.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{crianca.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {crianca.responsavelNome ? (
                          <div className="text-sm">
                            <p className="font-medium">{crianca.responsavelNome}</p>
                            {crianca.responsavelWhatsapp && (
                              <p className="text-muted-foreground text-xs">{crianca.responsavelWhatsapp}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>{crianca.idade} anos</TableCell>
                      <TableCell>
                        {crianca.genero === "masculino" ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Menino
                          </Badge>
                        ) : crianca.genero === "feminino" ? (
                          <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">
                            Menina
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={crianca.tipo === "membro" ? "default" : "outline"}
                          className={crianca.tipo === "membro" 
                            ? "" 
                            : "bg-amber-50 text-amber-700 border-amber-200"
                          }
                        >
                          {crianca.tipo === "membro" ? "Membro" : "Visitante"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setEditingCrianca(crianca)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Editar</p>
                            </TooltipContent>
                          </Tooltip>
                          
                          <AlertDialog>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Excluir</p>
                              </TooltipContent>
                            </Tooltip>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir <strong>{crianca.nome}</strong>? 
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => deleteMutation.mutate(crianca)}
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de edição */}
      <EditarCriancaDialog
        open={!!editingCrianca}
        onOpenChange={(open) => !open && setEditingCrianca(null)}
        crianca={editingCrianca}
      />
    </div>
  );
};
