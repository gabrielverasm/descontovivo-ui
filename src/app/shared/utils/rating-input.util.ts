/**
 * Utilitário para normalização de notas (rating) de produto/vendedor.
 * 
 * Regras de normalização:
 * - vazio/null/undefined => null
 * - "4,8" => 4.8
 * - "4.8" => 4.8
 * - "48" => 4.8
 * - "49" => 4.9
 * - "50" => 5.0
 * - "5" => 5
 * - "0" => 0
 * - abaixo de 0 ou acima de 5 deve ser inválido/limpo sem travar submit
 * - payload enviado para API deve ser number com ponto decimal, exemplo 4.8, nunca string "4,8"
 */

/**
 * Normaliza um valor de nota de rating.
 * 
 * @param value - Valor a ser normalizado (string, number, null, undefined)
 * @returns Número normalizado (0-5) ou null se inválido
 */
export function normalizeRatingInput(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  // If it's already a number, validate range
  if (typeof value === 'number') {
    return value >= 0 && value <= 5 ? value : null;
  }
  
  // If it's a string, normalize it
  const str = value.toString().trim();
  if (!str) return null;
  
  // Replace comma with dot
  let normalized = str.replace(',', '.');
  
  // Handle cases like "48" → "4.8", "49" → "4.9", "50" → "5.0"
  if (/^\d{2}$/.test(normalized)) {
    const num = parseInt(normalized, 10);
    if (num >= 0 && num <= 50) {
      normalized = (num / 10).toString();
    }
  }
  
  // Parse to float
  const parsed = parseFloat(normalized);
  
  // Validate range
  if (isNaN(parsed) || parsed < 0 || parsed > 5) {
    return null;
  }
  
  return parsed;
}

/**
 * Formata um número de rating para exibição em campo de input.
 * 
 * @param value - Número de rating (0-5) ou null/undefined
 * @returns String formatada com vírgula como separador decimal
 */
export function formatRatingForInput(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  return value.toString().replace('.', ',');
}

/**
 * Normaliza um campo de rating e retorna o valor formatado para input.
 * Útil para ser usado no evento blur de campos de rating.
 * 
 * @param value - Valor atual do campo
 * @returns Valor formatado para exibição no input
 */
export function normalizeAndFormatRating(value: string | number | null | undefined): string {
  const normalized = normalizeRatingInput(value);
  return formatRatingForInput(normalized);
}