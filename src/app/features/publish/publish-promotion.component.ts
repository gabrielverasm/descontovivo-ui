import { Component, inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Meta } from '@angular/platform-browser';
import { ImageProcessingService } from '../../core/services/image-processing.service';
import { PromotionCreateRequest, PromotionService } from '../../core/services/promotion.service';
import { SeoService } from '../../core/services/seo.service';
import { UploadResult, UploadService } from '../../core/services/upload.service';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { FileFieldComponent } from '../../shared/components/file-field/file-field.component';
import { FloatingFieldComponent } from '../../shared/components/floating-field/floating-field.component';

type ImageStatus = 'idle' | 'processing' | 'ready' | 'uploading' | 'done' | 'error';

@Component({
  selector: 'app-publish-promotion',
  standalone: true,
  imports: [FormsModule, BreadcrumbComponent, FloatingFieldComponent, FileFieldComponent],
  templateUrl: './publish-promotion.component.html',
  styleUrl: './publish-promotion.component.scss',
})
export class PublishPromotionComponent implements OnDestroy {
  private readonly meta = inject(Meta);
  private readonly seo = inject(SeoService);
  private readonly imageProcessing = inject(ImageProcessingService);
  private readonly uploadService = inject(UploadService);
  private readonly promotionService = inject(PromotionService);

  title = '';
  url = '';
  currentPrice = '';

  processedImageBlob: Blob | null = null;
  imagePreviewUrl: string | null = null;
  imageSizeKB: number | null = null;
  imageStatus: ImageStatus = 'idle';
  imageError: string | null = null;
  imageUrl: string | null = null;
  imageKey: string | null = null;

  submitting = false;
  submitMessage: string | null = null;
  submitError: string | null = null;

  get imageStatusText(): string | null {
    switch (this.imageStatus) {
      case 'processing': return 'Processando imagem…';
      case 'ready': return 'Imagem pronta para envio';
      case 'uploading': return 'Enviando imagem…';
      case 'done': return 'Upload concluído';
      default: return null;
    }
  }

  get submitDisabled(): boolean {
    if (this.submitting) return true;
    if (!this.title.trim() || !this.url.trim() || !this.currentPrice) return true;
    if (this.imageStatus !== 'ready' && this.imageStatus !== 'done') return true;
    return false;
  }

  get submitButtonText(): string {
    if (this.imageStatus === 'uploading') return 'Enviando imagem...';
    if (this.submitting) return 'Publicando...';
    return 'Publicar promoção';
  }

  constructor() {
    this.seo.setIndexFollow();
    this.meta.updateTag({ name: 'description', content: 'Compartilhe uma promoção com a comunidade do DescontoVivo para análise antes da publicação.' });
  }

  ngOnDestroy(): void {
    this.revokePreview();
  }

  async onSubmit(): Promise<void> {
    if (this.submitDisabled) return;

    const price = parseFloat(this.currentPrice);
    if (isNaN(price) || price <= 0) {
      this.submitError = 'Preço inválido.';
      return;
    }

    this.submitting = true;
    this.submitError = null;
    this.submitMessage = null;

    try {
      if (!this.imageUrl || !this.imageKey) {
        if (!this.processedImageBlob) {
          this.submitting = false;
          this.imageStatus = 'error';
          this.imageError = 'Selecione uma imagem válida antes de publicar.';
          return;
        }

        this.imageStatus = 'uploading';
        const result: UploadResult = await this.uploadService.uploadPromotionImage(this.processedImageBlob);
        this.imageUrl = result.imageUrl;
        this.imageKey = result.imageKey;
        this.imageStatus = 'done';
      }
    } catch {
      this.submitting = false;
      this.imageStatus = 'ready';
      this.submitError = 'Falha ao enviar imagem. Tente novamente.';
      return;
    }

    const payload: PromotionCreateRequest = {
      title: this.title.trim(),
      url: this.url.trim(),
      currentPrice: price,
      imageUrl: this.imageUrl!,
      imageKey: this.imageKey!,
    };

    this.promotionService.createPromotion(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.submitMessage = 'Promoção enviada para moderação com sucesso.';
        this.resetForm();
      },
      error: () => {
        this.submitting = false;
        this.submitError = 'Erro ao publicar promoção. Tente novamente.';
      },
    });
  }

  clearSubmitFeedback(): void {
    this.submitMessage = null;
    this.submitError = null;
  }

  async onImageSelected(file: File): Promise<void> {
    this.clearSubmitFeedback();
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
      this.processedImageBlob = processed.blob;
      this.imagePreviewUrl = processed.previewUrl;
      this.imageSizeKB = processed.sizeKB;
      this.imageStatus = 'ready';
    } catch {
      this.imageError = 'Falha ao processar imagem. Tente novamente.';
      this.imageStatus = 'error';
    }
  }

  private resetImage(): void {
    this.revokePreview();
    this.processedImageBlob = null;
    this.imagePreviewUrl = null;
    this.imageSizeKB = null;
    this.imageError = null;
    this.imageUrl = null;
    this.imageKey = null;
    this.imageStatus = 'idle';
  }

  private resetForm(): void {
    this.title = '';
    this.url = '';
    this.currentPrice = '';
    this.resetImage();
  }

  private revokePreview(): void {
    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
    }
  }
}
