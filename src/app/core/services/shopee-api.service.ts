import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type ShopeeOperation = 'products' | 'shops' | 'campaigns' | 'conversions' | 'feeds' | 'feed_data' | 'validation' | 'short_link';

export interface ShopeeOperationRequest {
  operation: ShopeeOperation;
  keyword?: string;
  page?: number;
  limit?: number;
  startTime?: number;
  endTime?: number;
  purchaseStatus?: number;
  feedId?: number;
  originUrl?: string;
  subIds?: string[];
}

@Injectable({ providedIn: 'root' })
export class ShopeeApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiBaseUrl}/admin/shopee/affiliate-operation`;

  execute(request: ShopeeOperationRequest): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(this.endpoint, {
      page: 1,
      limit: 20,
      subIds: [],
      ...request,
    });
  }
}
