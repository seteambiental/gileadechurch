import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { exportGenericToExcel, exportGenericToPDF, ExportColumn } from "@/lib/export";

interface ExportButtonProps {
  data: any[];
  columns: ExportColumn[];
  filename: string;
  title: string;
  disabled?: boolean;
  sheetName?: string;
}

export const ExportButton = ({
  data,
  columns,
  filename,
  title,
  disabled = false,
  sheetName = "Dados",
}: ExportButtonProps) => {
  const handleExcelExport = () => {
    exportGenericToExcel(data, columns, filename, sheetName);
  };

  const handlePdfExport = () => {
    exportGenericToPDF(data, columns, filename, title);
  };

  return (
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
  );
};
