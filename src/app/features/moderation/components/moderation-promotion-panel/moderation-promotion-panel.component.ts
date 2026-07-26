import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Promotion } from '../../../../core/models/promotion.model';
import { PromotionImageComponent } from '../../../../shared/components/promotion-image/promotion-image.component';
import { PromotionImageUploadComponent } from '../../../../shared/components/promotion-image-upload/promotion-image-upload.component';
import { formatCentsToBRL, onlyDigits } from '../../../../shared/utils/money-input.util';
import { resolveStoreName } from '../../../../shared/utils/store-name.util';
import { ModerationCategoryService, ModerationCategory } from '../../../../core/services/moderation-category.service';
import { MarketplaceInspectionButtonComponent } from '../../../../shared/components/marketplace-inspection-button/marketplace-inspection-button.component';
import { PromotionInspectionResponse } from '../../../../core/models/marketplace-inspection.model';
import { getMarketplaceTrustSignals, getMultipleTrustSignalsMetadata, TrustSignal } from '../../../../shared/utils/trust-signals.util';
import { normalizeOfficialStoreSignals, PromotionModerationFormValue } from '../../moderation-form.model';
import { formatRatingForInput, normalizeRatingInput } from '../../../../shared/utils/rating-input.util';

interface FieldDiag {
  label: string;
  status: 'ok' | 'missing' | 'optional';
}

export type ModerationPromotionMode = 'validate' | 'edit';

@Component({
  selector: 'app-moderation-promotion-panel',
  standalone: true,
  imports: [FormsModule, PromotionImageComponent, PromotionImageUploadComponent, MarketplaceInspectionButtonComponent],
  templateUrl: './moderation-promotion-panel.component.html',
  styleUrl: './moderation-promotion-panel.component.scss',
})
export class ModerationPromotionPanelComponent implements OnInit {
  @Input({ required: true }) promotion!: Promotion;
  @Input({ required: true }) mode: ModerationPromotionMode = 'validate';
  @Input() editForm!: PromotionModerationFormValue;
  @Input() actionInProgress: string | null = null;
  @Input() newImagePreviewUrl: string | null = null;
  @Input() newImageSizeKB: number | null = null;
  @Input() newImageStatusText: string | null = null;
  @Input() newImageError: string | null = null;
  @Input() soldAndDeliveredByStore = false;
  @Input() showRejectInput = false;
  @Input() rejectReason = '';

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  @Output() publish = new EventEmitter<void>();
  @Output() startReject = new EventEmitter<void>();
  @Output() cancelReject = new EventEmitter<void>();
  @Output() confirmReject = new EventEmitter<void>();
  @Output() imageSelected = new EventEmitter<File>();
  @Output() removeImage = new EventEmitter<void>();
  @Output() toggleSoldDelivered = new EventEmitter<boolean>();
  @Output() useStoreForSoldBy = new EventEmitter<void>();
  @Output() useStoreForDeliveredBy = new EventEmitter<void>();
  @Output() copySoldByToDeliveredBy = new EventEmitter<void>();
  @Output() rejectReasonChange = new EventEmitter<string>();
  @Output() inspectionLoaded = new EventEmitter<PromotionInspectionResponse>();
  @Output() inspectionFailed = new EventEmitter<void>();

  private readonly categoryService = inject(ModerationCategoryService);
  categories: ModerationCategory[] = [];
  categoriesLoading = false;
  categoriesError = false;
  editingCategory: string | null = null;
  editingCategoryName = '';

  currentPriceDisplay = '';
  originalPriceDisplay = '';
  private currentPriceDigits = '';
  private originalPriceDigits = '';

  @Input()
  set priceValues(val: { currentPrice?: number; originalPrice?: number }) {
    if (val.currentPrice != null) {
      this.currentPriceDigits = Math.round(val.currentPrice * 100).toString();
      this.currentPriceDisplay = formatCentsToBRL(this.currentPriceDigits);
    } else {
      this.currentPriceDigits = '';
      this.currentPriceDisplay = '';
    }
    if (val.originalPrice != null) {
      this.originalPriceDigits = Math.round(val.originalPrice * 100).toString();
      this.originalPriceDisplay = formatCentsToBRL(this.originalPriceDigits);
    } else {
      this.originalPriceDigits = '';
      this.originalPriceDisplay = '';
    }
  }

  onCurrentPriceInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.currentPriceDigits = onlyDigits(raw);
    this.currentPriceDisplay = formatCentsToBRL(this.currentPriceDigits);
    this.editForm.currentPrice = this.currentPriceDisplay;
  }

  onOriginalPriceInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.originalPriceDigits = onlyDigits(raw);
    this.originalPriceDisplay = formatCentsToBRL(this.originalPriceDigits);
    this.editForm.originalPrice = this.originalPriceDisplay;
  }

  normalizeRatingField(field: 'productRating' | 'sellerRating'): void {
    this.editForm[field] = formatRatingForInput(normalizeRatingInput(this.editForm[field]));
  }

  get isActionDisabled(): boolean {
    return this.actionInProgress === this.promotion.id;
  }

  getCurrentStoreName(): string {
    return resolveStoreName(this.promotion.store?.name || this.promotion.storeName);
  }

  hasValidStoreName(): boolean {
    return !!(this.editForm.storeName?.trim() || this.getCurrentStoreName());
  }

  getOfferLink(): string {
    return this.promotion.url || this.promotion.offerUrl || this.promotion.storeUrl || '';
  }

  get availableTrustSignals(): string[] {
    return getMarketplaceTrustSignals(this.editForm.marketplace || this.promotion.marketplace || '').map(signal => signal.toString());
  }

  getTrustSignalLabel(signal: string): string {
    return getMultipleTrustSignalsMetadata([signal as TrustSignal])[0]?.label || signal;
  }

  getTrustSignalTooltip(signal: string): string {
    return getMultipleTrustSignalsMetadata([signal as TrustSignal])[0]?.tooltip || '';
  }

  toggleTrustSignal(signal: string): void {
    const signals = this.editForm.trustSignals || [];
    const index = signals.indexOf(signal);
    index === -1 ? signals.push(signal) : signals.splice(index, 1);
    this.editForm.trustSignals = signals;
    if (signal === TrustSignal.OFFICIAL_STORE) this.editForm.officialStore = index === -1;
    this.editForm.trustSignals = normalizeOfficialStoreSignals(this.editForm.officialStore, this.editForm.trustSignals);
  }

  isTrustSignalSelected(signal: string): boolean { return (this.editForm.trustSignals || []).includes(signal); }

  onOfficialStoreChange(checked: boolean): void {
    this.editForm.officialStore = checked;
    const signal = TrustSignal.OFFICIAL_STORE.toString();
    const signals = this.editForm.trustSignals || [];
    const index = signals.indexOf(signal);
    if (checked && index === -1) signals.push(signal);
    if (!checked && index !== -1) signals.splice(index, 1);
    this.editForm.trustSignals = normalizeOfficialStoreSignals(checked, signals);
  }

  getFieldDiagnostics(): FieldDiag[] {
    const promo = this.promotion;
    const has = (v: unknown) => v !== undefined && v !== null && String(v).trim() !== '';
    const badStore = !promo.store?.name && (!promo.storeName || promo.storeName === 'loja-nao-identificada');
    return [
      { label: 'Título', status: has(promo.title) ? 'ok' : 'missing' },
      { label: 'Link da oferta', status: has(promo.url) || has(promo.offerUrl) || has(promo.storeUrl) ? 'ok' : 'missing' },
      { label: 'Preço atual', status: has(promo.currentPrice) ? 'ok' : 'missing' },
      { label: 'Preço original', status: has(promo.originalPrice) ? 'ok' : 'optional' },
      { label: 'Cupom', status: has(promo.couponCode) ? 'ok' : 'optional' },
      { label: 'Loja', status: badStore ? 'missing' : 'ok' },
      { label: 'Imagem', status: has(promo.imageUrl) ? 'ok' : 'missing' },
      { label: 'Vendido por', status: has(promo.soldBy) ? 'ok' : 'optional' },
      { label: 'Entregue por', status: has(promo.deliveredBy) ? 'ok' : 'optional' },
      { label: 'Categoria', status: has(promo.category) ? 'ok' : 'optional' },
      { label: 'Disponibilidade', status: has(promo.availability) ? 'ok' : 'optional' },
    ];
  }

  onRejectReasonChange(value: string): void {
    this.rejectReasonChange.emit(value);
  }

  ngOnInit(): void {
    this.loadCategories();
  }

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
    this.editForm.category = name;
  }

  startEditCategory(name: string): void {
    this.editingCategory = name;
    this.editingCategoryName = name;
  }

  cancelEditCategory(): void {
    this.editingCategory = null;
    this.editingCategoryName = '';
  }

  saveEditCategory(oldName: string): void {
    const newName = this.editingCategoryName.trim();
    if (!newName || newName === oldName) {
      this.cancelEditCategory();
      return;
    }
    this.categoryService.rename(oldName, newName).subscribe({
      next: () => {
        if (this.editForm.category === oldName) {
          this.editForm.category = newName;
        }
        this.cancelEditCategory();
        this.loadCategories();
      },
      error: (err) => {
        const msg = err?.error?.message || 'Erro ao renomear categoria.';
        alert(msg);
      },
    });
  }

  deleteCategory(cat: ModerationCategory): void {
    const countText = cat.promotionCount > 0
      ? ` de ${cat.promotionCount} promoção(ões)`
      : '';
    const confirmed = confirm(
      `Excluir a categoria "${cat.name}"${countText}? As promoções não serão apagadas.`
    );
    if (!confirmed) return;

    this.categoryService.delete(cat.name).subscribe({
      next: () => {
        if (this.editForm.category === cat.name) {
          this.editForm.category = '';
        }
        this.loadCategories();
      },
      error: (err) => {
        const msg = err?.error?.message || 'Erro ao excluir categoria.';
        alert(msg);
      },
    });
  }

  onEditCategoryKeydown(event: KeyboardEvent, oldName: string): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.saveEditCategory(oldName);
    } else if (event.key === 'Escape') {
      this.cancelEditCategory();
    }
  }
}
