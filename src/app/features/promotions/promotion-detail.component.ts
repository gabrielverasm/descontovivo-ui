import { DatePipe } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map, Subscription, switchMap } from 'rxjs';

import { CommentResponse } from '../../core/models/comment.model';
import { Promotion } from '../../core/models/promotion.model';
import { AuthService } from '../../core/services/auth.service';
import { CommentService } from '../../core/services/comment.service';
import { ImageProcessingService } from '../../core/services/image-processing.service';
import { SeoService } from '../../core/services/seo.service';
import { ModerationDecisionRequest, ModerationService } from '../../core/services/moderation.service';
import { PromotionService } from '../../core/services/promotion.service';
import { UploadService } from '../../core/services/upload.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PromotionContextComponent } from '../../shared/components/promotion-card/promotion-context.component';
import { PromotionImageComponent } from '../../shared/components/promotion-image/promotion-image.component';
import { PromotionPriceComponent } from '../../shared/components/promotion-price/promotion-price.component';
import { PromotionTrustSignalsComponent } from '../../shared/components/promotion-card/promotion-trust-signals.component';
import { PromotionVoteButtonsComponent } from '../../shared/components/promotion-card/promotion-vote-buttons.component';
import { PromotionDetailAdminComponent } from './components/promotion-detail-admin/promotion-detail-admin.component';
import { PromotionDetailCommentsComponent } from './components/promotion-detail-comments/promotion-detail-comments.component';
import { PromotionDetailRelatedComponent } from './components/promotion-detail-related/promotion-detail-related.component';
import { formatCentsToBRL, numberToCents, parseBRLInputToNumber } from '../../shared/utils/money-input.util';
import { resolveStoreName } from '../../shared/utils/store-name.util';
import { isSoldAndDeliveredByAmazon, getAmazonTrustLabel } from '../../shared/utils/seller.util';
import { sharePromotion } from '../../shared/utils/share-promotion.util';

@Component({
  selector: 'app-promotion-detail',
  standalone: true,
  imports: [
    DatePipe,
    EmptyStateComponent,
    RouterLink,
    PromotionContextComponent,
    PromotionImageComponent,
    PromotionPriceComponent,
    PromotionTrustSignalsComponent,
    PromotionVoteButtonsComponent,
    PromotionDetailAdminComponent,
    PromotionDetailCommentsComponent,
    PromotionDetailRelatedComponent,
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
  private readonly promotionService = inject(PromotionService);
  private readonly commentService = inject(CommentService);
  private readonly authService = inject(AuthService);
  private readonly moderationService = inject(ModerationService);
  private readonly imageProcessing = inject(ImageProcessingService);
  private readonly uploadService = inject(UploadService);
  private readonly seo = inject(SeoService);

  // Admin state
  isEditMode = false;
  isAdminSaving = false;
  isRemoveConfirm = false;
  adminMessage = '';
  adminError = '';
  editForm = { title: '', url: '', currentPrice: '', originalPrice: '', couponCode: '', storeName: '', soldBy: '', deliveredBy: '', category: '', availability: '' };

  // Admin image upload
  adminImageBlob: Blob | null = null;
  adminImagePreviewUrl: string | null = null;
  adminImageSizeKB: number | null = null;
  adminImageError: string | null = null;
  adminImageStatus: 'idle' | 'processing' | 'ready' | 'uploading' | 'done' | 'error' = 'idle';

  get adminImageStatusText(): string | null {
    switch (this.adminImageStatus) {
      case 'processing': return 'Processando imagem…';
      case 'ready': return 'Nova imagem selecionada';
      case 'uploading': return 'Enviando imagem…';
      case 'done': return 'Upload concluído';
      default: return null;
    }
  }

  get canModerate(): boolean { return this.authService.canModerate(); }
  get isAdmin(): boolean { return this.authService.hasRole('admin'); }
  promotion?: Promotion;
  comments: CommentResponse[] = [];
  relatedPage = 0;
  relatedExpanded = false;
  visibleCommentsCount = this.commentsPageSize;
  relatedPromotions: Promotion[] = [];
  newCommentContent = '';
  isSubmittingComment = false;
  commentError = '';

  private readonly routeSubscription: Subscription = this.route.paramMap.pipe(
    switchMap((params) => {
      const id = params.get('id') || '';
      return this.promotionService.getApprovedPromotions().pipe(
        map((promotions) => ({ promotions, id }))
      );
    })
  ).subscribe(({ promotions, id }) => {
    this.allPromotions = promotions;
    this.setPromotion(id);
    this.loadComments();
  });

  get isAuthenticated(): boolean { return this.authService.canComment(); }

  get totalCommentsCount() {
    return this.comments.length || this.promotion?.commentsCount || 0;
  }

  loadComments() {
    const slug = this.promotion?.slug || this.promotion?.id;
    if (!slug) return;
    this.commentService.listByPromotion(slug).subscribe({
      next: (comments) => {
        this.comments = comments.filter((c) => !c.parentId);
        this.visibleCommentsCount = this.commentsPageSize;
      }
    });
  }

  submitComment() {
    const content = this.newCommentContent.trim();
    if (!content || this.isSubmittingComment) return;
    const slug = this.promotion?.slug || this.promotion?.id;
    if (!slug) return;
    this.isSubmittingComment = true;
    this.commentError = '';
    this.commentService.createComment(slug, content).subscribe({
      next: (created) => {
        this.newCommentContent = '';
        this.isSubmittingComment = false;
        this.comments = [created, ...this.comments];
        if (this.promotion) {
          this.promotion = { ...this.promotion, commentsCount: (this.promotion.commentsCount ?? 0) + 1 };
        }
      },
      error: () => {
        this.isSubmittingComment = false;
        this.commentError = 'Não foi possível publicar o comentário. Tente novamente.';
      }
    });
  }

  get externalOfferUrl() {
    return this.promotion?.url || this.promotion?.offerUrl || this.promotion?.storeUrl || '';
  }

  get isAmazonFulfillment(): boolean {
    return isSoldAndDeliveredByAmazon(this.promotion?.soldBy, this.promotion?.deliveredBy);
  }

  get amazonTrustLabel(): string {
    return getAmazonTrustLabel();
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

  loadMoreComments() {
    this.visibleCommentsCount = Math.min(
      this.visibleCommentsCount + this.commentsPageSize,
      this.comments.length
    );
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

  returnToPromotionsList() {
    void this.router.navigate(['/promocoes'], {
      queryParams: this.promotion ? { highlight: this.promotion.id } : undefined,
    });
  }

  sharePromotion() {
    if (!this.promotion) return;
    void sharePromotion(this.promotion);
  }

  openEditMode() {
    if (!this.promotion) return;
    this.editForm = {
      title: this.promotion.title,
      url: this.promotion.url || this.promotion.offerUrl || this.promotion.storeUrl || '',
      currentPrice: formatCentsToBRL(numberToCents(this.promotion.currentPrice)),
      originalPrice: this.promotion.originalPrice ? formatCentsToBRL(numberToCents(this.promotion.originalPrice)) : '',
      couponCode: this.promotion.couponCode ?? '',
      storeName: resolveStoreName(this.promotion.store?.name),
      soldBy: this.promotion.soldBy ?? '',
      deliveredBy: this.promotion.deliveredBy ?? '',
      category: this.promotion.category ?? '',
      availability: this.promotion.availability ?? '',
    };
    this.isEditMode = true;
    this.adminMessage = '';
    this.adminError = '';
  }

  cancelEdit() {
    this.isEditMode = false;
    this.adminError = '';
    this.resetAdminImage();
  }

  submitEdit() {
    if (!this.promotion || this.isAdminSaving) return;
    const f = this.editForm;
    if (!f.title.trim() || !f.url.trim() || !f.currentPrice.trim()) {
      this.adminError = 'Título, URL e preço atual são obrigatórios.';
      return;
    }
    const price = parseBRLInputToNumber(f.currentPrice);
    if (!price || price <= 0) {
      this.adminError = 'Preço atual inválido.';
      return;
    }

    this.isAdminSaving = true;
    this.adminError = '';

    this.doSubmitEdit(price).then();
  }

  private async doSubmitEdit(price: number): Promise<void> {
    const f = this.editForm;
    let imageKey: string | undefined;

    if (this.adminImageBlob && this.adminImageStatus === 'ready') {
      try {
        this.adminImageStatus = 'uploading';
        const result = await this.uploadService.uploadPromotionImage(this.adminImageBlob);
        imageKey = result.imageKey;
        this.adminImageStatus = 'done';
      } catch {
        this.adminImageStatus = 'error';
        this.adminImageError = 'Não foi possível enviar a nova imagem.';
        this.isAdminSaving = false;
        this.adminError = 'Não foi possível enviar a nova imagem.';
        return;
      }
    }

    const req: ModerationDecisionRequest = {
      action: 'EDIT',
      reason: 'Ajuste administrativo no detalhe da promoção',
      title: f.title.trim(),
      url: f.url.trim(),
      currentPrice: price
    };
    const origPrice = parseBRLInputToNumber(f.originalPrice);
    if (origPrice && origPrice > 0) req.originalPrice = origPrice;
    if (f.couponCode.trim()) req.couponCode = f.couponCode.trim();
    if (f.storeName.trim()) req.storeName = f.storeName.trim();
    if (imageKey) req.imageKey = imageKey;
    req.soldBy = f.soldBy.trim() || null;
    req.deliveredBy = f.deliveredBy.trim() || null;
    req.category = f.category.trim() || null;
    if (f.availability.trim()) req.availability = f.availability.trim();

    this.moderationService.decide(this.promotion!.id, req).subscribe({
      next: (updated) => {
        this.promotion = this.normalizeUpdated(updated);
        const idx = this.allPromotions.findIndex((p) => p.id === updated.id);
        if (idx >= 0) this.allPromotions[idx] = this.promotion;
        this.isEditMode = false;
        this.isAdminSaving = false;
        this.adminMessage = 'Promoção atualizada com sucesso.';
        this.resetAdminImage();
      },
      error: () => {
        this.isAdminSaving = false;
        this.adminError = 'Não foi possível salvar as alterações.';
      }
    });
  }

  async onAdminImageSelected(file: File): Promise<void> {
    this.resetAdminImage();
    const validationError = this.imageProcessing.validate(file);
    if (validationError) {
      this.adminImageError = validationError;
      this.adminImageStatus = 'error';
      return;
    }
    try {
      this.adminImageStatus = 'processing';
      const processed = await this.imageProcessing.process(file);
      this.adminImageBlob = processed.blob;
      this.adminImagePreviewUrl = processed.previewUrl;
      this.adminImageSizeKB = processed.sizeKB;
      this.adminImageStatus = 'ready';
    } catch {
      this.adminImageError = 'Falha ao processar imagem. Tente novamente.';
      this.adminImageStatus = 'error';
    }
  }

  removeAdminImage(): void {
    this.resetAdminImage();
  }

  private resetAdminImage(): void {
    if (this.adminImagePreviewUrl) URL.revokeObjectURL(this.adminImagePreviewUrl);
    this.adminImageBlob = null;
    this.adminImagePreviewUrl = null;
    this.adminImageSizeKB = null;
    this.adminImageError = null;
    this.adminImageStatus = 'idle';
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
    this.resetAdminImage();
    this.backButtonObserver?.disconnect();
    clearTimeout(this.floatingBackAnimationTimeout);
    this.routeSubscription.unsubscribe();
  }

  private setPromotion(promotionId: string | null) {
    this.promotion = this.allPromotions.find(
      (promotion) => promotion.id === promotionId || promotion.slug === promotionId,
    );
    this.comments = [];
    this.relatedPromotions = this.promotion ? this.findRelatedPromotions(this.promotion) : [];
    this.relatedPage = 0;
    this.visibleCommentsCount = this.commentsPageSize;
    this.updateSeoMeta();
  }

  private updateSeoMeta() {
    if (!this.promotion) {
      this.seo.setNonIndexable(
        'Promoção não encontrada | DescontoVivo',
        'Confira as melhores promoções no DescontoVivo.'
      );
      return;
    }

    const { title, currentPrice, storeName } = this.promotion;
    const priceStr = currentPrice != null ? ` por R$${currentPrice.toFixed(2).replace('.', ',')}` : '';
    const storeStr = storeName ? ` em ${storeName}` : '';

    this.seo.setIndexable({
      title: `${title} | DescontoVivo`,
      description: `Veja a promoção ${title}${priceStr}${storeStr} no DescontoVivo.`,
      canonicalPath: `/promocoes/${this.promotion.slug || this.promotion.id}`,
      imageUrl: this.promotion.imageUrl || undefined
    });
  }

  private normalizeDestinationName(destinationName: string) {
    const lower = destinationName.toLowerCase();
    if (lower === 'loja não identificada' || lower === 'loja-nao-identificada') return '';
    if (lower === 'amazon.com.br') return 'Amazon';
    return destinationName;
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
