import { Component, inject, Input } from '@angular/core';

import { Promotion } from '../../../core/models/promotion.model';
import { VoteService, PriceVote } from '../../../core/services/vote.service';

@Component({
  selector: 'app-promotion-vote-buttons',
  standalone: true,
  templateUrl: './promotion-vote-buttons.component.html',
  styleUrl: './promotion-vote-buttons.component.scss',
})
export class PromotionVoteButtonsComponent {
  private readonly voteService = inject(VoteService);

  userPriceVote: PriceVote = null;
  localLikesCount = 0;
  localDislikesCount = 0;
  @Input() contextLabel = 'preço';

  private promotionSlug = '';
  voting = false;

  @Input()
  set promotion(promotion: Promotion | undefined) {
    if (!promotion) return;
    this.promotionSlug = promotion.slug || promotion.id;
    this.localLikesCount = promotion.likesCount;
    this.localDislikesCount = promotion.dislikesCount ?? 0;
    this.userPriceVote = null;
  }

  @Input()
  set likesCount(likesCount: number | undefined) {
    this.localLikesCount = likesCount ?? 0;
  }

  @Input()
  set dislikesCount(dislikesCount: number | undefined) {
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
    if (this.voting || !this.promotionSlug) return;

    if (this.userPriceVote === 'LIKE') {
      this.callRemoveVote();
    } else {
      this.callVote('LIKE');
    }
  }

  toggleDislikePrice() {
    if (this.voting || !this.promotionSlug) return;

    if (this.userPriceVote === 'DISLIKE') {
      this.callRemoveVote();
    } else {
      this.callVote('DISLIKE');
    }
  }

  private callVote(type: 'LIKE' | 'DISLIKE') {
    const prevLikes = this.localLikesCount;
    const prevDislikes = this.localDislikesCount;
    const prevVote = this.userPriceVote;

    // Optimistic update
    if (prevVote === 'LIKE') this.localLikesCount = Math.max(0, this.localLikesCount - 1);
    if (prevVote === 'DISLIKE') this.localDislikesCount = Math.max(0, this.localDislikesCount - 1);
    if (type === 'LIKE') this.localLikesCount += 1;
    if (type === 'DISLIKE') this.localDislikesCount += 1;
    this.userPriceVote = type;

    this.voting = true;
    this.voteService.vote(this.promotionSlug, type).subscribe({
      next: (res) => {
        this.localLikesCount = res.likesCount;
        this.localDislikesCount = res.dislikesCount;
        this.userPriceVote = res.userVote;
        this.voting = false;
      },
      error: () => {
        // Rollback
        this.localLikesCount = prevLikes;
        this.localDislikesCount = prevDislikes;
        this.userPriceVote = prevVote;
        this.voting = false;
      },
    });
  }

  private callRemoveVote() {
    const prevLikes = this.localLikesCount;
    const prevDislikes = this.localDislikesCount;
    const prevVote = this.userPriceVote;

    // Optimistic update
    if (prevVote === 'LIKE') this.localLikesCount = Math.max(0, this.localLikesCount - 1);
    if (prevVote === 'DISLIKE') this.localDislikesCount = Math.max(0, this.localDislikesCount - 1);
    this.userPriceVote = null;

    this.voting = true;
    this.voteService.removeVote(this.promotionSlug).subscribe({
      next: (res) => {
        this.localLikesCount = res.likesCount;
        this.localDislikesCount = res.dislikesCount;
        this.userPriceVote = res.userVote;
        this.voting = false;
      },
      error: () => {
        // Rollback
        this.localLikesCount = prevLikes;
        this.localDislikesCount = prevDislikes;
        this.userPriceVote = prevVote;
        this.voting = false;
      },
    });
  }
}
