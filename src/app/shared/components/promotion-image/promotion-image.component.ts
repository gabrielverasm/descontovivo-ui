import { Component, HostBinding, Input } from '@angular/core';

import { Promotion } from '../../../core/models/promotion.model';

type PromotionImageVariant = 'card' | 'detail';

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

  @HostBinding('class.promotion-image--detail')
  get isDetailVariant() {
    return this.variant === 'detail';
  }

  markImageUnavailable() {
    this.imageUnavailable = true;
  }
}
