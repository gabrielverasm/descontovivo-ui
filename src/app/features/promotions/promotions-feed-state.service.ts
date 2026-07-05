import { Injectable } from '@angular/core';

import { Promotion } from '../../core/models/promotion.model';

export interface FeedState {
  promotions: Promotion[];
  currentPage: number;
  totalPages: number;
  totalElements?: number;
  scrollY: number;
}

/**
 * Preserves the promotions feed state (loaded items, page, scroll position)
 * so that navigating back to the feed restores the user's previous view.
 */
@Injectable({ providedIn: 'root' })
export class PromotionsFeedStateService {
  private state: FeedState | null = null;

  save(state: FeedState): void {
    this.state = state;
  }

  restore(): FeedState | null {
    return this.state;
  }

  clear(): void {
    this.state = null;
  }

  get hasSavedState(): boolean {
    return this.state !== null && this.state.promotions.length > 0;
  }
}
