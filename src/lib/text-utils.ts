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
