import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatPhone, formatDateBR, formatCPF } from "./masks";
import { calculateAge } from "./age-utils";

interface MemberFunction {
  id: string;
  function_type: string;
  ministry_id: string | null;
  casa_refugio_id: string | null;
  condominio_id: string | null;
  ministries?: { name: string } | null;
  casas_refugio?: { name: string } | null;
  condominios?: { name: string } | null;
}

interface Member {
  id: string;
  full_name: string;
  birth_date: string | null;
  email: string | null;
  whatsapp: string | null;
  photo_url: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
  member_since: string | null;
  member_functions?: MemberFunction[];
  genero: string | null;
  estado_civil: string | null;
  cpf: string | null;
  rg: string | null;
  address: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  cep: string | null;
  casa_refugio_id: string | null;
  kids_numero: number | null;
}

interface FaceIndex {
  member_id: string | null;
}

interface CasaRefugio {
  id: string;
  name: string;
}

const functionTypeLabels: Record<string, string> = {
  lider_casa_refugio: "Líder de Casa Refúgio",
  lider_ministerio: "Líder de Ministério",
  pastor_geral: "Pastor Geral",
  pastor_auxiliar: "Pastor Auxiliar",
  supervisor_condominio: "Supervisor de Condomínio",
  sindico_condominio: "Síndico de Condomínio",
  integrante_ministerio: "Integrante de Ministério",
};

const getFunctionDisplay = (fn: MemberFunction) => {
  const label = functionTypeLabels[fn.function_type] || fn.function_type;
  let subdivision = "";
  
  if (fn.ministries?.name) {
    subdivision = fn.ministries.name;
  } else if (fn.casas_refugio?.name) {
    subdivision = fn.casas_refugio.name;
  } else if (fn.condominios?.name) {
    subdivision = fn.condominios.name;
  }

  return subdivision ? `${label} (${subdivision})` : label;
};

const formatMemberFunctions = (member: Member): string => {
  if (!member.member_functions || member.member_functions.length === 0) {
    return "-";
  }
  return member.member_functions.map(getFunctionDisplay).join("; ");
};

const formatGenero = (genero: string | null): string => {
  if (!genero) return "-";
  const map: Record<string, string> = { M: "Masculino", F: "Feminino", masculino: "Masculino", feminino: "Feminino" };
  return map[genero] || genero;
};

const formatEstadoCivil = (ec: string | null): string => {
  if (!ec) return "-";
  const map: Record<string, string> = {
    solteiro: "Solteiro(a)",
    casado: "Casado(a)",
    divorciado: "Divorciado(a)",
    viuvo: "Viúvo(a)",
    separado: "Separado(a)",
    uniao_estavel: "União Estável",
  };
  return map[ec] || ec;
};

const getAge = (birthDate: string | null): string => {
  if (!birthDate) return "-";
  const { years } = calculateAge(birthDate);
  return `${years}`;
};

const getCasaRefugioName = (casaRefugioId: string | null, casasRefugio: CasaRefugio[]): string => {
  if (!casaRefugioId) return "-";
  const casa = casasRefugio.find(c => c.id === casaRefugioId);
  return casa?.name || "-";
};

const formatAddress = (member: Member): string => {
  const parts = [
    member.address,
    member.number ? `nº ${member.number}` : null,
    member.complement,
    member.neighborhood,
    member.city && member.state ? `${member.city}/${member.state}` : member.city || member.state,
    member.cep,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "-";
};

// Helper to save ExcelJS workbook as file download
async function saveWorkbook(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const exportToExcel = async (members: Member[], filename: string = "membros", faceIndexes: FaceIndex[] = [], casasRefugio: CasaRefugio[] = []) => {
  const indexedMemberIds = new Set(faceIndexes.map(fi => fi.member_id));
  
  const data = members.map((member) => ({
    Nome: member.full_name,
    Gênero: formatGenero(member.genero),
    "Data Nascimento": formatDateBR(member.birth_date),
    Idade: getAge(member.birth_date),
    "Estado Civil": formatEstadoCivil(member.estado_civil),
    CPF: member.cpf || "-",
    RG: member.rg || "-",
    WhatsApp: member.whatsapp ? formatPhone(member.whatsapp) : "-",
    Email: member.email || "-",
    Endereço: member.address || "-",
    Número: member.number || "-",
    Complemento: member.complement || "-",
    Bairro: member.neighborhood || "-",
    Cidade: member.city || "-",
    Estado: member.state || "-",
    CEP: member.cep || "-",
    "Casa Refúgio": getCasaRefugioName(member.casa_refugio_id, casasRefugio),
    "Membro Desde": formatDateBR(member.member_since),
    "Nº Kids": member.kids_numero != null ? String(member.kids_numero) : "-",
    Foto: member.photo_url ? "Sim" : "Não",
    "Reconhecimento Facial": indexedMemberIds.has(member.id) ? "Indexado" : "Não indexado",
    Funções: formatMemberFunctions(member),
  }));

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Membros");

  if (data.length > 0) {
    const headers = Object.keys(data[0]);
    worksheet.addRow(headers);
    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };

    data.forEach((row) => {
      worksheet.addRow(headers.map((h) => row[h as keyof typeof row]));
    });

    // Auto-size columns
    headers.forEach((header, i) => {
      const col = worksheet.getColumn(i + 1);
      let maxLen = header.length;
      data.forEach((row) => {
        const val = String(row[header as keyof typeof row] || "");
        if (val.length > maxLen) maxLen = val.length;
      });
      col.width = Math.min(50, maxLen + 2);
    });
  }

  await saveWorkbook(workbook, `${filename}.xlsx`);
};

export const exportToPDF = (members: Member[], filename: string = "membros", faceIndexes: FaceIndex[] = [], casasRefugio: CasaRefugio[] = []) => {
  const doc = new jsPDF({ orientation: "landscape" });
  const indexedMemberIds = new Set(faceIndexes.map(fi => fi.member_id));

  // Title
  doc.setFontSize(18);
  doc.text("Lista de Membros - Gileade Church", 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, 14, 30);
  doc.text(`Total: ${members.length} membro${members.length !== 1 ? "s" : ""}`, 14, 36);

  // Table data
  const tableData = members.map((member) => [
    member.full_name,
    formatGenero(member.genero),
    getAge(member.birth_date),
    formatEstadoCivil(member.estado_civil),
    member.whatsapp ? formatPhone(member.whatsapp) : "-",
    member.email || "-",
    getCasaRefugioName(member.casa_refugio_id, casasRefugio),
    formatAddress(member),
    formatDateBR(member.member_since),
    formatMemberFunctions(member),
  ]);

  autoTable(doc, {
    head: [["Nome", "Gênero", "Idade", "Estado Civil", "WhatsApp", "Email", "Casa Refúgio", "Endereço", "Membro Desde", "Funções"]],
    body: tableData,
    startY: 42,
    styles: {
      fontSize: 12,
      cellPadding: 1.5,
    },
    headStyles: {
      fillColor: [220, 53, 69],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 249, 250],
    },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 16 },
      2: { cellWidth: 10 },
      3: { cellWidth: 18 },
      4: { cellWidth: 24 },
      5: { cellWidth: 30 },
      6: { cellWidth: 24 },
      7: { cellWidth: "auto" },
      8: { cellWidth: 18 },
      9: { cellWidth: "auto" },
    },
  });

  doc.save(`${filename}.pdf`);
};

// ========== GENERIC EXPORT UTILITIES ==========

export interface ExportColumn {
  header: string;
  accessor: string | ((row: any) => any);
  format?: (value: any) => string;
  /** Mark column type for proper Excel formatting and totals.
   * 'currency' = numeric with R$ formatting, included in totals
   * 'number' = numeric, included in totals
   * undefined = text, never summed */
  type?: 'currency' | 'number';
}

// Extract raw numeric value from a column for a given row
const getRawNumericValue = (row: any, col: ExportColumn): number => {
  const value = typeof col.accessor === "function" ? col.accessor(row) : row[col.accessor as string];
  if (value == null || value === "" || value === "—" || value === "-") return 0;
  if (typeof value === "number") return value;
  // Try parsing formatted currency string
  const cleaned = String(value).replace(/R\$\s*/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

const formatAsCurrency = (val: number): string => {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const buildTotalsRow = (data: any[], columns: ExportColumn[]): (string | number | null)[] => {
  return columns.map((col) => {
    if (!col.type) return null; // Only sum typed columns
    const sum = data.reduce((s, row) => s + getRawNumericValue(row, col), 0);
    return col.type === 'currency' ? sum : sum;
  });
};

export interface ExportRowStyle {
  fillColor?: string; // hex color e.g. "#D9D9D9"
  fontColor?: string;
  italic?: boolean;
}

export const exportGenericToExcel = async (
  data: any[],
  columns: ExportColumn[],
  filename: string,
  sheetName: string = "Dados",
  rowStyleFn?: (row: any, index: number) => ExportRowStyle | null
) => {
  if (data.length === 0) return;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  const headers = columns.map((col) => col.header);
  worksheet.addRow(headers);
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };

  data.forEach((row, rowIndex) => {
    const rowData = columns.map((col) => {
      if (col.type) {
        // Write raw number for typed columns
        return getRawNumericValue(row, col);
      }
      const value = typeof col.accessor === "function" 
        ? col.accessor(row) 
        : row[col.accessor as string];
      return col.format ? col.format(value) : (value ?? "-");
    });
    const excelRow = worksheet.addRow(rowData);

    // Apply number formatting to typed columns
    columns.forEach((col, colIdx) => {
      if (col.type) {
        const cell = excelRow.getCell(colIdx + 1);
        if (col.type === 'currency') {
          cell.numFmt = 'R$ #,##0.00';
        } else if (col.type === 'number') {
          cell.numFmt = '#,##0.##';
        }
      }
    });

    // Apply per-row styling
    if (rowStyleFn) {
      const style = rowStyleFn(row, rowIndex);
      if (style) {
        excelRow.eachCell((cell) => {
          if (style.fillColor) {
            const hex = style.fillColor.replace("#", "");
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: `FF${hex}` },
            };
          }
          if (style.fontColor) {
            const hex = style.fontColor.replace("#", "");
            cell.font = { ...cell.font, color: { argb: `FF${hex}` } };
          }
          if (style.italic) {
            cell.font = { ...cell.font, italic: true };
          }
        });
      }
    }
  });

  // Add TOTAL row
  const totals = buildTotalsRow(data, columns);
  const hasTotals = totals.some((v) => v !== null);
  if (hasTotals) {
    const totalRowData = totals.map((v, i) => {
      if (i === 0 && v === null) return "TOTAL";
      return v ?? "";
    });
    const totalRow = worksheet.addRow(totalRowData);
    totalRow.font = { bold: true };

    // Apply number formatting to total row
    columns.forEach((col, colIdx) => {
      if (col.type) {
        const cell = totalRow.getCell(colIdx + 1);
        if (col.type === 'currency') {
          cell.numFmt = 'R$ #,##0.00';
        } else if (col.type === 'number') {
          cell.numFmt = '#,##0.##';
        }
      }
    });
  }

  // Auto-size columns
  headers.forEach((header, i) => {
    const col = worksheet.getColumn(i + 1);
    let maxLen = header.length;
    data.forEach((row) => {
      const value = typeof columns[i].accessor === "function" 
        ? (columns[i].accessor as Function)(row) 
        : row[columns[i].accessor as string];
      const formatted = columns[i].format ? columns[i].format!(value) : String(value ?? "-");
      if (formatted.length > maxLen) maxLen = formatted.length;
    });
    col.width = Math.min(50, Math.max(maxLen + 2, 14));
  });

  await saveWorkbook(workbook, `${filename}.xlsx`);
};

export const exportGenericToPDF = (
  data: any[],
  columns: ExportColumn[],
  filename: string,
  title: string,
  rowStyleFn?: (row: any, index: number) => ExportRowStyle | null
) => {
  if (data.length === 0) return;

  const doc = new jsPDF({ orientation: "landscape" });

  // Title
  doc.setFontSize(16);
  doc.text(title, 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, 14, 30);
  doc.text(`Total: ${data.length} registro${data.length !== 1 ? "s" : ""}`, 14, 36);

  const tableHeaders = columns.map((col) => col.header);
  const tableData = data.map((row) =>
    columns.map((col) => {
      const value = typeof col.accessor === "function" 
        ? col.accessor(row) 
        : row[col.accessor];
      return col.format ? col.format(value) : (value ?? "-");
    })
  );

  // Build row style map for PDF
  const rowStyles = rowStyleFn 
    ? data.map((row, i) => rowStyleFn(row, i)) 
    : [];

  // Add TOTAL row
  const totals = buildTotalsRow(data, columns);
  const hasTotals = totals.some((v) => v !== null);
  if (hasTotals) {
    const totalRowData = totals.map((v, i) => {
      if (i === 0 && v === null) return "TOTAL";
      if (v === null) return "";
      const col = columns[i];
      if (col.type === 'currency') return formatAsCurrency(v as number);
      if (col.type === 'number') return String(v);
      return v || "";
    });
    tableData.push(totalRowData);
  }

  autoTable(doc, {
    head: [tableHeaders],
    body: tableData,
    startY: 42,
    styles: {
      fontSize: 12,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [220, 53, 69],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 249, 250],
    },
    didParseCell: (hookData: any) => {
      // Bold the TOTAL row (last row if totals exist)
      if (hasTotals && hookData.section === "body" && hookData.row.index === tableData.length - 1) {
        hookData.cell.styles.fontStyle = "bold";
        hookData.cell.styles.fillColor = [230, 230, 230];
      }
      // Apply per-row styling
      if (hookData.section === "body" && rowStyles[hookData.row.index]) {
        const style = rowStyles[hookData.row.index];
        if (style?.fillColor) {
          const hex = style.fillColor.replace("#", "");
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          hookData.cell.styles.fillColor = [r, g, b];
        }
        if (style?.fontColor) {
          const hex = style.fontColor.replace("#", "");
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          hookData.cell.styles.textColor = [r, g, b];
        }
        if (style?.italic) {
          hookData.cell.styles.fontStyle = "italic";
        }
      }
    },
  });

  doc.save(`${filename}.pdf`);
};
