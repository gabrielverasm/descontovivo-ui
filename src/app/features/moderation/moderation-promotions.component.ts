import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { Promotion } from '../../core/models/promotion.model';
import { ImageProcessingService } from '../../core/services/image-processing.service';
import { ModerationService, ModerationDecisionRequest } from '../../core/services/moderation.service';
import { SeoService } from '../../core/services/seo.service';
import { UploadService } from '../../core/services/upload.service';
import { PromotionImageComponent } from '../../shared/components/promotion-image/promotion-image.component';
import { ModerationPromotionPanelComponent } from './components/moderation-promotion-panel/moderation-promotion-panel.component';
import { ModerationCreatePromotionComponent } from './components/moderation-create-promotion/moderation-create-promotion.component';
import { resolveStoreName } from '../../shared/utils/store-name.util';

@Component({
  selector: 'app-moderation-promotions',
  standalone: true,
  imports: [FormsModule, DecimalPipe, DatePipe, PromotionImageComponent, ModerationPromotionPanelComponent, ModerationCreatePromotionComponent],
  templateUrl: './moderation-promotions.component.html',
  styleUrl: './moderation-promotions.component.scss',
})
export class ModerationPromotionsComponent implements OnInit, OnDestroy {
  private readonly moderationService = inject(ModerationService);
  private readonly imageProcessing = inject(ImageProcessingService);
  private readonly uploadService = inject(UploadService);

  constructor() {
    inject(SeoService).setNoIndex();
  }

  promotions: Promotion[] = [];
  loading = true;
  error = '';
  actionInProgress: string | null = null;
  successMessage = '';
  showCreateForm = false;

  // Validation panel
  selectedPromo: Promotion | null = null;
  editForm: Partial<ModerationDecisionRequest> = {};
  rejectReason = '';
  showRejectInput = false;
  soldAndDeliveredByStore = false;

  // Image upload
  newImageBlob: Blob | null = null;
  newImagePreviewUrl: string | null = null;
  newImageSizeKB: number | null = null;
  newImageError: string | null = null;
  newImageStatus: 'idle' | 'processing' | 'ready' | 'uploading' | 'done' | 'error' = 'idle';

  get newImageStatusText(): string | null {
    switch (this.newImageStatus) {
      case 'processing': return 'Processando imagem…';
      case 'ready': return 'Nova imagem selecionada';
      case 'uploading': return 'Enviando imagem…';
      case 'done': return 'Upload concluído';
      default: return null;
    }
  }

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.revokeImagePreview();
  }

  async onNewImageSelected(file: File): Promise<void> {
    this.resetNewImage();
    const validationError = this.imageProcessing.validate(file);
    if (validationError) {
      this.newImageError = validationError;
      this.newImageStatus = 'error';
      return;
    }
    try {
      this.newImageStatus = 'processing';
      const processed = await this.imageProcessing.process(file);
      this.newImageBlob = processed.blob;
      this.newImagePreviewUrl = processed.previewUrl;
      this.newImageSizeKB = processed.sizeKB;
      this.newImageStatus = 'ready';
    } catch {
      this.newImageError = 'Falha ao processar imagem. Tente novamente.';
      this.newImageStatus = 'error';
    }
  }

  removeNewImage(): void {
    this.resetNewImage();
  }

  private resetNewImage(): void {
    this.revokeImagePreview();
    this.newImageBlob = null;
    this.newImagePreviewUrl = null;
    this.newImageSizeKB = null;
    this.newImageError = null;
    this.newImageStatus = 'idle';
  }

  private revokeImagePreview(): void {
    if (this.newImagePreviewUrl) {
      URL.revokeObjectURL(this.newImagePreviewUrl);
    }
  }

  openCreateForm(): void {
    this.showCreateForm = true;
  }

  closeCreateForm(): void {
    this.showCreateForm = false;
  }

  onPromotionCreated(): void {
    this.showCreateForm = false;
    this.successMessage = 'Promoção adicionada com sucesso. Ela foi publicada diretamente.';
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.moderationService.getPending().pipe(
      finalize(() => (this.loading = false)),
    ).subscribe({
      next: (res) => {
        const list = res ?? [];
        this.promotions = list.sort((a, b) => {
          if (a.createdAt && b.createdAt) return a.createdAt.localeCompare(b.createdAt);
          return 0;
        });
      },
      error: () => (this.error = 'Erro ao carregar promoções pendentes.'),
    });
  }

  getMissingFields(promo: Promotion): string[] {
    const has = (v: unknown) => v !== undefined && v !== null && String(v).trim() !== '';
    const badStore = !promo.store?.name && (!promo.storeName || promo.storeName === 'loja-nao-identificada');
    const fields: Array<{ label: string; status: string }> = [
      { label: 'Título', status: has(promo.title) ? 'ok' : 'missing' },
      { label: 'Link da oferta', status: has(promo.url) || has(promo.offerUrl) || has(promo.storeUrl) ? 'ok' : 'missing' },
      { label: 'Preço atual', status: has(promo.currentPrice) ? 'ok' : 'missing' },
      { label: 'Loja', status: badStore ? 'missing' : 'ok' },
      { label: 'Imagem', status: has(promo.imageUrl) ? 'ok' : 'missing' },
    ];
    return fields.filter((f) => f.status === 'missing').map((f) => f.label);
  }

  // Validation panel
  openValidation(promo: Promotion): void {
    this.selectedPromo = promo;
    this.showRejectInput = false;
    this.rejectReason = '';
    this.successMessage = '';
    this.error = '';
    this.editForm = {
      title: promo.title,
      url: promo.url || promo.offerUrl || promo.storeUrl || '',
      currentPrice: promo.currentPrice,
      originalPrice: promo.originalPrice,
      couponCode: promo.couponCode || '',
      storeName: this.getCurrentStoreName() || '',
      soldBy: promo.soldBy || '',
      deliveredBy: promo.deliveredBy || '',
      category: promo.category || '',
      availability: promo.availability || '',
    };
    const store = this.getCurrentStoreName();
    this.soldAndDeliveredByStore = !!store &&
      (this.editForm.soldBy || '').trim().toLowerCase() === store.trim().toLowerCase() &&
      (this.editForm.deliveredBy || '').trim().toLowerCase() === store.trim().toLowerCase();
  }

  getCurrentStoreName(): string {
    if (!this.selectedPromo) return '';
    return resolveStoreName(this.selectedPromo.store?.name || this.selectedPromo.storeName);
  }

  useStoreForSoldBy(): void {
    const store = this.editForm.storeName?.trim() || this.getCurrentStoreName();
    if (store) this.editForm.soldBy = store;
  }

  useStoreForDeliveredBy(): void {
    const store = this.editForm.storeName?.trim() || this.getCurrentStoreName();
    if (store) this.editForm.deliveredBy = store;
  }

  copySoldByToDeliveredBy(): void {
    this.editForm.deliveredBy = this.editForm.soldBy || '';
  }

  toggleSoldAndDeliveredByStore(checked: boolean): void {
    this.soldAndDeliveredByStore = checked;
    if (checked) {
      const store = this.getCurrentStoreName();
      if (store) {
        this.editForm.soldBy = store;
        this.editForm.deliveredBy = store;
      }
    }
  }

  closeValidation(): void {
    this.selectedPromo = null;
    this.showRejectInput = false;
    this.rejectReason = '';
    this.resetNewImage();
  }



  // Actions
  async saveEdits(): Promise<void> {
    if (!this.selectedPromo) return;
    this.actionInProgress = this.selectedPromo.id;
    this.error = '';
    this.successMessage = '';

    let imageKey: string | undefined;
    if (this.newImageBlob && this.newImageStatus === 'ready') {
      try {
        this.newImageStatus = 'uploading';
        const result = await this.uploadService.uploadPromotionImage(this.newImageBlob);
        imageKey = result.imageKey;
        this.newImageStatus = 'done';
      } catch {
        this.newImageStatus = 'error';
        this.newImageError = 'Não foi possível enviar a nova imagem.';
        this.actionInProgress = null;
        this.error = 'Não foi possível enviar a nova imagem.';
        return;
      }
    }

    const req = this.buildEditRequest();
    if (imageKey) req.imageKey = imageKey;

    this.moderationService.decide(this.selectedPromo.id, req).pipe(
      finalize(() => (this.actionInProgress = null)),
    ).subscribe({
      next: (updated) => {
        this.updateInList(updated);
        this.selectedPromo = updated;
        this.openValidation(updated);
        this.resetNewImage();
        this.successMessage = 'Ajustes salvos com sucesso.';
      },
      error: () => (this.error = 'Erro ao salvar ajustes.'),
    });
  }

  async publish(): Promise<void> {
    if (!this.selectedPromo) return;
    this.actionInProgress = this.selectedPromo.id;
    this.error = '';
    this.successMessage = '';

    let imageKey: string | undefined;
    if (this.newImageBlob && this.newImageStatus === 'ready') {
      try {
        this.newImageStatus = 'uploading';
        const result = await this.uploadService.uploadPromotionImage(this.newImageBlob);
        imageKey = result.imageKey;
        this.newImageStatus = 'done';
      } catch {
        this.newImageStatus = 'error';
        this.newImageError = 'Não foi possível enviar a nova imagem.';
        this.actionInProgress = null;
        this.error = 'Não foi possível enviar a nova imagem.';
        return;
      }
    }

    const hasEdits = this.hasFormChanges() || !!imageKey;
    const promoId = this.selectedPromo.id;

    const doApprove = () => {
      this.moderationService.decide(promoId, {
        action: 'APPROVE',
        reason: 'Validado e aprovado manualmente',
      }).pipe(
        finalize(() => (this.actionInProgress = null)),
      ).subscribe({
        next: () => {
          this.removeFromList(promoId);
          this.selectedPromo = null;
          this.resetNewImage();
          this.successMessage = 'Promoção publicada com sucesso!';
        },
        error: () => (this.error = 'Erro ao publicar promoção.'),
      });
    };

    if (hasEdits) {
      const req = this.buildEditRequest();
      if (imageKey) req.imageKey = imageKey;
      this.moderationService.decide(promoId, req).subscribe({
        next: () => doApprove(),
        error: () => {
          this.actionInProgress = null;
          this.error = 'Erro ao salvar ajustes antes de publicar.';
        },
      });
    } else {
      doApprove();
    }
  }

  startReject(): void {
    this.showRejectInput = true;
    this.rejectReason = '';
  }

  cancelReject(): void {
    this.showRejectInput = false;
    this.rejectReason = '';
  }

  confirmReject(promo: Promotion): void {
    this.error = '';
    this.successMessage = '';
    const reason = this.rejectReason.trim() || 'Rejeitado pela moderação';
    this.actionInProgress = promo.id;
    this.moderationService.decide(promo.id, { action: 'REJECT', reason }).pipe(
      finalize(() => {
        this.actionInProgress = null;
        this.showRejectInput = false;
        this.rejectReason = '';
      }),
    ).subscribe({
      next: () => {
        this.removeFromList(promo.id);
        if (this.selectedPromo?.id === promo.id) this.selectedPromo = null;
        this.successMessage = 'Promoção rejeitada.';
      },
      error: () => (this.error = `Erro ao rejeitar "${promo.title}".`),
    });
  }

  rejectFromQueue(promo: Promotion): void {
    this.openValidation(promo);
    this.startReject();
  }

  private buildEditRequest(): ModerationDecisionRequest {
    const f = this.editForm;
    const req: ModerationDecisionRequest = {
      action: 'EDIT',
      reason: 'Ajustes de validação manual',
    };
    if (f.title) req.title = f.title;
    if (f.url) req.url = f.url;
    if (f.currentPrice != null) req.currentPrice = f.currentPrice;
    if (f.originalPrice != null && !isNaN(Number(f.originalPrice))) req.originalPrice = Number(f.originalPrice);
    if (f.couponCode?.trim()) req.couponCode = f.couponCode.trim();
    if (f.storeName?.trim()) req.storeName = f.storeName.trim();
    req.soldBy = f.soldBy?.trim() ?? '';
    req.deliveredBy = f.deliveredBy?.trim() ?? '';
    req.category = f.category?.trim() ?? '';
    if (f.availability?.trim()) req.availability = f.availability.trim();
    return req;
  }

  private hasFormChanges(): boolean {
    if (!this.selectedPromo) return false;
    const p = this.selectedPromo;
    const f = this.editForm;
    const norm = (v: unknown) => (v == null || String(v).trim() === '') ? '' : String(v).trim();
    return norm(f.title) !== norm(p.title) ||
      norm(f.url) !== norm(p.url || p.offerUrl || p.storeUrl) ||
      f.currentPrice !== p.currentPrice ||
      norm(f.originalPrice) !== norm(p.originalPrice) ||
      norm(f.couponCode) !== norm(p.couponCode) ||
      norm(f.soldBy) !== norm(p.soldBy) ||
      norm(f.deliveredBy) !== norm(p.deliveredBy) ||
      norm(f.category) !== norm(p.category) ||
      norm(f.availability) !== norm(p.availability);
  }

  private updateInList(updated: Promotion): void {
    this.promotions = this.promotions.map((p) => p.id === updated.id ? updated : p);
  }

  private removeFromList(id: string): void {
    this.promotions = this.promotions.filter((p) => p.id !== id);
  }
}
