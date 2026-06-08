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
  imageUrl: string;
  category: string;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  status: PromotionStatus;
  createdAt: string;
  createdBy: string;
}
