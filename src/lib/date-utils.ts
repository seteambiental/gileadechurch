/**
 * Timezone-safe date parsing utilities.
 * 
 * IMPORTANT: Never use `parseISO()` or `new Date("YYYY-MM-DD")` for date-only strings.
 * These parse as UTC midnight, which shifts dates back one day in negative UTC offset
 * timezones like Brazil (UTC-3).
 * 
 * Use `parseLocalDate()` instead for all date-only strings (YYYY-MM-DD).
 */

/**
 * Parse a date-only string (YYYY-MM-DD) as a local date.
 * Unlike parseISO or new Date("YYYY-MM-DD"), this creates the date in the local timezone.
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get today's date as a YYYY-MM-DD string in local timezone.
 * Avoids the UTC shift that occurs with `new Date().toISOString().split("T")[0]`.
 */
export function todayDateStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get the first day of the current month as a YYYY-MM-DD string in local timezone.
 */
export function firstDayOfMonthStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

const MESES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/**
 * Format an event period like "Impacto Masculino" inputs into a readable
 * Portuguese range, e.g. "12-14 Junho 2026" or "30 Maio - 2 Junho 2026".
 */
export function formatEventoPeriodo(dataInicio?: string | null, dataFim?: string | null): string {
  if (!dataInicio) return "";
  const ini = parseLocalDate(dataInicio);
  if (!dataFim || dataFim === dataInicio) {
    return `${ini.getDate()} ${MESES_PT[ini.getMonth()]} ${ini.getFullYear()}`;
  }
  const fim = parseLocalDate(dataFim);
  if (ini.getMonth() === fim.getMonth() && ini.getFullYear() === fim.getFullYear()) {
    return `${ini.getDate()}-${fim.getDate()} ${MESES_PT[ini.getMonth()]} ${ini.getFullYear()}`;
  }
  if (ini.getFullYear() === fim.getFullYear()) {
    return `${ini.getDate()} ${MESES_PT[ini.getMonth()]} - ${fim.getDate()} ${MESES_PT[fim.getMonth()]} ${ini.getFullYear()}`;
  }
  return `${ini.getDate()} ${MESES_PT[ini.getMonth()]} ${ini.getFullYear()} - ${fim.getDate()} ${MESES_PT[fim.getMonth()]} ${fim.getFullYear()}`;
}
