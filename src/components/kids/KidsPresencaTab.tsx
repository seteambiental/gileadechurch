import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, eachWeekOfInterval, isSunday, isWednesday } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, Save, CheckCircle2, XCircle, Bell, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface KidsPresencaTabProps {
  turmasConfig: TurmaConfig[];
  criancasPorTurma: Record<string, Crianca[]>;
}

export const KidsPresencaTab = ({ turmasConfig, criancasPorTurma }: KidsPresencaTabProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTurma, setSelectedTurma] = useState<string>(turmasConfig[0]?.turma || "");
  const [tipoCulto, setTipoCulto] = useState<string>("domingo");
  const [presencas, setPresencas] = useState<Record<string, boolean>>({});

  const dataFormatada = format(selectedDate, "yyyy-MM-dd");

  // Buscar presenças do dia selecionado
  const { data: presencasDia, isLoading } = useQuery({
    queryKey: ["kids-presencas", dataFormatada, selectedTurma],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kids_presencas")
        .select("*")
        .eq("data_culto", dataFormatada)
        .eq("turma", selectedTurma as "laranja" | "amarelo" | "verde" | "azul");
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTurma,
  });

  // Inicializar presenças quando os dados carregam
  useMemo(() => {
    if (presencasDia) {
      const presencasMap: Record<string, boolean> = {};
      presencasDia.forEach((p) => {
        const key = p.member_id || p.novo_convertido_id;
        if (key) presencasMap[key] = p.presente;
      });
      setPresencas(presencasMap);
    } else {
      setPresencas({});
    }
  }, [presencasDia]);

  // Salvar presenças
  const savePresencas = useMutation({
    mutationFn: async () => {
      const criancasTurma = criancasPorTurma[selectedTurma] || [];
      
      // Deletar presenças existentes do dia
      await supabase
        .from("kids_presencas")
        .delete()
        .eq("data_culto", dataFormatada)
        .eq("turma", selectedTurma as "laranja" | "amarelo" | "verde" | "azul");

      // Inserir novas presenças
      const registros = criancasTurma
        .filter((c) => presencas[c.id] !== undefined)
        .map((c) => ({
          member_id: c.tipo === "membro" ? c.id : null,
          novo_convertido_id: c.tipo === "novo_convertido" ? c.id : null,
          turma: selectedTurma as "laranja" | "amarelo" | "verde" | "azul",
          data_culto: dataFormatada,
          tipo_culto: tipoCulto,
          presente: presencas[c.id] ?? false,
        }));

      if (registros.length > 0) {
        const { error } = await supabase.from("kids_presencas").insert(registros);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Presenças salvas com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["kids-presencas"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    },
  });

  // Enviar notificações de ausência
  const enviarNotificacoes = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('notificar-ausencia-kids', {
        body: {
          data_culto: dataFormatada,
          turma: selectedTurma,
          enviar_agora: true,
        },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({ 
        title: "Notificações enviadas!", 
        description: data.message 
      });
      queryClient.invalidateQueries({ queryKey: ["kids-notificacoes-log"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    },
  });

  // Toggle presença
  const togglePresenca = (id: string) => {
    setPresencas((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Marcar todos presentes
  const marcarTodosPresentes = () => {
    const criancasTurma = criancasPorTurma[selectedTurma] || [];
    const novasPresencas: Record<string, boolean> = {};
    criancasTurma.forEach((c) => {
      novasPresencas[c.id] = true;
    });
    setPresencas(novasPresencas);
  };

  // Limpar presenças
  const limparPresencas = () => {
    setPresencas({});
  };

  const criancasTurma = criancasPorTurma[selectedTurma] || [];
  const turmaConfig = turmasConfig.find((t) => t.turma === selectedTurma);

  const presentes = Object.values(presencas).filter(Boolean).length;
  const ausentes = criancasTurma.length - presentes;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Registrar Presença</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[200px] justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, "PPP", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Turma</Label>
              <Select value={selectedTurma} onValueChange={setSelectedTurma}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {turmasConfig.map((t) => (
                    <SelectItem key={t.turma} value={t.turma}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: t.cor_hex }} 
                        />
                        {t.nome_exibicao}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Tipo de Culto</Label>
              <Select value={tipoCulto} onValueChange={setTipoCulto}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="domingo">Domingo</SelectItem>
                  <SelectItem value="quarta">Quarta</SelectItem>
                  <SelectItem value="especial">Especial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={marcarTodosPresentes}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Todos presentes
              </Button>
              <Button variant="outline" size="sm" onClick={limparPresencas}>
                <XCircle className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold">{criancasTurma.length}</p>
            <p className="text-sm text-muted-foreground">Total na turma</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-green-600">{presentes}</p>
            <p className="text-sm text-muted-foreground">Presentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-red-600">{ausentes}</p>
            <p className="text-sm text-muted-foreground">Ausentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de presenças */}
      <Card style={{ borderTopColor: turmaConfig?.cor_hex, borderTopWidth: 4 }}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: turmaConfig?.cor_hex }} 
              />
              Turma {turmaConfig?.nome_exibicao} - {format(selectedDate, "dd/MM/yyyy")}
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={() => savePresencas.mutate()} disabled={savePresencas.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {savePresencas.isPending ? "Salvando..." : "Salvar Presenças"}
              </Button>
              <Button 
                variant="outline"
                onClick={() => enviarNotificacoes.mutate()}
                disabled={enviarNotificacoes.isPending || ausentes === 0}
                title="Enviar notificação de ausência para responsáveis"
              >
                {enviarNotificacoes.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Bell className="h-4 w-4 mr-2" />
                )}
                Notificar Ausentes
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {criancasTurma.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Nenhuma criança nesta turma
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Presente</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Idade</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criancasTurma.map((crianca) => (
                    <TableRow 
                      key={`${crianca.tipo}-${crianca.id}`}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50",
                        presencas[crianca.id] && "bg-green-50 dark:bg-green-950/20"
                      )}
                      onClick={() => togglePresenca(crianca.id)}
                    >
                      <TableCell>
                        <Checkbox 
                          checked={presencas[crianca.id] ?? false}
                          onCheckedChange={() => togglePresenca(crianca.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{crianca.nome}</TableCell>
                      <TableCell>{crianca.idade} anos</TableCell>
                      <TableCell>
                        {presencas[crianca.id] ? (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Presente
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Não marcado
                          </Badge>
                        )}
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
