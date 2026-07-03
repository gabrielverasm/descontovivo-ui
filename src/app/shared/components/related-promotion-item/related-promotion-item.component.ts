import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Promotion } from '../../../core/models/promotion.model';
import { PromotionImageComponent } from '../promotion-image/promotion-image.component';
import { PromotionPriceComponent } from '../promotion-price/promotion-price.component';
import { PromotionTrustSignalsComponent } from '../promotion-card/promotion-trust-signals.component';

@Component({
  selector: 'app-related-promotion-item',
  standalone: true,
  imports: [RouterLink, PromotionImageComponent, PromotionPriceComponent, PromotionTrustSignalsComponent],
  templateUrl: './related-promotion-item.component.html',
  styleUrl: './related-promotion-item.component.scss',
})
export class RelatedPromotionItemComponent {
  @Input({ required: true }) promotion!: Promotion;
  @Input({ required: true }) publishedAgo = '';
}
