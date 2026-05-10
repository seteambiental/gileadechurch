/**
 * Remove acentos e caracteres especiais de uma string para busca
 * Exemplo: "João" -> "joao", "Érica" -> "erica"
 */
export const normalizeText = (text: string): string => {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

/**
 * Verifica se um texto contém outro, ignorando acentos e maiúsculas/minúsculas
 * Exemplo: includesNormalized("João", "joao") -> true
 */
export const includesNormalized = (text: string, search: string): boolean => {
  return normalizeText(text).includes(normalizeText(search));
};

/**
 * Distância de Levenshtein entre duas strings (já normalizadas).
 */
const levenshtein = (a: string, b: string): number => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let curr = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const next = Math.min(curr + 1, prev[j] + 1, prev[j - 1] + cost);
      prev[j - 1] = curr;
      curr = next;
    }
    prev[b.length] = curr;
  }
  return prev[b.length];
};

/**
 * Busca tolerante a erros de digitação: aceita substring exata (após
 * normalização) OU correspondência fuzzy por token, com tolerância
 * proporcional ao tamanho do termo (~1 erro a cada 4 chars).
 */
export const fuzzyMatch = (text: string, search: string): boolean => {
  const t = normalizeText(text);
  const q = normalizeText(search).trim();
  if (!q) return true;
  if (t.includes(q)) return true;
  const queryTokens = q.split(/\s+/).filter(Boolean);
  const textTokens = t.split(/\s+/).filter(Boolean);
  return queryTokens.every((qt) => {
    if (qt.length < 3) return textTokens.some((tt) => tt.startsWith(qt));
    const tolerance = Math.max(1, Math.floor(qt.length / 4));
    return textTokens.some((tt) => {
      if (tt.includes(qt)) return true;
      // janela do mesmo tamanho do token de busca
      const len = qt.length;
      if (tt.length < len) return levenshtein(tt, qt) <= tolerance;
      for (let i = 0; i + len <= tt.length; i++) {
        if (levenshtein(tt.slice(i, i + len), qt) <= tolerance) return true;
      }
      return false;
    });
  });
};

/**
 * Converte texto para Title Case (primeira letra de cada palavra em maiúsculo)
 * Exemplo: "JOÃO DA SILVA" -> "João da Silva"
 */
export const toTitleCase = (text: string): string => {
  if (!text) return text;
  
  // Palavras que devem permanecer em minúsculo (conectores em português)
  const lowercaseWords = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'por', 'com'];
  
  return text
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      // Primeira palavra sempre capitalizada
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      // Conectores permanecem em minúsculo
      if (lowercaseWords.includes(word)) {
        return word;
      }
      // Demais palavras capitalizadas
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

/**
 * Converte campo de nome para Title Case ao perder foco ou ao salvar
 */
export const formatNameField = (value: string): string => {
  return toTitleCase(value.trim());
};

/**
 * Extrai o primeiro nome de um nome completo
 * Exemplo: "Marcius Gilson da Silva" -> "Marcius"
 */
export const getFirstName = (fullName: string | null | undefined): string => {
  if (!fullName) return "";
  return fullName.trim().split(" ")[0];
};

/**
 * Pluraliza um título em português
 * Exemplo: "Líder" -> "Líderes", "Síndico" -> "Síndicos"
 */
const pluralizeTitle = (title: string): string => {
  // Títulos terminados em vogal: adiciona "s"
  if (/[aeiouáéíóúâêîôû]$/i.test(title)) {
    return `${title}s`;
  }
  // Títulos terminados em "r": adiciona "es"
  if (/r$/i.test(title)) {
    return `${title}es`;
  }
  // Default: adiciona "s"
  return `${title}s`;
};

/**
 * Formata nomes de líderes para exibição em cards
 * Exemplo: ("José Ademir Silva", "Gerusa Santos") -> "Líderes José e Gerusa"
 * Exemplo: ("José Ademir Silva", null) -> "Líder José"
 */
export const formatLeaderNames = (
  leaderName: string | null | undefined,
  spouseName: string | null | undefined,
  title: string = "Líder"
): string | null => {
  const firstName = getFirstName(leaderName);
  const spouseFirstName = getFirstName(spouseName);

  if (firstName && spouseFirstName) {
    return `${pluralizeTitle(title)} ${firstName} e ${spouseFirstName}`;
  }
  if (firstName) {
    return `${title} ${firstName}`;
  }
  return null;
};
