import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [RouterLink, BreadcrumbComponent],
  templateUrl: './terms.component.html',
  styleUrl: './terms.component.scss',
})
export class TermsComponent {
  constructor() {
    inject(SeoService).setIndexable({
      title: 'Termos de Uso | DescontoVivo',
      description: 'Termos de uso do DescontoVivo: regras de publicação, moderação, responsabilidades e condições de uso.',
      canonicalPath: '/termos',
    });
  }
}
