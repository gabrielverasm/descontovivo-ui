import { DatePipe } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { CommentResponse } from '../../core/models/comment.model';
import { Promotion } from '../../core/models/promotion.model';
import { AuthService } from '../../core/services/auth.service';
import { CommentService } from '../../core/services/comment.service';
import { ImageProcessingService } from '../../core/services/image-processing.service';
import { SeoService } from '../../core/services/seo.service';
import { StructuredDataService } from '../../core/services/structured-data.service';
import { ModerationDecisionRequest, ModerationService } from '../../core/services/moderation.service';
import { PromotionService } from '../../core/services/promotion.service';
import { UploadService } from '../../core/services/upload.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
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
import { deriveTrustSignals, getMultipleTrustSignalsMetadata } from '../../shared/utils/trust-signals.util';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { buildClickStoreParams, buildShareParams, buildViewPromotionParams } from '../../core/analytics/analytics-events';
import { UI_VERSION } from '../../core/app-version';
import { PromotionsFeedStateService } from './promotions-feed-state.service';

@Component({
  selector: 'app-promotion-detail',
  standalone: true,
  imports: [
    DatePipe,
    EmptyStateComponent,
    LoadingStateComponent,
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
  private readonly structuredData = inject(StructuredDataService);
  private readonly analytics = inject(AnalyticsService);
  private readonly feedState = inject(PromotionsFeedStateService);

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

  // Trust signals methods
  get hasTrustSignals(): boolean {
    if (!this.promotion) return false;
    return !!(
      this.promotion.officialStore ||
      (this.promotion.salesCount && this.promotion.salesCount >= 1000) ||
      (this.promotion.productRating && this.promotion.productRating >= 4.7) ||
      (this.promotion.sellerRating && this.promotion.sellerRating >= 4.7) ||
      (this.promotion.trustSignals && this.promotion.trustSignals.length > 0)
    );
  }

  get trustSignalsList(): { label: string; description: string }[] {
    if (!this.promotion) return [];
    
    const signals: { label: string; description: string }[] = [];
    
    // Derive trust signals from promotion fields
    const derivedSignals = deriveTrustSignals({
      officialStore: this.promotion.officialStore,
      salesCount: this.promotion.salesCount,
      productRating: this.promotion.productRating,
      sellerRating: this.promotion.sellerRating,
      marketplace: this.promotion.marketplace,
      trustSignals: this.promotion.trustSignals,
      soldBy: this.promotion.soldBy,
      deliveredBy: this.promotion.deliveredBy,
    });
    
    // Get metadata for all derived signals
    const metadata = getMultipleTrustSignalsMetadata(derivedSignals);
    
    // Convert to display format with checkmark prefix
    return metadata.map(meta => ({
      label: `✓ ${meta.label}`,
      description: meta.detailDescription || meta.tooltip
    }));
  }

  get canModerate(): boolean { return this.authService.canModerate(); }
  get isAdmin(): boolean { return this.authService.hasRole('admin'); }
  promotion?: Promotion;
  loading = true;
  notFound = false;
  loadError = false;
  comments: CommentResponse[] = [];
  relatedPage = 0;
  relatedExpanded = false;
  visibleCommentsCount = this.commentsPageSize;
  relatedPromotions: Promotion[] = [];
  newCommentContent = '';
  isSubmittingComment = false;
  commentError = '';

  private readonly routeSubscription: Subscription = this.route.paramMap.pipe(
    map(params => params.get('id') || ''),
    switchMap((slug) => {
      this.loading = true;
      this.notFound = false;
      this.loadError = false;
      this.promotion = undefined;
      return this.promotionService.getPromotionBySlug(slug).pipe(
        catchError((err: unknown) => {
          if (err instanceof HttpErrorResponse && err.status === 404) {
            this.notFound = true;
          } else {
            this.loadError = true;
          }
          return of(undefined);
        })
      );
    })
  ).subscribe((promotion) => {
    this.loading = false;
    if (promotion) {
      this.promotion = promotion;
    }

    this.comments = [];
    this.relatedPromotions = [];
    this.relatedPage = 0;
    this.visibleCommentsCount = this.commentsPageSize;

    this.updateSeoMeta();
    this.updateStructuredData();

    if (this.promotion) {
      this.analytics.trackViewPromotion(
        buildViewPromotionParams(
          this.promotion.id,
          this.promotion.slug || this.promotion.id,
          this.promotion.storeName,
          this.promotion.currentPrice,
        ),
      );
      this.loadComments();
      this.loadRelatedPromotions();
    }
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
          this.analytics.trackCommentSubmit({
            promotion_id: this.promotion.id,
            promotion_slug: this.promotion.slug || this.promotion.id,
            ui_version: UI_VERSION,
          });
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

  get externalOfferRel(): string {
    const isSponsored = this.promotion?.sponsoredLink === true
      || (this.promotion?.affiliateProgram != null && this.promotion?.affiliateProgram !== 'NONE');
    return isSponsored ? 'sponsored noopener noreferrer' : 'noopener noreferrer';
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

    return destinationName ? `Ir para ${destinationName}` : 'Ir para oferta';
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
    // If the feed state service has saved state, the user visited the feed during this session.
    // Navigate back to the feed. The PromotionsComponent will restore the saved items and scroll
    // position from the PromotionsFeedStateService, bringing the user back to where they were.
    // We don't use location.back() because the user might have navigated through related
    // promotions (feed → A → B), and back() would go to A, not the feed.
    void this.router.navigate(['/']);
  }

  sharePromotion() {
    if (!this.promotion) return;
    void sharePromotion(this.promotion).then((method) => {
      if (method && this.promotion) {
        this.analytics.trackSharePromotion(
          buildShareParams(method, this.promotion.slug || this.promotion.id, this.promotion.storeName),
        );
      }
    });
  }

  trackDetailStoreClick(): void {
    if (!this.promotion) return;
    this.analytics.trackClickStore(
      buildClickStoreParams(
        this.promotion.id,
        this.promotion.slug || this.promotion.id,
        this.promotion.storeName,
        'detail',
      ),
    );
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
        this.isEditMode = false;
        this.isAdminSaving = false;
        this.adminMessage = 'Promoção atualizada com sucesso.';
        this.resetAdminImage();
        this.updateSeoMeta();
        this.updateStructuredData();
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
    this.structuredData.clearPageStructuredData();
  }

  private loadRelatedPromotions(): void {
    if (!this.promotion) {
      this.relatedPromotions = [];
      return;
    }
    this.promotionService.getRelatedPromotions(this.promotion, 6).subscribe({
      next: (related) => {
        this.relatedPromotions = related;
        this.relatedPage = 0;
      },
      error: () => {
        this.relatedPromotions = [];
      }
    });
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
    const priceStr = currentPrice != null ? ` por R$\u00A0${currentPrice.toFixed(2).replace('.', ',')}` : '';
    const storeStr = storeName ? ` em ${storeName}` : '';

    const seoTitle = currentPrice != null
      ? `${title} por R$\u00A0${currentPrice.toFixed(2).replace('.', ',')} | DescontoVivo`
      : `${title} | DescontoVivo`;

    let seoDescription: string;
    if (currentPrice != null && storeName && this.promotion.originalPrice) {
      seoDescription = `Oferta de ${title} por R$\u00A0${currentPrice.toFixed(2).replace('.', ',')}${storeStr}. Antes era R$\u00A0${this.promotion.originalPrice.toFixed(2).replace('.', ',')}. Confira detalhes no DescontoVivo.`;
    } else if (currentPrice != null && storeName) {
      seoDescription = `Oferta de ${title} por R$\u00A0${currentPrice.toFixed(2).replace('.', ',')}${storeStr}. Confira detalhes no DescontoVivo.`;
    } else {
      seoDescription = `Veja a promoção ${title}${priceStr}${storeStr} no DescontoVivo.`;
    }

    this.seo.setIndexable({
      title: seoTitle,
      description: seoDescription,
      canonicalPath: `/promocoes/${this.promotion.slug || this.promotion.id}`,
      imageUrl: this.promotion.imageUrl || undefined
    });
  }

  private updateStructuredData(): void {
    this.structuredData.clearPageStructuredData();

    if (!this.promotion) return;

    const { title, currentPrice, storeName, imageUrl, slug, id } = this.promotion;

    // Only add Product JSON-LD if we have minimum required data (name + price)
    if (title && currentPrice != null) {
      const canonicalUrl = `https://descontovivo.com/promocoes/${slug || id}`;
      const storeStr = storeName || '';

      const descriptionParts = [`Oferta de ${title}`];
      if (storeStr) descriptionParts[0] += ` em ${storeStr}`;
      descriptionParts.push('Publicada no DescontoVivo.');

      const offer: Record<string, unknown> = {
        '@type': 'Offer',
        'priceCurrency': 'BRL',
        'price': currentPrice.toFixed(2),
        'url': canonicalUrl
      };

      // Only include availability if we have reliable data from the model
      const availability = this.resolveOfferAvailability();
      if (availability) {
        offer['availability'] = availability;
      }

      if (storeStr) {
        offer['seller'] = {
          '@type': 'Organization',
          'name': storeStr
        };
      }

      const productData: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        'name': title,
        'description': descriptionParts.join(' '),
        'offers': offer
      };

      if (imageUrl) {
        productData['image'] = imageUrl;
      }

      this.structuredData.setStructuredData('sd-page-product', productData);
    }
  }

  private resolveOfferAvailability(): string | null {
    if (!this.promotion) return null;

    // Use explicit availability field from the API if present
    const avail = this.promotion.availability?.toLowerCase();
    if (avail === 'in_stock' || avail === 'instock') return 'https://schema.org/InStock';
    if (avail === 'out_of_stock' || avail === 'outofstock' || avail === 'expired') return 'https://schema.org/OutOfStock';

    // Use status: rejected/pending implies not publicly available
    if (this.promotion.status === 'rejected') return 'https://schema.org/Discontinued';

    // If approved and no availability field, we cannot confidently determine stock status
    return null;
  }

  private normalizeDestinationName(destinationName: string) {
    const lower = destinationName.toLowerCase();
    if (lower === 'loja não identificada' || lower === 'loja-nao-identificada') return '';
    if (lower === 'amazon.com.br') return 'Amazon';
    return destinationName;
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
}
