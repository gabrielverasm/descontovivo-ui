import { CurrencyPipe, NgIf } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { Promotion } from '../../../core/models/promotion.model';
import { PromotionContextComponent } from './promotion-context.component';
import { PromotionTrustSignalsComponent } from './promotion-trust-signals.component';
import { PromotionVoteButtonsComponent } from './promotion-vote-buttons.component';

@Component({
  selector: 'app-promotion-card',
  standalone: true,
  imports: [
    CurrencyPipe,
    NgIf,
    PromotionContextComponent,
    PromotionTrustSignalsComponent,
    PromotionVoteButtonsComponent,
    RouterLink,
  ],
  templateUrl: './promotion-card.component.html',
  styleUrl: './promotion-card.component.scss',
})
export class PromotionCardComponent {
  private readonly router = inject(Router);
  private currentPromotion!: Promotion;

  @Input({ required: true })
  set promotion(promotion: Promotion) {
    this.currentPromotion = promotion;
  }

  get promotion() {
    return this.currentPromotion;
  }

  get latestCommentPreview() {
    return this.promotion.latestCommentPreview || 'ainda não há comentários';
  }

  get externalOfferLabel() {
    const destinationName =
      this.promotion.sellerName?.trim() ||
      this.promotion.trustedStoreName?.trim() ||
      this.promotion.storeName?.trim();

    return destinationName ? `Ir para ${destinationName}` : 'Ir para loja';
  }

  openDetails() {
    void this.router.navigate(['/promocoes', this.promotion.id]);
  }

  openDetailsFromKeyboard(event: KeyboardEvent) {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    this.openDetails();
  }
}
