import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Promotion } from '../../../core/models/promotion.model';
import {
  isUsefulSellerValue,
  isSoldAndDeliveredByAmazon,
  isSoldAndDeliveredByStore,
  hasPartnerDelivery,
} from '../../utils/seller.util';

@Component({
  selector: 'app-promotion-context',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './promotion-context.component.html',
  styleUrl: './promotion-context.component.scss',
})
export class PromotionContextComponent {
  @Input({ required: true }) promotion!: Promotion;

  get sellerProviderName(): string {
    if (isUsefulSellerValue(this.promotion.soldBy)) return this.promotion.soldBy!.trim();
    return '';
  }

  get deliveryProviderName(): string {
    if (isUsefulSellerValue(this.promotion.deliveredBy)) return this.promotion.deliveredBy!.trim();
    return '';
  }

  get showStoreFulfilled(): boolean {
    return isSoldAndDeliveredByStore(this.promotion);
  }

  get showPartnerDeliveryIcon(): boolean {
    return hasPartnerDelivery(this.promotion);
  }

  get isAmazonFulfillment(): boolean {
    return isSoldAndDeliveredByAmazon(this.promotion.soldBy, this.promotion.deliveredBy);
  }
}
