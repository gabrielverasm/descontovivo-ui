/**
 * Normaliza o título de uma promoção para exibição consistente.
 *
 * Regras:
 * - Trim de espaços nas bordas.
 * - Reduz múltiplos espaços internos para um único espaço.
 * - Converte tudo para minúsculo (pt-BR locale).
 * - Coloca somente o primeiro caractere alfabético em maiúsculo.
 *
 * Exemplo:
 *   "CAPACETE FECHADO PRO TORK SPORT MOTO 788 AZUL TAM. 60 VIS. FUMÊ"
 *   → "Capacete fechado pro tork sport moto 788 azul tam. 60 vis. fumê"
 */
export function normalizePromotionTitle(title: string | null | undefined): string {
  if (!title) return '';

  const normalized = title
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR');

  if (!normalized) return '';

  // Encontra o primeiro caractere alfabético e coloca em maiúsculo
  const firstAlphaIndex = normalized.search(/[a-záàâãéèêíïóôõöúçñ]/i);
  if (firstAlphaIndex === -1) return normalized;

  return (
    normalized.slice(0, firstAlphaIndex) +
    normalized.charAt(firstAlphaIndex).toLocaleUpperCase('pt-BR') +
    normalized.slice(firstAlphaIndex + 1)
  );
}
