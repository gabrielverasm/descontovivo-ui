import { Component, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss',
})
export class ServicesComponent {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  constructor() {
    this.title.setTitle('Serviços | DescontoVivo');
    this.meta.updateTag({
      name: 'description',
      content:
        'Entenda serviços de assinatura e benefícios ligados a grandes lojas, como Amazon Prime, antes de contratar.',
    });
  }
}
