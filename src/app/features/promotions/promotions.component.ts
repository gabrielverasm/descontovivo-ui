import { Component, inject, OnInit } from '@angular/core';
import { PromotionCardComponent } from '../../shared/components/promotion-card/promotion-card.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { PromotionService } from '../../core/services/promotion.service';
import { SeoService } from '../../core/services/seo.service';
import { Promotion } from '../../core/models/promotion.model';

@Component({
  selector: 'app-promotions',
  standalone: true,
  imports: [PromotionCardComponent, LoadingStateComponent],
  templateUrl: './promotions.component.html',
  styleUrl: './promotions.component.scss',
})
export class PromotionsComponent implements OnInit {
  private readonly promotionService = inject(PromotionService);
  private readonly seo = inject(SeoService);

  promotions: Promotion[] = [];
  loading = true;
  error = '';

  ngOnInit(): void {
    this.seo.setIndexable({
      title: 'Promoções | DescontoVivo',
      description: 'DescontoVivo reúne promoções compartilhadas pela comunidade, com ofertas revisadas antes de aparecerem no site.',
      canonicalPath: '/'
    });
    this.promotionService.getPromotions(0, 30).subscribe({
      next: (res) => {
        this.promotions = res.content;
        this.loading = false;
      },
      error: () => {
        this.error = 'Não foi possível carregar as promoções. Tente novamente mais tarde.';
        this.loading = false;
      },
    });
  }
}
