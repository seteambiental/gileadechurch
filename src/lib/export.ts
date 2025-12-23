import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatPhone, formatDateBR } from "./masks";

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

export const exportToExcel = (members: Member[], filename: string = "membros") => {
  const data = members.map((member) => ({
    Nome: member.full_name,
    WhatsApp: member.whatsapp ? formatPhone(member.whatsapp) : "-",
    Email: member.email || "-",
    Cidade: member.city || "-",
    Estado: member.state || "-",
    "Membro Desde": formatDateBR(member.member_since),
    Funções: formatMemberFunctions(member),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Membros");

  // Auto-size columns
  const maxWidth = 50;
  const colWidths = Object.keys(data[0] || {}).map((key) => ({
    wch: Math.min(
      maxWidth,
      Math.max(
        key.length,
        ...data.map((row) => String(row[key as keyof typeof row] || "").length)
      )
    ),
  }));
  worksheet["!cols"] = colWidths;

  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportToPDF = (members: Member[], filename: string = "membros") => {
  const doc = new jsPDF();

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
    member.whatsapp ? formatPhone(member.whatsapp) : "-",
    member.city && member.state ? `${member.city}/${member.state}` : "-",
    formatDateBR(member.member_since),
    formatMemberFunctions(member),
  ]);

  autoTable(doc, {
    head: [["Nome", "WhatsApp", "Cidade/UF", "Membro Desde", "Funções"]],
    body: tableData,
    startY: 42,
    styles: {
      fontSize: 8,
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
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 35 },
      2: { cellWidth: 30 },
      3: { cellWidth: 25 },
      4: { cellWidth: "auto" },
    },
  });

  doc.save(`${filename}.pdf`);
};
