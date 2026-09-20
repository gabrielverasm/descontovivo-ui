import { formatDate } from '@angular/common';

import { Promotion } from '../../core/models/promotion.model';

export const PRICE_STAMP_STALE_AFTER_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;
// Horário de Brasília fixo (sem horário de verão desde 2019): o mesmo texto no SSR (UTC) e no navegador.
const BRAZIL_TIMEZONE = '-0300';

type PriceStampFields = Pick<Promotion, 'verifiedAt' | 'publishedAt'>;

/** Momento a que o preço exibido se refere: verifiedAt e, se vazio ou inválido, publishedAt. */
export function resolvePriceStampDate(promotion: PriceStampFields): Date | null {
  for (const value of [promotion.verifiedAt, promotion.publishedAt]) {
    if (!value) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

/** "DD/MM HH:mm" no horário de Brasília. */
export function formatPriceStamp(date: Date): string {
  return formatDate(date, 'dd/MM HH:mm', 'en-US', BRAZIL_TIMEZONE);
}

/** Carimbo com mais de 7 dias. */
export function isPriceStampStale(date: Date, now: number = Date.now()): boolean {
  return now - date.getTime() > PRICE_STAMP_STALE_AFTER_DAYS * DAY_MS;
}
