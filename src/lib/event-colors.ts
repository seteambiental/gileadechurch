/**
 * Mapeamento automático de cores por tipo de compromisso/evento.
 * Usado para definir cores consistentes sem intervenção manual.
 */

export const CORES_POR_TIPO: Record<string, string> = {
  // Compromissos
  apresentacao_criancas: "#db2777", // Rosa
  aulas: "#0891b2",               // Ciano
  casamento: "#7b1e3a",           // Bordô
  churrasco: "#b45309",           // Âmbar
  conexao_lider: "#6366f1",       // Índigo
  confraternizacao: "#f97316",    // Tangerina
  culto: "#2563eb",               // Azul
  ceia: "#7c3aed",                // Roxo
  cursos: "#0d9488",              // Teal
  quarta_proposito: "#16a34a",    // Verde
  quarta_proposito_prestacao: "#2d4a3e", // Verde Floresta

  // Eventos
  batismo: "#0891b2",             // Ciano
  casa_refugio: "#16a34a",        // Verde
  conferencia: "#4a2d6b",         // Roxo Real
  gileade_fest: "#ea580c",        // Laranja
  impacto: "#dc2626",             // Vermelho
  evento: "#3d3d3d",              // Cinza Carvão
  retiro: "#8b5cf6",              // Violeta
  retiro_kids: "#84cc16",         // Lima
  acao_evangelistica: "#db2777",   // Rosa
  outros: "#6b7280",               // Cinza
};

export function getCorPorTipo(tipo: string): string {
  return CORES_POR_TIPO[tipo] || "#dc2626";
}
