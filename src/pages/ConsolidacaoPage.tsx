import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isAuthBypassed } from "@/lib/auth-bypass";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Loader2,
  UserPlus,
  Search,
  Users,
  UserCheck,
  Trash2,
  Pencil,
} from "lucide-react";
import logoGileade from "@/assets/logo-gileade.jpeg";
import { NovoConvertidoFormDialog } from "@/components/consolidacao/NovoConvertidoFormDialog";
import { TrilhoProgress } from "@/components/consolidacao/TrilhoProgress";
import { EnviarMensagemButton } from "@/components/consolidacao/EnviarMensagemButton";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const comoChegouLabels: Record<string, string> = {
  culto_domingo: "Culto Domingo",
  culto_quarta: "Culto Quarta",
  casa_refugio: "Casa Refúgio",
  impacto: "Impacto",
  acao_evangelistica: "Ação Evangelística",
};

const ConsolidacaoPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const bypass = isAuthBypassed();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingConvertido, setEditingConvertido] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user && !bypass) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate, bypass]);

  const { data: convertidos = [], isLoading } = useQuery({
    queryKey: ["novos-convertidos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("novos_convertidos")
        .select(`
          *,
          membro_vinculado:members!novos_convertidos_membro_vinculado_id_fkey(full_name),
          casa_origem:casas_refugio!novos_convertidos_casa_refugio_id_fkey(name)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredConvertidos = convertidos.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const pendentes = filteredConvertidos.filter((c) => !c.tornou_membro);
  const membros = filteredConvertidos.filter((c) => c.tornou_membro);

  const handleDelete = async () => {
    if (!deletingId) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("novos_convertidos")
        .delete()
        .eq("id", deletingId);
      if (error) throw error;

      toast({ title: "Registro excluído com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["novos-convertidos"] });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-destructive animate-spin" />
      </div>
    );
  }

  if (!user && !bypass) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoGileade} alt="Gileade" className="w-10 h-10 rounded-full object-cover shadow-red" />
            <div>
              <h1 className="font-heading font-bold text-lg text-foreground">Consolidação</h1>
              <p className="text-xs text-muted-foreground">Acompanhamento de Novos Convertidos</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/app")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Users className="w-5 h-5 text-destructive" />
                <p className="text-2xl font-bold text-foreground">{pendentes.length}</p>
              </div>
              <p className="text-xs text-muted-foreground">Em Trilho</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <UserCheck className="w-5 h-5 text-green-600" />
                <p className="text-2xl font-bold text-foreground">{membros.length}</p>
              </div>
              <p className="text-xs text-muted-foreground">Tornaram-se Membros</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="secondary" onClick={() => { setEditingConvertido(null); setShowForm(true); }}>
            <UserPlus className="w-4 h-4 mr-2" />
            Novo Cadastro
          </Button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-destructive animate-spin" />
          </div>
        ) : filteredConvertidos.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {search ? "Nenhum resultado encontrado" : "Nenhum novo convertido cadastrado"}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredConvertidos.map((convertido) => (
              <Card key={convertido.id} className="bg-card border-border">
                <CardContent className="pt-4 pb-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{convertido.full_name}</h3>
                      <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                        {convertido.whatsapp && <span>{convertido.whatsapp}</span>}
                        {convertido.como_chegou && (
                          <span className="px-2 py-0.5 bg-muted rounded-full">
                            {comoChegouLabels[convertido.como_chegou] || convertido.como_chegou}
                          </span>
                        )}
                        {convertido.membro_vinculado && (
                          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                            Vínculo: {convertido.membro_vinculado.full_name}
                          </span>
                        )}
                        {convertido.casa_origem && (
                          <span className="px-2 py-0.5 bg-destructive/10 text-destructive rounded-full">
                            CR: {convertido.casa_origem.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <EnviarMensagemButton convertido={convertido} />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => { setEditingConvertido(convertido); setShowForm(true); }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeletingId(convertido.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <TrilhoProgress convertido={convertido} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Form Dialog */}
      <NovoConvertidoFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        convertido={editingConvertido}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Registro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ConsolidacaoPage;
