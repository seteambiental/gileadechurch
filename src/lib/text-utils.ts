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
    return `${title}es ${firstName} e ${spouseFirstName}`;
  }
  if (firstName) {
    return `${title} ${firstName}`;
  }
  return null;
};
