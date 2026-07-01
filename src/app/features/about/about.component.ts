import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink, BreadcrumbComponent],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent {
  constructor() {
    inject(SeoService).setIndexable({
      title: 'Sobre o DescontoVivo | Promoções com contexto, comunidade e segurança',
      description: 'Conheça o DescontoVivo, uma comunidade de promoções com comentários, curadoria, sinais de confiança e informações para ajudar você a comprar melhor e com mais segurança.',
      canonicalPath: '/sobre'
    });
  }
}
