import { Component, inject, OnInit } from '@angular/core';
import { PromotionCardComponent } from '../../shared/components/promotion-card/promotion-card.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { PromotionService } from '../../core/services/promotion.service';
import { SeoService } from '../../core/services/seo.service';
import { Promotion } from '../../core/models/promotion.model';

@Component({
  selector: 'app-promotions',
  standalone: true,
  imports: [PromotionCardComponent, LoadingStateComponent],
  templateUrl: './promotions.component.html',
  styleUrl: './promotions.component.scss',
})
export class PromotionsComponent implements OnInit {
  private readonly promotionService = inject(PromotionService);
  private readonly seo = inject(SeoService);

  private readonly pageSize = 12;
  private currentPage = 0;
  private totalPages = 1;

  promotions: Promotion[] = [];
  loading = true;
  loadingMore = false;
  error = '';
  loadMoreError = '';

  get hasMore(): boolean {
    return this.currentPage + 1 < this.totalPages;
  }

  ngOnInit(): void {
    this.seo.setIndexable({
      title: 'Promoções | DescontoVivo',
      description: 'DescontoVivo reúne promoções compartilhadas pela comunidade, com ofertas revisadas antes de aparecerem no site.',
      canonicalPath: '/'
    });
    this.loadPage(0);
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
        this.currentPage = res.number;
        this.totalPages = res.totalPages;
        this.loading = false;
        this.loadingMore = false;
        this.loadMoreError = '';
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
}
