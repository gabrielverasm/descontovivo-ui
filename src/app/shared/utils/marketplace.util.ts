/**
 * Deriva o marketplace a partir do nome da loja.
 *
 * A API exige o campo marketplace preenchido.
 * Regras:
 * - Se o storeName contém "amazon" → "AMAZON"
 * - Se contém "magalu" ou "magazine luiza" → "MAGALU"
 * - Senão, usa o storeName em UPPERCASE como fallback.
 * - Se vazio, retorna "OUTRO".
 */
export function deriveMarketplace(storeName: string | null | undefined): string {
  if (!storeName || !storeName.trim()) return 'OUTRO';

  const lower = storeName.trim().toLowerCase();

  if (lower.includes('amazon')) return 'AMAZON';
  if (lower.includes('magalu') || lower.includes('magazine luiza')) return 'MAGALU';
  if (lower.includes('mercado livre') || lower.includes('mercadolivre')) return 'MERCADO_LIVRE';
  if (lower.includes('shopee')) return 'SHOPEE';
  if (lower.includes('aliexpress')) return 'ALIEXPRESS';
  if (lower.includes('casas bahia')) return 'CASAS_BAHIA';
  if (lower.includes('ponto frio') || lower.includes('pontofrio')) return 'PONTO_FRIO';
  if (lower.includes('americanas')) return 'AMERICANAS';
  if (lower.includes('kabum')) return 'KABUM';
  if (lower.includes('pague menos')) return 'PAGUE_MENOS';

  // Fallback: usar storeName sanitizado como marketplace
  return storeName.trim().toUpperCase().replace(/\s+/g, '_');
}
