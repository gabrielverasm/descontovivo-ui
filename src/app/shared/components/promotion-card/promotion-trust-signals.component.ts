import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Promotion } from '../../../core/models/promotion.model';

@Component({
  selector: 'app-promotion-trust-signals',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './promotion-trust-signals.component.html',
  styleUrl: './promotion-trust-signals.component.scss',
})
export class PromotionTrustSignalsComponent {
  @Input({ required: true }) promotion!: Promotion;

  get hasDealSignal() {
    return Boolean(this.promotion.offerBadge && this.promotion.offerBadge !== 'Comum');
  }

  get dealSignalLabel() {
    return this.promotion.offerBadge === 'Muito boa'
      ? 'Oferta muito boa'
      : 'Oferta com bom desconto';
  }

  get hasReviewSignal() {
    return Boolean(this.promotion.trustBadge || this.promotion.isSoldAndDeliveredByTrustedStore);
  }

  get reviewSignalTitle() {
    return (
      this.promotion.trustTooltip ||
      'Oferta revisada. Passou por uma checagem básica antes de aparecer no feed.'
    );
  }

  get reviewSignalLabel() {
    return this.isTrustedMarketplaceSignal ? 'Marketplace grande reconhecido' : 'Oferta revisada';
  }

  get isTrustedMarketplaceSignal() {
    return Boolean(this.promotion.isSoldAndDeliveredByTrustedStore && this.promotion.trustedStoreName);
  }

  get warningBadgeDescription() {
    const warningBadge = this.promotion.warningBadge?.toLowerCase() || '';

    if (warningBadge.includes('frete')) {
      return 'Confira o valor do frete antes de comprar. Em algumas regiões, o frete pode reduzir a vantagem da oferta.';
    }

    if (warningBadge.includes('vendedor')) {
      return (
        this.promotion.sellerWarning ||
        'Vendedor de marketplace: pode não ser uma loja grande reconhecida. Confira reputação, prazo, frete e política de troca antes de comprar.'
      );
    }

    if (warningBadge.includes('marketplace')) {
      return (
        this.promotion.sellerWarning ||
        'Vendedor de marketplace: pode não ser uma loja grande reconhecida. Confira reputação, prazo, frete e política de troca antes de comprar.'
      );
    }

    return this.promotion.warningBadge || 'Sinal de atenção para esta oferta.';
  }

  get isShippingWarning() {
    return this.promotion.warningBadge?.toLowerCase().includes('frete') || false;
  }

  get isMarketplaceWarning() {
    return this.promotion.warningBadge?.toLowerCase().includes('marketplace') || false;
  }

  get couponBadgeDescription() {
    return this.promotion.couponCode
      ? `Use o cupom ${this.promotion.couponCode} antes de finalizar a compra.`
      : 'Cupom disponível para esta oferta.';
  }
}
