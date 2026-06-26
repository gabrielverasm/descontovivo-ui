import { Component, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';

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
export class TransparencyComponent {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  constructor() {
    this.title.setTitle('Transparência | DescontoVivo');
    this.meta.updateTag({
      name: 'description',
      content:
        'Saiba como o DescontoVivo lida com links, comissões e curadoria de ofertas.',
    });
  }
}
