export interface AdminImportItem {
  sourceId: string;
  title: string;
  description: string;
  marketplace: string;
  storeName: string;
  sellerName?: string;
  soldBy?: string;
  deliveredBy?: string;
  productUrl: string;
  imageUrl?: string;
  currentPrice: number;
  originalPrice?: number | null;
  coupon?: string | null;
  category: string;
  publishAt?: string | null;
  verifiedAt?: string | null;
}

export interface AdminImportRequest {
  batchId: string;
  items: AdminImportItem[];
}

export interface AdminImportError {
  sourceId: string;
  field: string;
  message: string;
}

export interface AdminImportResponse {
  batchId: string;
  dryRun: boolean;
  created: number;
  updated: number;
  skipped: number;
  errors: AdminImportError[];
}
