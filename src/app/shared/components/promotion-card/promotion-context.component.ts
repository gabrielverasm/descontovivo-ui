import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Promotion } from '../../../core/models/promotion.model';
import {
  isUsefulSellerValue,
  isSoldAndDeliveredByAmazon,
  getAmazonTrustLabel,
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

  /** Fonte primária: soldBy > sellerName > trustedStoreName */
  get sellerProviderName(): string {
    if (isUsefulSellerValue(this.promotion.soldBy)) return this.promotion.soldBy!.trim();
    if (isUsefulSellerValue(this.promotion.sellerName)) return this.promotion.sellerName!.trim();
    if (isUsefulSellerValue(this.promotion.trustedStoreName)) return this.promotion.trustedStoreName!.trim();
    return '';
  }

  /** Fonte primária: deliveredBy > deliveryInfo > trustedStoreName */
  get deliveryProviderName(): string {
    if (isUsefulSellerValue(this.promotion.deliveredBy)) return this.promotion.deliveredBy!.trim();

    if (isUsefulSellerValue(this.promotion.trustedStoreName)) return this.promotion.trustedStoreName!.trim();

    const deliveryInfo = this.promotion.deliveryInfo?.trim();
    if (!deliveryInfo || !isUsefulSellerValue(deliveryInfo)) return '';

    const normalizedDelivery = deliveryInfo.toLowerCase();
    if (normalizedDelivery.includes('amazon')) return 'Amazon';
    if (normalizedDelivery.includes('magalu')) return 'Magalu';
    if (normalizedDelivery.includes('mercado livre')) return 'Mercado Livre';
    if (normalizedDelivery.includes('loja') || normalizedDelivery.includes('marketplace')) {
      return isUsefulSellerValue(this.promotion.storeName) ? this.promotion.storeName : '';
    }
    return deliveryInfo;
  }

  get isTrustedFulfillment() {
    return Boolean(
      this.promotion.isSoldAndDeliveredByTrustedStore && this.promotion.trustedStoreName,
    );
  }

  get trustedFulfillmentTitle() {
    return 'Marketplace grande e reconhecido. Compra mais segura, mas confira as condições antes de finalizar.';
  }

  /** Quando soldBy e deliveredBy indicam Amazon */
  get isAmazonFulfillment(): boolean {
    return isSoldAndDeliveredByAmazon(this.promotion.soldBy, this.promotion.deliveredBy);
  }

  get amazonTrustLabel(): string {
    return getAmazonTrustLabel();
  }

  get isSameSellerAndDelivery() {
    return Boolean(
      this.sellerProviderName &&
        this.deliveryProviderName &&
        this.normalizeProviderName(this.sellerProviderName) === this.normalizeProviderName(this.deliveryProviderName),
    );
  }

  get isMarketplaceSeller() {
    return (
      this.promotion.sellerType === 'marketplace' || this.promotion.sellerType === 'third_party'
    );
  }

  get sellerWarningTitle() {
    return (
      this.promotion.sellerWarning ||
      'Vendedor de marketplace menor: confira reputação, prazo, frete e política de troca antes de comprar.'
    );
  }

  private normalizeProviderName(providerName: string) {
    return providerName.toLowerCase().replace(/\.com\.br/g, '').trim();
  }
}
