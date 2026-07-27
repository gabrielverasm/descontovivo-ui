import { Component, EventEmitter, inject, Output } from '@angular/core';
import { finalize } from 'rxjs';
import { AdminImportService } from '../../../../core/services/admin-import.service';
import { ImageProcessingService } from '../../../../core/services/image-processing.service';
import { UploadService } from '../../../../core/services/upload.service';
import { PromotionInspectionResponse } from '../../../../core/models/marketplace-inspection.model';
import { applyInspectionToForm } from '../../../../shared/utils/promotion-inspection-form.util';
import { deriveMarketplace } from '../../../../shared/utils/marketplace.util';
import { detectMarketplace } from '../../../../shared/utils/marketplace-detection.util';
import { normalizeOfficialStoreSignals, promotionFormToPayload, validatePromotionForm } from '../../moderation-form.model';
import { ModerationPromotionPanelComponent } from '../moderation-promotion-panel/moderation-promotion-panel.component';

@Component({
  selector: 'app-moderation-create-promotion',
  standalone: true,
  imports: [ModerationPromotionPanelComponent],
  templateUrl: './moderation-create-promotion.component.html',
  styleUrl: './moderation-create-promotion.component.scss',
})
export class ModerationCreatePromotionComponent {
  private readonly adminImportService = inject(AdminImportService);
  private readonly imageProcessing = inject(ImageProcessingService);
  private readonly uploadService = inject(UploadService);

  @Output() created = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  form = {
    marketplace: null as import('../../../../core/models/marketplace-inspection.model').MarketplaceCode | null,
    url: '',
    title: '',
    currentPrice: '',
    originalPrice: '',
    couponCode: '',
    storeName: '',
    soldBy: '',
    deliveredBy: '',
    category: '',
    categories: [] as string[],
    availability: '',
    priceSignal: '',
    // New trust signals fields
    salesCount: '',
    productRating: '',
    sellerRating: '',
    officialStore: false,
    trustSignals: [] as string[],
  };

  saving = false;
  error = '';
  inspectionMessage = '';
  soldAndDeliveredByStore = false;

  // Image
  imageBlob: Blob | null = null;
  imagePreviewUrl: string | null = null;
  imageSizeKB: number | null = null;
  imageError: string | null = null;
  imageStatus: 'idle' | 'processing' | 'ready' | 'uploading' | 'done' | 'error' = 'idle';
  inspectionImageKey: string | null = null;
  private uploadedImageKey: string | null = null;
  private uploadedImageUrl: string | null = null;
  private inspectedFormUrl: string | null = null;

  applyInspection(data: PromotionInspectionResponse): void {
    this.resetImage();
    applyInspectionToForm(this.form, data);
    this.form.categories = data.category ? [data.category] : [];
    this.inspectionImageKey = data.imageKey;
    this.inspectedFormUrl = this.form.url;
    this.form.trustSignals = normalizeOfficialStoreSignals(data.officialStore, [...data.trustSignals]);
    this.imagePreviewUrl = data.imageUrl;
    this.imageBlob = null;
    this.imageStatus = data.imageKey ? 'done' : 'idle';
    this.inspectionMessage = 'Dados da Shopee carregados';
    this.error = data.missingFields.length
      ? 'Alguns campos não foram encontrados e precisam ser preenchidos manualmente'
      : '';
  }

  inspectionFailed(): void {
    this.inspectionMessage = '';
    this.error = 'Não foi possível carregar os dados da Shopee.';
  }

  get imageStatusText(): string | null {
    switch (this.imageStatus) {
      case 'processing': return 'Processando imagem…';
      case 'ready': return 'Imagem selecionada';
      case 'uploading': return 'Enviando imagem…';
      case 'done': return 'Upload concluído';
      default: return null;
    }
  }

  get hasSubmittableImage(): boolean {
    return !!this.inspectionImageKey
      || !!this.uploadedImageKey
      || (!!this.imageBlob && this.imageStatus === 'ready');
  }

  get isImageBusy(): boolean {
    return this.imageStatus === 'processing' || this.imageStatus === 'uploading';
  }

  toggleSoldDelivered(checked: boolean): void {
    this.soldAndDeliveredByStore = checked;
    if (checked && this.form.storeName.trim()) {
      this.form.soldBy = this.form.storeName.trim();
      this.form.deliveredBy = this.form.storeName.trim();
    }
  }

  useStoreForSoldBy(): void {
    if (this.form.storeName.trim()) {
      this.form.soldBy = this.form.storeName.trim();
    }
  }

  useStoreForDeliveredBy(): void {
    if (this.form.storeName.trim()) {
      this.form.deliveredBy = this.form.storeName.trim();
    }
  }

  copySoldByToDeliveredBy(): void {
    this.form.deliveredBy = this.form.soldBy;
  }

  // --- Image ---

  async onImageSelected(file: File): Promise<void> {
    this.resetImage();
    this.clearImageValidationFeedback();
    const validationError = this.imageProcessing.validate(file);
    if (validationError) {
      this.imageError = validationError;
      this.imageStatus = 'error';
      return;
    }
    try {
      this.imageStatus = 'processing';
      const processed = await this.imageProcessing.process(file);
      this.imageBlob = processed.blob;
      this.imagePreviewUrl = processed.previewUrl;
      this.imageSizeKB = processed.sizeKB;
      this.clearImageValidationFeedback();
      this.imageStatus = 'ready';
    } catch {
      this.imageError = 'Falha ao processar imagem. Tente novamente.';
      this.imageStatus = 'error';
    }
  }

  removeImage(): void {
    this.resetImage();
    this.clearImageValidationFeedback();
  }

  // --- Submit ---

  async submit(): Promise<void> {
    try {
      if (this.saving) return;
      this.error = '';
      
      const validation = validatePromotionForm(this.form, {
        requireStore: true,
        requireImage: true,
        hasImage: this.hasSubmittableImage,
      });
      if (validation) { this.error = validation; return; }
      const common = promotionFormToPayload(this.form);

      this.saving = true;
      
      // Upload da imagem
      let imageUrl = this.uploadedImageUrl || this.imagePreviewUrl || '';
      let imageKey = this.inspectionImageKey || this.uploadedImageKey || '';
      if (!imageKey) try {
        this.imageStatus = 'uploading';
        this.clearImageValidationFeedback();
        const result = await this.uploadService.uploadPromotionImage(this.imageBlob!);
        imageUrl = result.imageUrl;
        imageKey = result.imageKey;
        this.uploadedImageUrl = result.imageUrl;
        this.uploadedImageKey = result.imageKey;
        this.imageStatus = 'done';
      } catch (error) {
        this.imageStatus = 'ready';
        this.imageError = 'Não foi possível enviar a imagem. Tente novamente.';
        this.saving = false;
        console.error('Image upload error:', error);
        return;
      }

      const now = new Date().toISOString();
      const sourceId = `manual-mod-${Date.now()}`;
      const storeName = this.form.storeName.trim();
      const detectedMarketplace = detectMarketplace(this.form.url)?.marketplace;
      const inspectedMarketplace = this.form.url === this.inspectedFormUrl
        ? this.form.marketplace
        : null;
      const marketplace = detectedMarketplace || inspectedMarketplace || deriveMarketplace(storeName);

      const item = {
        sourceId,
        title: common.title,
        marketplace,
        storeName,
        // Keep the legacy import field aligned with the canonical seller field
        // without exposing two inputs for the same information.
        sellerName: common.soldBy,
        soldBy: common.soldBy,
        deliveredBy: common.deliveredBy,
        productUrl: common.url,
        imageUrl,
        imageKey,
        currentPrice: common.currentPrice!,
        originalPrice: common.originalPrice,
        coupon: common.couponCode || null,
        category: common.category || '',
        categories: common.categories,
        availability: common.availability || null,
        priceSignal: common.priceSignal || null,
        publishAt: now,
        verifiedAt: now,
        // New trust signals fields
        salesCount: common.salesCount,
        productRating: common.productRating,
        sellerRating: common.sellerRating,
        officialStore: common.officialStore,
        trustSignals: common.trustSignals,
      };

      this.adminImportService.import({ batchId: `manual-${Date.now()}`, items: [item] }, false).pipe(
        finalize(() => (this.saving = false)),
      ).subscribe({
        next: (res) => {
          if (res.created > 0) {
            this.resetForm();
            this.created.emit();
          } else if (res.errors?.length > 0) {
            this.error = `Erro: ${res.errors[0].message}`;
          } else {
            this.error = 'Promoção não foi criada. Pode já existir com o mesmo link.';
          }
        },
        error: (error) => {
          console.error('Submit error:', error);
          this.error = 'Não foi possível criar a promoção. Tente novamente.';
        },
      });
    } catch (error) {
      console.error('Unexpected error in submit:', error);
      this.saving = false;
      this.error = 'Ocorreu um erro inesperado. Tente novamente.';
    }
  }

  // --- Reset ---

  private resetForm(): void {
    this.form = { 
      url: '', 
      title: '', 
      currentPrice: '', 
      originalPrice: '', 
      couponCode: '', 
      storeName: '', 
      soldBy: '', 
      deliveredBy: '', 
      category: '', 
      categories: [] as string[],
      availability: '', 
      priceSignal: '',
      salesCount: '',
      productRating: '',
      sellerRating: '',
      officialStore: false,
      marketplace: null,
      trustSignals: [] as string[]
    };
    this.inspectedFormUrl = null;
    this.soldAndDeliveredByStore = false;
    this.resetImage();
  }

  private resetImage(): void {
    if (this.imagePreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(this.imagePreviewUrl);
    this.imageBlob = null;
    this.imagePreviewUrl = null;
    this.imageSizeKB = null;
    this.imageError = null;
    this.imageStatus = 'idle';
    this.inspectionImageKey = null;
    this.uploadedImageKey = null;
    this.uploadedImageUrl = null;
    this.inspectionMessage = '';
  }

  private clearImageValidationFeedback(): void {
    this.imageError = null;
    if (this.error === 'Imagem do produto é obrigatória.') {
      this.error = '';
    }
  }
}
