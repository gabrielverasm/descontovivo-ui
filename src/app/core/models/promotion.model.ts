export type PromotionStatus = 'pending' | 'approved' | 'rejected';
export type PromotionSellerType = 'official_store' | 'marketplace' | 'third_party' | 'store';

export interface Promotion {
  id: string;
  title: string;
  description: string;
  currentPrice: number;
  originalPrice?: number;
  discountPercentage?: number;
  storeName: string;
  storeUrl: string;
  offerUrl?: string;
  imageUrl: string;
  category: string;
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
  likesCount: number;
  dislikesCount?: number;
  commentsCount: number;
  status: PromotionStatus;
  createdAt: string;
  createdBy: string;
}
