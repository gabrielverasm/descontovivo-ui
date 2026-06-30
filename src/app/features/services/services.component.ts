import { Component, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
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
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.setIndexFollow();
    this.title.setTitle('Serviços | DescontoVivo');
    this.meta.updateTag({
      name: 'description',
      content:
        'Entenda serviços de assinatura e benefícios ligados a grandes lojas, como Amazon Prime, antes de contratar.',
    });
  }
}
