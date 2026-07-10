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
import { getMarketplaceTrustSignals, getMultipleTrustSignalsMetadata, TrustSignal } from '../../../../shared/utils/trust-signals.util';
import { normalizeRatingInput, formatRatingForInput } from '../../../../shared/utils/rating-input.util';

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
    // New trust signals fields
    salesCount: '',
    productRating: '',
    sellerRating: '',
    officialStore: false,
  };

  // Trust signals chips
  trustSignals: string[] = [];

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

  // Getter puro para availableTrustSignals
  get availableTrustSignals(): string[] {
    const marketplace = deriveMarketplace(this.form.storeName || '');
    return getMarketplaceTrustSignals(marketplace).map(signal => signal.toString());
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

  // --- Trust signals helpers ---

  toggleTrustSignal(signal: string): void {
    const index = this.trustSignals.indexOf(signal);
    if (index === -1) {
      this.trustSignals.push(signal);
    } else {
      this.trustSignals.splice(index, 1);
    }
    
    // Sync OFFICIAL_STORE chip with officialStore checkbox
    if (signal === TrustSignal.OFFICIAL_STORE.toString()) {
      this.form.officialStore = index === -1; // true when added, false when removed
    }
  }

  isTrustSignalSelected(signal: string): boolean {
    return this.trustSignals.includes(signal);
  }

  getTrustSignalLabel(signal: string): string {
    // Use the metadata from trust-signals.util.ts
    const metadata = getMultipleTrustSignalsMetadata([signal as any])[0];
    return metadata?.label || signal;
  }

  getTrustSignalTooltip(signal: string): string {
    // Use the metadata from trust-signals.util.ts
    const metadata = getMultipleTrustSignalsMetadata([signal as any])[0];
    return metadata?.tooltip || '';
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

  isCategorySelected(name: string): boolean {
    return this.form.category === name;
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

  // --- Helper functions ---

  private parseOptionalIntegerInput(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    // If it's already a number, validate range
    if (typeof value === 'number') {
      return value >= 0 && Number.isInteger(value) ? value : null;
    }
    
    // If it's a string, normalize it
    const str = String(value).trim();
    if (!str) return null;
    
    // Parse to integer
    const parsed = parseInt(str, 10);
    
    // Validate result
    if (isNaN(parsed) || parsed < 0) {
      return null;
    }
    
    return parsed;
  }

  normalizeRatingField(field: 'productRating' | 'sellerRating'): void {
    const value = this.form[field];
    const normalized = normalizeRatingInput(value);
    
    if (normalized !== null && normalized !== undefined) {
      this.form[field] = formatRatingForInput(normalized);
    } else if (value && String(value).trim()) {
      // If normalization failed but there's a value, clear it
      this.form[field] = '';
    }
  }

  onOfficialStoreChange(checked: boolean): void {
    this.form.officialStore = checked;
    
    // Sync with OFFICIAL_STORE chip
    const officialStoreSignal = TrustSignal.OFFICIAL_STORE.toString();
    const index = this.trustSignals.indexOf(officialStoreSignal);
    
    if (checked && index === -1) {
      // Add OFFICIAL_STORE chip
      this.trustSignals.push(officialStoreSignal);
    } else if (!checked && index !== -1) {
      // Remove OFFICIAL_STORE chip
      this.trustSignals.splice(index, 1);
    }
  }

  // --- Submit ---

  async submit(): Promise<void> {
    try {
      this.error = '';
      
      // Validação inicial
      if (!this.form.url.trim()) { 
        this.error = 'Link da oferta é obrigatório.';
        return; 
      }
      if (!this.form.title.trim()) { 
        this.error = 'Título é obrigatório.';
        return; 
      }
      if (!this.form.storeName.trim()) { 
        this.error = 'Nome da loja é obrigatório.';
        return; 
      }
      const price = parseBRLInputToNumber(this.form.currentPrice);
      if (!price || price <= 0) { 
        this.error = 'Preço atual é obrigatório e deve ser maior que zero.';
        return; 
      }
      if (!this.imageBlob || this.imageStatus !== 'ready') { 
        this.error = 'Imagem do produto é obrigatória.';
        return; 
      }

      this.saving = true;
      
      // Upload da imagem
      let imageUrl: string;
      let imageKey: string;
      try {
        this.imageStatus = 'uploading';
        const result = await this.uploadService.uploadPromotionImage(this.imageBlob);
        imageUrl = result.imageUrl;
        imageKey = result.imageKey;
        this.imageStatus = 'done';
      } catch (error) {
        this.imageStatus = 'error';
        this.imageError = 'Não foi possível enviar a imagem.';
        this.error = 'Não foi possível enviar a imagem.';
        this.saving = false;
        console.error('Image upload error:', error);
        return;
      }

      const originalPrice = parseBRLInputToNumber(this.form.originalPrice);
      const now = new Date().toISOString();
      const sourceId = `manual-mod-${Date.now()}`;
      const storeName = this.form.storeName.trim();
      const marketplace = deriveMarketplace(storeName);
      const title = normalizePromotionTitle(this.form.title);

      // Parse trust signals fields
      const salesCount = this.parseOptionalIntegerInput(this.form.salesCount);
      const productRating = normalizeRatingInput(this.form.productRating);
      const sellerRating = normalizeRatingInput(this.form.sellerRating);

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
        imageKey,
        currentPrice: price,
        originalPrice: originalPrice && originalPrice > 0 ? originalPrice : null,
        coupon: this.form.couponCode.trim() || null,
        category: this.form.category.trim() || 'GERAL',
        availability: this.form.availability || null,
        priceSignal: this.form.priceSignal || null,
        publishAt: now,
        verifiedAt: now,
        // New trust signals fields
        salesCount: salesCount && salesCount > 0 ? salesCount : null,
        productRating,
        sellerRating,
        officialStore: this.form.officialStore,
        trustSignals: this.trustSignals,
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
      availability: '', 
      priceSignal: '',
      salesCount: '',
      productRating: '',
      sellerRating: '',
      officialStore: false
    };
    this.trustSignals = [];
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
