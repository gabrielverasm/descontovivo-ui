import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Meta } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { Promotion } from '../../core/models/promotion.model';
import { PromotionService } from '../../core/services/promotion.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PromotionCardComponent } from '../../shared/components/promotion-card/promotion-card.component';

@Component({
  selector: 'app-promotions',
  standalone: true,
  imports: [EmptyStateComponent, FormsModule, PromotionCardComponent],
  templateUrl: './promotions.component.html',
  styleUrl: './promotions.component.scss'
})
export class PromotionsComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly pageSize = 6;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly meta = inject(Meta);
  private readonly promotionService = inject(PromotionService);
  private highlightTimeoutId: ReturnType<typeof setTimeout> | undefined;
  private scrollTimeoutId: ReturnType<typeof setTimeout> | undefined;
  private queryParamSubscription: Subscription | undefined;
  private promotionsSubscription: Subscription | undefined;
  private intersectionObserver: IntersectionObserver | undefined;

  @ViewChild('loadMoreAnchor') loadMoreAnchorRef: ElementRef<HTMLElement> | undefined;

  constructor() {
    this.meta.updateTag({ name: 'description', content: 'Encontre promoções compartilhadas pela comunidade no DescontoVivo, com ofertas revisadas, contexto de compra e sinais de confiança.' });
  }

  highlightedPromotionId = '';
  query = '';
  visibleCount = this.pageSize;
  promotions: Promotion[] = [];

  ngOnInit() {
    this.promotionsSubscription = this.promotionService.getApprovedPromotions().subscribe((data) => {
      this.promotions = data;
    });
  }

  ngAfterViewInit() {
    this.queryParamSubscription = this.route.queryParamMap.subscribe((params) => {
      this.highlightPromotion(params.get('highlight') || '');
    });

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && this.hasMorePromotions) {
          this.loadMorePromotions();
        }
      },
      { rootMargin: '120px' }
    );

    if (this.loadMoreAnchorRef) {
      this.intersectionObserver.observe(this.loadMoreAnchorRef.nativeElement);
    }
  }

  ngOnDestroy() {
    this.clearHighlightTimeout();
    this.queryParamSubscription?.unsubscribe();
    this.promotionsSubscription?.unsubscribe();
    this.intersectionObserver?.disconnect();
  }

  get filteredPromotions() {
    const term = this.query.trim().toLowerCase();

    if (!term) {
      return this.promotions;
    }

    return this.promotions.filter((promotion) => {
      const searchable = [
        promotion.title,
        promotion.description,
        promotion.storeName,
        promotion.category,
        ...promotion.tags
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(term);
    });
  }

  get visiblePromotions() {
    return this.filteredPromotions.slice(0, this.visibleCount);
  }

  get hasMorePromotions() {
    return this.visibleCount < this.filteredPromotions.length;
  }

  loadMorePromotions() {
    this.visibleCount = Math.min(this.visibleCount + this.pageSize, this.filteredPromotions.length);
  }

  resetVisiblePromotions() {
    this.visibleCount = this.pageSize;
  }

  private highlightPromotion(promotionId: string) {
    if (!promotionId) {
      return;
    }

    this.clearHighlightTimeout();
    this.query = '';
    const promotionIndex = this.promotions.findIndex((promotion) => promotion.id === promotionId);

    if (promotionIndex < 0) {
      return;
    }

    this.visibleCount = Math.max(this.pageSize, promotionIndex + 1);

    this.scrollTimeoutId = window.setTimeout(() => {
      const target = document.querySelector<HTMLElement>(`[data-promotion-id="${promotionId}"]`);

      if (!target) {
        return;
      }

      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
      this.highlightedPromotionId = promotionId;
      this.router.navigate([], {
        queryParams: { highlight: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
      this.highlightTimeoutId = window.setTimeout(() => {
        this.highlightedPromotionId = '';
      }, 3600);
    });
  }

  private clearHighlightTimeout() {
    if (this.highlightTimeoutId) {
      window.clearTimeout(this.highlightTimeoutId);
    }

    if (this.scrollTimeoutId) {
      window.clearTimeout(this.scrollTimeoutId);
    }
  }
}
