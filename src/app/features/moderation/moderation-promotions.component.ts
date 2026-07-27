import { Component, inject, OnInit } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { finalize } from 'rxjs';
import { Promotion } from '../../core/models/promotion.model';
import { ModerationService } from '../../core/services/moderation.service';
import { SeoService } from '../../core/services/seo.service';
import { Router } from '@angular/router';
import { PromotionImageComponent } from '../../shared/components/promotion-image/promotion-image.component';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-moderation-promotions',
  standalone: true,
  imports: [DecimalPipe, DatePipe, PromotionImageComponent],
  templateUrl: './moderation-promotions.component.html',
  styleUrl: './moderation-promotions.component.scss',
})
export class ModerationPromotionsComponent implements OnInit {
  private readonly moderationService = inject(ModerationService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  constructor() {
    inject(SeoService).setNoIndex();
  }

  promotions: Promotion[] = [];
  loading = true;
  error = '';

  ngOnInit(): void {
    const navigationState = this.router.getCurrentNavigation?.()?.extras.state as { message?: unknown } | undefined;
    let message = typeof navigationState?.message === 'string' ? navigationState.message : '';
    if (!message && typeof window !== 'undefined') {
      const historyState = window.history.state as { message?: unknown } | null;
      message = typeof historyState?.message === 'string' ? historyState.message : '';
      if (message) window.history.replaceState({ ...historyState, message: undefined }, typeof document !== 'undefined' ? document.title : '');
    } else if (message && typeof window !== 'undefined') {
      window.history.replaceState({ ...window.history.state, message: undefined }, typeof document !== 'undefined' ? document.title : '');
    }
    if (message) this.toast.success(message);
    this.load();
  }

  validate(promo: Promotion): void {
    void this.router.navigate(['/moderacao/promocoes'], { queryParams: { validar: promo.id } });
  }

  reject(promo: Promotion): void {
    void this.router.navigate(['/moderacao/promocoes'], { queryParams: { validar: promo.id, acao: 'rejeitar' } });
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.moderationService.getPending().pipe(
      finalize(() => (this.loading = false)),
    ).subscribe({
      next: (res) => {
        const list = res ?? [];
        this.promotions = list.sort((a, b) => {
          if (a.createdAt && b.createdAt) return a.createdAt.localeCompare(b.createdAt);
          return 0;
        });
      },
      error: () => (this.error = 'Erro ao carregar promoções pendentes.'),
    });
  }

  getMissingFields(promo: Promotion): string[] {
    const has = (v: unknown) => v !== undefined && v !== null && String(v).trim() !== '';
    const badStore = !promo.store?.name && (!promo.storeName || promo.storeName === 'loja-nao-identificada');
    const fields: Array<{ label: string; status: string }> = [
      { label: 'Título', status: has(promo.title) ? 'ok' : 'missing' },
      { label: 'Link da oferta', status: has(promo.url) || has(promo.offerUrl) || has(promo.storeUrl) ? 'ok' : 'missing' },
      { label: 'Preço atual', status: has(promo.currentPrice) ? 'ok' : 'missing' },
      { label: 'Loja', status: badStore ? 'missing' : 'ok' },
      { label: 'Imagem', status: has(promo.imageUrl) ? 'ok' : 'missing' },
    ];
    return fields.filter((f) => f.status === 'missing').map((f) => f.label);
  }

}
