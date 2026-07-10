import { afterNextRender, Component, inject, Injector, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationStart, Router } from '@angular/router';
import { PromotionCardComponent } from '../../shared/components/promotion-card/promotion-card.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { PromotionService } from '../../core/services/promotion.service';
import { SeoService } from '../../core/services/seo.service';
import { StructuredDataService } from '../../core/services/structured-data.service';
import { Promotion } from '../../core/models/promotion.model';
import { PromotionsFeedStateService } from './promotions-feed-state.service';
import { PublicNotificationStreamService } from '../../core/services/public-notification-stream.service';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-promotions',
  standalone: true,
  imports: [FormsModule, PromotionCardComponent, LoadingStateComponent],
  templateUrl: './promotions.component.html',
  styleUrl: './promotions.component.scss',
})
export class PromotionsComponent implements OnInit, OnDestroy {
  private readonly promotionService = inject(PromotionService);
  private readonly seo = inject(SeoService);
  private readonly structuredData = inject(StructuredDataService);
  private readonly feedState = inject(PromotionsFeedStateService);
  private readonly notificationStream = inject(PublicNotificationStreamService);
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);

  private readonly pageSize = 12;
  private currentPage = 0;
  private totalPages = 1;
  private totalElements = 0;
  private pendingScrollY: number | null = null;
  private notificationSub: Subscription | null = null;
  private navigationSub: Subscription | null = null;
  private lastKnownScrollY = 0;

  promotions: Promotion[] = [];
  loading = true;
  loadingMore = false;
  error = '';
  loadMoreError = '';
  newPromotionsCount = 0;
  query = '';
  private isSearchActive = false;

  // Auto-load timer properties
  autoLoadEnabled = false;
  autoLoadCountdown = 5;
  autoLoadStoppedByUser = false;
  private autoLoadIntervalId: ReturnType<typeof setInterval> | null = null;

  get hasMore(): boolean {
    if (this.isSearchActive) return false;
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

    // Save scrollY when navigation starts (before AppComponent's scroll-to-top on NavigationEnd)
    this.navigationSub = this.router.events
      .pipe(filter((e): e is NavigationStart => e instanceof NavigationStart))
      .subscribe(() => {
        this.lastKnownScrollY = window.scrollY;
      });

    const saved = this.feedState.restore();
    if (saved) {
      this.promotions = saved.promotions;
      this.currentPage = saved.currentPage;
      this.totalPages = saved.totalPages;
      this.totalElements = saved.totalElements ?? 0;
      this.query = saved.query ?? '';
      this.isSearchActive = !!saved.query;
      this.loading = false;
      this.pendingScrollY = saved.scrollY;

      // Register the cached/displayed feed snapshot so the SSE service
      // can detect staleness even when using cached data
      this.registerDisplayedSnapshot(saved.promotions, saved.totalElements);

      // Restore scroll position after the view renders the cached items
      afterNextRender(() => {
        if (this.pendingScrollY !== null) {
          window.scrollTo(0, this.pendingScrollY);
          this.pendingScrollY = null;
        }
      }, { injector: this.injector });
    } else {
      this.loadPage(0);
    }
  }

  ngOnDestroy(): void {
    this.stopAutoLoad();
    this.notificationSub?.unsubscribe();
    this.navigationSub?.unsubscribe();
    this.structuredData.removeStructuredData('sd-website');
    this.structuredData.removeStructuredData('sd-organization');
    this.feedState.save({
      promotions: this.promotions,
      currentPage: this.currentPage,
      totalPages: this.totalPages,
      totalElements: this.totalElements,
      scrollY: this.lastKnownScrollY || window.scrollY,
      query: this.query || undefined,
    });
  }

  refreshFeed(): void {
    this.loading = true;
    this.error = '';
    this.autoLoadStoppedByUser = false; // Reset user stopped flag

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
    this.stopAutoLoad(); // Stop auto-load without marking as stopped by user
    this.loadPage(this.currentPage + 1);
  }

  /**
   * Handle button click for load more
   */
  onLoadMoreButtonClick(): void {
    if (this.loadingMore || !this.hasMore) return;

    // If auto-load is enabled, stop it (mark as stopped by user)
    if (this.autoLoadEnabled) {
      this.stopAutoLoad(true);
      return;
    }

    // If auto-load was stopped by user, reset the flag before loading
    this.autoLoadStoppedByUser = false;
    this.loadMore();
  }

  /**
   * Toggle auto-load timer (legacy, kept for reference)
   */
  toggleAutoLoad(): void {
    if (this.autoLoadEnabled) {
      this.stopAutoLoad(true); // User stopped it
    } else {
      this.startAutoLoad();
    }
  }

  /**
   * Start auto-load timer
   */
  startAutoLoad(): void {
    if (!this.hasMore || this.loadingMore) return;

    // Clear any existing interval before creating a new one
    if (this.autoLoadIntervalId) {
      clearInterval(this.autoLoadIntervalId);
      this.autoLoadIntervalId = null;
    }

    this.autoLoadEnabled = true;
    this.autoLoadCountdown = 5;

    this.autoLoadIntervalId = setInterval(() => {
      this.autoLoadCountdown--;

      if (this.autoLoadCountdown <= 0) {
        this.executeAutoLoad();
      }
    }, 1000);
  }

  /**
   * Stop auto-load timer
   * @param byUser - true if user manually stopped the auto-load
   */
  stopAutoLoad(byUser = false): void {
    this.autoLoadEnabled = false;
    this.autoLoadCountdown = 5;

    if (this.autoLoadIntervalId) {
      clearInterval(this.autoLoadIntervalId);
      this.autoLoadIntervalId = null;
    }

    if (byUser) {
      this.autoLoadStoppedByUser = true;
    }
  }

  /**
   * Execute auto-load when timer reaches zero
   */
  private executeAutoLoad(): void {
    if (!this.hasMore || this.loadingMore) {
      this.stopAutoLoad();
      return;
    }
    
    // Reset countdown and load next page
    this.autoLoadCountdown = 5;
    this.loadPage(this.currentPage + 1);
  }

  onSearch(): void {
    const term = this.query.trim();
    if (!term) {
      this.clearSearch();
      return;
    }
    this.autoLoadStoppedByUser = false; // Reset user stopped flag
    this.isSearchActive = true;
    this.loading = true;
    this.error = '';
    this.promotionService.searchPromotions(term).subscribe({
      next: (results) => {
        this.promotions = results;
        this.currentPage = 0;
        this.totalPages = 1;
        this.loading = false;
      },
      error: () => {
        this.error = 'Não foi possível realizar a busca. Tente novamente.';
        this.loading = false;
      },
    });
  }

  onSearchClear(): void {
    // Fired by the native "search" event when user clicks the X on type=search
    if (!this.query) {
      this.clearSearch();
    }
  }

  clearSearch(): void {
    this.query = '';
    if (this.isSearchActive) {
      this.isSearchActive = false;
      this.loadPage(0);
    }
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

        // After manual load, restart auto-load if there are more pages
        // But only if auto-load was not manually stopped
        if (!isFirst && !this.autoLoadEnabled && this.hasMore && !this.autoLoadStoppedByUser && !this.isSearchActive) {
          // User manually loaded, restart auto-load immediately with appropriate conditions
          this.startAutoLoad();
        }

        // After first page load, start auto-load if there are more pages
        if (isFirst && !this.autoLoadEnabled && this.hasMore && !this.isSearchActive && !this.autoLoadStoppedByUser) {
          this.startAutoLoad();
        }

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
