import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Promotion } from '../../../core/models/promotion.model';
import { PromotionContextComponent } from './promotion-context.component';
import { PromotionTrustSignalsComponent } from './promotion-trust-signals.component';
import { PromotionVoteButtonsComponent } from './promotion-vote-buttons.component';

@Component({
  selector: 'app-promotion-card',
  standalone: true,
  imports: [
    CurrencyPipe,
    NgFor,
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
  private currentPromotion!: Promotion;

  @Input({ required: true })
  set promotion(promotion: Promotion) {
    this.currentPromotion = promotion;
  }

  get promotion() {
    return this.currentPromotion;
  }
}
