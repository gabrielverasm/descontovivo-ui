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
      title: 'Serviços | DescontoVivo',
      description: 'Entenda serviços de assinatura e benefícios ligados a grandes lojas, como Amazon Prime, antes de contratar.',
      canonicalPath: '/servicos'
    });
  }
}
