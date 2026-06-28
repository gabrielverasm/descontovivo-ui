import { Component, inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Meta } from '@angular/platform-browser';
import { ImageProcessingService } from '../../core/services/image-processing.service';
import { UploadResult, UploadService } from '../../core/services/upload.service';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { FileFieldComponent } from '../../shared/components/file-field/file-field.component';
import { FloatingFieldComponent } from '../../shared/components/floating-field/floating-field.component';

type ImageStatus = 'idle' | 'processing' | 'uploading' | 'done' | 'error';

@Component({
  selector: 'app-publish-promotion',
  standalone: true,
  imports: [FormsModule, BreadcrumbComponent, FloatingFieldComponent, FileFieldComponent],
  templateUrl: './publish-promotion.component.html',
  styleUrl: './publish-promotion.component.scss',
})
export class PublishPromotionComponent implements OnDestroy {
  private readonly meta = inject(Meta);
  private readonly imageProcessing = inject(ImageProcessingService);
  private readonly uploadService = inject(UploadService);

  title = '';

  imagePreviewUrl: string | null = null;
  imageSizeKB: number | null = null;
  imageStatus: ImageStatus = 'idle';
  imageError: string | null = null;
  imageUrl: string | null = null;
  imageKey: string | null = null;

  get imageStatusText(): string | null {
    switch (this.imageStatus) {
      case 'processing': return 'Processando imagem…';
      case 'uploading': return 'Enviando imagem…';
      case 'done': return 'Upload concluído';
      default: return null;
    }
  }

  get submitDisabled(): boolean {
    return !this.imageUrl || this.imageStatus === 'processing' || this.imageStatus === 'uploading';
  }

  constructor() {
    this.meta.updateTag({ name: 'description', content: 'Compartilhe uma promoção com a comunidade do DescontoVivo para análise antes da publicação.' });
  }

  ngOnDestroy(): void {
    this.revokePreview();
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
      this.imagePreviewUrl = processed.previewUrl;
      this.imageSizeKB = processed.sizeKB;

      this.imageStatus = 'uploading';
      const result: UploadResult = await this.uploadService.uploadPromotionImage(processed.blob);
      this.imageUrl = result.imageUrl;
      this.imageKey = result.imageKey;
      this.imageStatus = 'done';
    } catch {
      this.imageError = 'Falha ao processar ou enviar imagem. Tente novamente.';
      this.imageStatus = 'error';
      this.imageUrl = null;
      this.imageKey = null;
    }
  }

  private resetImage(): void {
    this.revokePreview();
    this.imagePreviewUrl = null;
    this.imageSizeKB = null;
    this.imageError = null;
    this.imageUrl = null;
    this.imageKey = null;
    this.imageStatus = 'idle';
  }

  private revokePreview(): void {
    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
    }
  }
}
