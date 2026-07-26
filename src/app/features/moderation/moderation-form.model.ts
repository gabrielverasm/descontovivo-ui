import { MarketplaceCode } from '../../core/models/marketplace-inspection.model';
import { Promotion } from '../../core/models/promotion.model';
import { ModerationDecisionRequest } from '../../core/services/moderation.service';
import { detectMarketplace } from '../../shared/utils/marketplace-detection.util';
import { normalizePromotionTitle } from '../../shared/utils/normalize-title.util';
import { formatCentsToBRL, numberToCents, parseBRLInputToNumber } from '../../shared/utils/money-input.util';
import { formatRatingForInput, normalizeRatingInput } from '../../shared/utils/rating-input.util';
import { parseIntegerInput } from '../../shared/utils/integer-input.util';
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
  categories: string[];
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

export interface PromotionFormPayload {
  title: string;
  url: string;
  currentPrice: number | null;
  originalPrice: number | null;
  couponCode: string;
  storeName: string;
  soldBy: string | null;
  deliveredBy: string | null;
  category: string | null;
  categories: string[];
  availability: string;
  priceSignal: string;
  salesCount: number | null;
  productRating: number | null;
  sellerRating: number | null;
  officialStore: boolean;
  trustSignals: string[];
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
    categories: promotion.categories?.length ? [...promotion.categories] : (promotion.category ? [promotion.category] : []),
    availability: promotion.availability || '',
    priceSignal: promotion.priceSignal === 'NONE' ? '' : promotion.priceSignal || '',
    salesCount: promotion.salesCount == null ? '' : String(promotion.salesCount),
    productRating: promotion.productRating == null ? '' : formatRatingForInput(promotion.productRating),
    sellerRating: promotion.sellerRating == null ? '' : formatRatingForInput(promotion.sellerRating),
    officialStore: promotion.officialStore ?? false,
    trustSignals: normalizeOfficialStoreSignals(promotion.officialStore ?? false, [...(promotion.trustSignals || [])]),
  };
}

export function validatePromotionForm(
  form: PromotionModerationFormValue,
  options: { requireStore?: boolean; requireImage?: boolean; hasImage?: boolean } = {},
): string {
  if (!form.title.trim() || !form.url.trim()) return 'Título e URL da oferta são obrigatórios.';
  if (options.requireStore && !form.storeName.trim()) return 'Nome da loja é obrigatório.';
  const price = parseBRLInputToNumber(form.currentPrice);
  if (!price || price <= 0) return 'Preço atual inválido.';
  if (options.requireImage && !options.hasImage) return 'Imagem do produto é obrigatória.';
  return '';
}

export function promotionFormToPayload(form: PromotionModerationFormValue): PromotionFormPayload {
  return {
    title: normalizePromotionTitle(form.title.trim()),
    url: form.url.trim(),
    currentPrice: parseBRLInputToNumber(form.currentPrice),
    originalPrice: parseBRLInputToNumber(form.originalPrice),
    couponCode: form.couponCode.trim(),
    storeName: form.storeName.trim(),
    soldBy: form.soldBy.trim() || null,
    deliveredBy: form.deliveredBy.trim() || null,
    category: form.categories[0] || null,
    categories: [...new Set(form.categories.map(value => value.trim()).filter(Boolean))],
    availability: form.availability.trim(),
    priceSignal: form.priceSignal.trim(),
    salesCount: parseIntegerInput(form.salesCount),
    productRating: normalizeRatingInput(form.productRating),
    sellerRating: normalizeRatingInput(form.sellerRating),
    officialStore: form.officialStore,
    trustSignals: normalizeOfficialStoreSignals(form.officialStore, [...form.trustSignals]),
  };
}

export function moderationFormToEditRequest(
  form: PromotionModerationFormValue,
  context: PromotionModerationFormContext,
  action: 'EDIT' | 'APPROVE' = 'EDIT',
  reason = 'Ajustes de moderação',
): ModerationDecisionRequest {
  const fields = promotionFormToPayload(form);
  const detected = detectMarketplace(form.url);
  const request: ModerationDecisionRequest = {
    action,
    reason,
    title: fields.title,
    url: fields.url,
    currentPrice: fields.currentPrice ?? undefined,
    originalPrice: fields.originalPrice,
    couponCode: fields.couponCode,
    storeName: fields.storeName,
    sellerName: fields.soldBy,
    soldBy: fields.soldBy,
    deliveredBy: fields.deliveredBy,
    category: fields.category,
    categories: fields.categories,
    availability: fields.availability,
    priceSignal: fields.priceSignal,
    marketplace: detected?.marketplace || (form.url === context.inspectedFormUrl ? form.marketplace : null),
    salesCount: fields.salesCount,
    productRating: fields.productRating,
    sellerRating: fields.sellerRating,
    officialStore: fields.officialStore,
    trustSignals: fields.trustSignals,
    replaceInspectionFields: context.inspectionApplied,
    imageKey: context.imageKey || undefined,
  };
  return request;
}
