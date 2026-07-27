import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { debounceTime, Subject, Subscription } from 'rxjs';
import { Promotion } from '../../../../core/models/promotion.model';
import { PromotionImageUploadComponent } from '../../../../shared/components/promotion-image-upload/promotion-image-upload.component';
import { MarketplaceInspectionButtonComponent } from '../../../../shared/components/marketplace-inspection-button/marketplace-inspection-button.component';
import { PromotionInspectionResponse } from '../../../../core/models/marketplace-inspection.model';
import { formatIntegerInput } from '../../../../shared/utils/integer-input.util';
import { formatRatingWhileTyping } from '../../../../shared/utils/rating-input.util';
import { getMarketplaceTrustSignals, getMultipleTrustSignalsMetadata, TrustSignal } from '../../../../shared/utils/trust-signals.util';
import { normalizeOfficialStoreSignals, PromotionModerationFormValue } from '../../moderation-form.model';
import { PromotionCategorySelectorComponent } from '../promotion-category-selector/promotion-category-selector.component';
import { BrlCurrencyInputDirective } from '../../../../shared/directives/brl-currency-input.directive';
import { resolveStoreFromOfferUrl } from '../../../../shared/utils/store-from-offer-url.util';

export type ModerationPromotionMode = 'create' | 'validate' | 'edit';

@Component({
  selector: 'app-moderation-promotion-panel',
  standalone: true,
  imports: [FormsModule, PromotionImageUploadComponent, MarketplaceInspectionButtonComponent, PromotionCategorySelectorComponent, BrlCurrencyInputDirective],
  templateUrl: './moderation-promotion-panel.component.html',
  styleUrl: './moderation-promotion-panel.component.scss',
})
export class ModerationPromotionPanelComponent implements OnChanges, OnDestroy, OnInit {
  @ViewChild(PromotionCategorySelectorComponent) categorySelector?: PromotionCategorySelectorComponent;
  @ViewChild('titleInput') titleInput?: ElementRef<HTMLInputElement>;
  @Input() promotion!: Promotion;
  @Input({ required: true }) mode: ModerationPromotionMode = 'validate';
  @Input({ required: true }) editForm!: PromotionModerationFormValue;
  @Input() actionInProgress: string | null = null;
  @Input() newImagePreviewUrl: string | null = null;
  @Input() newImageSizeKB: number | null = null;
  @Input() newImageStatusText: string | null = null;
  @Input() newImageError: string | null = null;
  @Input() persistedImageHidden = false;
  @Input() soldAndDeliveredByStore = false;
  @Input() showRejectInput = false;
  @Input() rejectReason = '';
  @Input() formError = '';
  @Input() feedbackMessage = '';
  @Input() imageBusy = false;

  @Output() close = new EventEmitter<void>();
  @Output() create = new EventEmitter<void>();
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

  private readonly offerUrlChanges = new Subject<string>();
  private readonly subscriptions = new Subscription();
  private lastAutoStoreName: string | null = null;
  private lastAutoDeliveredBy: string | null = null;
  private storeNameManuallyEdited = false;
  private deliveredByManuallyEdited = false;
  private initialized = false;

  ngOnInit(): void {
    this.subscriptions.add(
      this.offerUrlChanges.pipe(debounceTime(400)).subscribe((url) => this.autofillStore(url)),
    );
    this.initialized = true;
    this.offerUrlChanges.next(this.editForm.url);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['editForm']) return;
    this.resetAutofillTracking();
    if (this.initialized) this.offerUrlChanges.next(this.editForm.url);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get isActionDisabled(): boolean {
    return this.imageBusy || !!this.actionInProgress;
  }

  get displayedImageUrl(): string | null {
    if (this.newImagePreviewUrl) return this.newImagePreviewUrl;
    if (this.mode !== 'create' && !this.persistedImageHidden) return this.promotion?.imageUrl?.trim() || null;
    return null;
  }

  get displayedImageAlt(): string {
    return this.promotion?.title ? `Imagem de ${this.promotion.title}` : 'Imagem da promoção';
  }

  get availableTrustSignals(): string[] {
    const marketplace = this.editForm.marketplace || (this.mode === 'create' ? '' : this.promotion?.marketplace || '');
    const signals = getMarketplaceTrustSignals(marketplace).map(signal => signal.toString());
    const curated = TrustSignal.CURATED_BY_DESCONTOVIVO.toString();
    return signals.includes(curated) ? [curated, ...signals.filter(signal => signal !== curated)] : signals;
  }

  hasValidStoreName(): boolean { return !!this.editForm.storeName.trim(); }

  onOfferUrlChange(value: string): void {
    this.editForm.url = value;
    this.offerUrlChanges.next(value);
  }

  onStoreNameChange(value: string): void {
    this.editForm.storeName = value;
    this.storeNameManuallyEdited = value !== this.lastAutoStoreName;
  }

  onDeliveredByChange(value: string): void {
    this.editForm.deliveredBy = value;
    this.deliveredByManuallyEdited = value !== this.lastAutoDeliveredBy;
  }

  updateSalesCount(value: string): void {
    this.editForm.salesCount = formatIntegerInput(value);
  }

  updateRating(field: 'productRating' | 'sellerRating', value: string): void {
    this.editForm[field] = formatRatingWhileTyping(value, this.editForm[field]);
  }

  onRatingInput(field: 'productRating' | 'sellerRating', event: Event): void {
    const input = event.target as HTMLInputElement;
    this.updateRating(field, input.value);
    input.value = this.editForm[field];
  }

  updateCategories(categories: string[]): void {
    this.editForm.categories = [...new Set(categories)];
    this.editForm.category = this.editForm.categories[0] || '';
  }

  resetCategoriesAndFocusTitle(): void {
    this.categorySelector?.resetAfterSuccessfulSave();
    queueMicrotask(() => this.titleInput?.nativeElement.focus());
  }

  toggleTrustSignal(signal: string): void {
    const selected = this.editForm.trustSignals.includes(signal);
    const next = selected ? this.editForm.trustSignals.filter(value => value !== signal) : [...this.editForm.trustSignals, signal];
    if (signal === TrustSignal.OFFICIAL_STORE) this.editForm.officialStore = !selected;
    this.editForm.trustSignals = normalizeOfficialStoreSignals(this.editForm.officialStore, next);
  }

  isTrustSignalSelected(signal: string): boolean { return this.editForm.trustSignals.includes(signal); }
  getTrustSignalLabel(signal: string): string { return getMultipleTrustSignalsMetadata([signal as TrustSignal])[0]?.label || signal; }
  getTrustSignalTooltip(signal: string): string { return getMultipleTrustSignalsMetadata([signal as TrustSignal])[0]?.tooltip || ''; }

  private autofillStore(url: string): void {
    const storeName = resolveStoreFromOfferUrl(url);
    if (!storeName) return;

    if (this.canAutofill(this.editForm.storeName, this.lastAutoStoreName, this.storeNameManuallyEdited)) {
      this.editForm.storeName = storeName;
      this.lastAutoStoreName = storeName;
      this.storeNameManuallyEdited = false;
    }

    if (this.canAutofill(this.editForm.deliveredBy, this.lastAutoDeliveredBy, this.deliveredByManuallyEdited)) {
      this.editForm.deliveredBy = storeName;
      this.lastAutoDeliveredBy = storeName;
      this.deliveredByManuallyEdited = false;
    }
  }

  private canAutofill(currentValue: string, lastAutoValue: string | null, manuallyEdited: boolean): boolean {
    return !currentValue.trim() || (!manuallyEdited && lastAutoValue !== null && currentValue === lastAutoValue);
  }

  private resetAutofillTracking(): void {
    this.lastAutoStoreName = null;
    this.lastAutoDeliveredBy = null;
    this.storeNameManuallyEdited = false;
    this.deliveredByManuallyEdited = false;
  }
}
