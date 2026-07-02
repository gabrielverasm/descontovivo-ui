import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Promotion } from '../../../../core/models/promotion.model';
import { ModerationDecisionRequest } from '../../../../core/services/moderation.service';
import { PromotionImageComponent } from '../../../../shared/components/promotion-image/promotion-image.component';
import { PromotionImageUploadComponent } from '../../../../shared/components/promotion-image-upload/promotion-image-upload.component';

interface FieldDiag {
  label: string;
  status: 'ok' | 'missing' | 'optional';
}

@Component({
  selector: 'app-moderation-promotion-panel',
  standalone: true,
  imports: [FormsModule, PromotionImageComponent, PromotionImageUploadComponent],
  templateUrl: './moderation-promotion-panel.component.html',
  styleUrl: './moderation-promotion-panel.component.scss',
})
export class ModerationPromotionPanelComponent {
  @Input({ required: true }) promotion!: Promotion;
  @Input() editForm: Partial<ModerationDecisionRequest> = {};
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

  get isActionDisabled(): boolean {
    return this.actionInProgress === this.promotion.id;
  }

  getCurrentStoreName(): string {
    const name = this.promotion.store?.name || this.promotion.storeName || '';
    return name === 'loja-nao-identificada' ? '' : name;
  }

  hasValidStoreName(): boolean {
    return !!this.getCurrentStoreName();
  }

  getOfferLink(): string {
    return this.promotion.url || this.promotion.offerUrl || this.promotion.storeUrl || '';
  }

  getFieldDiagnostics(): FieldDiag[] {
    const promo = this.promotion;
    const has = (v: unknown) => v !== undefined && v !== null && String(v).trim() !== '';
    const badStore = !promo.store?.name && (!promo.storeName || promo.storeName === 'loja-nao-identificada');
    return [
      { label: 'Título', status: has(promo.title) ? 'ok' : 'missing' },
      { label: 'Descrição', status: has(promo.description) && promo.description !== promo.title ? 'ok' : 'missing' },
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
}
