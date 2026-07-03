import { Component, HostBinding, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Promotion } from '../../../core/models/promotion.model';
import {
  isSoldAndDeliveredByAmazon,
  isSoldAndDeliveredByStore,
} from '../../utils/seller.util';

@Component({
  selector: 'app-promotion-trust-signals',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './promotion-trust-signals.component.html',
  styleUrl: './promotion-trust-signals.component.scss',
})
export class PromotionTrustSignalsComponent {
  @Input({ required: true }) promotion!: Promotion;
  @Input() clickable = true;
  @Input() compact = false;

  @HostBinding('class.promotion-trust-signals--compact')
  get compactClass(): boolean { return this.compact; }

  get isAmazonFulfillment(): boolean {
    return isSoldAndDeliveredByAmazon(this.promotion.soldBy, this.promotion.deliveredBy);
  }

  get showSoldAndDeliveredByStore(): boolean {
    return isSoldAndDeliveredByStore(this.promotion);
  }

  get hasCoupon(): boolean {
    return Boolean(this.promotion.couponCode?.trim());
  }

  get hasPriceSignal(): boolean {
    return this.promotion.priceSignal === 'GOOD_PRICE' || this.promotion.priceSignal === 'GREAT_PRICE';
  }

  get priceSignalLabel(): string {
    return this.promotion.priceSignal === 'GREAT_PRICE' ? 'Preço muito bom' : 'Preço bom';
  }

  get priceSignalTitle(): string {
    return this.promotion.priceSignal === 'GREAT_PRICE'
      ? 'Preço marcado como muito bom pela moderação. Confira preço final, frete e condições antes de comprar.'
      : 'Preço marcado como bom pela moderação. Confira preço final, frete e condições antes de comprar.';
  }

  get soldAndDeliveredTitle(): string {
    return 'A loja aparece como vendedora e responsável pela entrega. É um bom sinal, mas confira os dados no site da loja.';
  }

  get couponTitle(): string {
    return this.promotion.couponCode
      ? `Use o cupom ${this.promotion.couponCode} antes de finalizar a compra.`
      : 'Esta promoção pode ter cupom informado.';
  }

  get primeTitle(): string {
    return 'Vendido e entregue pela Amazon. Pode ter benefícios Prime quando elegível.';
  }
}
