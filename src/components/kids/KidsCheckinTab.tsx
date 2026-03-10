import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { QrCode, Printer, CalendarIcon, UserCheck, LogIn, LogOut, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface TurmaConfig {
  id: string;
  turma: string;
  nome_exibicao: string;
  cor_hex: string;
  idade_minima: number;
  idade_maxima: number;
}

interface KidsCheckinTabProps {
  turmasConfig: TurmaConfig[];
}

export const KidsCheckinTab = ({ turmasConfig }: KidsCheckinTabProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showQRPrint, setShowQRPrint] = useState(false);
  const [selectedTurmasPrint, setSelectedTurmasPrint] = useState<Set<string>>(new Set());
  const [printTurma, setPrintTurma] = useState<string | null>(null);
  const dataFormatada = format(selectedDate, "yyyy-MM-dd");

  const { data: checkins, isLoading } = useQuery({
    queryKey: ["kids-checkins", dataFormatada],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kids_checkins")
        .select("*")
        .eq("data_culto", dataFormatada)
        .order("check_me_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const baseUrl = window.location.origin;

  const toggleTurmaPrint = (turma: string) => {
    setSelectedTurmasPrint(prev => {
      const next = new Set(prev);
      if (next.has(turma)) next.delete(turma);
      else next.add(turma);
      return next;
    });
  };

  const handlePrintSelected = () => {
    if (selectedTurmasPrint.size === 0) return;
    setShowQRPrint(true);
    setPrintTurma(null);
    setTimeout(() => {
      window.print();
      setShowQRPrint(false);
    }, 500);
  };

  const handlePrintSingle = (turma: string) => {
    setPrintTurma(turma);
    setShowQRPrint(true);
    setTimeout(() => {
      window.print();
      setShowQRPrint(false);
      setPrintTurma(null);
    }, 500);
  };

  const stats = {
    checkMe: checkins?.filter(c => c.check_me_at && !c.check_in_at).length || 0,
    checkIn: checkins?.filter(c => c.check_in_at && !c.check_out_at).length || 0,
    checkOut: checkins?.filter(c => c.check_out_at).length || 0,
    total: checkins?.length || 0,
  };

  return (
    <div className="space-y-4">
      {/* Print-only: meia folha A4 por QR */}
      {showQRPrint && (
        <div className="fixed inset-0 bg-white z-[9999]" id="print-qrs">
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #print-qrs, #print-qrs * { visibility: visible !important; }
              #print-qrs { position: fixed; top: 0; left: 0; width: 100%; }
              .print-qr-page { page-break-after: always; width: 210mm; height: 148.5mm; display: flex; flex-direction: column; align-items: center; justify-content: center; }
              .print-qr-page:last-child { page-break-after: auto; }
            }
            @media screen { #print-qrs { display: none; } }
          `}</style>
          {(printTurma
            ? turmasConfig.filter(t => t.turma === printTurma)
            : turmasConfig.filter(t => t.turma !== "todas" && selectedTurmasPrint.has(t.turma))
          ).map(turma => (
            <div key={turma.turma} className="print-qr-page">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full mb-4" style={{ backgroundColor: turma.cor_hex }} />
                <h1 className="text-4xl font-bold mb-1">{turma.nome_exibicao}</h1>
                <p className="text-lg text-gray-500 mb-6">{turma.idade_minima} a {turma.idade_maxima} anos</p>
                <QRCodeSVG
                  value={`${baseUrl}/kids/checkin/${turma.turma}`}
                  size={280}
                  level="H"
                  fgColor={turma.cor_hex}
                />
                <p className="text-base text-gray-400 mt-6">Escaneie para fazer o Check-in</p>
                <p className="text-xs text-gray-300 mt-2">Ministério Kids • Igreja Gileade</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Codes por turma */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Codes das Turmas
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintSelected}
              disabled={selectedTurmasPrint.size === 0}
            >
              <Printer className="h-4 w-4 mr-1" />
              Imprimir selecionados ({selectedTurmasPrint.size})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {turmasConfig.filter(t => t.turma !== "todas").map(turma => {
              const isSelected = selectedTurmasPrint.has(turma.turma);
              return (
                <div
                  key={turma.turma}
                  className={cn(
                    "flex flex-col items-center p-4 rounded-xl border-2 bg-white relative cursor-pointer transition-all",
                    isSelected && "ring-2 ring-offset-2 shadow-md"
                  )}
                  style={{ borderColor: turma.cor_hex, ...(isSelected ? { ringColor: turma.cor_hex } : {}) }}
                  onClick={() => toggleTurmaPrint(turma.turma)}
                >
                  {/* Checkbox de seleção */}
                  <div className="absolute top-2 left-2">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleTurmaPrint(turma.turma)}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                  {/* Botão imprimir individual */}
                  <button
                    className="absolute top-2 right-2 p-1 rounded hover:bg-muted transition-colors"
                    onClick={(e) => { e.stopPropagation(); handlePrintSingle(turma.turma); }}
                    title={`Imprimir ${turma.nome_exibicao}`}
                  >
                    <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <div className="w-5 h-5 rounded-full mb-1 mt-2" style={{ backgroundColor: turma.cor_hex }} />
                  <p className="font-semibold text-sm mb-2">{turma.nome_exibicao}</p>
                  <QRCodeSVG
                    value={`${baseUrl}/kids/checkin/${turma.turma}`}
                    size={100}
                    level="H"
                    fgColor={turma.cor_hex}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">{turma.idade_minima}-{turma.idade_maxima} anos</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filtros e estatísticas */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <Label>Data</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, "PPP", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                locale={ptBR}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.checkMe}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <UserCheck className="h-3 w-3" /> Check-me
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.checkIn}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <LogIn className="h-3 w-3" /> Check-in
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.checkOut}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <LogOut className="h-3 w-3" /> Check-out
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de check-ins do dia */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Check-ins de {format(selectedDate, "dd/MM/yyyy")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!checkins?.length ? (
            <p className="text-center py-8 text-muted-foreground">Nenhum check-in registrado nesta data</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Criança</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Check-me</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkins.map(checkin => {
                    const turma = turmasConfig.find(t => t.turma === checkin.turma);
                    const status = checkin.check_out_at ? "finalizado" : checkin.check_in_at ? "na sala" : "aguardando";
                    return (
                      <TableRow key={checkin.id}>
                        <TableCell className="font-medium">{checkin.crianca_nome}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: turma?.cor_hex }} />
                            {turma?.nome_exibicao}
                          </div>
                        </TableCell>
                        <TableCell>{checkin.responsavel_nome || "—"}</TableCell>
                        <TableCell>
                          {checkin.check_me_at && (
                            <span className="text-xs flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(checkin.check_me_at), "HH:mm")}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {checkin.check_in_at ? (
                            <span className="text-xs flex items-center gap-1 text-green-600">
                              <Clock className="h-3 w-3" />
                              {format(new Date(checkin.check_in_at), "HH:mm")}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          {checkin.check_out_at ? (
                            <span className="text-xs flex items-center gap-1 text-blue-600">
                              <Clock className="h-3 w-3" />
                              {format(new Date(checkin.check_out_at), "HH:mm")}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            status === "finalizado" && "bg-blue-100 text-blue-700",
                            status === "na sala" && "bg-green-100 text-green-700",
                            status === "aguardando" && "bg-amber-100 text-amber-700",
                          )}>
                            {status === "finalizado" ? "Finalizado" : status === "na sala" ? "Na sala" : "Aguardando"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
