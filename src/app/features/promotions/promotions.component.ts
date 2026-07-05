import { AfterViewInit, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { PromotionCardComponent } from '../../shared/components/promotion-card/promotion-card.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { PromotionService } from '../../core/services/promotion.service';
import { SeoService } from '../../core/services/seo.service';
import { StructuredDataService } from '../../core/services/structured-data.service';
import { Promotion } from '../../core/models/promotion.model';
import { PromotionsFeedStateService } from './promotions-feed-state.service';
import { PublicNotificationStreamService } from '../../core/services/public-notification-stream.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-promotions',
  standalone: true,
  imports: [PromotionCardComponent, LoadingStateComponent],
  templateUrl: './promotions.component.html',
  styleUrl: './promotions.component.scss',
})
export class PromotionsComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly promotionService = inject(PromotionService);
  private readonly seo = inject(SeoService);
  private readonly structuredData = inject(StructuredDataService);
  private readonly feedState = inject(PromotionsFeedStateService);
  private readonly notificationStream = inject(PublicNotificationStreamService);

  private readonly pageSize = 12;
  private currentPage = 0;
  private totalPages = 1;
  private totalElements = 0;
  private pendingScrollY: number | null = null;
  private notificationSub: Subscription | null = null;

  promotions: Promotion[] = [];
  loading = true;
  loadingMore = false;
  error = '';
  loadMoreError = '';
  newPromotionsCount = 0;

  get hasMore(): boolean {
    return this.currentPage + 1 < this.totalPages;
  }

  ngOnInit(): void {
    this.seo.setIndexable({
      title: 'DescontoVivo: Promoções e ofertas compartilhadas pela comunidade',
      description: 'DescontoVivo reúne promoções compartilhadas pela comunidade, com ofertas revisadas antes de aparecerem no site. Encontre descontos em tecnologia, casa, mercado e mais.',
      canonicalPath: '/'
    });

    this.structuredData.setStructuredData('sd-website', {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'name': 'DescontoVivo',
      'alternateName': 'Desconto Vivo',
      'url': 'https://descontovivo.com/'
    });

    this.structuredData.setStructuredData('sd-organization', {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      'name': 'DescontoVivo',
      'url': 'https://descontovivo.com/',
      'logo': 'https://descontovivo.com/brand/logo-og-image.jpg'
    });

    this.notificationSub = this.notificationStream.state$.subscribe((state) => {
      this.newPromotionsCount = state.newPromotionsCount;
    });

    const saved = this.feedState.restore();
    if (saved) {
      this.promotions = saved.promotions;
      this.currentPage = saved.currentPage;
      this.totalPages = saved.totalPages;
      this.totalElements = saved.totalElements ?? 0;
      this.loading = false;
      this.pendingScrollY = saved.scrollY;

      // Register the cached/displayed feed snapshot so the SSE service
      // can detect staleness even when using cached data
      this.registerDisplayedSnapshot(saved.promotions, saved.totalElements);
    } else {
      this.loadPage(0);
    }
  }

  ngAfterViewInit(): void {
    if (this.pendingScrollY !== null) {
      const scrollY = this.pendingScrollY;
      this.pendingScrollY = null;
      // Wait for the view to render before restoring scroll
      setTimeout(() => window.scrollTo(0, scrollY), 0);
    }
  }

  ngOnDestroy(): void {
    this.notificationSub?.unsubscribe();
    this.structuredData.removeStructuredData('sd-website');
    this.structuredData.removeStructuredData('sd-organization');
    this.feedState.save({
      promotions: this.promotions,
      currentPage: this.currentPage,
      totalPages: this.totalPages,
      totalElements: this.totalElements,
      scrollY: window.scrollY,
    });
  }

  refreshFeed(): void {
    this.loading = true;
    this.error = '';

    this.promotionService.getPromotions(0, this.pageSize).subscribe({
      next: (res) => {
        this.promotions = res.content;
        this.currentPage = res.page;
        this.totalPages = res.totalPages;
        this.totalElements = res.totalElements;
        this.loading = false;
        this.loadingMore = false;

        // Register the new displayed snapshot, then clear badge
        this.registerDisplayedSnapshot(res.content, res.totalElements);
        this.notificationStream.clearNewPromotions();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: () => {
        this.error = 'Não foi possível carregar as promoções. Tente novamente mais tarde.';
        this.loading = false;
      },
    });
  }

  get newPromotionsBadge(): string {
    return this.notificationStream.formatCount(this.newPromotionsCount);
  }

  loadMore(): void {
    if (this.loadingMore || !this.hasMore) return;
    this.loadMoreError = '';
    this.loadPage(this.currentPage + 1);
  }

  private loadPage(page: number): void {
    const isFirst = page === 0;
    if (isFirst) {
      this.loading = true;
    } else {
      this.loadingMore = true;
    }

    this.promotionService.getPromotions(page, this.pageSize).subscribe({
      next: (res) => {
        if (isFirst) {
          this.promotions = res.content;
        } else {
          this.promotions = [...this.promotions, ...res.content];
        }
        this.currentPage = res.page;
        this.totalPages = res.totalPages;
        this.totalElements = res.totalElements;
        this.loading = false;
        this.loadingMore = false;
        this.loadMoreError = '';

        // Register displayed snapshot on first page load (initial load or page 0)
        if (isFirst) {
          this.registerDisplayedSnapshot(res.content, res.totalElements);
        }
      },
      error: () => {
        if (isFirst) {
          this.error = 'Não foi possível carregar as promoções. Tente novamente mais tarde.';
        } else {
          this.loadMoreError = 'Não foi possível carregar mais promoções. Tente novamente.';
        }
        this.loading = false;
        this.loadingMore = false;
      },
    });
  }

  /**
   * Registers the currently displayed feed state with the notification stream service
   * so it can compare against the server's state and show a stale-feed badge.
   */
  private registerDisplayedSnapshot(promotions: Promotion[], totalElements?: number): void {
    const latestPublishedAt = promotions.length > 0
      ? (promotions[0].publishedAt || promotions[0].createdAt || null)
      : null;

    this.notificationStream.setDisplayedFeedSnapshot({
      publishedCount: totalElements ?? promotions.length,
      latestPublishedAt,
    });
  }
}
