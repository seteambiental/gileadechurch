import { format } from "date-fns";

interface Feriado {
  data: string; // yyyy-MM-dd
  nome: string;
}

/**
 * Calcula a data da Páscoa usando o algoritmo de Meeus/Jones/Butcher
 */
function calcularPascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

/**
 * Retorna a lista de feriados nacionais brasileiros para um determinado ano.
 * Inclui feriados fixos e móveis (baseados na Páscoa).
 */
export function getFeriadosBrasileiros(ano: number): Feriado[] {
  const pascoa = calcularPascoa(ano);

  // Helper para adicionar/subtrair dias da Páscoa
  const offsetPascoa = (dias: number): Date => {
    const d = new Date(pascoa);
    d.setDate(d.getDate() + dias);
    return d;
  };

  const formatDate = (d: Date) => format(d, "yyyy-MM-dd");

  const feriadosMoveis: Feriado[] = [
    { data: formatDate(offsetPascoa(-48)), nome: "Feriado de Carnaval" },
    { data: formatDate(offsetPascoa(-47)), nome: "Feriado de Carnaval" },
    { data: formatDate(offsetPascoa(-2)), nome: "Sexta-feira Santa" },
    { data: formatDate(pascoa), nome: "Páscoa" },
    { data: formatDate(offsetPascoa(60)), nome: "Corpus Christi" },
  ];

  const feriadosFixos: Feriado[] = [
    { data: `${ano}-01-01`, nome: "Confraternização Universal" },
    { data: `${ano}-04-21`, nome: "Tiradentes" },
    { data: `${ano}-05-01`, nome: "Dia do Trabalho" },
    { data: `${ano}-09-07`, nome: "Independência do Brasil" },
    { data: `${ano}-10-12`, nome: "Nossa Sra. Aparecida" },
    { data: `${ano}-11-02`, nome: "Finados" },
    { data: `${ano}-11-15`, nome: "Proclamação da República" },
    { data: `${ano}-11-20`, nome: "Consciência Negra" },
    { data: `${ano}-12-25`, nome: "Natal" },
  ];

  return [...feriadosFixos, ...feriadosMoveis].sort((a, b) => a.data.localeCompare(b.data));
}

/**
 * Retorna o feriado para uma data específica, ou null se não for feriado.
 */
export function getFeriadoParaData(dateStr: string): Feriado | null {
  const ano = parseInt(dateStr.substring(0, 4), 10);
  const feriados = getFeriadosBrasileiros(ano);
  return feriados.find((f) => f.data === dateStr) || null;
}
