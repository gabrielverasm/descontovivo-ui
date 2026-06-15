import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Promotion } from '../models/promotion.model';
import { APPROVED_PROMOTIONS_MOCK } from '../mocks/promotions.mock';

@Injectable({ providedIn: 'root' })
export class PromotionService {
  getApprovedPromotions(): Observable<Promotion[]> {
    return of([...APPROVED_PROMOTIONS_MOCK]);
  }

  getPromotionById(id: string): Observable<Promotion | undefined> {
    return of(APPROVED_PROMOTIONS_MOCK.find((p) => p.id === id));
  }

  searchPromotions(term: string): Observable<Promotion[]> {
    const lower = term.toLowerCase();
    return of(
      APPROVED_PROMOTIONS_MOCK.filter(
        (p) =>
          p.title.toLowerCase().includes(lower) ||
          p.description.toLowerCase().includes(lower) ||
          p.storeName.toLowerCase().includes(lower) ||
          p.category.toLowerCase().includes(lower) ||
          p.tags.some((t) => t.toLowerCase().includes(lower)) ||
          (p.couponCode && p.couponCode.toLowerCase().includes(lower))
      )
    );
  }

  getRelatedPromotions(promotion: Promotion, limit = 4): Observable<Promotion[]> {
    const related = APPROVED_PROMOTIONS_MOCK.filter(
      (p) =>
        p.id !== promotion.id &&
        (p.category === promotion.category ||
          p.storeName === promotion.storeName ||
          p.tags.some((t) => promotion.tags.includes(t)))
    ).slice(0, limit);
    return of(related);
  }
}
