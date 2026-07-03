/**
 * Helpers de seller/entrega para exibição de badges de confiança.
 */

import { Promotion } from '../../core/models/promotion.model';

const INVALID_SELLER_VALUES = [
  '', 'loja-nao-identificada', 'loja não identificada', 'loja nao identificada',
  'não identificada', 'nao identificada', 'não identificado', 'nao identificado',
  'não informado', 'nao informado', 'não informado pela fonte', 'nao informado pela fonte',
  'desconhecida', 'desconhecido', 'indisponível', 'indisponivel', 'unknown', 'n/a', '-',
];

function normalizeForComparison(value: string): string {
  return value.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function normalizeSellerName(value: string): string {
  let n = normalizeForComparison(value)
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .replace(/\.(com\.br|com|br)$/i, '')
    .replace(/[.]/g, ' ').trim();
  // Aliases
  if (/^amazon/.test(n) || n === 'amazon fulfillment') n = 'amazon';
  if (n === 'magazine luiza') n = 'magalu';
  return n;
}

export function isUsefulSellerValue(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return !INVALID_SELLER_VALUES.includes(normalizeForComparison(trimmed));
}

export function isAmazonSeller(name: string | null | undefined): boolean {
  if (!name) return false;
  return /\bamazon\b/i.test(name.trim());
}

export function isSoldAndDeliveredByAmazon(soldBy: string | null | undefined, deliveredBy: string | null | undefined): boolean {
  return isAmazonSeller(soldBy) && isAmazonSeller(deliveredBy);
}

export function getAmazonTrustLabel(): string {
  return 'Vendido e entregue pela Amazon';
}

function sellerCompactKey(value: string): string {
  return normalizeSellerName(value).replace(/[\s-]+/g, '');
}

export function isSameSeller(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!isUsefulSellerValue(a) || !isUsefulSellerValue(b)) return false;

  const na = normalizeSellerName(a!);
  const nb = normalizeSellerName(b!);

  if (na === nb) return true;

  const ka = sellerCompactKey(a!);
  const kb = sellerCompactKey(b!);

  if (ka && kb && ka === kb) return true;

  // Fallback: substring match only when both are long enough and one fully contains the other.
  // Guard against false positives like "Pague Menos" matching "Menos" by requiring
  // the shorter string to be at least 60% of the longer string's length.
  if (na.length >= 3 && nb.length >= 3) {
    const shorter = na.length <= nb.length ? na : nb;
    const longer = na.length > nb.length ? na : nb;
    if (shorter.length / longer.length >= 0.6 && longer.includes(shorter)) return true;
  }

  return false;
}

export function isStoreSeller(promotion: Promotion, value: string | null | undefined): boolean {
  const storeName = promotion.store?.name || promotion.storeName;
  if (!isUsefulSellerValue(storeName) || !isUsefulSellerValue(value)) return false;
  return isSameSeller(storeName, value);
}

export function isSoldAndDeliveredByStore(promotion: Promotion): boolean {
  const storeName = promotion.store?.name || promotion.storeName;
  if (!isUsefulSellerValue(storeName)) return false;
  if (!isUsefulSellerValue(promotion.soldBy)) return false;
  if (!isUsefulSellerValue(promotion.deliveredBy)) return false;
  return isStoreSeller(promotion, promotion.soldBy) && isStoreSeller(promotion, promotion.deliveredBy);
}

export function hasThirdPartySeller(promotion: Promotion): boolean {
  const storeName = promotion.store?.name || promotion.storeName;
  if (!isUsefulSellerValue(storeName) || !isUsefulSellerValue(promotion.soldBy)) return false;
  return !isStoreSeller(promotion, promotion.soldBy);
}

export function hasPartnerDelivery(promotion: Promotion): boolean {
  const storeName = promotion.store?.name || promotion.storeName;
  if (!isUsefulSellerValue(storeName) || !isUsefulSellerValue(promotion.deliveredBy)) return false;
  return !isStoreSeller(promotion, promotion.deliveredBy);
}
