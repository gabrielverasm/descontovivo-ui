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
      map((res) => this.normalizePage(res)),
    );
  }

  getPromotionsFresh(page = 0, size = 20): Observable<PagedResponse<Promotion>> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('_fresh', Date.now().toString());
    return this.http.get<PagedResponse<Promotion>>(this.baseUrl, {
      params,
      transferCache: false,
    }).pipe(
      map((res) => this.normalizePage(res)),
    );
  }

  private normalizePage(res: PagedResponse<Promotion>): PagedResponse<Promotion> {
    return {
      ...res,
      content: res.content.map((p) => this.normalize(p)),
    };
  }

  getPromotionBySlug(slug: string): Observable<Promotion> {
    return this.http.get<Promotion>(`${this.baseUrl}/${slug}`).pipe(
      map((p) => this.normalize(p)),
    );
  }

  searchPromotions(term: string): Observable<Promotion[]> {
    const params = new HttpParams().set('q', term);
    return this.http.get<PagedResponse<Promotion>>(this.baseUrl, { params }).pipe(
      map((res) => res.content.map((p) => this.normalize(p))),
      catchError(() => of([])),
    );
  }

  getRelatedPromotions(promotion: Promotion, limit = 4): Observable<Promotion[]> {
    const slug = promotion.slug?.trim();
    const currentCategories = this.categoryKeys(promotion);
    if (!slug || currentCategories.size === 0) return of([]);

    return this.http
      .get<PagedResponse<Promotion>>(`${this.baseUrl}/${encodeURIComponent(slug)}/related`, {
        params: new HttpParams().set('size', limit),
      })
      .pipe(
        map((res) => {
          const seen = new Set<string>();
          return res.content
            .map((item) => this.normalize(item))
            .filter((item) => {
              if (item.id === promotion.id || !item.slug?.trim() || seen.has(item.id)) return false;
              const sharesCategory = [...this.categoryKeys(item)].some(category => currentCategories.has(category));
              if (!sharesCategory) return false;
              seen.add(item.id);
              return true;
            })
            .slice(0, limit);
        }),
        catchError(() => of([])),
      );
  }

  createPromotion(request: PromotionCreateRequest): Observable<Promotion> {
    return this.http.post<Promotion>(this.baseUrl, request);
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
      createdAt: p.publishedAt || p.createdAt || new Date().toISOString(),
      imageUrl: p.imageUrl || '',
      categories: p.categories?.filter(Boolean) ?? (p.category ? [p.category] : []),
    };
  }

  private categoryKeys(promotion: Promotion): Set<string> {
    const categories = promotion.categories?.length
      ? promotion.categories
      : promotion.category ? [promotion.category] : [];
    return new Set(categories.map(category => category.trim().toLocaleLowerCase('pt-BR')).filter(Boolean));
  }
}
