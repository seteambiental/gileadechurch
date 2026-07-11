// Input masks for phone and CEP

export const formatPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  
  if (numbers.length <= 2) {
    return `(${numbers}`;
  }
  if (numbers.length <= 7) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  }
  if (numbers.length <= 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  }
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

export const formatCep = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  
  if (numbers.length <= 5) {
    return numbers;
  }
  return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
};

export const unformatPhone = (value: string): string => {
  return value.replace(/\D/g, "");
};

export const unformatCep = (value: string): string => {
  return value.replace(/\D/g, "");
};

export const formatCPF = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  
  if (numbers.length <= 3) {
    return numbers;
  }
  if (numbers.length <= 6) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  }
  if (numbers.length <= 9) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  }
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
};

// Mask CPF showing only first 3 digits: 763.XXX.XXX-XX
export const maskCPF = (value: string | null): string => {
  if (!value) return "";
  const numbers = value.replace(/\D/g, "");
  if (numbers.length < 3) return numbers;
  return `${numbers.slice(0, 3)}.XXX.XXX-XX`;
};

export const formatRG = (value: string): string => {
  // RG format can vary by state, keeping it simple with dots
  const cleaned = value.replace(/[^0-9Xx]/g, "");
  return cleaned.toUpperCase();
};

export const formatCNPJ = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  
  if (numbers.length <= 2) {
    return numbers;
  }
  if (numbers.length <= 5) {
    return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
  }
  if (numbers.length <= 8) {
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
  }
  if (numbers.length <= 12) {
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
  }
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
};

// Format number as Brazilian currency: R$ 1.234,00
export const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "R$ 0,00";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

// Máscara de data digitável dd/mm/aaaa
export const formatDateInput = (value: string): string => {
  const d = value.replace(/\D/g, "").slice(0, 8);
  let out = d.slice(0, 2);
  if (d.length >= 3) out += "/" + d.slice(2, 4);
  if (d.length >= 5) out += "/" + d.slice(4, 8);
  return out;
};

// Converte dd/mm/aaaa -> aaaa-mm-dd (ISO). Retorna null se incompleto/inválido.
export const dateInputToISO = (value: string): string | null => {
  const d = value.replace(/\D/g, "");
  if (d.length !== 8) return null;
  const dd = d.slice(0, 2);
  const mm = d.slice(2, 4);
  const yyyy = d.slice(4, 8);
  const dayN = Number(dd);
  const monN = Number(mm);
  if (dayN < 1 || dayN > 31 || monN < 1 || monN > 12) return null;
  return `${yyyy}-${mm}-${dd}`;
};

// Converte aaaa-mm-dd (ISO) -> dd/mm/aaaa para exibição em input.
export const isoToDateInput = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
};

// Parse date string (YYYY-MM-DD) without timezone issues
export const formatDateBR = (dateString: string | null): string => {
  if (!dateString) return "-";
  
  // Split the date string to avoid timezone issues
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return "-";
  
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
};
