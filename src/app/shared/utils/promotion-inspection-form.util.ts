import { MarketplaceCode, PromotionInspectionResponse } from '../../core/models/marketplace-inspection.model';
import { formatCentsToBRL, numberToCents } from './money-input.util';

export interface InspectionForm {
  marketplace: MarketplaceCode | null;
  url: string;
  title: string;
  currentPrice: string;
  originalPrice: string;
  storeName: string;
  sellerName: string;
  soldBy: string;
  deliveredBy: string;
  category: string;
  salesCount: string;
  productRating: string;
  sellerRating: string;
  officialStore: boolean;
  trustSignals: string[];
}

export function applyInspectionToForm(form: InspectionForm, data: PromotionInspectionResponse): void {
  Object.assign(form, {
    marketplace: data.marketplace,
    url: data.affiliateUrl || data.productUrl || '',
    title: data.title || '',
    currentPrice: data.currentPrice == null ? '' : formatCentsToBRL(numberToCents(data.currentPrice)),
    originalPrice: data.originalPrice == null ? '' : formatCentsToBRL(numberToCents(data.originalPrice)),
    storeName: data.storeName || '',
    sellerName: data.sellerName || '',
    soldBy: data.soldBy || '',
    deliveredBy: data.deliveredBy || '',
    category: data.category || '',
    salesCount: data.salesCount == null ? '' : String(data.salesCount),
    productRating: data.productRating == null ? '' : String(data.productRating).replace('.', ','),
    sellerRating: data.sellerRating == null ? '' : String(data.sellerRating).replace('.', ','),
    officialStore: data.officialStore,
    trustSignals: [...data.trustSignals],
  });
}
