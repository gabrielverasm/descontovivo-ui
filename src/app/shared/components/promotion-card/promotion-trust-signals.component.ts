import { Component, HostBinding, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Promotion } from '../../../core/models/promotion.model';
import {
  isSoldAndDeliveredByAmazon,
  isSoldAndDeliveredByStore,
} from '../../utils/seller.util';
import {
  TrustSignal,
  getCompactTrustDisplay,
  getTrustSignalLabel,
  getTrustSignalTooltip,
  formatSalesCount,
  formatRating,
  deriveTrustSignals,
} from '../../utils/trust-signals.util';

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

  // Badge image sources and titles
  readonly officialBadgeSrc = '/brand/loja-oficial.webp';
  readonly curationBadgeSrc = '/brand/curadoria.webp';
  readonly officialBadgeTitle = 'Loja oficial da plataforma';
  readonly curationBadgeTitle = 'Revisada pela curadoria do DescontoVivo';

  // New trust signals methods
  
  get hasTrustSignals(): boolean {
    return this.hasOfficialStore ||
           this.hasHighSales ||
           this.hasGoodProductRating ||
           this.hasGoodSellerRating ||
           this.hasAnyPlatformTrustSignal ||
           this.hasCuratedByDescontovivo;
  }

  get hasOfficialStore(): boolean {
    return !!this.promotion.officialStore;
  }

  get hasCuratedByDescontovivo(): boolean {
    if (!this.promotion.trustSignals) {
      return false;
    }
    
    return this.promotion.trustSignals.includes('CURATED_BY_DESCONTOVIVO');
  }

  get hasAnyPlatformTrustSignal(): boolean {
    if (!this.promotion.trustSignals || !this.promotion.marketplace) {
      return false;
    }
    
    const marketplaceUpper = this.promotion.marketplace.toUpperCase();
    const platformSignals = this.promotion.trustSignals.filter(signal => {
      if (marketplaceUpper === 'AMAZON') {
        return signal.includes('AMAZON_');
      } else if (marketplaceUpper === 'MERCADO_LIVRE') {
        return signal.includes('MERCADO_LIVRE_');
      } else if (marketplaceUpper === 'MAGALU') {
        return signal.includes('MAGALU_');
      } else if (marketplaceUpper === 'SHOPEE') {
        return signal.includes('SHOPEE_');
      } else if (marketplaceUpper === 'ALIEXPRESS') {
        return signal.includes('ALIEXPRESS_');
      }
      return false;
    });
    
    return platformSignals.length > 0;
  }

  get hasHighSales(): boolean {
    return !!(this.promotion.salesCount && this.promotion.salesCount >= 1000);
  }

  get hasGoodProductRating(): boolean {
    return !!(this.promotion.productRating && this.promotion.productRating >= 4.7);
  }

  get hasGoodSellerRating(): boolean {
    return !!(this.promotion.sellerRating && this.promotion.sellerRating >= 4.7);
  }

  get salesCountFormatted(): string | undefined {
    return formatSalesCount(this.promotion.salesCount);
  }

  get productRatingFormatted(): string | undefined {
    return formatRating(this.promotion.productRating);
  }

  get sellerRatingFormatted(): string | undefined {
    return formatRating(this.promotion.sellerRating);
  }

  get compactTrustDisplay(): string {
    return getCompactTrustDisplay(this.promotion);
  }

  get compactTextWithoutImageBadges(): string {
    // Get the compact display text
    const fullText = getCompactTrustDisplay(this.promotion);
    
    // If we have image badges, remove "Oficial" and "Revisada pela curadoria" from text
    const imageBadgeSignals: string[] = [];
    if (this.hasOfficialStore) {
      imageBadgeSignals.push('Oficial');
    }
    if (this.hasCuratedByDescontovivo) {
      imageBadgeSignals.push('Revisada pela curadoria');
    }
    
    if (imageBadgeSignals.length === 0) {
      return fullText;
    }
    
    // Filter out the image badge signals from the text parts
    const parts = fullText.split(' · ');
    const filteredParts = parts.filter(part => 
      !imageBadgeSignals.some(signal => part.startsWith(signal))
    );
    
    return filteredParts.join(' · ');
  }

  get trustSignals(): TrustSignal[] {
    return deriveTrustSignals(this.promotion);
  }

  getTrustSignalLabel(signal: TrustSignal): string {
    return getTrustSignalLabel(signal);
  }

  getTrustSignalTooltip(signal: TrustSignal): string {
    return getTrustSignalTooltip(signal);
  }

  get officialStoreTitle(): string {
    return 'Loja oficial do vendedor na plataforma.';
  }

  get platformGuaranteeTitle(): string {
    if (!this.promotion.marketplace) {
      return 'Garantia da plataforma.';
    }
    
    const marketplace = this.promotion.marketplace.toUpperCase();
    switch (marketplace) {
      case 'AMAZON':
        return 'Protegido pela Garantia de A a Z da Amazon.';
      case 'MERCADO_LIVRE':
        return 'Compra protegida pela Garantia do Mercado Livre.';
      case 'MAGALU':
        return 'Compra protegida pela Garantia Magalu.';
      case 'SHOPEE':
        return 'Compra finalizada na Shopee e sujeita às regras da Garantia Shopee.';
      case 'ALIEXPRESS':
        return 'Protegido pela Política de Proteção ao Comprador do AliExpress.';
      default:
        return 'Garantia da plataforma.';
    }
  }

  get highSalesTitle(): string {
    const formatted = this.salesCountFormatted;
    const marketplace = this.promotion.marketplace?.toUpperCase();
    const platformName = marketplace === 'AMAZON' ? 'Amazon' :
                        marketplace === 'MERCADO_LIVRE' ? 'Mercado Livre' :
                        marketplace === 'MAGALU' ? 'Magalu' :
                        marketplace === 'SHOPEE' ? 'Shopee' :
                        marketplace === 'ALIEXPRESS' ? 'AliExpress' : 'plataforma';
    
    return formatted
      ? `Mais de ${formatted.replace(' mil+ vendas', ' mil')} vendas informadas na ${platformName}.`
      : 'Milhares de vendas realizadas para este produto.';
  }

  get productRatingTitle(): string {
    return this.productRatingFormatted
      ? `Produto bem avaliado: nota ${this.promotion.productRating?.toFixed(1)}.`
      : 'Produto com boa avaliação dos compradores.';
  }

  get sellerRatingTitle(): string {
    return this.sellerRatingFormatted
      ? `Vendedor bem avaliado: nota ${this.promotion.sellerRating?.toFixed(1)}.`
      : 'Vendedor com boa avaliação dos compradores.';
  }
}
