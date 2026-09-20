import { Component, inject, AfterViewInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { SeoService } from '../../core/services/seo.service';

// TODO [Amazon Associados]: Revisar esta página para garantir compliance com a
// Operating Agreement vigente.
// - A frase "Como Associado da Amazon, eu ganho com compras qualificadas." já está
//   no rodapé de todas as páginas (public-layout).
// - Links de afiliado usam rel="sponsored noopener noreferrer" (buildOfferRel);
//   decidir se devem incluir também "nofollow".

@Component({
  selector: 'app-transparency',
  standalone: true,
  imports: [RouterLink, BreadcrumbComponent],
  templateUrl: './transparency.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './transparency.component.scss',
})
export class TransparencyComponent implements AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private fragmentSub: Subscription | null = null;

  constructor() {
    inject(SeoService).setIndexable({
      title: 'Transparência | DescontoVivo',
      description: 'Saiba como o DescontoVivo lida com links, comissões e curadoria de ofertas.',
      canonicalPath: '/transparencia/'
    });
  }

  ngAfterViewInit(): void {
    this.fragmentSub = this.route.fragment.subscribe(fragment => {
      if (fragment) {
        this.openAndScrollToFragment(fragment);
      }
    });
  }

  ngOnDestroy(): void {
    this.fragmentSub?.unsubscribe();
  }

  private openAndScrollToFragment(fragment: string): void {
    // Small delay to ensure DOM is rendered
    setTimeout(() => {
      const el = document.getElementById(fragment);
      if (!el) return;

      // If the element is a <details>, open it
      if (el.tagName === 'DETAILS') {
        (el as HTMLDetailsElement).open = true;
      }

      // If the element is inside a <details>, open the parent
      const parentDetails = el.closest('details');
      if (parentDetails) {
        parentDetails.open = true;
      }

      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }
}
