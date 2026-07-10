export type PromotionStatus = 'pending' | 'approved' | 'rejected';
export type PromotionSellerType = 'official_store' | 'marketplace' | 'third_party' | 'store';
export type AffiliateProgram = 'NONE' | 'AMAZON';

export interface PromotionStore {
  slug: string;
  name: string;
}

export interface Promotion {
  id: string;
  slug?: string;
  title: string;
  currentPrice: number;
  originalPrice?: number;
  discountPercentage?: number;
  storeName: string;
  storeUrl: string;
  url?: string;
  offerUrl?: string;
  imageUrl: string;
  category: string;
  soldBy?: string | null;
  deliveredBy?: string | null;
  tags: string[];
  sellerName?: string;
  sellerType?: PromotionSellerType;
  deliveryInfo?: string;
  shippingInfo?: string;
  trustedStoreName?: string;
  isSoldAndDeliveredByTrustedStore?: boolean;
  sellerWarning?: string;
  trustTooltip?: string;
  trustBadge?: string;
  offerBadge?: string;
  warningBadge?: string;
  couponCode?: string;
  priceSignal?: 'NONE' | 'GOOD_PRICE' | 'GREAT_PRICE';
  affiliateProgram?: AffiliateProgram;
  sponsoredLink?: boolean;
  likesCount: number;
  dislikesCount?: number;
  commentsCount: number;
  latestCommentPreview?: string;
  availability?: string;
  status: PromotionStatus;
  createdAt: string;
  publishedAt?: string;
  createdBy: string;
  authorUsername?: string;
  store?: PromotionStore;
  // New trust signals fields
  marketplace?: string;
  salesCount?: number;
  productRating?: number;
  sellerRating?: number;
  officialStore?: boolean;
  trustSignals?: string[];
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  page: number;
}
