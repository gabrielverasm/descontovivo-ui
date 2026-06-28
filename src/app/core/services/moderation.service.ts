import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Promotion } from '../models/promotion.model';

export type ModerationAction = 'APPROVE' | 'REJECT' | 'REMOVE' | 'EDIT';

export interface ModerationDecisionRequest {
  action: ModerationAction;
  reason: string;
  title?: string;
  url?: string;
  description?: string;
  currentPrice?: number;
  originalPrice?: number;
  couponCode?: string;
  imageUrl?: string;
  availability?: string;
  storeSlug?: string;
}

@Injectable({ providedIn: 'root' })
export class ModerationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/moderation/promotions`;

  getPending(page = 0, size = 20): Observable<Promotion[]> {
    return this.http.get<Promotion[]>(this.baseUrl, {
      params: { page, size },
    });
  }

  decide(id: string, request: ModerationDecisionRequest): Observable<Promotion> {
    return this.http.patch<Promotion>(`${this.baseUrl}/${id}`, request);
  }
}
