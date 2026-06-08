import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="public-layout">
      <header class="public-layout__header">
        <a class="brand" routerLink="/" aria-label="DescontoVivo home">
          <img
            class="brand__logo brand__logo--light"
            src="/brand/logo-horizontal-light.png"
            alt="DescontoVivo"
          />
          <img
            class="brand__logo brand__logo--dark"
            src="/brand/logo-horizontal-dark.png"
            alt="DescontoVivo"
            aria-hidden="true"
          />
        </a>

        <nav class="public-layout__nav" aria-label="Navegacao principal">
          <a routerLink="/" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: true }"
            >Home</a
          >
          <a routerLink="/promocoes" routerLinkActive="is-active">Promoções</a>
          <a routerLink="/login" routerLinkActive="is-active">Entrar</a>
          <a routerLink="/cadastro" routerLinkActive="is-active">Cadastro</a>
        </nav>
      </header>

      <main class="public-layout__content">
        <router-outlet></router-outlet>
      </main>

      <footer class="public-layout__footer">
        <p>DescontoVivo © 2026. Feed limpo, rapido e direto ao ponto.</p>
      </footer>
    </div>
  `,
  styleUrl: './public-layout.component.scss',
})
export class PublicLayoutComponent {}
