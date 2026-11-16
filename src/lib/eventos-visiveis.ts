import { format, subDays } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";

/** Quantos dias um evento continua aparecendo nas listas de inscrições depois de terminar. */
export const DIAS_APOS_TERMINO = 7;

/**
 * Um evento aparece nas listas de inscrições se ainda não terminou
 * ou se terminou há no máximo DIAS_APOS_TERMINO dias.
 * Usa a data de término (ou a de início, se não houver término).
 */
export function eventoAindaVisivel(
  evento: { data_fim?: string | null; data_inicio?: string | null; data_evento?: string | null },
  hojeStr: string,
): boolean {
  const fim = (evento.data_fim || evento.data_inicio || evento.data_evento || "").slice(0, 10);
  if (!fim) return true;
  const corte = format(subDays(parseLocalDate(hojeStr), DIAS_APOS_TERMINO), "yyyy-MM-dd");
  return fim >= corte;
}
