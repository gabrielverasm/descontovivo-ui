import { NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { APPROVED_PROMOTIONS_MOCK } from '../../core/mocks/promotions.mock';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PromotionCardComponent } from '../../shared/components/promotion-card/promotion-card.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [EmptyStateComponent, NgFor, NgIf, PageHeaderComponent, PromotionCardComponent, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  readonly featuredPromotions = APPROVED_PROMOTIONS_MOCK.slice(0, 4);
}
