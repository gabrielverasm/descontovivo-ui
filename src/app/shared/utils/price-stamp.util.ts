import { Promotion } from '../../core/models/promotion.model';

export const PRICE_STAMP_STALE_AFTER_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;
/**
 * Fuso fixo do carimbo (sem horário de verão desde 2019): o mesmo texto no SSR (Worker em UTC) e no
 * navegador, seja qual for o fuso da máquina.
 */
export const PRICE_STAMP_TIME_ZONE = 'America/Fortaleza';

const formatters = new Map<string, Intl.DateTimeFormat>();

interface CivilDateTime {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
}

/** Ano, mês, dia, hora e minuto do instante no fuso pedido (calendário civil, não o da máquina). */
function civilDateTime(date: Date, timeZone: string): CivilDateTime {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    formatters.set(timeZone, formatter);
  }
  const parts: Record<string, string> = {};
  for (const { type, value } of formatter.formatToParts(date)) parts[type] = value;
  return { year: parts['year'], month: parts['month'], day: parts['day'], hour: parts['hour'], minute: parts['minute'] };
}

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

/** "DD/MM HH:mm" no fuso do carimbo. */
export function formatPriceStamp(date: Date, timeZone: string = PRICE_STAMP_TIME_ZONE): string {
  const { day, month, hour, minute } = civilDateTime(date, timeZone);
  return `${day}/${month} ${hour}:${minute}`;
}

/**
 * Data e hora do carimbo: "hoje HH:mm" quando o carimbo cai no mesmo dia civil de `now` no fuso
 * pedido; nos demais dias, "DD/MM HH:mm". A hora nunca é omitida. Função pura: `now` é sempre
 * injetado por quem chama.
 */
export function formatPriceStampDate(
  verifiedAt: Date,
  now: Date | number,
  timeZone: string = PRICE_STAMP_TIME_ZONE,
): string {
  const stamp = civilDateTime(verifiedAt, timeZone);
  const today = civilDateTime(new Date(now), timeZone);
  const sameDay = stamp.year === today.year && stamp.month === today.month && stamp.day === today.day;
  return sameDay ? `hoje ${stamp.hour}:${stamp.minute}` : formatPriceStamp(verifiedAt, timeZone);
}

/** Carimbo com mais de 7 dias. */
export function isPriceStampStale(date: Date, now: number = Date.now()): boolean {
  return now - date.getTime() > PRICE_STAMP_STALE_AFTER_DAYS * DAY_MS;
}
