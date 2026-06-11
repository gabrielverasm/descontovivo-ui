import { Component, Input } from '@angular/core';

import { Promotion } from '../../../core/models/promotion.model';

type PriceVote = 'like' | 'dislike' | null;

@Component({
  selector: 'app-promotion-vote-buttons',
  standalone: true,
  templateUrl: './promotion-vote-buttons.component.html',
  styleUrl: './promotion-vote-buttons.component.scss',
})
export class PromotionVoteButtonsComponent {
  userPriceVote: PriceVote = null;
  localLikesCount = 0;
  localDislikesCount = 0;

  @Input({ required: true })
  set promotion(promotion: Promotion) {
    this.userPriceVote = null;
    this.localLikesCount = promotion.likesCount;
    this.localDislikesCount = promotion.dislikesCount ?? 0;
  }

  toggleLikePrice() {
    if (this.userPriceVote === 'like') {
      this.localLikesCount = Math.max(0, this.localLikesCount - 1);
      this.userPriceVote = null;
      return;
    }

    if (this.userPriceVote === 'dislike') {
      this.localDislikesCount = Math.max(0, this.localDislikesCount - 1);
    }

    this.localLikesCount += 1;
    this.userPriceVote = 'like';
  }

  toggleDislikePrice() {
    if (this.userPriceVote === 'dislike') {
      this.localDislikesCount = Math.max(0, this.localDislikesCount - 1);
      this.userPriceVote = null;
      return;
    }

    if (this.userPriceVote === 'like') {
      this.localLikesCount = Math.max(0, this.localLikesCount - 1);
    }

    this.localDislikesCount += 1;
    this.userPriceVote = 'dislike';
  }
}
