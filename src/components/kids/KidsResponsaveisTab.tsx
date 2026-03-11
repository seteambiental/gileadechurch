import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { includesNormalized } from "@/lib/text-utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, UserPlus, Bell, Phone } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";

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
}

interface KidsResponsaveisTabProps {
  turmasConfig: TurmaConfig[];
  criancasPorTurma: Record<string, Crianca[]>;
}

const PARENTESCOS = [
  { value: "pai", label: "Pai" },
  { value: "mae", label: "Mãe" },
  { value: "avo", label: "Avô/Avó" },
  { value: "tio", label: "Tio/Tia" },
  { value: "responsavel", label: "Responsável" },
];

export const KidsResponsaveisTab = ({ turmasConfig, criancasPorTurma }: KidsResponsaveisTabProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCrianca, setSelectedCrianca] = useState<{ id: string; tipo: string; nome: string } | null>(null);
  const [selectedResponsavel, setSelectedResponsavel] = useState("");
  const [selectedParentesco, setSelectedParentesco] = useState("responsavel");
  const [isPrincipal, setIsPrincipal] = useState(false);
  const [notificarAusencia, setNotificarAusencia] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Buscar responsáveis cadastrados
  const { data: responsaveis, isLoading } = useQuery({
    queryKey: ["kids-responsaveis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kids_responsaveis")
        .select(`
          *,
          responsavel:members!kids_responsaveis_responsavel_member_id_fkey(id, full_name, photo_url, whatsapp),
          crianca_member:members!kids_responsaveis_crianca_member_id_fkey(id, full_name),
          crianca_nc:novos_convertidos!kids_responsaveis_crianca_novo_convertido_id_fkey(id, full_name)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Buscar membros adultos para serem responsáveis
  const { data: membrosAdultos } = useQuery({
    queryKey: ["members-adultos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, photo_url, whatsapp, birth_date")
        .order("full_name");
      
      if (error) throw error;
      
      // Filtrar apenas adultos (idade > 18)
      const hoje = new Date();
      return data?.filter((m) => {
        if (!m.birth_date) return true; // Se não tem data, assume adulto
        const nascimento = new Date(m.birth_date);
        const idade = Math.floor((hoje.getTime() - nascimento.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        return idade >= 18;
      });
    },
  });

  // Todas as crianças
  const todasCriancas = Object.values(criancasPorTurma).flat();

  // Adicionar responsável
  const addResponsavel = useMutation({
    mutationFn: async () => {
      if (!selectedCrianca || !selectedResponsavel) {
        throw new Error("Selecione a criança e o responsável");
      }

      const { error } = await supabase.from("kids_responsaveis").insert({
        crianca_member_id: selectedCrianca.tipo === "membro" ? selectedCrianca.id : null,
        crianca_novo_convertido_id: selectedCrianca.tipo === "novo_convertido" ? selectedCrianca.id : null,
        responsavel_member_id: selectedResponsavel,
        parentesco: selectedParentesco,
        principal: isPrincipal,
        notificar_ausencia: notificarAusencia,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Responsável vinculado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["kids-responsaveis"] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Erro", 
        description: error.message 
      });
    },
  });

  // Remover vínculo
  const removeResponsavel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("kids_responsaveis")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Vínculo removido" });
      queryClient.invalidateQueries({ queryKey: ["kids-responsaveis"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    },
  });

  // Toggle notificação
  const toggleNotificacao = useMutation({
    mutationFn: async ({ id, valor }: { id: string; valor: boolean }) => {
      const { error } = await supabase
        .from("kids_responsaveis")
        .update({ notificar_ausencia: valor })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kids-responsaveis"] });
    },
  });

  const resetForm = () => {
    setSelectedCrianca(null);
    setSelectedResponsavel("");
    setSelectedParentesco("responsavel");
    setIsPrincipal(false);
    setNotificarAusencia(true);
  };

  // Agrupar responsáveis por criança
  const responsaveisPorCrianca = responsaveis?.reduce((acc, r) => {
    const key = r.crianca_member_id || r.crianca_novo_convertido_id || "";
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {} as Record<string, typeof responsaveis>);

  // Filtrar responsáveis por busca
  const filteredResponsaveis = useMemo(() => {
    if (!responsaveis) return [];
    if (!searchTerm) return responsaveis;
    return responsaveis.filter((r) => {
      const criancaNome = r.crianca_member?.full_name || r.crianca_nc?.full_name || "";
      const respNome = r.responsavel?.full_name || "";
      return includesNormalized(criancaNome, searchTerm) || includesNormalized(respNome, searchTerm);
    });
  }, [responsaveis, searchTerm]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Responsáveis
          </h2>
          <p className="text-sm text-muted-foreground">
            Vincule responsáveis às crianças para receber notificações de ausência
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Vincular Responsável
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Vincular Responsável à Criança</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Criança</Label>
                <Select 
                  value={selectedCrianca ? `${selectedCrianca.tipo}:${selectedCrianca.id}` : ""} 
                  onValueChange={(v) => {
                    const [tipo, id] = v.split(":");
                    const crianca = todasCriancas.find((c) => c.id === id);
                    setSelectedCrianca({ id, tipo, nome: crianca?.nome || "" });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a criança" />
                  </SelectTrigger>
                  <SelectContent>
                    {todasCriancas.map((c) => (
                      <SelectItem key={`${c.tipo}:${c.id}`} value={`${c.tipo}:${c.id}`}>
                        {c.nome} ({c.idade} anos)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Responsável</Label>
                <Select value={selectedResponsavel} onValueChange={setSelectedResponsavel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {membrosAdultos?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex items-center gap-2">
                          {m.full_name}
                          {m.whatsapp && (
                            <Phone className="h-3 w-3 text-green-600" />
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Parentesco</Label>
                <Select value={selectedParentesco} onValueChange={setSelectedParentesco}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PARENTESCOS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox 
                  id="principal" 
                  checked={isPrincipal} 
                  onCheckedChange={(c) => setIsPrincipal(!!c)} 
                />
                <Label htmlFor="principal" className="cursor-pointer">
                  Responsável principal
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox 
                  id="notificar" 
                  checked={notificarAusencia} 
                  onCheckedChange={(c) => setNotificarAusencia(!!c)} 
                />
                <Label htmlFor="notificar" className="cursor-pointer">
                  Notificar em caso de ausência
                </Label>
              </div>

              <Button 
                className="w-full" 
                onClick={() => addResponsavel.mutate()}
                disabled={!selectedCrianca || !selectedResponsavel || addResponsavel.isPending}
              >
                {addResponsavel.isPending ? "Vinculando..." : "Vincular Responsável"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de vínculos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vínculos Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {!responsaveis || responsaveis.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Nenhum responsável vinculado ainda
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Criança</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Parentesco</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Notificar</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responsaveis.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {r.crianca_member?.full_name || r.crianca_nc?.full_name}
                          </span>
                          {r.principal && (
                            <Badge variant="secondary" className="text-xs">Principal</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={r.responsavel?.photo_url || undefined} />
                            <AvatarFallback>
                              {r.responsavel?.full_name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{r.responsavel?.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {PARENTESCOS.find((p) => p.value === r.parentesco)?.label || r.parentesco}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.responsavel?.whatsapp ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {r.responsavel.whatsapp}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Checkbox 
                          checked={r.notificar_ausencia}
                          onCheckedChange={(checked) => 
                            toggleNotificacao.mutate({ id: r.id, valor: !!checked })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeResponsavel.mutate(r.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
