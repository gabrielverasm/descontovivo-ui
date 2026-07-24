import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [RouterLink, BreadcrumbComponent],
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.scss',
})
export class PrivacyComponent {
  constructor() {
    inject(SeoService).setIndexable({
      title: 'Política de Privacidade | DescontoVivo',
      description: 'Saiba como o DescontoVivo trata dados pessoais, quais informações coletamos e seus direitos como usuário.',
      canonicalPath: '/privacidade/',
    });
  }
}
