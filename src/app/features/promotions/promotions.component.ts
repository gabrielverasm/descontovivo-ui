import { NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

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
export class PromotionsComponent {
  private readonly pageSize = 6;

  query = '';
  visibleCount = this.pageSize;
  readonly promotions = APPROVED_PROMOTIONS_MOCK;

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

}
