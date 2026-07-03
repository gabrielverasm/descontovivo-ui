import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Promotion } from '../../../core/models/promotion.model';
import {
  isUsefulSellerValue,
  isSoldAndDeliveredByAmazon,
  isSoldAndDeliveredByStore,
  isDeliveredByStore,
  hasPartnerDelivery,
  hasThirdPartySeller,
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

  get showThirdPartySellerIcon(): boolean {
    if (this.showStoreFulfilled) return false;
    return hasThirdPartySeller(this.promotion);
  }

  get showStoreDeliveryIcon(): boolean {
    if (this.showStoreFulfilled) return false;
    return isDeliveredByStore(this.promotion);
  }

  get showPartnerDeliveryIcon(): boolean {
    if (this.showStoreFulfilled) return false;
    if (this.showStoreDeliveryIcon) return false;
    return hasPartnerDelivery(this.promotion);
  }

  get isAmazonFulfillment(): boolean {
    return isSoldAndDeliveredByAmazon(this.promotion.soldBy, this.promotion.deliveredBy);
  }

  get thirdPartySellerTitle(): string {
    return 'Vendedor terceiro. Confira reputação, avaliações, prazo, frete e política de troca antes de comprar.';
  }
}
