import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Promotion } from '../../../core/models/promotion.model';

@Component({
  selector: 'app-promotion-trust-signals',
  standalone: true,
  imports: [NgIf, RouterLink],
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
}
