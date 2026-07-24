import { Component, inject, AfterViewInit, OnDestroy } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { SeoService } from '../../core/services/seo.service';

// TODO [Amazon Associados]: Quando o cadastro no programa Amazon Associados for
// aprovado e links de afiliado Amazon estiverem ativos no site, será necessário:
// 1. Incluir publicamente a frase exigida pela Amazon:
//    "Como associado da Amazon, eu recebo por compras qualificadas."
// 2. Revisar esta página para garantir compliance com a Operating Agreement vigente.
// 3. Atualizar o rel dos links Amazon para "sponsored nofollow noopener noreferrer".
// Não exibir essa frase antes do cadastro estar ativo.

@Component({
  selector: 'app-transparency',
  standalone: true,
  imports: [RouterLink, BreadcrumbComponent],
  templateUrl: './transparency.component.html',
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
