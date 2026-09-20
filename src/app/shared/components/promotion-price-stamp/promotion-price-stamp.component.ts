import { afterNextRender, ChangeDetectionStrategy, Component, inject, InjectionToken, Input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Promotion } from '../../../core/models/promotion.model';
import { isAffiliateOffer } from '../../utils/offer-link.util';
import {
  formatPriceStamp,
  formatPriceStampDate,
  isPriceStampStale,
  resolvePriceStampDate,
} from '../../utils/price-stamp.util';
import { resolveStoreDisplayName } from '../../utils/store-name.util';

/** Relógio do carimbo (ms desde a época). Os testes injetam um valor fixo. */
export const PRICE_STAMP_NOW = new InjectionToken<() => number>('PRICE_STAMP_NOW', {
  providedIn: 'root',
  factory: () => () => Date.now(),
});

@Component({
  selector: 'app-promotion-price-stamp',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './promotion-price-stamp.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './promotion-price-stamp.component.scss',
})
export class PromotionPriceStampComponent {
  @Input({ required: true }) promotion!: Promotion;

  private readonly now = inject(PRICE_STAMP_NOW);

  // O SSR e o prerender só escrevem a data absoluta ("DD/MM HH:mm"): o HTML gerado é servido depois
  // do dia em que foi feito, e "hoje" ali ficaria errado. afterNextRender só roda no navegador,
  // depois da hidratação, então a primeira renderização do navegador é igual à do servidor.
  readonly ready = signal(false);

  constructor() {
    afterNextRender(() => this.ready.set(true));
  }

  private get stampDate(): Date | null {
    return resolvePriceStampDate(this.promotion);
  }

  /** Só ofertas de afiliado levam o carimbo, e só quando há uma data confiável. */
  get visible(): boolean {
    return isAffiliateOffer(this.promotion) && this.stampDate !== null;
  }

  get stampLabel(): string {
    const date = this.stampDate;
    if (!date) return '';
    return this.ready() ? formatPriceStampDate(date, this.now()) : formatPriceStamp(date);
  }

  get stampDateTime(): string | null {
    return this.stampDate?.toISOString() ?? null;
  }

  get isStale(): boolean {
    const date = this.stampDate;
    return date ? isPriceStampStale(date, this.now()) : false;
  }

  get storeName(): string {
    return (
      resolveStoreDisplayName(this.promotion.storeName) ||
      resolveStoreDisplayName(this.promotion.store?.name) ||
      'loja'
    );
  }
}
