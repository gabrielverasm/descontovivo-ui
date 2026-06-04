import { Component } from '@angular/core';

import { Promotion } from '../../core/models/promotion.model';
import { PromotionCardComponent } from '../../shared/components/promotion-card/promotion-card.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [PromotionCardComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  readonly promotions: Promotion[] = [
    {
      id: 1,
      store: 'Amazon',
      title: 'Notebook Lenovo IdeaPad Slim 3 com SSD de 512 GB',
      description: 'Oferta com foco em produtividade diaria, ideal para estudos e trabalho leve.',
      price: 'R$ 2.899,00',
      oldPrice: 'R$ 3.499,00',
      discount: '-17%',
      votes: 128,
      comments: 24,
      postedAt: 'há 12 min',
      featured: true,
    },
    {
      id: 2,
      store: 'KaBuM!',
      title: 'Monitor ultrawide 34" com painel IPS',
      description:
        'Formato amplo para multitarefa sem poluir o feed com informacoes desnecessarias.',
      price: 'R$ 1.999,90',
      oldPrice: 'R$ 2.449,90',
      discount: '-18%',
      votes: 84,
      comments: 11,
      postedAt: 'há 28 min',
    },
    {
      id: 3,
      store: 'Magalu',
      title: 'Fone sem fio com cancelamento de ruido ativo',
      description: 'Bom para rotina e viagens, com destaque visual discreto e direto.',
      price: 'R$ 349,90',
      oldPrice: 'R$ 499,90',
      discount: '-30%',
      votes: 63,
      comments: 8,
      postedAt: 'há 41 min',
    },
  ];
}
