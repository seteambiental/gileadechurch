import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import jsPDF from "jspdf";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import logoPG from "@/assets/logo-pg.png";
import logoChurchKids from "@/assets/pg-church-kids.png";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { QrCode, Printer, CalendarIcon, UserCheck, LogIn, LogOut, Clock, Loader2 } from "lucide-react";
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
  const [selectedTurmasPrint, setSelectedTurmasPrint] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
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

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const renderQRToDataURL = async (url: string, color: string, size: number): Promise<string> => {
    const tempDiv = document.createElement("div");
    tempDiv.style.cssText = "position:fixed;top:-9999px;left:-9999px;";
    document.body.appendChild(tempDiv);
    const { createRoot } = await import("react-dom/client");
    const root = createRoot(tempDiv);

    await new Promise<void>((resolve) => {
      root.render(<QRCodeSVG value={url} size={size} level="H" fgColor={color} />);
      setTimeout(resolve, 150);
    });

    const svgEl = tempDiv.querySelector("svg");
    let dataUrl = "";
    if (svgEl) {
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const svgImg = await loadImage("data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData))));
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(svgImg, 0, 0, size, size);
      dataUrl = canvas.toDataURL("image/png");
    }
    root.unmount();
    tempDiv.remove();
    return dataUrl;
  };

  const generateQRPdf = async (turmasToprint: TurmaConfig[]) => {
    if (turmasToprint.length === 0) return;
    setGenerating(true);

    try {
      // Meia folha A4 landscape: 210mm x 148.5mm
      const pageW = 210;
      const pageH = 148.5;
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [pageW, pageH] });

      // Pre-load logos
      const [headerImg, footerImg] = await Promise.all([
        loadImage(logoPG),
        loadImage(logoChurchKids),
      ]);

      const headerCanvas = document.createElement("canvas");
      headerCanvas.width = headerImg.naturalWidth;
      headerCanvas.height = headerImg.naturalHeight;
      headerCanvas.getContext("2d")!.drawImage(headerImg, 0, 0);
      const headerDataUrl = headerCanvas.toDataURL("image/png");
      const headerAspect = headerImg.naturalWidth / headerImg.naturalHeight;

      const footerCanvas = document.createElement("canvas");
      footerCanvas.width = footerImg.naturalWidth;
      footerCanvas.height = footerImg.naturalHeight;
      footerCanvas.getContext("2d")!.drawImage(footerImg, 0, 0);
      const footerDataUrl = footerCanvas.toDataURL("image/png");
      const footerAspect = footerImg.naturalWidth / footerImg.naturalHeight;

      for (let i = 0; i < turmasToprint.length; i++) {
        const turma = turmasToprint[i];
        if (i > 0) pdf.addPage([pageW, pageH], "landscape");

        // --- Layout calculation (all centered) ---
        // Header logo: ~45mm wide
        const headerW = 45;
        const headerH = headerW / headerAspect;

        // QR Code: ~55mm
        const qrSize = 55;

        // Footer logo: ~25mm wide
        const footerW = 25;
        const footerH = footerW / footerAspect;

        // Text heights
        const nameTextH = 8;
        const ageTextH = 5;
        const scanTextH = 4;
        const spacing = 4;

        // Total content height
        const totalH = headerH + spacing + nameTextH + ageTextH + spacing + qrSize + spacing + scanTextH + spacing + footerH;
        const startY = (pageH - totalH) / 2;
        let y = startY;

        // 1. Header logo (centered)
        pdf.addImage(headerDataUrl, "PNG", (pageW - headerW) / 2, y, headerW, headerH);
        y += headerH + spacing;

        // 2. Turma name
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(28);
        pdf.setTextColor(turma.cor_hex);
        pdf.text(turma.nome_exibicao, pageW / 2, y + nameTextH * 0.7, { align: "center" });
        y += nameTextH;

        // 3. Age range
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(14);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`${turma.idade_minima} a ${turma.idade_maxima} anos`, pageW / 2, y + ageTextH * 0.7, { align: "center" });
        y += ageTextH + spacing;

        // 4. QR Code (centered, largest element)
        const qrDataUrl = await renderQRToDataURL(
          `${baseUrl}/kids/checkin/${turma.turma}`,
          turma.cor_hex,
          400
        );
        if (qrDataUrl) {
          pdf.addImage(qrDataUrl, "PNG", (pageW - qrSize) / 2, y, qrSize, qrSize);
        }
        y += qrSize + spacing;

        // 5. "Escaneie para fazer o Check-in"
        pdf.setFontSize(10);
        pdf.setTextColor(170, 170, 170);
        pdf.text("Escaneie para fazer o Check-in", pageW / 2, y + scanTextH * 0.7, { align: "center" });
        y += scanTextH + spacing;

        // 6. Footer logo (centered, smallest)
        pdf.addImage(footerDataUrl, "PNG", (pageW - footerW) / 2, y, footerW, footerH);
      }

      pdf.save("qrcode-kids-checkin.pdf");
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handlePrintSelected = () => {
    const turmas = turmasConfig.filter(t => t.turma !== "todas" && selectedTurmasPrint.has(t.turma));
    generateQRPdf(turmas);
  };

  const handlePrintSingle = (turmaKey: string) => {
    const turma = turmasConfig.find(t => t.turma === turmaKey);
    if (turma) generateQRPdf([turma]);
  };

  const generateCheckMePdf = async () => {
    setGenerating(true);
    try {
      const pageW = 210;
      const pageH = 148.5;
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [pageW, pageH] });

      const [headerImg, footerImg] = await Promise.all([
        loadImage(logoPG),
        loadImage(logoChurchKids),
      ]);

      const headerCanvas = document.createElement("canvas");
      headerCanvas.width = headerImg.naturalWidth;
      headerCanvas.height = headerImg.naturalHeight;
      headerCanvas.getContext("2d")!.drawImage(headerImg, 0, 0);
      const headerDataUrl = headerCanvas.toDataURL("image/png");
      const headerAspect = headerImg.naturalWidth / headerImg.naturalHeight;

      const footerCanvas = document.createElement("canvas");
      footerCanvas.width = footerImg.naturalWidth;
      footerCanvas.height = footerImg.naturalHeight;
      footerCanvas.getContext("2d")!.drawImage(footerImg, 0, 0);
      const footerDataUrl = footerCanvas.toDataURL("image/png");
      const footerAspect = footerImg.naturalWidth / footerImg.naturalHeight;

      const headerW = 45;
      const headerH = headerW / headerAspect;
      const qrSize = 55;
      const footerW = 25;
      const footerH = footerW / footerAspect;
      const nameTextH = 8;
      const subTextH = 5;
      const scanTextH = 4;
      const spacing = 4;

      const totalH = headerH + spacing + nameTextH + subTextH + spacing + qrSize + spacing + scanTextH + spacing + footerH;
      const startY = (pageH - totalH) / 2;
      let y = startY;

      pdf.addImage(headerDataUrl, "PNG", (pageW - headerW) / 2, y, headerW, headerH);
      y += headerH + spacing;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(28);
      pdf.setTextColor("#7c3aed");
      pdf.text("Check-me Kids", pageW / 2, y + nameTextH * 0.7, { align: "center" });
      y += nameTextH;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(14);
      pdf.setTextColor(150, 150, 150);
      pdf.text("Escaneie para registrar a presença", pageW / 2, y + subTextH * 0.7, { align: "center" });
      y += subTextH + spacing;

      const qrDataUrl = await renderQRToDataURL(`${baseUrl}/kids/checkme`, "#7c3aed", 400);
      if (qrDataUrl) {
        pdf.addImage(qrDataUrl, "PNG", (pageW - qrSize) / 2, y, qrSize, qrSize);
      }
      y += qrSize + spacing;

      pdf.setFontSize(10);
      pdf.setTextColor(170, 170, 170);
      pdf.text("A turma será identificada automaticamente", pageW / 2, y + scanTextH * 0.7, { align: "center" });
      y += scanTextH + spacing;

      pdf.addImage(footerDataUrl, "PNG", (pageW - footerW) / 2, y, footerW, footerH);

      pdf.save("qrcode-checkme-kids.pdf");
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
    } finally {
      setGenerating(false);
    }
  };


  const stats = {
    checkMe: checkins?.filter(c => c.check_me_at && !c.check_in_at).length || 0,
    checkIn: checkins?.filter(c => c.check_in_at && !c.check_out_at).length || 0,
    checkOut: checkins?.filter(c => c.check_out_at).length || 0,
    total: checkins?.length || 0,
  };

  return (
    <div className="space-y-4">
      {/* QR Code Geral - CHECK ME */}
      <Card className="border-2 border-primary">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              QR Code Geral — Check-me
            </CardTitle>
            <Button
              variant="default"
              size="sm"
              onClick={() => generateCheckMePdf()}
              disabled={generating}
            >
              {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Printer className="h-4 w-4 mr-1" />}
              Imprimir QR Code Check-me
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            QR Code único para o responsável escanear e registrar a presença da criança. A turma é identificada automaticamente.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <div className="flex flex-col items-center p-6 rounded-xl border-2 border-primary bg-white">
              <img src={logoPG} alt="Logo PG" className="h-10 object-contain mb-2" />
              <p className="font-bold text-base mb-3">Check-me Kids</p>
              <QRCodeSVG
                value={`${baseUrl}/kids/checkme`}
                size={140}
                level="H"
                fgColor="#7c3aed"
              />
              <p className="text-xs text-muted-foreground mt-2">Escaneie para fazer o Check-me</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR Codes por turma */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Codes por Turma
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintSelected}
              disabled={selectedTurmasPrint.size === 0 || generating}
            >
              {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Printer className="h-4 w-4 mr-1" />}
              {generating ? "Gerando PDF..." : `Imprimir selecionados (${selectedTurmasPrint.size})`}
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
