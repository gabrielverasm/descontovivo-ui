import { Component, HostBinding, Input } from '@angular/core';

import { Promotion } from '../../../core/models/promotion.model';

type PromotionImageVariant = 'card' | 'detail' | 'moderationPanel';

@Component({
  selector: 'app-promotion-image',
  standalone: true,
  imports: [],
  templateUrl: './promotion-image.component.html',
  styleUrl: './promotion-image.component.scss',
})
export class PromotionImageComponent {
  private currentPromotion!: Promotion;
  imageUnavailable = false;

  @Input() variant: PromotionImageVariant = 'card';

  @Input({ required: true })
  set promotion(promotion: Promotion) {
    this.currentPromotion = promotion;
    this.imageUnavailable = !promotion.imageUrl?.trim();
  }

  get promotion() {
    return this.currentPromotion;
  }

  get imageAlt(): string {
    const title = this.currentPromotion.title;
    const store = this.currentPromotion.storeName;
    if (store && store.toLowerCase() !== 'loja não identificada' && store.toLowerCase() !== 'loja-nao-identificada') {
      return `${title} em ${store}`;
    }
    return title;
  }

  @HostBinding('class.promotion-image--detail')
  get isDetailVariant() {
    return this.variant === 'detail';
  }

  @HostBinding('class.promotion-image--moderation-panel')
  get isModerationPanelVariant() {
    return this.variant === 'moderationPanel';
  }

  markImageUnavailable() {
    this.imageUnavailable = true;
  }
}
