import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [RouterLink, BreadcrumbComponent],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss',
})
export class ServicesComponent {
  constructor() {
    inject(SeoService).setIndexable({
      title: 'Lojas e Serviços | DescontoVivo',
      description: 'Informações sobre as lojas monitoradas pelo DescontoVivo: Amazon, Mercado Livre, Magalu, Shopee e AliExpress. Dicas de frete, assinaturas e o que observar antes de comprar.',
      canonicalPath: '/servicos'
    });
  }
}
