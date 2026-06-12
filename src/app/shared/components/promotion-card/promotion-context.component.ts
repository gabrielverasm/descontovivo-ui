import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Promotion } from '../../../core/models/promotion.model';

@Component({
  selector: 'app-promotion-context',
  standalone: true,
  imports: [NgIf, RouterLink],
  templateUrl: './promotion-context.component.html',
  styleUrl: './promotion-context.component.scss',
})
export class PromotionContextComponent {
  @Input({ required: true }) promotion!: Promotion;

  get isTrustedFulfillment() {
    return Boolean(
      this.promotion.isSoldAndDeliveredByTrustedStore && this.promotion.trustedStoreName,
    );
  }

  get trustedFulfillmentTitle() {
    return 'Marketplace grande e reconhecido. Compra mais segura, mas confira as condições antes de finalizar.';
  }

  get deliveryProviderName() {
    const deliveryInfo = this.promotion.deliveryInfo?.trim();

    if (this.promotion.trustedStoreName) {
      return this.promotion.trustedStoreName;
    }

    if (!deliveryInfo) {
      return '';
    }

    const normalizedDelivery = deliveryInfo.toLowerCase();

    if (normalizedDelivery.includes('amazon')) {
      return 'Amazon';
    }

    if (normalizedDelivery.includes('magalu')) {
      return 'Magalu';
    }

    if (normalizedDelivery.includes('mercado livre')) {
      return 'Mercado Livre';
    }

    if (normalizedDelivery.includes('loja') || normalizedDelivery.includes('marketplace')) {
      return this.promotion.storeName;
    }

    return deliveryInfo;
  }

  get sellerProviderName() {
    return this.promotion.sellerName?.trim() || this.promotion.trustedStoreName?.trim() || '';
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
