/**
 * Utility functions for age calculations
 */

/**
 * Calculate age from birth date string (YYYY-MM-DD format)
 * @param birthDate - Date string in YYYY-MM-DD format
 * @returns Object with years and total days
 */
export function calculateAge(birthDate: string | null | undefined): { years: number; totalDays: number } {
  if (!birthDate) return { years: 0, totalDays: 0 };

  const [year, month, day] = birthDate.split("-").map(Number);
  if (!year || !month || !day) return { years: 0, totalDays: 0 };

  const today = new Date();
  const birth = new Date(year, month - 1, day);

  // Calculate total days difference
  const diffTime = today.getTime() - birth.getTime();
  const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Calculate years
  let years = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    years--;
  }

  return { years, totalDays };
}

/**
 * Check if person is under 12 years old (requires a responsible adult)
 * Under 12 means: 11 years, 11 months and any days - basically anyone who hasn't turned 12 yet
 * @param birthDate - Date string in YYYY-MM-DD format
 * @returns true if person needs a responsible adult
 */
export function needsResponsible(birthDate: string | null | undefined): boolean {
  if (!birthDate) return false;
  
  const { years } = calculateAge(birthDate);
  return years < 12;
}

/**
 * Get formatted age string
 * @param birthDate - Date string in YYYY-MM-DD format
 * @returns Formatted age string (e.g., "11 anos")
 */
export function getAgeString(birthDate: string | null | undefined): string {
  if (!birthDate) return "";
  
  const { years } = calculateAge(birthDate);
  return `${years} ${years === 1 ? "ano" : "anos"}`;
}
