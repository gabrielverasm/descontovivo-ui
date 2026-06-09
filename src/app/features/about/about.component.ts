import { Component, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  constructor() {
    this.title.setTitle('Sobre o DescontoVivo | Promoções com contexto, comunidade e segurança');
    this.meta.updateTag({
      name: 'description',
      content:
        'Conheça o DescontoVivo, uma comunidade de promoções com comentários, curadoria, sinais de confiança e informações para ajudar você a comprar melhor e com mais segurança.'
    });
  }
}
