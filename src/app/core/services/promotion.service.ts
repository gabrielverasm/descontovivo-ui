import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { PagedResponse, Promotion } from '../models/promotion.model';

export interface PromotionCreateRequest {
  title: string;
  url: string;
  currentPrice: number;
  imageUrl: string;
  imageKey: string;
  description?: string;
  originalPrice?: number;
  couponCode?: string;
  storeSlug?: string;
}

@Injectable({ providedIn: 'root' })
export class PromotionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/promotions`;

  getPromotions(page = 0, size = 20): Observable<PagedResponse<Promotion>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PagedResponse<Promotion>>(this.baseUrl, { params }).pipe(
      map((res) => ({
        ...res,
        content: res.content.map((p) => this.normalize(p)),
      })),
    );
  }

  getPromotionBySlug(slug: string): Observable<Promotion | undefined> {
    return this.http.get<Promotion>(`${this.baseUrl}/${slug}`).pipe(
      map((p) => this.normalize(p)),
      catchError(() => of(undefined)),
    );
  }

  getPromotionById(id: string): Observable<Promotion | undefined> {
    return this.getPromotionBySlug(id);
  }

  searchPromotions(term: string): Observable<Promotion[]> {
    const params = new HttpParams().set('q', term);
    return this.http.get<PagedResponse<Promotion>>(this.baseUrl, { params }).pipe(
      map((res) => res.content.map((p) => this.normalize(p))),
      catchError(() => of([])),
    );
  }

  getRelatedPromotions(promotion: Promotion, limit = 4): Observable<Promotion[]> {
    return this.http
      .get<PagedResponse<Promotion>>(this.baseUrl, {
        params: new HttpParams().set('size', limit),
      })
      .pipe(
        map((res) =>
          res.content.filter((p) => p.id !== promotion.id).slice(0, limit).map((p) => this.normalize(p)),
        ),
        catchError(() => of([])),
      );
  }

  createPromotion(request: PromotionCreateRequest): Observable<Promotion> {
    return this.http.post<Promotion>(this.baseUrl, request);
  }

  /** Compat: usado pelo promotion-detail para carregar lista completa */
  getApprovedPromotions(): Observable<Promotion[]> {
    return this.getPromotions(0, 50).pipe(
      map((res) => res.content),
      catchError(() => of([])),
    );
  }

  /** Compat: garante que campos usados pelos cards existam */
  private normalize(p: Promotion): Promotion {
    return {
      ...p,
      url: p.url || '',
      offerUrl: p.offerUrl || '',
      storeName: p.storeName || p.store?.name || '',
      storeUrl: p.storeUrl || '',
      tags: p.tags || [],
      likesCount: p.likesCount ?? 0,
      dislikesCount: p.dislikesCount ?? 0,
      commentsCount: p.commentsCount ?? 0,
      status: p.status || 'approved',
      createdBy: p.createdBy || '',
      createdAt: p.createdAt || p.publishedAt || new Date().toISOString(),
      imageUrl: p.imageUrl || '',
    };
  }
}
