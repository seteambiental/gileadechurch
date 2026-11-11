// Regras da lista de aniversariantes de hoje.

/**
 * Retorna true quando a data (AAAA-MM-DD) faz aniversário no dia/mês informado.
 * Datas impossíveis (ano antes de 1900, ano futuro ou nascido neste ano) são
 * ignoradas — costumam ser preenchimentos falsos como 11/11/11111.
 */
export function fazAniversarioHoje(dataIso: string | null | undefined, hoje: Date): boolean {
  if (!dataIso) return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataIso.trim());
  if (!m) return false;
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  if (ano < 1900 || ano >= hoje.getFullYear()) return false;
  return mes === hoje.getMonth() + 1 && dia === hoje.getDate();
}

const soDigitos = (v?: string | null) => (v || "").replace(/\D/g, "");
const normNome = (v?: string | null) =>
  (v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");

/** Índice de pessoas (nome, WhatsApp e CPF) para saber se alguém já é membro. */
export function criarIndicePessoas() {
  const nomes = new Set<string>();
  const tels = new Set<string>();
  const cpfs = new Set<string>();
  return {
    adicionar(nome?: string | null, tel?: string | null, cpf?: string | null) {
      const n = normNome(nome);
      const t = soDigitos(tel);
      const c = soDigitos(cpf);
      if (n) nomes.add(n);
      if (t.length >= 10) tels.add(t);
      if (c.length === 11) cpfs.add(c);
    },
    contem(nome?: string | null, tel?: string | null, cpf?: string | null) {
      const n = normNome(nome);
      const t = soDigitos(tel);
      const c = soDigitos(cpf);
      return (!!n && nomes.has(n)) || (t.length >= 10 && tels.has(t)) || (c.length === 11 && cpfs.has(c));
    },
  };
}
