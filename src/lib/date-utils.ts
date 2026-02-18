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
