import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Comment } from '../../core/models/comment.model';
import { Promotion } from '../../core/models/promotion.model';
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
    PromotionVoteButtonsComponent,
    RouterLink
  ],
  templateUrl: './promotion-detail.component.html',
  styleUrl: './promotion-detail.component.scss'
})
export class PromotionDetailComponent implements OnDestroy {
  private readonly relatedPageSize = 3;
  private readonly commentsPageSize = 5;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  promotion?: Promotion;
  comments: Comment[] = [];
  readonly replyDrafts: Record<string, string> = {};
  readonly openReplyForms: Record<string, boolean> = {};
  readonly localRepliesByComment: Record<string, CommentReply[]> = {};
  relatedPage = 0;
  visibleCommentsCount = this.commentsPageSize;
  relatedPromotions: Promotion[] = [];

  private readonly routeSubscription = this.route.paramMap.subscribe((params) => {
    this.setPromotion(params.get('id'));
  });

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

  get relatedPageCount() {
    return Math.ceil(this.relatedPromotions.length / this.relatedPageSize);
  }

  get relatedPages() {
    return Array.from({ length: this.relatedPageCount }, (_, index) => index + 1);
  }

  get visibleRelatedPromotions() {
    const start = this.relatedPage * this.relatedPageSize;
    return this.relatedPromotions.slice(start, start + this.relatedPageSize);
  }

  get hasRelatedPagination() {
    return this.relatedPromotions.length > this.relatedPageSize;
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

  showPreviousRelatedPromotions() {
    this.relatedPage = Math.max(0, this.relatedPage - 1);
  }

  showNextRelatedPromotions() {
    this.relatedPage = Math.min(this.relatedPageCount - 1, this.relatedPage + 1);
  }

  showRelatedPromotionsPage(page: number) {
    this.relatedPage = page - 1;
  }

  getPublishedAgo(createdAt: string) {
    const elapsedMilliseconds = Date.now() - new Date(createdAt).getTime();
    const elapsedHours = Math.max(1, Math.floor(elapsedMilliseconds / 3600000));

    if (elapsedHours < 24) {
      return `há ${elapsedHours} ${elapsedHours === 1 ? 'hora' : 'horas'}`;
    }

    const elapsedDays = Math.floor(elapsedHours / 24);
    return `há ${elapsedDays} ${elapsedDays === 1 ? 'dia' : 'dias'}`;
  }

  get publishedAgo(): string {
    const diffMs = Math.max(0, Date.now() - new Date(this.promotion!.createdAt).getTime());
    const m = 60000, h = 3600000, d = 86400000, w = 604800000, mo = 2592000000, y = 31536000000;
    if (diffMs < h) { const v = Math.floor(diffMs / m); return `há ${v} ${v === 1 ? 'minuto' : 'minutos'}`; }
    if (diffMs < d) { const v = Math.floor(diffMs / h); return `há ${v} ${v === 1 ? 'hora' : 'horas'}`; }
    if (diffMs < w) { const v = Math.floor(diffMs / d); return `há ${v} ${v === 1 ? 'dia' : 'dias'}`; }
    if (diffMs < mo) { const v = Math.min(4, Math.floor(diffMs / w)); return `há ${v} ${v === 1 ? 'semana' : 'semanas'}`; }
    if (diffMs < y) { const v = Math.min(12, Math.floor(diffMs / mo)); return `há ${v} ${v === 1 ? 'mês' : 'meses'}`; }
    const v = Math.floor(diffMs / y); return `há ${v} ${v === 1 ? 'ano' : 'anos'}`;
  }

  getAvatarColor(name: string): string {
    const colors = ['#172033', '#2563eb', '#7c3aed', '#0891b2', '#059669', '#dc2626', '#d97706'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  returnToPromotionsList() {
    void this.router.navigate(['/promocoes'], {
      queryParams: this.promotion ? { highlight: this.promotion.id } : undefined,
    });
  }

  ngOnDestroy() {
    this.routeSubscription.unsubscribe();
  }

  private setPromotion(promotionId: string | null) {
    this.promotion = APPROVED_PROMOTIONS_MOCK.find((promotion) => promotion.id === promotionId);
    this.comments = this.promotion ? getRootPromotionComments(this.promotion.id) : [];
    this.relatedPromotions = this.promotion ? this.findRelatedPromotions(this.promotion) : [];
    this.relatedPage = 0;
    this.visibleCommentsCount = this.commentsPageSize;
  }

  private normalizeDestinationName(destinationName: string) {
    return destinationName.toLowerCase() === 'amazon.com.br' ? 'Amazon' : destinationName;
  }

  private findRelatedPromotions(currentPromotion: Promotion) {
    const currentTags = new Set(currentPromotion.tags.map((tag) => tag.toLowerCase()));
    const currentTitleWords = this.getTitleWords(currentPromotion.title);
    const scoredPromotions = APPROVED_PROMOTIONS_MOCK.filter((promotion) => promotion.id !== currentPromotion.id)
      .map((promotion) => {
        const sharedTags = promotion.tags.filter((tag) => currentTags.has(tag.toLowerCase())).length;
        const titleWords = Array.from(this.getTitleWords(promotion.title));
        const sharedTitleWords = titleWords.filter((word: string) => currentTitleWords.has(word)).length;
        const score =
          (promotion.category === currentPromotion.category ? 10 : 0) +
          sharedTags * 5 +
          sharedTitleWords * 2;

        return { promotion, score };
      })
      .filter((item) => item.score > 0)
      .sort((firstItem, secondItem) => {
        const scoreDifference = secondItem.score - firstItem.score;

        if (scoreDifference !== 0) {
          return scoreDifference;
        }

        return this.getPromotionDateTime(secondItem.promotion) - this.getPromotionDateTime(firstItem.promotion);
      });

    const relatedPromotions = scoredPromotions.map((item) => item.promotion);

    if (relatedPromotions.length >= this.relatedPageSize) {
      return relatedPromotions;
    }

    const relatedIds = new Set(relatedPromotions.map((promotion) => promotion.id));
    const fallbackPromotions = APPROVED_PROMOTIONS_MOCK.filter(
      (promotion) => promotion.id !== currentPromotion.id && !relatedIds.has(promotion.id),
    ).sort((firstPromotion, secondPromotion) => (
      this.getPromotionDateTime(secondPromotion) - this.getPromotionDateTime(firstPromotion)
    ));

    return [...relatedPromotions, ...fallbackPromotions];
  }

  private getPromotionDateTime(promotion: Promotion) {
    return new Date(promotion.createdAt).getTime();
  }

  private getTitleWords(title: string) {
    return new Set(
      title
        .toLowerCase()
        .split(/\W+/)
        .filter((word) => word.length > 2),
    );
  }
}
