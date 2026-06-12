import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { Comment } from '../../core/models/comment.model';
import {
  COMMENTS_MOCK,
  getPromotionCommentCount,
  getRootPromotionComments
} from '../../core/mocks/comments.mock';
import { APPROVED_PROMOTIONS_MOCK } from '../../core/mocks/promotions.mock';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PromotionContextComponent } from '../../shared/components/promotion-card/promotion-context.component';
import { PromotionImageComponent } from '../../shared/components/promotion-image/promotion-image.component';
import { PromotionPriceComponent } from '../../shared/components/promotion-price/promotion-price.component';
import { PromotionTrustSignalsComponent } from '../../shared/components/promotion-card/promotion-trust-signals.component';
import { PromotionVoteButtonsComponent } from '../../shared/components/promotion-card/promotion-vote-buttons.component';

interface CommentReply {
  id: string;
  commentId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

@Component({
  selector: 'app-promotion-detail',
  standalone: true,
  imports: [
    DatePipe,
    EmptyStateComponent,
    FormsModule,
    NgFor,
    NgIf,
    PromotionContextComponent,
    PromotionImageComponent,
    PromotionPriceComponent,
    PromotionTrustSignalsComponent,
    PromotionVoteButtonsComponent
  ],
  templateUrl: './promotion-detail.component.html',
  styleUrl: './promotion-detail.component.scss'
})
export class PromotionDetailComponent {
  private readonly commentsPageSize = 5;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly promotion = APPROVED_PROMOTIONS_MOCK.find(
    (item) => item.id === this.route.snapshot.paramMap.get('id')
  );
  readonly comments = this.promotion ? getRootPromotionComments(this.promotion.id) : [];
  readonly replyDrafts: Record<string, string> = {};
  readonly openReplyForms: Record<string, boolean> = {};
  readonly localRepliesByComment: Record<string, CommentReply[]> = {};
  visibleCommentsCount = this.commentsPageSize;

  get visibleComments() {
    return this.comments.slice(0, this.visibleCommentsCount);
  }

  get totalCommentsCount() {
    const mockedCount = this.promotion ? getPromotionCommentCount(this.promotion.id) : 0;
    const localRepliesCount = Object.values(this.localRepliesByComment).reduce(
      (total, replies) => total + replies.length,
      0
    );

    return mockedCount + localRepliesCount;
  }

  get shownCommentsCount() {
    return this.visibleComments.reduce(
      (total, comment) => total + 1 + this.getCommentReplies(comment).length,
      0
    );
  }

  get hasMoreComments() {
    return this.visibleCommentsCount < this.comments.length;
  }

  get externalOfferUrl() {
    return this.promotion?.offerUrl || this.promotion?.storeUrl || '';
  }

  get externalOfferLabel() {
    const destinationName = this.normalizeDestinationName(
      this.promotion?.sellerName?.trim() ||
        this.promotion?.trustedStoreName?.trim() ||
        this.promotion?.storeName?.trim() ||
        '',
    );

    return destinationName ? `Acessar oferta na ${destinationName}` : 'Acessar oferta';
  }

  getCommentReplies(comment: Comment) {
    const mockedReplies = COMMENTS_MOCK.filter((reply) => reply.parentCommentId === comment.id).map((reply) => ({
      id: reply.id,
      commentId: comment.id,
      authorName: reply.author.name,
      content: reply.content,
      createdAt: reply.createdAt
    }));

    return [...mockedReplies, ...(this.localRepliesByComment[comment.id] ?? [])];
  }

  toggleReplyForm(comment: Comment) {
    this.openReplyForms[comment.id] = !this.openReplyForms[comment.id];
  }

  addReply(comment: Comment) {
    const content = this.replyDrafts[comment.id]?.trim();

    if (!content) {
      return;
    }

    const nextReply: CommentReply = {
      id: `reply-${comment.id}-${Date.now()}`,
      commentId: comment.id,
      authorName: 'Você',
      content,
      createdAt: new Date().toISOString()
    };

    this.localRepliesByComment[comment.id] = [...(this.localRepliesByComment[comment.id] ?? []), nextReply];
    this.replyDrafts[comment.id] = '';
    this.openReplyForms[comment.id] = false;
  }

  loadMoreComments() {
    this.visibleCommentsCount = Math.min(
      this.visibleCommentsCount + this.commentsPageSize,
      this.comments.length
    );
  }

  returnToPromotionsList() {
    void this.router.navigate(['/promocoes'], {
      queryParams: this.promotion ? { highlight: this.promotion.id } : undefined,
    });
  }

  private normalizeDestinationName(destinationName: string) {
    return destinationName.toLowerCase() === 'amazon.com.br' ? 'Amazon' : destinationName;
  }
}
