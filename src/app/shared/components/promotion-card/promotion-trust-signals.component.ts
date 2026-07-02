import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Promotion } from '../../../core/models/promotion.model';
import { isUsefulSellerValue, isSoldAndDeliveredByAmazon } from '../../utils/seller.util';

@Component({
  selector: 'app-promotion-trust-signals',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './promotion-trust-signals.component.html',
  styleUrl: './promotion-trust-signals.component.scss',
})
export class PromotionTrustSignalsComponent {
  @Input({ required: true }) promotion!: Promotion;

  get isAmazonFulfillment(): boolean {
    return isSoldAndDeliveredByAmazon(this.promotion.soldBy, this.promotion.deliveredBy);
  }

  get isSoldAndDeliveredBySameStore(): boolean {
    if (this.isAmazonFulfillment) return false;
    const sold = this.promotion.soldBy?.trim();
    const delivered = this.promotion.deliveredBy?.trim();
    if (!isUsefulSellerValue(sold) || !isUsefulSellerValue(delivered)) return false;
    const normSold = sold!.toLowerCase().replace(/\.com\.br$/i, '');
    const normDelivered = delivered!.toLowerCase().replace(/\.com\.br$/i, '');
    return normSold === normDelivered;
  }

  get isMarketplaceSeller(): boolean {
    if (this.isAmazonFulfillment) return false;
    if (this.isSoldAndDeliveredBySameStore) return false;
    const sold = this.promotion.soldBy?.trim();
    const delivered = this.promotion.deliveredBy?.trim();
    return isUsefulSellerValue(sold) && isUsefulSellerValue(delivered);
  }

  get hasCoupon(): boolean {
    return Boolean(this.promotion.couponCode?.trim());
  }

  get soldAndDeliveredTitle(): string {
    return 'A mesma loja aparece como vendedora e responsável pela entrega.';
  }

  get marketplaceTitle(): string {
    return 'A oferta pode envolver vendedor terceiro ou marketplace. Confira os dados na loja antes de comprar.';
  }

  get couponTitle(): string {
    return this.promotion.couponCode
      ? `Use o cupom ${this.promotion.couponCode} antes de finalizar a compra.`
      : 'Esta promoção pode ter cupom informado.';
  }
}
