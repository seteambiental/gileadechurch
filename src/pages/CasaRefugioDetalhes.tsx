import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isAuthBypassed } from "@/lib/auth-bypass";
import { ArrowLeft, Loader2, Home, Users, Package, DollarSign, Calendar, MapPin, Image, ScanFace, Trash2, Pencil, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import logoGileade from "@/assets/logo-gileade.jpeg";
import { format, parseISO, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRangeFilter } from "@/components/casas-refugio/DateRangeFilter";
import { EncontrosCharts } from "@/components/casas-refugio/EncontrosCharts";
import { MembrosVinculadosList } from "@/components/casas-refugio/MembrosVinculadosList";
import { VincularMembroDialog } from "@/components/casas-refugio/VincularMembroDialog";
import { AnalisePresencaDialog } from "@/components/casas-refugio/AnalisePresencaDialog";
import { EncontroFormDialog } from "@/components/casas-refugio/EncontroFormDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

const CasaRefugioDetalhes = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bypass = isAuthBypassed();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showVincularDialog, setShowVincularDialog] = useState(false);
  const [analiseEncontro, setAnaliseEncontro] = useState<{
    id: string;
    photoUrl: string;
    dataEncontro: string;
  } | null>(null);
  const [editingEncontro, setEditingEncontro] = useState<any>(null);
  const [deletingEncontroId, setDeletingEncontroId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && !user && !bypass) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate, bypass]);

  const { data: casa, isLoading: loadingCasa } = useQuery({
    queryKey: ["casa-refugio", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casas_refugio")
        .select(`
          *,
          supervisor:members!casas_refugio_supervisor_id_fkey(full_name),
          supervisor_esposa:members!casas_refugio_supervisor_esposa_id_fkey(full_name),
          lider:members!casas_refugio_lider_id_fkey(full_name),
          lider_esposa:members!casas_refugio_lider_esposa_id_fkey(full_name),
          anfitriao:members!casas_refugio_anfitriao_id_fkey(full_name),
          anfitriao_esposa:members!casas_refugio_anfitriao_esposa_id_fkey(full_name)
        `)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: encontros = [], isLoading: loadingEncontros } = useQuery({
    queryKey: ["encontros-casa", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("encontros_casa_refugio")
        .select("*")
        .eq("casa_refugio_id", id)
        .order("data_encontro", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Buscar membros vinculados para indicadores de cadastro
  const { data: membrosVinculados = [] } = useQuery({
    queryKey: ["membros-vinculados-stats", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, birth_date")
        .eq("casa_refugio_id", id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Calcular líderes, membros (excluindo líderes) e crianças vinculados
  const indicadoresVinculados = useMemo(() => {
    const hoje = new Date();
    
    // IDs dos líderes
    const liderIds = [casa?.lider_id, casa?.lider_esposa_id].filter(Boolean);
    const qtdLideres = liderIds.length;
    
    let membrosAdultos = 0;
    let criancas = 0;
    
    membrosVinculados.forEach((m) => {
      // Se for líder, não conta como membro
      if (liderIds.includes(m.id)) return;
      
      if (m.birth_date) {
        const nascimento = parseISO(m.birth_date);
        const idade = Math.floor((hoje.getTime() - nascimento.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        if (idade < 12) {
          criancas++;
        } else {
          membrosAdultos++;
        }
      } else {
        membrosAdultos++; // Sem data de nascimento, considera adulto
      }
    });
    
    return { 
      lideres: qtdLideres, 
      membros: membrosAdultos, 
      criancas, 
      visitantes: 0, // Visitantes não são vinculados
      total: membrosVinculados.length 
    };
  }, [membrosVinculados, casa]);

  // Filter encontros by date range
  const filteredEncontros = useMemo(() => {
    if (!startDate && !endDate) return encontros;
    
    return encontros.filter((encontro) => {
      const encontroDate = parseISO(encontro.data_encontro);
      
      if (startDate && endDate) {
        return isWithinInterval(encontroDate, {
          start: parseISO(startDate),
          end: parseISO(endDate),
        });
      }
      
      if (startDate) {
        return encontroDate >= parseISO(startDate);
      }
      
      if (endDate) {
        return encontroDate <= parseISO(endDate);
      }
      
      return true;
    });
  }, [encontros, startDate, endDate]);

  // Calculate indicators from filtered data
  const totalEncontros = filteredEncontros.length;
  const totalLideres = filteredEncontros.reduce((acc, e) => acc + (e.qtd_lideres || 0), 0);
  const totalMembros = filteredEncontros.reduce((acc, e) => acc + (e.qtd_membros || 0), 0);
  const totalCriancas = filteredEncontros.reduce((acc, e) => acc + (e.qtd_criancas || 0), 0);
  const totalVisitantes = filteredEncontros.reduce((acc, e) => acc + (e.qtd_visitantes || 0), 0);
  const totalPessoas = totalLideres + totalMembros + totalCriancas + totalVisitantes;
  const totalKilos = filteredEncontros.reduce((acc, e) => acc + Number(e.kilos_arrecadados || 0), 0);
  const totalOfertas = filteredEncontros.reduce((acc, e) => acc + Number(e.ofertas || 0), 0);
  const mediaPessoas = totalEncontros > 0 ? Math.round(totalPessoas / totalEncontros) : 0;

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
  };

  const deleteMutation = useMutation({
    mutationFn: async (encontroId: string) => {
      const { error } = await supabase
        .from("encontros_casa_refugio")
        .delete()
        .eq("id", encontroId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["encontros-casa", id] });
      toast.success("Encontro excluído com sucesso!");
      setDeletingEncontroId(null);
    },
    onError: () => {
      toast.error("Erro ao excluir encontro");
    },
  });

  const exportEncontroPDF = async (encontro: any) => {
    const doc = new jsPDF();
    const total = (encontro.qtd_lideres || 0) + (encontro.qtd_membros || 0) + (encontro.qtd_criancas || 0) + (encontro.qtd_visitantes || 0);
    const dataFormatada = format(parseISO(encontro.data_encontro), "dd/MM/yyyy");
    
    // Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("RELATÓRIO DA CASA REFÚGIO", 105, 20, { align: "center" });
    
    doc.setFontSize(14);
    doc.text(`${casa?.name?.toUpperCase() || ""}`, 105, 30, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Data: ${dataFormatada}`, 105, 40, { align: "center" });
    
    let startY = 55;
    
    // Add photo if exists
    if (encontro.photo_url) {
      try {
        // Load image using HTMLImageElement
        const img = document.createElement("img") as HTMLImageElement;
        img.crossOrigin = "anonymous";
        
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            const maxWidth = 180;
            const maxHeight = 100;
            let width = img.width;
            let height = img.height;
            
            // Scale to fit
            if (width > maxWidth) {
              height = (maxWidth / width) * height;
              width = maxWidth;
            }
            if (height > maxHeight) {
              width = (maxHeight / height) * width;
              height = maxHeight;
            }
            
            const x = (210 - width) / 2; // Center horizontally
            doc.addImage(img, "JPEG", x, startY, width, height);
            startY += height + 10;
            resolve();
          };
          img.onerror = () => {
            // Continue without image if loading fails
            resolve();
          };
          img.src = encontro.photo_url;
        });
      } catch (error) {
        console.error("Error loading image for PDF:", error);
      }
    }
    
    // Table with data
    autoTable(doc, {
      startY: startY,
      head: [["Descrição", "Valor"]],
      body: [
        ["Líderes", String(encontro.qtd_lideres || 0)],
        ["Membros", String(encontro.qtd_membros || 0)],
        ["Crianças", String(encontro.qtd_criancas || 0)],
        ["Visitantes", String(encontro.qtd_visitantes || 0)],
        ["Total de Pessoas", String(total)],
        ["Kilos Arrecadados", `${encontro.kilos_arrecadados || 0} kg`],
        ["Ofertas", `R$ ${Number(encontro.ofertas || 0).toFixed(2).replace(".", ",")}`],
      ],
      headStyles: { fillColor: [220, 53, 69] },
      styles: { fontSize: 11 },
      columnStyles: {
        0: { fontStyle: "bold" },
      },
    });
    
    if (encontro.observacoes) {
      const finalY = (doc as any).lastAutoTable.finalY || 100;
      doc.setFontSize(10);
      doc.text(`Observações: ${encontro.observacoes}`, 14, finalY + 10);
    }
    
    doc.save(`encontro-${format(parseISO(encontro.data_encontro), "yyyy-MM-dd")}.pdf`);
  };

  if (authLoading || loadingCasa) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-destructive animate-spin" />
      </div>
    );
  }

  if (!user && !bypass) return null;

  if (!casa) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground mb-4">Casa Refúgio não encontrada</h1>
          <Button onClick={() => navigate("/ministerio/casas-refugio")}>Voltar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoGileade} alt="Gileade" className="w-10 h-10 rounded-full object-cover shadow-red" />
            <div>
              <h1 className="font-heading font-bold text-lg text-foreground">{casa.name}</h1>
              <p className="text-xs text-muted-foreground">{casa.condominio}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              const params = searchParams.toString();
              navigate(`/ministerio/casas-refugio${params ? `?${params}` : ""}`);
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Info Card */}
        <Card className="bg-card border-border">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                <Home className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h2 className="font-bold text-foreground">{casa.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {[casa.lider?.full_name, casa.lider_esposa?.full_name].filter(Boolean).join(" e ") || casa.lideres || "—"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Anfitriões: </span>
                {[casa.anfitriao?.full_name, casa.anfitriao_esposa?.full_name].filter(Boolean).join(" e ") || casa.anfitrioes || "—"}
              </div>
              <div>
                <span className="text-muted-foreground">Supervisores: </span>
                {[casa.supervisor?.full_name, casa.supervisor_esposa?.full_name].filter(Boolean).join(" e ") || casa.supervisores || "—"}
              </div>
              <div><span className="text-muted-foreground">Dias:</span> {casa.dias || "—"}</div>
              <div><span className="text-muted-foreground">Frequência:</span> {casa.frequencia || "—"}</div>
            </div>
            {casa.address && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground pt-2 border-t border-border">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{casa.address}, {casa.numero} - {casa.neighborhood}, {casa.city}/{casa.state} - CEP: {casa.cep}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Date Filter */}
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onApply={() => {}}
          onClear={clearFilters}
        />

        {/* Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-foreground">{totalEncontros}</p>
              <p className="text-xs text-muted-foreground">Encontros</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-foreground">{mediaPessoas}</p>
              <p className="text-xs text-muted-foreground">Média/Encontro</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-foreground">{totalKilos}</p>
              <p className="text-xs text-muted-foreground">Kilos Total</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-foreground">R$ {totalOfertas.toFixed(2).replace(".", ",")}</p>
              <p className="text-xs text-muted-foreground">Ofertas Total</p>
            </CardContent>
          </Card>
        </div>

        {/* Breakdown - Membros Vinculados */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-blue-500/10 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-blue-600">{indicadoresVinculados.lideres}</p>
            <p className="text-xs text-muted-foreground">Líderes</p>
          </div>
          <div className="bg-green-500/10 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-green-600">{indicadoresVinculados.membros}</p>
            <p className="text-xs text-muted-foreground">Membros</p>
          </div>
          <div className="bg-amber-500/10 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-amber-600">{indicadoresVinculados.criancas}</p>
            <p className="text-xs text-muted-foreground">Crianças</p>
          </div>
          <div className="bg-purple-500/10 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-purple-600">{indicadoresVinculados.visitantes}</p>
            <p className="text-xs text-muted-foreground">Visitantes</p>
          </div>
        </div>

        {/* Membros Vinculados */}
        {id && casa && (
          <MembrosVinculadosList
            casaRefugioId={id}
            onVincularClick={() => setShowVincularDialog(true)}
          />
        )}

        {/* Charts */}
        <EncontrosCharts encontros={filteredEncontros} />

        {/* Encontros Table */}
        <div>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Histórico de Encontros ({filteredEncontros.length})
          </h3>
          {loadingEncontros ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-destructive animate-spin" />
            </div>
          ) : filteredEncontros.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum encontro registrado
            </div>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-center">Líd.</TableHead>
                      <TableHead className="text-center">Memb.</TableHead>
                      <TableHead className="text-center">Vis.</TableHead>
                      <TableHead className="text-center">Cri.</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">Kilos</TableHead>
                      <TableHead className="text-center">Ofertas</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEncontros.map((encontro) => {
                      const total = (encontro.qtd_lideres || 0) + (encontro.qtd_membros || 0) + (encontro.qtd_criancas || 0) + (encontro.qtd_visitantes || 0);
                      return (
                        <TableRow key={encontro.id}>
                          <TableCell className="font-medium whitespace-nowrap">
                            {format(parseISO(encontro.data_encontro), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell className="text-center text-blue-600">{encontro.qtd_lideres || 0}</TableCell>
                          <TableCell className="text-center text-green-600">{encontro.qtd_membros || 0}</TableCell>
                          <TableCell className="text-center text-purple-600">{encontro.qtd_visitantes || 0}</TableCell>
                          <TableCell className="text-center text-amber-600">{encontro.qtd_criancas || 0}</TableCell>
                          <TableCell className="text-center font-medium">{total}</TableCell>
                          <TableCell className="text-center">{encontro.kilos_arrecadados || 0}</TableCell>
                          <TableCell className="text-center whitespace-nowrap">R$ {Number(encontro.ofertas || 0).toFixed(2).replace(".", ",")}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              {encontro.photo_url && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setAnaliseEncontro({
                                      id: encontro.id,
                                      photoUrl: encontro.photo_url!,
                                      dataEncontro: encontro.data_encontro,
                                    })}
                                    title="Analisar presença"
                                  >
                                    <ScanFace className="w-4 h-4 text-destructive" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setSelectedPhoto(encontro.photo_url)}
                                    title="Ver foto"
                                  >
                                    <Image className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => exportEncontroPDF(encontro)}
                                title="Exportar PDF"
                              >
                                <FileDown className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setEditingEncontro(encontro)}
                                title="Editar"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeletingEncontroId(encontro.id)}
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </div>
      </main>

      {/* Photo Modal */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-3xl p-2">
          {selectedPhoto && (
            <img
              src={selectedPhoto}
              alt="Foto do encontro"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Analise Presenca Dialog */}
      {id && analiseEncontro && (
        <AnalisePresencaDialog
          open={!!analiseEncontro}
          onOpenChange={(open) => !open && setAnaliseEncontro(null)}
          encontroId={analiseEncontro.id}
          casaRefugioId={id}
          photoUrl={analiseEncontro.photoUrl}
          dataEncontro={analiseEncontro.dataEncontro}
        />
      )}

      {/* Vincular Membro Dialog */}
      {id && casa && (
        <VincularMembroDialog
          open={showVincularDialog}
          onOpenChange={setShowVincularDialog}
          casaRefugioId={id}
          casaRefugioName={casa.name}
        />
      )}

      {/* Edit Encontro Dialog */}
      {casa && editingEncontro && (
        <EncontroFormDialog
          open={!!editingEncontro}
          onOpenChange={(open) => !open && setEditingEncontro(null)}
          casa={casa}
          editingEncontro={editingEncontro}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingEncontroId} onOpenChange={() => setDeletingEncontroId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este encontro? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingEncontroId && deleteMutation.mutate(deletingEncontroId)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CasaRefugioDetalhes;
