import { MarketplaceCode } from '../../core/models/marketplace-inspection.model';
import { Promotion } from '../../core/models/promotion.model';
import { ModerationDecisionRequest } from '../../core/services/moderation.service';
import { detectMarketplace } from '../../shared/utils/marketplace-detection.util';
import { normalizePromotionTitle } from '../../shared/utils/normalize-title.util';
import { formatCentsToBRL, numberToCents, parseBRLInputToNumber } from '../../shared/utils/money-input.util';
import { formatRatingForInput, normalizeRatingInput } from '../../shared/utils/rating-input.util';
import { TrustSignal } from '../../shared/utils/trust-signals.util';
import { resolveStoreName } from '../../shared/utils/store-name.util';

export interface PromotionModerationFormValue {
  marketplace: MarketplaceCode | null;
  title: string;
  url: string;
  currentPrice: string;
  originalPrice: string;
  couponCode: string;
  storeName: string;
  soldBy: string;
  deliveredBy: string;
  category: string;
  availability: string;
  priceSignal: string;
  salesCount: string;
  productRating: string;
  sellerRating: string;
  officialStore: boolean;
  trustSignals: string[];
}

export interface PromotionModerationFormContext {
  promotion: Promotion;
  inspectionApplied: boolean;
  inspectedFormUrl: string | null;
  imageKey?: string | null;
}

export function normalizeOfficialStoreSignals(officialStore: boolean, trustSignals: string[]): string[] {
  const withoutOfficial = trustSignals.filter((signal) => signal !== TrustSignal.OFFICIAL_STORE);
  return officialStore ? [...withoutOfficial, TrustSignal.OFFICIAL_STORE] : withoutOfficial;
}

export function promotionToModerationForm(promotion: Promotion): PromotionModerationFormValue {
  return {
    marketplace: (promotion.marketplace as MarketplaceCode | undefined) ?? null,
    title: promotion.title || '',
    url: promotion.url || promotion.offerUrl || promotion.storeUrl || '',
    currentPrice: promotion.currentPrice == null ? '' : formatCentsToBRL(numberToCents(promotion.currentPrice)),
    originalPrice: promotion.originalPrice == null ? '' : formatCentsToBRL(numberToCents(promotion.originalPrice)),
    couponCode: promotion.couponCode || '',
    storeName: resolveStoreName(promotion.store?.name || promotion.storeName),
    soldBy: promotion.soldBy || '',
    deliveredBy: promotion.deliveredBy || '',
    category: promotion.category || '',
    availability: promotion.availability || '',
    priceSignal: promotion.priceSignal === 'NONE' ? '' : promotion.priceSignal || '',
    salesCount: promotion.salesCount == null ? '' : String(promotion.salesCount),
    productRating: promotion.productRating == null ? '' : formatRatingForInput(promotion.productRating),
    sellerRating: promotion.sellerRating == null ? '' : formatRatingForInput(promotion.sellerRating),
    officialStore: promotion.officialStore ?? false,
    trustSignals: normalizeOfficialStoreSignals(promotion.officialStore ?? false, [...(promotion.trustSignals || [])]),
  };
}

export function moderationFormToEditRequest(
  form: PromotionModerationFormValue,
  context: PromotionModerationFormContext,
  action: 'EDIT' | 'APPROVE' = 'EDIT',
  reason = 'Ajustes de moderação',
): ModerationDecisionRequest {
  const currentPrice = parseBRLInputToNumber(form.currentPrice);
  const originalPrice = parseBRLInputToNumber(form.originalPrice);
  const detected = detectMarketplace(form.url);
  const request: ModerationDecisionRequest = {
    action,
    reason,
    title: normalizePromotionTitle(form.title.trim()),
    url: form.url.trim(),
    currentPrice: currentPrice ?? undefined,
    originalPrice: originalPrice ?? null,
    couponCode: form.couponCode.trim(),
    storeName: form.storeName.trim(),
    sellerName: form.soldBy.trim() || null,
    soldBy: form.soldBy.trim() || null,
    deliveredBy: form.deliveredBy.trim() || null,
    category: form.category.trim() || null,
    availability: form.availability.trim(),
    priceSignal: form.priceSignal.trim(),
    marketplace: detected?.marketplace || (form.url === context.inspectedFormUrl ? form.marketplace : null),
    salesCount: parseSalesCount(form.salesCount),
    productRating: normalizeRatingInput(form.productRating),
    sellerRating: normalizeRatingInput(form.sellerRating),
    officialStore: form.officialStore,
    trustSignals: normalizeOfficialStoreSignals(form.officialStore, [...form.trustSignals]),
    replaceInspectionFields: context.inspectionApplied,
    imageKey: context.imageKey || undefined,
  };
  return request;
}

function parseSalesCount(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}
