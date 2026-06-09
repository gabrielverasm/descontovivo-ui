export type PromotionStatus = 'pending' | 'approved' | 'rejected';

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
  deliveryInfo?: string;
  shippingInfo?: string;
  trustBadge?: string;
  offerBadge?: string;
  warningBadge?: string;
  couponCode?: string;
  likesCount: number;
  commentsCount: number;
  status: PromotionStatus;
  createdAt: string;
  createdBy: string;
}
