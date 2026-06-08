import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Promotion } from '../../../core/models/promotion.model';

@Component({
  selector: 'app-promotion-card',
  standalone: true,
  imports: [CurrencyPipe, NgFor, NgIf, RouterLink],
  templateUrl: './promotion-card.component.html',
  styleUrl: './promotion-card.component.scss'
})
export class PromotionCardComponent {
  @Input({ required: true }) promotion!: Promotion;
}
