import { NgFor, NgIf } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { APPROVED_PROMOTIONS_MOCK } from '../../core/mocks/promotions.mock';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PromotionCardComponent } from '../../shared/components/promotion-card/promotion-card.component';

@Component({
  selector: 'app-promotions',
  standalone: true,
  imports: [EmptyStateComponent, FormsModule, NgFor, NgIf, PromotionCardComponent],
  templateUrl: './promotions.component.html',
  styleUrl: './promotions.component.scss'
})
export class PromotionsComponent implements AfterViewInit, OnDestroy {
  private readonly pageSize = 6;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private highlightTimeoutId: ReturnType<typeof setTimeout> | undefined;
  private scrollTimeoutId: ReturnType<typeof setTimeout> | undefined;
  private queryParamSubscription: Subscription | undefined;
  private intersectionObserver: IntersectionObserver | undefined;

  @ViewChild('loadMoreAnchor') loadMoreAnchorRef: ElementRef<HTMLElement> | undefined;

  highlightedPromotionId = '';
  query = '';
  visibleCount = this.pageSize;
  readonly promotions = APPROVED_PROMOTIONS_MOCK;

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
