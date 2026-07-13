export type MarketplaceCode = 'SHOPEE' | 'AMAZON' | 'MERCADO_LIVRE' | 'MAGALU' | 'ALIEXPRESS';

export interface MarketplaceDetection {
  marketplace: MarketplaceCode;
  label: string;
  supported: boolean;
}

export interface PromotionInspectionResponse {
  marketplace: MarketplaceCode;
  supported: boolean;
  inputUrl: string;
  productUrl: string | null;
  affiliateUrl: string | null;
  title: string | null;
  currentPrice: number | null;
  originalPrice: number | null;
  imageKey: string | null;
  imageUrl: string | null;
  storeName: string | null;
  sellerName: string | null;
  soldBy: string | null;
  deliveredBy: string | null;
  salesCount: number | null;
  productRating: number | null;
  sellerRating: number | null;
  officialStore: boolean;
  shopeeGuarantee: boolean;
  category: string | null;
  trustSignals: string[];
  missingFields: string[];
  warnings: string[];
}
