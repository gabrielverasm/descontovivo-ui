import { Component, EventEmitter, inject, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { AdminImportService } from '../../../../core/services/admin-import.service';
import { ImageProcessingService } from '../../../../core/services/image-processing.service';
import { UploadService } from '../../../../core/services/upload.service';
import { PromotionImageUploadComponent } from '../../../../shared/components/promotion-image-upload/promotion-image-upload.component';
import { FloatingFieldComponent } from '../../../../shared/components/floating-field/floating-field.component';
import { formatCentsToBRL, onlyDigits, parseBRLInputToNumber } from '../../../../shared/utils/money-input.util';

@Component({
  selector: 'app-moderation-create-promotion',
  standalone: true,
  imports: [FormsModule, FloatingFieldComponent, PromotionImageUploadComponent],
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
    url: '',
    title: '',
    currentPrice: '',
    originalPrice: '',
    couponCode: '',
    storeName: '',
    soldBy: '',
    deliveredBy: '',
    category: '',
  };

  saving = false;
  error = '';

  // Image
  imageBlob: Blob | null = null;
  imagePreviewUrl: string | null = null;
  imageSizeKB: number | null = null;
  imageError: string | null = null;
  imageStatus: 'idle' | 'processing' | 'ready' | 'uploading' | 'done' | 'error' = 'idle';

  get imageStatusText(): string | null {
    switch (this.imageStatus) {
      case 'processing': return 'Processando imagem…';
      case 'ready': return 'Imagem selecionada';
      case 'uploading': return 'Enviando imagem…';
      case 'done': return 'Upload concluído';
      default: return null;
    }
  }

  onPriceInput(field: 'currentPrice' | 'originalPrice', value: string): void {
    const digits = onlyDigits(value);
    this.form[field] = formatCentsToBRL(digits);
  }

  async onImageSelected(file: File): Promise<void> {
    this.resetImage();
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
      this.imageStatus = 'ready';
    } catch {
      this.imageError = 'Falha ao processar imagem. Tente novamente.';
      this.imageStatus = 'error';
    }
  }

  removeImage(): void {
    this.resetImage();
  }

  async submit(): Promise<void> {
    this.error = '';

    // Validação
    if (!this.form.url.trim()) { this.error = 'Link da oferta é obrigatório.'; return; }
    if (!this.form.title.trim()) { this.error = 'Título é obrigatório.'; return; }
    const price = parseBRLInputToNumber(this.form.currentPrice);
    if (!price || price <= 0) { this.error = 'Preço atual é obrigatório e deve ser maior que zero.'; return; }
    if (!this.imageBlob || this.imageStatus !== 'ready') { this.error = 'Imagem do produto é obrigatória.'; return; }

    this.saving = true;

    // Upload imagem
    let imageUrl: string;
    try {
      this.imageStatus = 'uploading';
      const result = await this.uploadService.uploadPromotionImage(this.imageBlob);
      imageUrl = result.imageUrl;
      this.imageStatus = 'done';
    } catch {
      this.imageStatus = 'error';
      this.imageError = 'Não foi possível enviar a imagem.';
      this.error = 'Não foi possível enviar a imagem.';
      this.saving = false;
      return;
    }

    // Montar payload
    const originalPrice = parseBRLInputToNumber(this.form.originalPrice);
    const now = new Date().toISOString();
    const sourceId = `manual-mod-${Date.now()}`;

    const item = {
      sourceId,
      title: this.form.title.trim(),
      marketplace: '',
      storeName: this.form.storeName.trim() || 'Loja não identificada',
      sellerName: this.form.soldBy.trim() || null,
      soldBy: this.form.soldBy.trim() || null,
      deliveredBy: this.form.deliveredBy.trim() || null,
      productUrl: this.form.url.trim(),
      imageUrl,
      currentPrice: price,
      originalPrice: originalPrice && originalPrice > 0 ? originalPrice : null,
      coupon: this.form.couponCode.trim() || null,
      category: this.form.category.trim() || 'GERAL',
      publishAt: now,
      verifiedAt: now,
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
      error: () => {
        this.error = 'Não foi possível criar a promoção. Tente novamente.';
      },
    });
  }

  private resetForm(): void {
    this.form = {
      url: '', title: '', currentPrice: '', originalPrice: '',
      couponCode: '', storeName: '', soldBy: '', deliveredBy: '',
      category: '',
    };
    this.resetImage();
  }

  private resetImage(): void {
    if (this.imagePreviewUrl) URL.revokeObjectURL(this.imagePreviewUrl);
    this.imageBlob = null;
    this.imagePreviewUrl = null;
    this.imageSizeKB = null;
    this.imageError = null;
    this.imageStatus = 'idle';
  }
}
