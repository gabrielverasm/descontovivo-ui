import { CurrencyPipe, NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';

import { Promotion } from '../../../core/models/promotion.model';

@Component({
  selector: 'app-promotion-price',
  standalone: true,
  imports: [CurrencyPipe, NgIf],
  templateUrl: './promotion-price.component.html',
  styleUrl: './promotion-price.component.scss',
})
export class PromotionPriceComponent {
  @Input({ required: true }) promotion!: Promotion;
}
