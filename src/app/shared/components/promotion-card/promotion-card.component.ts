import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

import { Promotion } from '../../../core/models/promotion.model';

@Component({
  selector: 'app-promotion-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './promotion-card.component.html',
  styleUrl: './promotion-card.component.scss',
})
export class PromotionCardComponent {
  promotion = input.required<Promotion>();
}
