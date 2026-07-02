/**
 * Utilitário para máscara de dinheiro BRL.
 *
 * Regras:
 * - Apenas dígitos são aceitos na entrada.
 * - As duas últimas casas são centavos.
 * - A partir de 5 dígitos, aparece separador de milhar.
 * - O payload para API é number decimal com ponto (ex: 5327.10).
 *
 * Exemplos:
 * "1"      => R$ 0,01  => 0.01
 * "10"     => R$ 0,10  => 0.10
 * "697"    => R$ 6,97  => 6.97
 * "1990"   => R$ 19,90 => 19.90
 * "10990"  => R$ 109,90 => 109.90
 * "532710" => R$ 5.327,10 => 5327.10
 */

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Remove tudo que não seja dígito */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** Converte string de dígitos (centavos) para number decimal. Ex: "532710" => 5327.10 */
export function centsToNumber(digits: string): number {
  if (!digits) return 0;
  const cleaned = onlyDigits(digits);
  if (!cleaned) return 0;
  return Number(cleaned) / 100;
}

/** Converte number decimal para string de dígitos (centavos). Ex: 5327.10 => "532710" */
export function numberToCents(value: number | string | null | undefined): string {
  if (value == null || value === '') return '';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';
  return Math.round(num * 100).toString();
}

/** Formata dígitos (centavos) para exibição BRL. Ex: "532710" => "R$ 5.327,10" */
export function formatCentsToBRL(digits: string): string {
  if (!digits) return '';
  const num = centsToNumber(digits);
  return brlFormatter.format(num);
}

/** Converte valor visual BRL (qualquer formato) para number decimal ou null. */
export function parseBRLInputToNumber(value: string): number | null {
  if (!value) return null;
  const digits = onlyDigits(value);
  if (!digits) return null;
  const num = centsToNumber(digits);
  return num > 0 ? num : null;
}
