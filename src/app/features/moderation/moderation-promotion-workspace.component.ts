import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Observable, Subscription, of } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';
import { Promotion } from '../../core/models/promotion.model';
import { PromotionInspectionResponse } from '../../core/models/marketplace-inspection.model';
import { ImageProcessingService } from '../../core/services/image-processing.service';
import { ModerationDecisionRequest, ModerationService } from '../../core/services/moderation.service';
import { PromotionService } from '../../core/services/promotion.service';
import { SeoService } from '../../core/services/seo.service';
import { UploadService } from '../../core/services/upload.service';
import { formatCentsToBRL, numberToCents } from '../../shared/utils/money-input.util';
import { formatRatingForInput } from '../../shared/utils/rating-input.util';
import { resolveStoreName } from '../../shared/utils/store-name.util';
import {
  PromotionModerationFormContext,
  PromotionModerationFormValue,
  moderationFormToEditRequest,
  normalizeOfficialStoreSignals,
  validatePromotionForm,
  promotionToModerationForm,
} from './moderation-form.model';
import { ModerationCreatePromotionComponent } from './components/moderation-create-promotion/moderation-create-promotion.component';
import { ModerationPromotionPanelComponent } from './components/moderation-promotion-panel/moderation-promotion-panel.component';
import { ToastService } from '../../core/services/toast.service';

export type ModerationWorkspaceMode = 'create' | 'validate' | 'edit';

@Component({
  selector: 'app-moderation-promotion-workspace',
  standalone: true,
  imports: [ModerationCreatePromotionComponent, ModerationPromotionPanelComponent],
  templateUrl: './moderation-promotion-workspace.component.html',
  styleUrl: './moderation-promotion-workspace.component.scss',
})
export class ModerationPromotionWorkspaceComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly moderationService = inject(ModerationService);
  private readonly promotionService = inject(PromotionService);
  private readonly imageProcessing = inject(ImageProcessingService);
  private readonly uploadService = inject(UploadService);
  private readonly toast = inject(ToastService);
  private readonly subscriptions = new Subscription();
  private loadSubscription: Subscription | null = null;
  private preserveNextSlugQuery = '';

  mode: ModerationWorkspaceMode = 'create';
  promotion: Promotion | null = null;
  form: PromotionModerationFormValue = this.emptyForm();
  loading = false;
  saving = false;
  loadError = '';
  actionError = '';
  inspectionError = '';
  invalidUrl = false;
  showRejectInput = false;
  rejectReason = '';
  actionFromUrl = false;

  soldAndDeliveredByStore = false;
  inspectionImageKey: string | null = null;
  inspectionApplied = false;
  inspectionRequiresImage = false;
  inspectedFormUrl: string | null = null;
  newImageBlob: Blob | null = null;
  newImagePreviewUrl: string | null = null;
  newImageSizeKB: number | null = null;
  newImageError: string | null = null;
  newImageStatus: 'idle' | 'processing' | 'ready' | 'uploading' | 'done' | 'error' = 'idle';
  persistedImageHidden = false;

  constructor() { inject(SeoService).setNoIndex(); }

  ngOnInit(): void {
    this.subscriptions.add(this.route.queryParamMap.subscribe((params) => this.resolveQuery(params)));
  }

  ngOnDestroy(): void {
    this.loadSubscription?.unsubscribe();
    this.subscriptions.unsubscribe();
    this.revokeBlobPreview();
  }

  get title(): string {
    if (this.mode === 'create') return 'Adicionando promoção manual';
    const identifier = this.promotion?.slug || this.promotion?.id || '';
    return `${this.mode === 'edit' ? 'Editando promoção' : 'Moderando promoção'}: ${identifier}`;
  }

  get newImageStatusText(): string | null {
    if (this.newImageStatus === 'processing') return 'Processando imagem…';
    if (this.newImageStatus === 'ready') return 'Nova imagem selecionada';
    if (this.newImageStatus === 'uploading') return 'Enviando imagem…';
    if (this.newImageStatus === 'done') return 'Upload concluído';
    return null;
  }

  get isImageBusy(): boolean {
    return this.newImageStatus === 'processing' || this.newImageStatus === 'uploading';
  }

  private resolveQuery(params: ParamMap): void {
    const requestedEditSlug = params.get('editar') || '';
    if (this.preserveNextSlugQuery && requestedEditSlug === this.preserveNextSlugQuery && this.mode === 'edit' && this.promotion) {
      this.preserveNextSlugQuery = '';
      return;
    }
    this.preserveNextSlugQuery = '';
    this.loadSubscription?.unsubscribe();
    this.resetWorkspace();
    const validar = params.get('validar');
    const editar = params.get('editar');
    this.invalidUrl = (!!validar && !!editar) || (params.has('validar') && !validar) || (params.has('editar') && !editar);
    if (this.invalidUrl) return;
    this.mode = validar ? 'validate' : editar ? 'edit' : 'create';
    if (this.mode === 'create') return;
    this.actionFromUrl = params.get('acao') === 'rejeitar';
    this.showRejectInput = this.actionFromUrl;
    this.loading = true;
    const identifier = validar || editar;
    const request$ = this.mode === 'validate' ? this.findPending(identifier!) : this.promotionService.getPromotionBySlug(identifier!);
    this.loadSubscription = request$.pipe(finalize(() => this.loading = false)).subscribe({
      next: (promotion) => {
        if (!promotion) {
          this.loadError = this.mode === 'validate' ? 'Promoção pendente não encontrada ou já moderada.' : 'Promoção publicada não encontrada.';
          return;
        }
        this.promotion = promotion;
        this.form = promotionToModerationForm(promotion);
        this.persistedImageHidden = false;
        this.syncSoldAndDeliveredByStore();
      },
      error: (error: unknown) => {
        this.loadError = this.mode === 'edit' && error instanceof HttpErrorResponse && error.status === 404
          ? 'Promoção publicada não encontrada.'
          : this.mode === 'edit' ? 'Não foi possível carregar a promoção para edição.' : 'Promoção pendente não encontrada ou já moderada.';
      },
    });
  }

  private resetWorkspace(): void {
    this.promotion = null;
    this.form = this.emptyForm();
    this.mode = 'create';
    this.loading = false;
    this.loadError = '';
    this.actionError = '';
    this.inspectionError = '';
    this.invalidUrl = false;
    this.showRejectInput = false;
    this.rejectReason = '';
    this.actionFromUrl = false;
    this.clearInspectionState();
    this.clearManualImage();
    this.newImagePreviewUrl = null;
    this.persistedImageHidden = false;
  }

  private emptyForm(): PromotionModerationFormValue {
    return { marketplace: null, title: '', url: '', currentPrice: '', originalPrice: '', couponCode: '', storeName: '', soldBy: '', deliveredBy: '', category: '', categories: [], availability: '', priceSignal: '', salesCount: '', productRating: '', sellerRating: '', officialStore: false, trustSignals: [] };
  }

  private findPending(id: string): Observable<Promotion | null> {
    const pageSize = 50;
    const maxPages = 100;
    const visited = new Set<string>();
    const page = (pageNumber: number): Observable<Promotion | null> => {
      if (pageNumber >= maxPages) return of(null);
      return this.moderationService.getPending(pageNumber, pageSize).pipe(switchMap((items) => {
        const signature = items.map((item) => item.id).join('|');
        if (visited.has(signature)) return of(null);
        visited.add(signature);
        const found = items.find((item) => item.id === id);
        return found ? of(found) : items.length === pageSize ? page(pageNumber + 1) : of(null);
      }));
    };
    return page(0);
  }

  onCreated(): void {}

  cancel(): void { void this.router.navigate(this.mode === 'edit' && this.promotion ? ['/promocoes', this.promotion.slug || this.promotion.id] : ['/moderacao']); }

  useStoreForSoldBy(): void { if (this.form.storeName.trim()) this.form.soldBy = this.form.storeName.trim(); }
  useStoreForDeliveredBy(): void { if (this.form.storeName.trim()) this.form.deliveredBy = this.form.storeName.trim(); }
  copySoldByToDeliveredBy(): void { this.form.deliveredBy = this.form.soldBy; }
  toggleSoldAndDeliveredByStore(checked: boolean): void {
    this.soldAndDeliveredByStore = checked;
    if (checked) { const store = this.form.storeName.trim(); this.form.soldBy = store; this.form.deliveredBy = store; }
  }

  private syncSoldAndDeliveredByStore(): void {
    const normalize = (value: string) => value.trim().toLocaleLowerCase();
    const store = normalize(this.form.storeName);
    this.soldAndDeliveredByStore = !!store && normalize(this.form.soldBy) === store && normalize(this.form.deliveredBy) === store;
  }

  async onImageSelected(file: File): Promise<void> {
    this.clearManualImage();
    const validationError = this.imageProcessing.validate(file);
    if (validationError) { this.newImageError = validationError; this.newImageStatus = 'error'; return; }
    try {
      this.newImageStatus = 'processing';
      const processed = await this.imageProcessing.process(file);
      this.newImageBlob = processed.blob; this.newImagePreviewUrl = processed.previewUrl; this.newImageSizeKB = processed.sizeKB; this.newImageStatus = 'ready';
      this.inspectionRequiresImage = false;
      this.inspectionError = this.inspectionError.replace('A imagem não foi encontrada. Selecione uma imagem manualmente.', '').trim();
    } catch { this.newImageError = 'Falha ao processar imagem. Tente novamente.'; this.newImageStatus = 'error'; }
  }

  removeImage(): void {
    const hadReplacement = !!this.newImagePreviewUrl;
    this.clearManualImage();
    this.newImagePreviewUrl = null;

    if (hadReplacement) {
      this.inspectionImageKey = null;
      this.inspectionRequiresImage = this.persistedImageHidden || !this.promotion?.imageUrl?.trim();
    } else if (this.promotion?.imageUrl?.trim() && !this.persistedImageHidden) {
      this.persistedImageHidden = true;
      this.inspectionRequiresImage = true;
    }

    if (this.inspectionRequiresImage) {
      if (!this.inspectionError.includes('A imagem não foi encontrada')) {
        this.inspectionError = `A imagem não foi encontrada. Selecione uma imagem manualmente. ${this.inspectionError}`.trim();
      }
    } else {
      this.inspectionError = this.inspectionError.replace('A imagem não foi encontrada. Selecione uma imagem manualmente.', '').trim();
    }
  }

  inspectionLoaded(data: PromotionInspectionResponse): void {
    this.clearManualImage();
    this.form = { ...this.form, marketplace: data.marketplace, url: data.affiliateUrl || data.productUrl || '', title: data.title || '', currentPrice: data.currentPrice == null ? '' : formatCentsToBRL(numberToCents(data.currentPrice)), originalPrice: data.originalPrice == null ? '' : formatCentsToBRL(numberToCents(data.originalPrice)), storeName: resolveStoreName(data.storeName), soldBy: data.soldBy || '', deliveredBy: data.deliveredBy || '', category: data.category || '', categories: data.category ? [data.category] : [], salesCount: data.salesCount == null ? '' : String(data.salesCount), productRating: data.productRating == null ? '' : formatRatingForInput(data.productRating), sellerRating: data.sellerRating == null ? '' : formatRatingForInput(data.sellerRating), officialStore: data.officialStore, trustSignals: normalizeOfficialStoreSignals(data.officialStore, [...data.trustSignals]) };
    this.inspectionImageKey = data.imageKey;
    this.inspectionApplied = true;
    const hasPersistedImage =
      !this.persistedImageHidden && !!this.promotion?.imageUrl?.trim();
    this.inspectionRequiresImage = !data.imageKey && !hasPersistedImage;
    this.inspectedFormUrl = this.form.url;
    this.newImagePreviewUrl = data.imageUrl;
    this.newImageStatus = data.imageKey ? 'done' : 'idle';
    this.inspectionError = [
      this.inspectionRequiresImage ? 'A imagem não foi encontrada. Selecione uma imagem manualmente.' : '',
      data.missingFields.length ? 'Alguns campos não foram encontrados e precisam ser preenchidos manualmente.' : '',
    ].filter(Boolean).join(' ');
    this.syncSoldAndDeliveredByStore();
    this.toast.success('Inspeção concluída.');
  }

  inspectionFailed(): void {
    this.inspectionError = '';
    this.toast.error('Não foi possível carregar os dados da inspeção.');
  }

  save(): void { this.submitEdit('Ajustes salvos com sucesso.'); }
  publish(): void {
    if (!this.promotion || this.saving) return;
    if (this.hasFormChanges() || this.hasPendingImageState()) this.submitEdit('Promoção publicada com sucesso!', true);
    else { this.saving = true; this.actionError = ''; this.decide({ action: 'APPROVE', reason: 'Validado e aprovado manualmente' }, 'Promoção publicada com sucesso!'); }
  }
  confirmReject(): void {
    if (!this.promotion || this.saving) return;
    this.saving = true; this.actionError = '';
    this.decide({ action: 'REJECT', reason: this.rejectReason.trim() || 'Rejeitado pela moderação' }, 'Promoção rejeitada.');
  }

  private submitEdit(success: string, approveAfterEdit = false): void {
    if (!this.promotion || this.saving) return;
    const validation = this.validateForm();
    if (validation) { this.actionError = validation; return; }
    this.saving = true; this.actionError = '';
    this.uploadImageIfNeeded().then((imageKey) => {
      const context: PromotionModerationFormContext = { promotion: this.promotion!, inspectionApplied: this.inspectionApplied, inspectedFormUrl: this.inspectedFormUrl, imageKey: imageKey || this.inspectionImageKey };
      const request = moderationFormToEditRequest(this.form, context, 'EDIT', 'Ajustes de moderação');
      this.decide(request, success, approveAfterEdit);
    }).catch(() => { this.saving = false; this.actionError = 'Não foi possível enviar a nova imagem.'; });
  }

  private decide(request: ModerationDecisionRequest, success: string, approveAfterEdit = false): void {
    this.subscriptions.add(this.moderationService.decide(this.promotion!.id, request).subscribe({
      next: (updated) => {
        if (approveAfterEdit) {
          this.moderationService.decide(updated.id, { action: 'APPROVE', reason: 'Validado e aprovado manualmente' }).pipe(finalize(() => this.saving = false)).subscribe({
            next: () => this.returnToQueue(success),
            error: () => this.toast.error('Ajustes salvos, mas não foi possível publicar a promoção.'),
          });
          return;
        }
        if (request.action === 'EDIT') {
          const previousSlug = this.route.snapshot.queryParamMap.get('editar');
          this.promotion = updated; this.form = promotionToModerationForm(updated); this.toast.success(success); this.resetSavedImageState(); this.saving = false; this.syncSoldAndDeliveredByStore();
          if (this.mode === 'edit' && updated.slug && updated.slug !== previousSlug) {
            this.preserveNextSlugQuery = updated.slug;
            void this.router.navigate([], { relativeTo: this.route, queryParams: { editar: updated.slug }, replaceUrl: true });
          }
        }
        else { this.saving = false; this.returnToQueue(success); }
      },
      error: () => {
        this.saving = false;
        this.toast.error(
          request.action === 'REJECT'
            ? 'Não foi possível rejeitar a promoção.'
            : request.action === 'APPROVE'
              ? 'Não foi possível publicar a promoção.'
              : 'Não foi possível salvar as alterações.',
        );
      },
    }));
  }

  private validateForm(): string {
    const validation = validatePromotionForm(this.form);
    if (validation) return validation;
    const hasReplacement = !!this.inspectionImageKey || !!(this.newImageBlob && this.newImageStatus === 'ready');
    const hasPersistedImage = !this.persistedImageHidden && !!this.promotion?.imageUrl?.trim();
    if (!hasReplacement && !hasPersistedImage) return 'A imagem não foi encontrada. Selecione uma imagem manualmente.';
    return '';
  }

  private hasPendingImageState(): boolean { return !!this.newImageBlob || !!this.inspectionImageKey || this.inspectionApplied || this.persistedImageHidden; }

  private hasFormChanges(): boolean {
    if (!this.promotion) return false;
    const original = { ...promotionToModerationForm(this.promotion), storeName: resolveStoreName(this.promotion.store?.name || this.promotion.storeName) };
    return JSON.stringify({ ...this.form, trustSignals: [...this.form.trustSignals].sort() }) !== JSON.stringify({ ...original, trustSignals: [...original.trustSignals].sort() });
  }

  private async uploadImageIfNeeded(): Promise<string | null> {
    if (!this.newImageBlob || this.newImageStatus !== 'ready') return null;
    this.newImageStatus = 'uploading';
    const result = await this.uploadService.uploadPromotionImage(this.newImageBlob);
    this.newImageStatus = 'done';
    return result.imageKey;
  }

  private returnToQueue(message: string): void { void this.router.navigate(['/moderacao'], { state: { message } }); }

  private resetSavedImageState(): void { this.clearInspectionState(); this.clearManualImage(); this.newImagePreviewUrl = null; this.persistedImageHidden = false; }
  private clearInspectionState(): void { this.inspectionImageKey = null; this.inspectionApplied = false; this.inspectionRequiresImage = false; this.inspectedFormUrl = null; }
  private clearManualImage(): void { this.revokeBlobPreview(); this.newImageBlob = null; this.newImageSizeKB = null; this.newImageError = null; this.newImageStatus = 'idle'; }
  private revokeBlobPreview(): void { if (this.newImagePreviewUrl?.startsWith('blob:')) { URL.revokeObjectURL(this.newImagePreviewUrl); this.newImagePreviewUrl = null; } }
}
