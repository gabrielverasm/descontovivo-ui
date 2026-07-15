const SITE_NAME = 'DescontoVivo';
const MAX_TITLE_LENGTH = 70;
const MAX_DESCRIPTION_LENGTH = 160;

export interface PromotionSeoInput {
  title: string;
  currentPrice?: number | null;
  storeName?: string | null;
}

export interface PromotionSeoData {
  title: string;
  description: string;
}

export function buildPromotionSeo(input: PromotionSeoInput): PromotionSeoData {
  const productName = normalizeWhitespace(input.title) || 'Promoção';
  const price = formatBRL(input.currentPrice);
  const suffix = `${price ? ` por ${price}` : ''} | ${SITE_NAME}`;
  const title = `${truncateAtWord(productName, MAX_TITLE_LENGTH - suffix.length)}${suffix}`;
  const store = normalizeWhitespace(input.storeName || '');

  let description = `Veja a promoção ${productName}${price ? ` por ${price}` : ''}`;
  if (store) description += ` em ${store}`;
  description += ` no ${SITE_NAME}. Confira os detalhes antes de comprar.`;

  return {
    title,
    description: truncateAtWord(description, MAX_DESCRIPTION_LENGTH),
  };
}

export function resolveSchemaAvailability(value?: string | null): string | null {
  const normalized = value?.trim().toLowerCase().replace(/[\s-]+/g, '_');

  if (normalized === 'available' || normalized === 'in_stock' || normalized === 'instock') {
    return 'https://schema.org/InStock';
  }

  if (
    normalized === 'expired'
    || normalized === 'unavailable'
    || normalized === 'out_of_stock'
    || normalized === 'outofstock'
  ) {
    return 'https://schema.org/OutOfStock';
  }

  return null;
}

function formatBRL(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function truncateAtWord(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;

  const candidate = value.slice(0, Math.max(1, maxLength - 1)).trimEnd();
  const lastSpace = candidate.lastIndexOf(' ');
  const cutAt = lastSpace >= Math.floor(maxLength * 0.6) ? lastSpace : candidate.length;
  return `${candidate.slice(0, cutAt).trimEnd()}…`;
}
