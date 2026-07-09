import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminImportService } from '../../../../core/services/admin-import.service';
import { ImageProcessingService } from '../../../../core/services/image-processing.service';
import { ModerationCategoryService, ModerationCategory } from '../../../../core/services/moderation-category.service';
import { UploadService } from '../../../../core/services/upload.service';
import { PromotionImageUploadComponent } from '../../../../shared/components/promotion-image-upload/promotion-image-upload.component';
import { deriveMarketplace } from '../../../../shared/utils/marketplace.util';
import { formatCentsToBRL, onlyDigits, parseBRLInputToNumber } from '../../../../shared/utils/money-input.util';
import { normalizePromotionTitle } from '../../../../shared/utils/normalize-title.util';

@Component({
  selector: 'app-moderation-create-promotion',
  standalone: true,
  imports: [FormsModule, PromotionImageUploadComponent],
  templateUrl: './moderation-create-promotion.component.html',
  styleUrl: './moderation-create-promotion.component.scss',
})
export class ModerationCreatePromotionComponent implements OnInit {
  private readonly adminImportService = inject(AdminImportService);
  private readonly imageProcessing = inject(ImageProcessingService);
  private readonly uploadService = inject(UploadService);
  private readonly categoryService = inject(ModerationCategoryService);

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
    availability: '',
    priceSignal: '',
  };

  saving = false;
  error = '';
  soldAndDeliveredByStore = false;

  // Categories
  categories: ModerationCategory[] = [];
  categoriesLoading = false;
  categoriesError = false;

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

  ngOnInit(): void {
    this.loadCategories();
  }

  // --- Price helpers ---

  onPriceInput(field: 'currentPrice' | 'originalPrice', value: string): void {
    const digits = onlyDigits(value);
    this.form[field] = formatCentsToBRL(digits);
  }

  // --- Store / seller helpers ---

  hasValidStoreName(): boolean {
    return !!this.form.storeName.trim();
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

  // --- Categories ---

  loadCategories(): void {
    this.categoriesLoading = true;
    this.categoriesError = false;
    this.categoryService.list().subscribe({
      next: (cats) => {
        this.categories = cats;
        this.categoriesLoading = false;
      },
      error: () => {
        this.categoriesError = true;
        this.categoriesLoading = false;
      },
    });
  }

  selectCategory(name: string): void {
    this.form.category = name;
  }

  // --- Image ---

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

  // --- Submit ---

  async submit(): Promise<void> {
    this.error = '';
    if (!this.form.url.trim()) { this.error = 'Link da oferta é obrigatório.'; return; }
    if (!this.form.title.trim()) { this.error = 'Título é obrigatório.'; return; }
    if (!this.form.storeName.trim()) { this.error = 'Nome da loja é obrigatório.'; return; }
    const price = parseBRLInputToNumber(this.form.currentPrice);
    if (!price || price <= 0) { this.error = 'Preço atual é obrigatório e deve ser maior que zero.'; return; }
    if (!this.imageBlob || this.imageStatus !== 'ready') { this.error = 'Imagem do produto é obrigatória.'; return; }

    this.saving = true;
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

    const originalPrice = parseBRLInputToNumber(this.form.originalPrice);
    const now = new Date().toISOString();
    const sourceId = `manual-mod-${Date.now()}`;
    const storeName = this.form.storeName.trim();
    const marketplace = deriveMarketplace(storeName);
    const title = normalizePromotionTitle(this.form.title);

    const item = {
      sourceId,
      title,
      marketplace,
      storeName,
      sellerName: this.form.soldBy.trim() || null,
      soldBy: this.form.soldBy.trim() || null,
      deliveredBy: this.form.deliveredBy.trim() || null,
      productUrl: this.form.url.trim(),
      imageUrl,
      currentPrice: price,
      originalPrice: originalPrice && originalPrice > 0 ? originalPrice : null,
      coupon: this.form.couponCode.trim() || null,
      category: this.form.category.trim() || 'GERAL',
      availability: this.form.availability || null,
      priceSignal: this.form.priceSignal || null,
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

  // --- Reset ---

  private resetForm(): void {
    this.form = { url: '', title: '', currentPrice: '', originalPrice: '', couponCode: '', storeName: '', soldBy: '', deliveredBy: '', category: '', availability: '', priceSignal: '' };
    this.soldAndDeliveredByStore = false;
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
