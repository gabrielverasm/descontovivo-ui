import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { AffiliateStoreId } from '../../core/analytics/analytics-events';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { UI_VERSION } from '../../core/app-version';
import { SeoService } from '../../core/services/seo.service';

interface MonitoredStore {
  id: AffiliateStoreId;
  name: string;
  logoPath: string;
  logoAlt: string;
  affiliateUrl: string;
  affiliateLabel: string;
  affiliateAriaLabel: string;
}

type MonitoredStores = Record<
  'amazon' | 'mercadoLivre' | 'magalu' | 'shopee' | 'aliexpress',
  MonitoredStore
>;

interface RelatedService {
  id: 'amazon_prime' | 'meli_plus';
  name: string;
  logoPath: string;
  logoAlt: string;
  url: string;
  label: string;
  ariaLabel: string;
  sponsored: boolean;
}

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [RouterLink, BreadcrumbComponent],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss',
})
export class ServicesComponent {
  private readonly analytics = inject(AnalyticsService);

  readonly stores: MonitoredStores = {
    amazon: {
      id: 'amazon',
      name: 'Amazon',
      logoPath: '/assets/lojas/amazon.svg',
      logoAlt: 'Logo da Amazon',
      affiliateUrl: 'https://link.amazon/B0b5nIch0',
      affiliateLabel: 'Visitar a Amazon',
      affiliateAriaLabel: 'Visitar a Amazon — link patrocinado',
    },
    mercadoLivre: {
      id: 'mercado_livre',
      name: 'Mercado Livre',
      logoPath: '/assets/lojas/mercado-livre.svg',
      logoAlt: 'Logo do Mercado Livre',
      affiliateUrl: 'https://meli.la/2vZLHsF',
      affiliateLabel: 'Ver ofertas no Mercado Livre',
      affiliateAriaLabel: 'Ver ofertas no Mercado Livre — link patrocinado',
    },
    magalu: {
      id: 'magalu',
      name: 'Magalu',
      logoPath: '/assets/lojas/magalu.svg',
      logoAlt: 'Logo da Magalu',
      affiliateUrl: 'https://www.magazinevoce.com.br/magazinedescontovivo/',
      affiliateLabel: 'Visitar nossa loja Magalu',
      affiliateAriaLabel: 'Visitar nossa loja Magalu — link patrocinado',
    },
    shopee: {
      id: 'shopee',
      name: 'Shopee',
      logoPath: '/assets/lojas/shopee.svg',
      logoAlt: 'Logo da Shopee',
      affiliateUrl: 'https://s.shopee.com.br/9fJKQGm4sg',
      affiliateLabel: 'Ver ofertas na Shopee',
      affiliateAriaLabel: 'Ver ofertas na Shopee — link patrocinado',
    },
    aliexpress: {
      id: 'aliexpress',
      name: 'AliExpress',
      logoPath: '/assets/lojas/aliexpress.svg',
      logoAlt: 'Logo do AliExpress',
      affiliateUrl: 'https://s.click.aliexpress.com/e/_c3okcdkb',
      affiliateLabel: 'Ver ofertas no AliExpress',
      affiliateAriaLabel: 'Ver ofertas no AliExpress — link patrocinado',
    },
  };

  readonly relatedServices: Record<'amazonPrime' | 'meliPlus', RelatedService> = {
    amazonPrime: {
      id: 'amazon_prime',
      name: 'Amazon Prime',
      logoPath: '/assets/servicos/prime.webp',
      logoAlt: 'Amazon Prime',
      url: 'https://link.amazon/B01Tr9PVc',
      label: 'Conhecer o Amazon Prime',
      ariaLabel: 'Conhecer o Amazon Prime — link patrocinado',
      sponsored: true,
    },
    meliPlus: {
      id: 'meli_plus',
      name: 'Meli+',
      logoPath: '/assets/servicos/meli-plus.webp',
      logoAlt: 'Meli+',
      url: 'https://www.mercadolivre.com.br/assinaturas/melimais',
      label: 'Conhecer o Meli+',
      ariaLabel: 'Conhecer o Meli+ no Mercado Livre',
      sponsored: false,
    },
  };

  constructor() {
    inject(SeoService).setIndexable({
      title: 'Lojas e Serviços | DescontoVivo',
      description: 'Informações sobre as lojas monitoradas pelo DescontoVivo: Amazon, Mercado Livre, Magalu, Shopee e AliExpress. Dicas de frete, assinaturas e o que observar antes de comprar.',
      canonicalPath: '/servicos'
    });
  }

  trackAffiliateClick(store: AffiliateStoreId): void {
    try {
      this.analytics.trackAffiliateStoreClick({
        store,
        placement: 'services',
        ui_version: UI_VERSION,
      });
    } catch {
      // Analytics must never interfere with the anchor's native navigation.
    }
  }

  trackAffiliateServiceClick(): void {
    try {
      this.analytics.trackAffiliateServiceClick({
        service: 'amazon_prime',
        placement: 'services',
        ui_version: UI_VERSION,
      });
    } catch {
      // Analytics must never interfere with the anchor's native navigation.
    }
  }

  trackServiceClick(): void {
    try {
      this.analytics.trackServiceClick({
        service: 'meli_plus',
        placement: 'services',
        ui_version: UI_VERSION,
      });
    } catch {
      // Analytics must never interfere with the anchor's native navigation.
    }
  }
}
