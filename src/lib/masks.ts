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

// Parse date string (YYYY-MM-DD) without timezone issues
export const formatDateBR = (dateString: string | null): string => {
  if (!dateString) return "-";
  
  // Split the date string to avoid timezone issues
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return "-";
  
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
};
