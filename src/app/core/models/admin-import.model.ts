export interface AdminImportItem {
  sourceId: string;
  title: string;
  marketplace: string;
  storeName: string;
  sellerName?: string | null;
  soldBy?: string | null;
  deliveredBy?: string | null;
  productUrl: string;
  imageUrl: string;
  imageKey?: string | null;
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
  skipped: number;
  errors: AdminImportError[];
}
