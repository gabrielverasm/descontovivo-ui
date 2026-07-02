/**
 * Retorna o nome da loja limpo, ou string vazia se for considerada "desconhecida".
 *
 * Valores tratados como desconhecido:
 * - null / undefined / string vazia
 * - "loja-nao-identificada" (slug técnico)
 * - "Loja não identificada" (label legível, case-insensitive)
 */
export function resolveStoreName(name: string | null | undefined): string {
  if (!name) return '';
  const trimmed = name.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  if (lower === 'loja-nao-identificada' || lower === 'loja não identificada') return '';
  return trimmed;
}
