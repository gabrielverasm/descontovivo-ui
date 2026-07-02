/**
 * Helpers de seller/entrega para exibição de badges de confiança.
 */

const INVALID_SELLER_VALUES = [
  '',
  'loja-nao-identificada',
  'loja não identificada',
  'loja nao identificada',
  'não identificada',
  'nao identificada',
  'não identificado',
  'nao identificado',
  'desconhecida',
  'desconhecido',
  'unknown',
  'n/a',
  '-',
];

/**
 * Normaliza texto para comparação: trim, lowercase, remove acentos, colapsa espaços.
 */
function normalizeForComparison(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Retorna true se o valor de seller/delivery é útil para exibição.
 * Filtra null, undefined, string vazia e valores técnicos inúteis.
 */
export function isUsefulSellerValue(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  const normalized = normalizeForComparison(trimmed);
  return !INVALID_SELLER_VALUES.includes(normalized);
}

/**
 * Verifica se o nome indica Amazon (case-insensitive, tolerante a variações).
 *
 * Aceita: "Amazon", "Amazon.com.br", "Amazon Brasil",
 *         "Vendido pela Amazon", "Amazon Serviços de Varejo do Brasil"
 * Rejeita: "Amazonas", "Loja Amazonas"
 *
 * Usa word-boundary: procura "amazon" como palavra completa,
 * aceitando ponto/espaço/pontuação ao redor mas não letras.
 */
export function isAmazonSeller(name: string | null | undefined): boolean {
  if (!name) return false;
  const trimmed = name.trim();
  if (!trimmed) return false;
  // \bamazon\b — word boundary garante que "amazonas" não bate
  return /\bamazon\b/i.test(trimmed);
}

/**
 * Verifica se a promoção é vendida E entregue pela Amazon.
 */
export function isSoldAndDeliveredByAmazon(
  soldBy: string | null | undefined,
  deliveredBy: string | null | undefined,
): boolean {
  return isAmazonSeller(soldBy) && isAmazonSeller(deliveredBy);
}

/**
 * Retorna o label de confiança compacto para o badge.
 * Não inventa "Prime" — usa apenas "Vendido e entregue pela Amazon".
 */
export function getAmazonTrustLabel(): string {
  return 'Vendido e entregue pela Amazon';
}
