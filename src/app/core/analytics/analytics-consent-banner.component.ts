import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnalyticsConsentService } from './analytics-consent.service';

@Component({
  selector: 'app-analytics-consent-banner',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (consentService.status() === 'pending') {
      <aside class="consent-banner" role="dialog" aria-label="Consentimento de métricas" aria-live="polite">
        <p class="consent-banner__text">
          Usamos métricas para entender acessos e melhorar o DescontoVivo.
          Você pode aceitar ou recusar esse acompanhamento.
          <a routerLink="/privacidade" class="consent-banner__link">Saiba mais</a>
        </p>
        <div class="consent-banner__actions">
          <button type="button" class="consent-banner__btn consent-banner__btn--accept" (click)="accept()">Aceitar métricas</button>
          <button type="button" class="consent-banner__btn consent-banner__btn--deny" (click)="deny()">Recusar</button>
        </div>
      </aside>
    }
  `,
  styles: [`
    .consent-banner {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 9999;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 0.875rem 1.25rem;
      background: var(--color-surface, #1e293b);
      color: var(--color-text-inverse, #f1f5f9);
      font-size: 0.8125rem;
      line-height: 1.4;
      box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.15);
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from { transform: translateY(100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .consent-banner__text {
      margin: 0;
      flex: 1 1 300px;
      text-align: center;
    }

    .consent-banner__link {
      color: var(--color-primary-light, #93c5fd);
      text-decoration: underline;
      margin-left: 0.25rem;
    }

    .consent-banner__actions {
      display: flex;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .consent-banner__btn {
      border: none;
      border-radius: 6px;
      padding: 0.5rem 1rem;
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.15s;
    }

    .consent-banner__btn:hover {
      opacity: 0.85;
    }

    .consent-banner__btn--accept {
      background: var(--color-primary, #2563eb);
      color: #fff;
    }

    .consent-banner__btn--deny {
      background: transparent;
      color: var(--color-text-inverse, #f1f5f9);
      border: 1px solid var(--color-border-inverse, #64748b);
    }

    @media (max-width: 480px) {
      .consent-banner {
        flex-direction: column;
        padding: 0.75rem 1rem;
        gap: 0.5rem;
      }

      .consent-banner__actions {
        width: 100%;
        justify-content: center;
      }
    }
  `],
})
export class AnalyticsConsentBannerComponent {
  readonly consentService = inject(AnalyticsConsentService);

  accept(): void {
    this.consentService.grant();
  }

  deny(): void {
    this.consentService.deny();
  }
}
