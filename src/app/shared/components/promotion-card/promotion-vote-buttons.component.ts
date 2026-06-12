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
  @Input() contextLabel = 'preço';

  @Input()
  set promotion(promotion: Promotion | undefined) {
    if (!promotion) {
      return;
    }

    this.userPriceVote = null;
    this.localLikesCount = promotion.likesCount;
    this.localDislikesCount = promotion.dislikesCount ?? 0;
  }

  @Input()
  set likesCount(likesCount: number | undefined) {
    this.userPriceVote = null;
    this.localLikesCount = likesCount ?? 0;
  }

  @Input()
  set dislikesCount(dislikesCount: number | undefined) {
    this.userPriceVote = null;
    this.localDislikesCount = dislikesCount ?? 0;
  }

  get likeAriaLabel() {
    return `Curti o ${this.contextLabel}`;
  }

  get dislikeAriaLabel() {
    return `Não curti o ${this.contextLabel}`;
  }

  get likeTitle() {
    return `${this.localLikesCount} pessoas curtiram o ${this.contextLabel}`;
  }

  get dislikeTitle() {
    return `${this.localDislikesCount} pessoas não curtiram o ${this.contextLabel}`;
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
