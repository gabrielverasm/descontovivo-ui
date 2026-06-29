import { DatePipe } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, map, Subscription, switchMap } from 'rxjs';

import { Comment } from '../../core/models/comment.model';
import { Promotion } from '../../core/models/promotion.model';
import { AuthService } from '../../core/services/auth.service';
import { CommentService } from '../../core/services/comment.service';
import { ModerationDecisionRequest, ModerationService } from '../../core/services/moderation.service';
import { PromotionService } from '../../core/services/promotion.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PromotionContextComponent } from '../../shared/components/promotion-card/promotion-context.component';
import { PromotionImageComponent } from '../../shared/components/promotion-image/promotion-image.component';
import { PromotionPriceComponent } from '../../shared/components/promotion-price/promotion-price.component';
import { PromotionTrustSignalsComponent } from '../../shared/components/promotion-card/promotion-trust-signals.component';
import { PromotionVoteButtonsComponent } from '../../shared/components/promotion-card/promotion-vote-buttons.component';

import { FloatingFieldComponent } from '../../shared/components/floating-field/floating-field.component';
import { RelatedPromotionItemComponent } from '../../shared/components/related-promotion-item/related-promotion-item.component';

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
    RouterLink,
    PromotionContextComponent,
    PromotionImageComponent,
    PromotionPriceComponent,
    PromotionTrustSignalsComponent,
    PromotionVoteButtonsComponent,
    FloatingFieldComponent,
    RelatedPromotionItemComponent
  ],
  templateUrl: './promotion-detail.component.html',
  styleUrl: './promotion-detail.component.scss'
})
export class PromotionDetailComponent implements AfterViewInit, OnDestroy {
  @ViewChild('backButtonAnchor') backButtonAnchor?: ElementRef<HTMLElement>;

  isFloatingBackVisible = false;
  isFloatingBackAnimating = false;

  private backButtonObserver?: IntersectionObserver;
  private floatingBackAnimationTimeout?: ReturnType<typeof setTimeout>;
  private allPromotions: Promotion[] = [];
  private readonly relatedPageSize = 3;
  private readonly commentsPageSize = 5;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly meta = inject(Meta);
  private readonly titleService = inject(Title);
  private readonly promotionService = inject(PromotionService);
  private readonly commentService = inject(CommentService);
  private readonly authService = inject(AuthService);
  private readonly moderationService = inject(ModerationService);

  // Admin state
  isEditMode = false;
  isAdminSaving = false;
  isRemoveConfirm = false;
  adminMessage = '';
  adminError = '';
  editForm = { title: '', description: '', url: '', currentPrice: '', originalPrice: '', couponCode: '', storeSlug: '' };

  get canModerate(): boolean { return this.authService.canModerate(); }
  get isAdmin(): boolean { return this.authService.hasRole('admin'); }
  private allComments: Comment[] = [];
  private commentCount = 0;
  promotion?: Promotion;
  comments: Comment[] = [];
  readonly replyDrafts: Record<string, string> = {};
  readonly openReplyForms: Record<string, boolean> = {};
  readonly localRepliesByComment: Record<string, CommentReply[]> = {};
  relatedPage = 0;
  relatedExpanded = false;
  visibleCommentsCount = this.commentsPageSize;
  relatedPromotions: Promotion[] = [];

  private readonly routeSubscription: Subscription = this.route.paramMap.pipe(
    switchMap((params) => {
      const id = params.get('id') || '';
      return forkJoin({
        promotions: this.promotionService.getApprovedPromotions(),
        comments: this.commentService.getRootCommentsByPromotionId(id),
        allComments: this.commentService.getAllComments(),
        commentCount: this.commentService.getCommentCountByPromotionId(id)
      }).pipe(map((data) => ({ ...data, id })));
    })
  ).subscribe(({ promotions, comments, allComments, commentCount, id }) => {
    this.allPromotions = promotions;
    this.allComments = allComments;
    this.commentCount = commentCount;
    this.setPromotion(id, comments);
  });

  get visibleComments() {
    return this.comments.slice(0, this.visibleCommentsCount);
  }

  get totalCommentsCount() {
    const localRepliesCount = Object.values(this.localRepliesByComment).reduce(
      (total, replies) => total + replies.length,
      0
    );

    return this.commentCount + localRepliesCount;
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

  get visibleRelatedPageNumbers(): Array<number | 'ellipsis'> {
    const total = this.relatedPageCount;
    const current = this.relatedPage + 1;
    if (total <= 5) return this.relatedPages;
    if (current <= 3) return [1, 2, 3, 4, 'ellipsis', total];
    if (current >= total - 2) return [1, 'ellipsis', total - 3, total - 2, total - 1, total];
    return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total];
  }

  get visibleRelatedPromotions() {
    const start = this.relatedPage * this.relatedPageSize;
    return this.relatedPromotions.slice(start, start + this.relatedPageSize);
  }

  get hasRelatedPagination() {
    return this.relatedPromotions.length > this.relatedPageSize;
  }

  get externalOfferUrl() {
    return this.promotion?.url || this.promotion?.offerUrl || this.promotion?.storeUrl || '';
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
    const mockedReplies = this.allComments.filter((reply) => reply.parentCommentId === comment.id).map((reply) => ({
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

  get publisherName(): string {
    return this.promotion?.authorUsername || this.promotion?.createdBy || 'Usuário';
  }

  get publishedAgo(): string {
    const diffMs = Math.max(0, Date.now() - new Date(this.promotion!.publishedAt || this.promotion!.createdAt).getTime());
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

  openEditMode() {
    if (!this.promotion) return;
    this.editForm = {
      title: this.promotion.title,
      description: this.promotion.description,
      url: this.promotion.url || this.promotion.offerUrl || this.promotion.storeUrl || '',
      currentPrice: this.promotion.currentPrice?.toString() ?? '',
      originalPrice: this.promotion.originalPrice?.toString() ?? '',
      couponCode: this.promotion.couponCode ?? '',
      storeSlug: this.promotion.store?.slug ?? ''
    };
    this.isEditMode = true;
    this.adminMessage = '';
    this.adminError = '';
  }

  cancelEdit() {
    this.isEditMode = false;
    this.adminError = '';
  }

  submitEdit() {
    if (!this.promotion || this.isAdminSaving) return;
    const f = this.editForm;
    if (!f.title.trim() || !f.url.trim() || !f.currentPrice.trim()) {
      this.adminError = 'Título, URL e preço atual são obrigatórios.';
      return;
    }
    const price = parseFloat(f.currentPrice);
    if (isNaN(price) || price <= 0) {
      this.adminError = 'Preço atual inválido.';
      return;
    }
    const req: ModerationDecisionRequest = {
      action: 'EDIT',
      reason: 'Ajuste administrativo no detalhe da promoção',
      title: f.title.trim(),
      url: f.url.trim(),
      description: f.description.trim() || undefined,
      currentPrice: price
    };
    const origPrice = parseFloat(f.originalPrice);
    if (!isNaN(origPrice) && origPrice > 0) req.originalPrice = origPrice;
    if (f.couponCode.trim()) req.couponCode = f.couponCode.trim();
    if (f.storeSlug.trim()) req.storeSlug = f.storeSlug.trim();
    this.isAdminSaving = true;
    this.adminError = '';
    this.moderationService.decide(this.promotion.id, req).subscribe({
      next: (updated) => {
        this.promotion = this.normalizeUpdated(updated);
        const idx = this.allPromotions.findIndex((p) => p.id === updated.id);
        if (idx >= 0) this.allPromotions[idx] = this.promotion;
        this.isEditMode = false;
        this.isAdminSaving = false;
        this.adminMessage = 'Promoção atualizada com sucesso.';
      },
      error: () => {
        this.isAdminSaving = false;
        this.adminError = 'Não foi possível salvar as alterações.';
      }
    });
  }

  confirmRemove() {
    this.isRemoveConfirm = true;
    this.adminMessage = '';
    this.adminError = '';
  }

  cancelRemove() {
    this.isRemoveConfirm = false;
  }

  executeRemove() {
    if (!this.promotion || this.isAdminSaving) return;
    this.isAdminSaving = true;
    this.adminError = '';
    this.moderationService.decide(this.promotion.id, {
      action: 'REMOVE',
      reason: 'Removida pelo administrador'
    }).subscribe({
      next: () => {
        this.isAdminSaving = false;
        this.isRemoveConfirm = false;
        void this.router.navigate(['/promocoes']);
      },
      error: () => {
        this.isAdminSaving = false;
        this.adminError = 'Erro ao remover. Tente novamente.';
      }
    });
  }

  ngAfterViewInit(): void {
    const target = this.backButtonAnchor?.nativeElement;

    if (!target || typeof IntersectionObserver === 'undefined') {
      return;
    }

    this.backButtonObserver = new IntersectionObserver(
      ([entry]) => {
        const shouldShow = !entry.isIntersecting;

        if (shouldShow && !this.isFloatingBackVisible) {
          this.isFloatingBackAnimating = true;
          clearTimeout(this.floatingBackAnimationTimeout);
          this.floatingBackAnimationTimeout = setTimeout(() => {
            this.isFloatingBackAnimating = false;
          }, 520);
        }

        this.isFloatingBackVisible = shouldShow;
      },
      { threshold: 0.1 }
    );

    this.backButtonObserver.observe(target);
  }

  ngOnDestroy() {
    this.backButtonObserver?.disconnect();
    clearTimeout(this.floatingBackAnimationTimeout);
    this.routeSubscription.unsubscribe();
  }

  private setPromotion(promotionId: string | null, comments?: Comment[]) {
    this.promotion = this.allPromotions.find(
      (promotion) => promotion.id === promotionId || promotion.slug === promotionId,
    );
    this.comments = comments ?? [];
    this.relatedPromotions = this.promotion ? this.findRelatedPromotions(this.promotion) : [];
    this.relatedPage = 0;
    this.visibleCommentsCount = this.commentsPageSize;
    this.updateSeoMeta();
  }

  private updateSeoMeta() {
    if (!this.promotion) {
      this.titleService.setTitle('Promoção não encontrada | DescontoVivo');
      this.meta.updateTag({ name: 'description', content: 'Confira as melhores promoções no DescontoVivo.' });
      return;
    }

    const { title, currentPrice, storeName } = this.promotion;
    const priceStr = currentPrice != null ? ` por R$${currentPrice.toFixed(2).replace('.', ',')}` : '';
    const storeStr = storeName ? ` em ${storeName}` : '';

    this.titleService.setTitle(`${title} | DescontoVivo`);
    this.meta.updateTag({ name: 'description', content: `Veja a promoção ${title}${priceStr}${storeStr} no DescontoVivo.` });
  }

  private normalizeDestinationName(destinationName: string) {
    return destinationName.toLowerCase() === 'amazon.com.br' ? 'Amazon' : destinationName;
  }

  private findRelatedPromotions(currentPromotion: Promotion) {
    const currentTags = new Set(currentPromotion.tags.map((tag) => tag.toLowerCase()));
    const currentTitleWords = this.getTitleWords(currentPromotion.title);
    const scoredPromotions = this.allPromotions.filter((promotion) => promotion.id !== currentPromotion.id)
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
    const fallbackPromotions = this.allPromotions.filter(
      (promotion) => promotion.id !== currentPromotion.id && !relatedIds.has(promotion.id),
    ).sort((firstPromotion, secondPromotion) => (
      this.getPromotionDateTime(secondPromotion) - this.getPromotionDateTime(firstPromotion)
    ));

    return [...relatedPromotions, ...fallbackPromotions];
  }

  private normalizeUpdated(p: Partial<Promotion> & { id: string }): Promotion {
    const base = this.promotion!;
    return {
      ...base,
      ...p,
      url: p.url || p.offerUrl || base.url || base.offerUrl || '',
      offerUrl: p.url || p.offerUrl || base.offerUrl || base.url || '',
      storeUrl: p.storeUrl || base.storeUrl || '',
      storeName: p.storeName || p.store?.name || base.storeName || '',
      tags: p.tags || base.tags || [],
      likesCount: p.likesCount ?? base.likesCount ?? 0,
      dislikesCount: p.dislikesCount ?? base.dislikesCount ?? 0,
      commentsCount: p.commentsCount ?? base.commentsCount ?? 0,
      status: p.status || base.status || 'approved',
      createdBy: p.createdBy || base.createdBy || '',
      createdAt: p.createdAt || base.createdAt,
      publishedAt: p.publishedAt || base.publishedAt || p.createdAt || base.createdAt,
      imageUrl: p.imageUrl || base.imageUrl || '',
      description: p.description ?? base.description,
      currentPrice: p.currentPrice ?? base.currentPrice,
      originalPrice: p.originalPrice ?? base.originalPrice,
      couponCode: p.couponCode ?? base.couponCode,
      category: p.category || base.category || '',
    } as Promotion;
  }

  private getPromotionDateTime(promotion: Promotion) {
    return new Date(promotion.publishedAt || promotion.createdAt).getTime();
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
