import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FloatingFieldComponent } from '../../../../shared/components/floating-field/floating-field.component';
import { PromotionImageUploadComponent } from '../../../../shared/components/promotion-image-upload/promotion-image-upload.component';
import { formatCentsToBRL, onlyDigits, parseBRLInputToNumber } from '../../../../shared/utils/money-input.util';
import { deriveMarketplace } from '../../../../shared/utils/marketplace.util';
import { getMarketplaceTrustSignals, getMultipleTrustSignalsMetadata, TrustSignal } from '../../../../shared/utils/trust-signals.util';

@Component({
  selector: 'app-promotion-detail-admin',
  standalone: true,
  imports: [FormsModule, FloatingFieldComponent, PromotionImageUploadComponent],
  templateUrl: './promotion-detail-admin.component.html',
  styleUrl: './promotion-detail-admin.component.scss',
})
export class PromotionDetailAdminComponent {
  @Input() isAdmin = false;
  @Input() isEditMode = false;
  @Input() isRemoveConfirm = false;
  @Input() isAdminSaving = false;
  @Input() adminMessage = '';
  @Input() adminError = '';
  @Input() editForm = { 
    title: '', 
    url: '', 
    currentPrice: '', 
    originalPrice: '', 
    couponCode: '', 
    storeName: '', 
    soldBy: '', 
    deliveredBy: '', 
    category: '', 
    availability: '',
    // New trust signals fields
    salesCount: '',
    productRating: '',
    sellerRating: '',
    officialStore: false,
    trustSignals: [] as string[]
  };
  @Input() adminImagePreviewUrl: string | null = null;
  @Input() adminImageSizeKB: number | null = null;
  @Input() adminImageStatusText: string | null = null;
  @Input() adminImageError: string | null = null;

  @Output() openEdit = new EventEmitter<void>();
  @Output() cancelEdit = new EventEmitter<void>();
  @Output() submitEdit = new EventEmitter<void>();
  @Output() confirmRemove = new EventEmitter<void>();
  @Output() cancelRemove = new EventEmitter<void>();
  @Output() executeRemove = new EventEmitter<void>();
  @Output() imageSelected = new EventEmitter<File>();
  @Output() removeImage = new EventEmitter<void>();

  onPriceInput(field: 'currentPrice' | 'originalPrice', value: string): void {
    const digits = onlyDigits(value);
    this.editForm[field] = formatCentsToBRL(digits);
  }

  // Trust signals methods
  get availableTrustSignals(): string[] {
    const marketplace = deriveMarketplace(this.editForm.storeName || '');
    return getMarketplaceTrustSignals(marketplace).map(signal => signal.toString());
  }

  getTrustSignalLabel(signal: string): string {
    const metadata = getMultipleTrustSignalsMetadata([signal as TrustSignal])[0];
    return metadata?.label || signal;
  }

  getTrustSignalTooltip(signal: string): string {
    const metadata = getMultipleTrustSignalsMetadata([signal as TrustSignal])[0];
    return metadata?.tooltip || '';
  }

  toggleTrustSignal(signal: string): void {
    const index = this.editForm.trustSignals.indexOf(signal);
    if (index === -1) {
      this.editForm.trustSignals.push(signal);
    } else {
      this.editForm.trustSignals.splice(index, 1);
    }
    
    // Sync OFFICIAL_STORE chip with officialStore checkbox
    if (signal === TrustSignal.OFFICIAL_STORE) {
      this.editForm.officialStore = index === -1; // true when added, false when removed
    }
  }

  isTrustSignalSelected(signal: string): boolean {
    return this.editForm.trustSignals.includes(signal);
  }

  onOfficialStoreChange(checked: boolean): void {
    this.editForm.officialStore = checked;
    
    // Sync with OFFICIAL_STORE chip
    const officialStoreSignal = TrustSignal.OFFICIAL_STORE.toString();
    const index = this.editForm.trustSignals.indexOf(officialStoreSignal);
    
    if (checked && index === -1) {
      // Add OFFICIAL_STORE chip
      this.editForm.trustSignals.push(officialStoreSignal);
    } else if (!checked && index !== -1) {
      // Remove OFFICIAL_STORE chip
      this.editForm.trustSignals.splice(index, 1);
    }
  }

  private normalizeRatingInput(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    // If it's already a number, validate range
    if (typeof value === 'number') {
      return value >= 0 && value <= 5 ? value : null;
    }
    
    // If it's a string, normalize it
    const str = value.toString().trim();
    if (!str) return null;
    
    // Replace comma with dot
    let normalized = str.replace(',', '.');
    
    // Handle cases like "48" → "4.8", "49" → "4.9", "50" → "5.0"
    if (/^\d{2}$/.test(normalized)) {
      const num = parseInt(normalized, 10);
      if (num >= 0 && num <= 50) {
        normalized = (num / 10).toString();
      }
    }
    
    // Parse to float
    const parsed = parseFloat(normalized);
    
    // Validate range
    if (isNaN(parsed) || parsed < 0 || parsed > 5) {
      return null;
    }
    
    return parsed;
  }

  private formatRatingForInput(value: number | null): string {
    if (value === null || value === undefined) {
      return '';
    }
    return value.toString().replace('.', ',');
  }

  normalizeRatingField(field: 'productRating' | 'sellerRating'): void {
    const value = this.editForm[field];
    const normalized = this.normalizeRatingInput(value);
    
    if (normalized !== null && normalized !== undefined) {
      this.editForm[field] = this.formatRatingForInput(normalized);
    } else if (value && String(value).trim()) {
      // If normalization failed but there's a value, clear it
      this.editForm[field] = '';
    }
  }
}
