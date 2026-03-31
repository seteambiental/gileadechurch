import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isAuthBypassed } from "@/lib/auth-bypass";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Loader2,
  UserPlus,
  Users,
  UserCheck,
  Trash2,
  Pencil,
  UserRoundCheck,
  Calendar,
} from "lucide-react";
import logoGileade from "@/assets/logo-gileade.jpeg";
import { NovoConvertidoFormDialog } from "@/components/consolidacao/NovoConvertidoFormDialog";
import { TrilhoProgress } from "@/components/consolidacao/TrilhoProgress";
import { EnviarMensagemButton } from "@/components/consolidacao/EnviarMensagemButton";
import { ConsolidacaoAgendaTab } from "@/components/consolidacao/ConsolidacaoAgendaTab";
import { useToast } from "@/hooks/use-toast";
import { includesNormalized } from "@/lib/text-utils";
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
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [activeTab, setActiveTab] = useState("convertidos");
  const [eventoSelecionado, setEventoSelecionado] = useState<{ id: string; titulo: string } | null>(null);

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
    includesNormalized(c.full_name, search)
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

  const handleConvertToMember = async () => {
    if (!convertingId) return;

    const convertido = convertidos.find((c) => c.id === convertingId);
    if (!convertido) return;

    setIsConverting(true);
    try {
      // Criar membro com os dados do novo convertido
      const memberData = {
        full_name: convertido.full_name,
        whatsapp: convertido.whatsapp,
        email: convertido.email,
        birth_date: convertido.data_nascimento,
        address: convertido.address,
        numero: convertido.numero,
        complement: convertido.complement,
        neighborhood: convertido.neighborhood,
        city: convertido.city,
        state: convertido.state,
        cep: convertido.cep,
        cpf: convertido.cpf,
        genero: convertido.genero,
        photo_url: convertido.photo_url,
        casa_refugio_id: convertido.casa_refugio_frequenta_id || convertido.casa_refugio_id,
        member_since: new Date().toISOString().split("T")[0],
      };

      const { data: newMember, error: memberError } = await supabase
        .from("members")
        .insert(memberData)
        .select("id")
        .single();

      if (memberError) throw memberError;

      // Atualizar novo_convertido marcando como tornou_membro e vinculando ao member_id
      const { error: updateError } = await supabase
        .from("novos_convertidos")
        .update({
          tornou_membro: true,
          member_id: newMember.id,
          data_membresia: new Date().toISOString().split("T")[0],
        })
        .eq("id", convertingId);

      if (updateError) throw updateError;

      toast({ title: "Convertido para membro com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["novos-convertidos"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao converter", description: error.message });
    } finally {
      setIsConverting(false);
      setConvertingId(null);
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
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/app")} className="text-muted-foreground hover:text-foreground">
              <Home className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="convertidos" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Novos Convertidos</span>
              <span className="sm:hidden">Convertidos</span>
            </TabsTrigger>
            <TabsTrigger value="eventos" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Eventos</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="convertidos">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
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
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <SearchInput
                placeholder="Buscar por nome..."
                value={search}
                onChange={setSearch}
                className="flex-1"
              />
              <Button variant="secondary" onClick={() => { setEditingConvertido(null); setEventoSelecionado(null); setShowForm(true); }}>
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
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">{convertido.full_name}</h3>
                            {convertido.tornou_membro && (
                              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                                Membro
                              </span>
                            )}
                          </div>
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
                          {!convertido.tornou_membro && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => setConvertingId(convertido.id)}
                              title="Converter para Membro"
                            >
                              <UserRoundCheck className="w-4 h-4" />
                            </Button>
                          )}
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
          </TabsContent>

          <TabsContent value="eventos">
            <ConsolidacaoAgendaTab 
              onEventoSelect={(id, titulo) => {
                setEventoSelecionado({ id, titulo });
                setEditingConvertido(null);
                setShowForm(true);
              }}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Form Dialog */}
      <NovoConvertidoFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        convertido={editingConvertido}
        eventoId={eventoSelecionado?.id}
        eventoTitulo={eventoSelecionado?.titulo}
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

      {/* Convert to Member Confirmation */}
      <AlertDialog open={!!convertingId} onOpenChange={() => setConvertingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Converter para Membro</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá criar um novo registro de membro com os mesmos dados deste novo convertido.
              O registro original será mantido e marcado como "tornou-se membro".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isConverting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConvertToMember}
              disabled={isConverting}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {isConverting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Converter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ConsolidacaoPage;
