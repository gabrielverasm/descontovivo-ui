import { CurrencyPipe } from '@angular/common';
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

import { Promotion } from '../../../core/models/promotion.model';
import { calculateDiscountPercentage } from '../../utils/discount.util';

@Component({
  selector: 'app-promotion-price',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './promotion-price.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './promotion-price.component.scss',
})
export class PromotionPriceComponent {
  @Input({ required: true }) promotion!: Promotion;

  /** Computed from the two prices, not from the API's discountPercentage field. */
  get discountPercentage(): number | null {
    return calculateDiscountPercentage(this.promotion.originalPrice, this.promotion.currentPrice);
  }
}
