/** A data final é inclusiva: no dia seguinte o envio recorrente para. */
export function recorrenciaExpirou(hoje: string, dataFim?: string | null): boolean {
  return Boolean(dataFim && hoje > dataFim);
}
