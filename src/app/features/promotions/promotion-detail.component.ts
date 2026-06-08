import { CurrencyPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { APPROVED_PROMOTIONS_MOCK } from '../../core/mocks/promotions.mock';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-promotion-detail',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, EmptyStateComponent, NgFor, NgIf, RouterLink],
  templateUrl: './promotion-detail.component.html',
  styleUrl: './promotion-detail.component.scss'
})
export class PromotionDetailComponent {
  private readonly route = inject(ActivatedRoute);
  readonly promotion = APPROVED_PROMOTIONS_MOCK.find(
    (item) => item.id === this.route.snapshot.paramMap.get('id')
  );
}
