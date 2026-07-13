import { MarketplaceCode, MarketplaceDetection } from '../../core/models/marketplace-inspection.model';

const MARKETPLACES: Array<{ code: MarketplaceCode; label: string; hosts: string[]; supported: boolean }> = [
  { code: 'SHOPEE', label: 'Shopee', hosts: ['shopee.com.br', 'www.shopee.com.br', 's.shopee.com.br'], supported: true },
  { code: 'AMAZON', label: 'Amazon', hosts: ['amazon.com.br', 'www.amazon.com.br', 'amzn.to'], supported: false },
  { code: 'MERCADO_LIVRE', label: 'Mercado Livre', hosts: ['mercadolivre.com.br', 'www.mercadolivre.com.br', 'produto.mercadolivre.com.br', 'meli.la'], supported: false },
  { code: 'MAGALU', label: 'Magalu', hosts: ['magazineluiza.com.br', 'www.magazineluiza.com.br', 'mglu.io'], supported: false },
  { code: 'ALIEXPRESS', label: 'AliExpress', hosts: ['aliexpress.com', 'www.aliexpress.com', 'pt.aliexpress.com', 's.click.aliexpress.com'], supported: false },
];

export function detectMarketplace(value: string): MarketplaceDetection | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    const match = MARKETPLACES.find((item) => item.hosts.includes(url.hostname.toLowerCase()));
    return match ? { marketplace: match.code, label: match.label, supported: match.supported } : null;
  } catch {
    return null;
  }
}
