import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useState } from "react";
import { exportGenericToExcel, exportGenericToPDF, ExportColumn } from "@/lib/export";

interface ExportButtonProps {
  data: any[];
  columns: ExportColumn[];
  filename: string;
  title: string;
  disabled?: boolean;
  sheetName?: string;
  /** When true, opens a dialog to pick which columns/fields go into the export */
  selectableColumns?: boolean;
}

export const ExportButton = ({
  data,
  columns,
  filename,
  title,
  disabled = false,
  sheetName = "Dados",
  selectableColumns = true,
}: ExportButtonProps) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingFormat, setPendingFormat] = useState<"excel" | "pdf" | null>(null);
  const [selected, setSelected] = useState<string[]>(() => columns.map((c) => c.header));

  const activeColumns = selectableColumns
    ? columns.filter((c) => selected.includes(c.header))
    : columns;

  const runExcel = async (cols: ExportColumn[]) => {
    await exportGenericToExcel(data, cols, filename, sheetName);
  };

  const runPdf = (cols: ExportColumn[]) => {
    exportGenericToPDF(data, cols, filename, title);
  };

  const handleExcelExport = async () => {
    if (selectableColumns) {
      setPendingFormat("excel");
      setPickerOpen(true);
      return;
    }
    await runExcel(columns);
  };

  const handlePdfExport = () => {
    if (selectableColumns) {
      setPendingFormat("pdf");
      setPickerOpen(true);
      return;
    }
    runPdf(columns);
  };

  const toggleColumn = (header: string) => {
    setSelected((prev) =>
      prev.includes(header) ? prev.filter((h) => h !== header) : [...prev, header]
    );
  };

  const confirmExport = async () => {
    const cols = columns.filter((c) => selected.includes(c.header));
    if (cols.length === 0) return;
    if (pendingFormat === "excel") await runExcel(cols);
    else if (pendingFormat === "pdf") runPdf(cols);
    setPickerOpen(false);
    setPendingFormat(null);
  };

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || data.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={handleExcelExport}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePdfExport}>
          <FileText className="w-4 h-4 mr-2" />
          PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Selecionar campos do relatório</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <button
              type="button"
              className="hover:text-foreground underline"
              onClick={() => setSelected(columns.map((c) => c.header))}
            >
              Selecionar todos
            </button>
            <button
              type="button"
              className="hover:text-foreground underline"
              onClick={() => setSelected([])}
            >
              Limpar
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto py-2">
            {columns.map((col) => (
              <div key={col.header} className="flex items-center gap-2">
                <Checkbox
                  id={`col-${col.header}`}
                  checked={selected.includes(col.header)}
                  onCheckedChange={() => toggleColumn(col.header)}
                />
                <Label htmlFor={`col-${col.header}`} className="text-sm font-normal cursor-pointer">
                  {col.header}
                </Label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickerOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmExport} disabled={selected.length === 0}>
              Exportar ({selected.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
