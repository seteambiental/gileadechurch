import { format, isValid, parse } from "date-fns";

export function maskManualDate(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function manualDateToISO(value: string): string {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return "";
  const date = parse(value, "dd/MM/yyyy", new Date());
  return isValid(date) && format(date, "dd/MM/yyyy") === value
    ? format(date, "yyyy-MM-dd") : "";
}

export function isoDateToManual(value: string): string {
  if (!value) return "";
  const date = parse(value, "yyyy-MM-dd", new Date());
  return isValid(date) ? format(date, "dd/MM/yyyy") : "";
}