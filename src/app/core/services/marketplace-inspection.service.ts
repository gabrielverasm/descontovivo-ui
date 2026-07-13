import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PromotionInspectionResponse } from '../models/marketplace-inspection.model';

@Injectable({ providedIn: 'root' })
export class MarketplaceInspectionService {
  private readonly http = inject(HttpClient);

  inspect(url: string): Observable<PromotionInspectionResponse> {
    return this.http.post<PromotionInspectionResponse>(
      `${environment.apiBaseUrl}/admin/promotions/inspect-url`,
      { url },
    );
  }
}
