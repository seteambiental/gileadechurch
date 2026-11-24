/**
 * Eventos antigos sem configuração exibiam todos os campos.
 * Quando a configuração existe, somente os campos listados devem aparecer.
 */
export function campoDoFormularioHabilitado(campos: unknown, campo: string): boolean {
  if (campos === null || campos === undefined) return true;
  return Array.isArray(campos) && campos.includes(campo);
}
