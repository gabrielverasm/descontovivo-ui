/**
 * Trust signals enum for all marketplaces
 * Generic signals apply to all marketplaces
 */
export enum TrustSignal {
  // Generic signals (all marketplaces)
  OFFICIAL_STORE = 'OFFICIAL_STORE',
  HIGH_SALES = 'HIGH_SALES',
  GOOD_PRODUCT_RATING = 'GOOD_PRODUCT_RATING',
  GOOD_SELLER_RATING = 'GOOD_SELLER_RATING',
  PLATFORM_FULFILLED = 'PLATFORM_FULFILLED',
  SOLD_BY_PLATFORM = 'SOLD_BY_PLATFORM',
  DELIVERED_BY_PLATFORM = 'DELIVERED_BY_PLATFORM',
  CURATED_BY_DESCONTOVIVO = 'CURATED_BY_DESCONTOVIVO',
  
  // Amazon-specific signals
  AMAZON_PRIME = 'AMAZON_PRIME',
  AMAZON_A_TO_Z_GUARANTEE = 'AMAZON_A_TO_Z_GUARANTEE',
  
  // Mercado Livre-specific signals
  MERCADO_LIVRE_COMPRA_GARANTIDA = 'MERCADO_LIVRE_COMPRA_GARANTIDA',
  MERCADO_LIVRE_FULL = 'MERCADO_LIVRE_FULL',
  MERCADO_LIDER = 'MERCADO_LIDER',
  
  // Magalu-specific signals
  MAGALU_GARANTE_COMPRA = 'MAGALU_GARANTE_COMPRA',
  MAGALU_DEVOLUCAO_7_DIAS = 'MAGALU_DEVOLUCAO_7_DIAS',
  
  // Shopee-specific signals
  SHOPEE_GUARANTEE = 'SHOPEE_GUARANTEE',
  
  // AliExpress-specific signals
  ALIEXPRESS_BUYER_PROTECTION = 'ALIEXPRESS_BUYER_PROTECTION',
  ALIEXPRESS_FREE_RETURN = 'ALIEXPRESS_FREE_RETURN',
  ALIEXPRESS_CHOICE = 'ALIEXPRESS_CHOICE',
}

/**
 * Trust signal metadata with display information
 */
export interface TrustSignalMetadata {
  signal: TrustSignal;
  label: string;
  tooltip: string;
  detailDescription?: string;
  priority: number; // lower = higher priority
}

/**
 * Get metadata for all trust signals
 */
export function getTrustSignalsMetadata(): TrustSignalMetadata[] {
  return [
    // Generic signals
    {
      signal: TrustSignal.OFFICIAL_STORE,
      label: 'Oficial',
      tooltip: 'Loja oficial do vendedor na plataforma',
      priority: 1,
    },
    {
      signal: TrustSignal.HIGH_SALES,
      label: 'Muitas vendas',
      tooltip: 'Milhares de vendas realizadas para este produto',
      priority: 3,
    },
    {
      signal: TrustSignal.GOOD_PRODUCT_RATING,
      label: 'Produto bem avaliado',
      tooltip: 'Produto com avaliação acima de 4.7 estrelas',
      priority: 4,
    },
    {
      signal: TrustSignal.GOOD_SELLER_RATING,
      label: 'Vendedor bem avaliado',
      tooltip: 'Vendedor com avaliação acima de 4.7 estrelas',
      priority: 5,
    },
    {
      signal: TrustSignal.PLATFORM_FULFILLED,
      label: 'Plataforma',
      tooltip: 'Compra finalizada dentro da plataforma',
      priority: 6,
    },
    {
      signal: TrustSignal.SOLD_BY_PLATFORM,
      label: 'Vendido pela plataforma',
      tooltip: 'Vendido diretamente pela plataforma',
      priority: 2,
    },
    {
      signal: TrustSignal.DELIVERED_BY_PLATFORM,
      label: 'Enviado pela plataforma',
      tooltip: 'Enviado diretamente pela plataforma',
      priority: 7,
    },
    {
      signal: TrustSignal.CURATED_BY_DESCONTOVIVO,
      label: 'Revisada pela curadoria',
      tooltip: 'Promoção revisada pela curadoria do DescontoVivo',
      priority: 100, // Lowest priority, always last
    },
    
    // Amazon signals
    {
      signal: TrustSignal.AMAZON_PRIME,
      label: 'Prime',
      tooltip: 'Elegível para benefícios Amazon Prime',
      priority: 2,
    },
    {
      signal: TrustSignal.AMAZON_A_TO_Z_GUARANTEE,
      label: 'Garantia de A a Z',
      tooltip: 'Protegido pela Garantia de A a Z da Amazon',
      priority: 1,
    },
    
    // Mercado Livre signals
    {
      signal: TrustSignal.MERCADO_LIVRE_COMPRA_GARANTIDA,
      label: 'Compra Garantida',
      tooltip: 'Compra protegida pela Garantia do Mercado Livre',
      priority: 1,
    },
    {
      signal: TrustSignal.MERCADO_LIVRE_FULL,
      label: 'Full',
      tooltip: 'Compra com benefícios Full do Mercado Livre',
      priority: 2,
    },
    {
      signal: TrustSignal.MERCADO_LIDER,
      label: 'MercadoLíder',
      tooltip: 'Vendedor certificado como MercadoLíder',
      priority: 3,
    },
    
    // Magalu signals
    {
      signal: TrustSignal.MAGALU_GARANTE_COMPRA,
      label: 'Garantia Magalu',
      tooltip: 'Compra protegida pela Garantia Magalu',
      priority: 1,
    },
    {
      signal: TrustSignal.MAGALU_DEVOLUCAO_7_DIAS,
      label: 'Devolução 7 dias',
      tooltip: 'Direito a devolução em até 7 dias',
      priority: 2,
    },
    
    // Shopee signals
    {
      signal: TrustSignal.SHOPEE_GUARANTEE,
      label: 'Garantia Shopee',
      tooltip: 'Compra finalizada na Shopee e sujeita às regras da Garantia Shopee',
      priority: 1,
    },
    
    // AliExpress signals
    {
      signal: TrustSignal.ALIEXPRESS_BUYER_PROTECTION,
      label: 'Proteção AliExpress',
      tooltip: 'Protegido pela Política de Proteção ao Comprador do AliExpress',
      priority: 1,
    },
    {
      signal: TrustSignal.ALIEXPRESS_FREE_RETURN,
      label: 'Devolução grátis',
      tooltip: 'Devolução gratuita disponível',
      priority: 2,
    },
    {
      signal: TrustSignal.ALIEXPRESS_CHOICE,
      label: 'Choice',
      tooltip: 'Produto selecionado pela curadoria AliExpress Choice',
      priority: 3,
    },
  ];
}

/**
 * Get metadata for a specific trust signal
 */
export function getTrustSignalMetadata(signal: TrustSignal): TrustSignalMetadata | undefined {
  return getTrustSignalsMetadata().find(meta => meta.signal === signal);
}

/**
 * Get metadata for multiple trust signals
 */
export function getMultipleTrustSignalsMetadata(signals: TrustSignal[]): TrustSignalMetadata[] {
  return signals
    .map(signal => getTrustSignalMetadata(signal))
    .filter((meta): meta is TrustSignalMetadata => meta !== undefined);
}

/**
 * Get marketplace-specific signals for a given marketplace
 */
export function getMarketplaceTrustSignals(marketplace?: string): TrustSignal[] {
  if (!marketplace) {
    return Object.values(TrustSignal).filter(signal => 
      signal === TrustSignal.CURATED_BY_DESCONTOVIVO || 
      signal === TrustSignal.OFFICIAL_STORE || 
      signal === TrustSignal.HIGH_SALES || 
      signal === TrustSignal.GOOD_PRODUCT_RATING || 
      signal === TrustSignal.GOOD_SELLER_RATING
    );
  }
  
  const marketplaceUpper = marketplace.toUpperCase();
  const signals: TrustSignal[] = [];
  
  // Add generic signals first
  signals.push(
    TrustSignal.CURATED_BY_DESCONTOVIVO,
    TrustSignal.OFFICIAL_STORE,
    TrustSignal.HIGH_SALES,
    TrustSignal.GOOD_PRODUCT_RATING,
    TrustSignal.GOOD_SELLER_RATING
  );
  
  // Add marketplace-specific signals
  if (marketplaceUpper === 'AMAZON') {
    signals.push(
      TrustSignal.SOLD_BY_PLATFORM,
      TrustSignal.DELIVERED_BY_PLATFORM,
      TrustSignal.AMAZON_PRIME,
      TrustSignal.AMAZON_A_TO_Z_GUARANTEE
    );
  } else if (marketplaceUpper === 'MERCADO_LIVRE') {
    signals.push(
      TrustSignal.MERCADO_LIVRE_COMPRA_GARANTIDA,
      TrustSignal.MERCADO_LIVRE_FULL,
      TrustSignal.MERCADO_LIDER
    );
  } else if (marketplaceUpper === 'MAGALU') {
    signals.push(
      TrustSignal.MAGALU_GARANTE_COMPRA,
      TrustSignal.MAGALU_DEVOLUCAO_7_DIAS
    );
  } else if (marketplaceUpper === 'SHOPEE') {
    signals.push(
      TrustSignal.SHOPEE_GUARANTEE
    );
  } else if (marketplaceUpper === 'ALIEXPRESS') {
    signals.push(
      TrustSignal.ALIEXPRESS_BUYER_PROTECTION,
      TrustSignal.ALIEXPRESS_FREE_RETURN,
      TrustSignal.ALIEXPRESS_CHOICE
    );
  }
  
  return signals;
}

/**
 * Format sales count to rounded down thousands
 * Example: 5334 → "5 mil+ vendas"
 * Only formats for salesCount >= 1000
 */
export function formatSalesCount(salesCount: number | undefined): string | undefined {
  if (!salesCount || salesCount < 1000) {
    return undefined;
  }
  const thousands = Math.floor(salesCount / 1000);
  return `${thousands} mil+ vendas`;
}

/**
 * Format product or seller rating with star
 * Example: 4.8 → "⭐ 4.8"
 */
export function formatRating(rating: number | undefined): string | undefined {
  if (!rating || rating < 0 || rating > 5) {
    return undefined;
  }
  return `⭐ ${rating.toFixed(1)}`;
}

/**
 * Derive trust signals from promotion fields
 * Returns array of TrustSignal enums
 */
export function deriveTrustSignals(promotion: {
  officialStore?: boolean;
  salesCount?: number;
  productRating?: number;
  sellerRating?: number;
  marketplace?: string;
  trustSignals?: string[];
  soldBy?: string | null;
  deliveredBy?: string | null;
}): TrustSignal[] {
  const signals = new Set<TrustSignal>();
  
  // Add existing trust signals
  if (promotion.trustSignals) {
    promotion.trustSignals.forEach(signal => {
      if (Object.values(TrustSignal).includes(signal as TrustSignal)) {
        signals.add(signal as TrustSignal);
      }
    });
  }
  
  // Derive generic signals from fields
  if (promotion.officialStore) {
    signals.add(TrustSignal.OFFICIAL_STORE);
  }
  
  if (promotion.salesCount && promotion.salesCount >= 1000) {
    signals.add(TrustSignal.HIGH_SALES);
  }
  
  if (promotion.productRating && promotion.productRating >= 4.7) {
    signals.add(TrustSignal.GOOD_PRODUCT_RATING);
  }
  
  if (promotion.sellerRating && promotion.sellerRating >= 4.7) {
    signals.add(TrustSignal.GOOD_SELLER_RATING);
  }
  
  // Derive platform signals based on marketplace and soldBy/deliveredBy
  if (promotion.marketplace) {
    const marketplaceUpper = promotion.marketplace.toUpperCase();
    
    // Add SOLD_BY_PLATFORM and DELIVERED_BY_PLATFORM for Amazon
    if (marketplaceUpper === 'AMAZON') {
      if (promotion.soldBy && promotion.soldBy.toLowerCase().includes('amazon')) {
        signals.add(TrustSignal.SOLD_BY_PLATFORM);
      }
      if (promotion.deliveredBy && promotion.deliveredBy.toLowerCase().includes('amazon')) {
        signals.add(TrustSignal.DELIVERED_BY_PLATFORM);
      }
    }
  }
  
  // Only add curated signal when explicitly provided by the API.
  if (promotion.trustSignals?.includes('CURATED_BY_DESCONTOVIVO')) {
    signals.add(TrustSignal.CURATED_BY_DESCONTOVIVO);
  }
  
  return Array.from(signals);
}

/**
 * Get display label for a trust signal
 */
export function getTrustSignalLabel(signal: TrustSignal): string {
  return getTrustSignalMetadata(signal)?.label || signal;
}

/**
 * Get tooltip text for a trust signal
 */
export function getTrustSignalTooltip(signal: TrustSignal): string {
  return getTrustSignalMetadata(signal)?.tooltip || '';
}

/**
 * Get priority order for trust signals in compact display
 * Lower number = higher priority
 */
export function getTrustSignalPriority(signal: TrustSignal): number {
  return getTrustSignalMetadata(signal)?.priority || 100;
}

/**
 * Get the highest priority trust signals for compact card display
 * Returns max 3 signals following priority rules
 */
export function getCompactTrustSignals(promotion: {
  officialStore?: boolean;
  salesCount?: number;
  productRating?: number;
  sellerRating?: number;
  marketplace?: string;
  trustSignals?: string[];
  soldBy?: string | null;
  deliveredBy?: string | null;
}): { signals: TrustSignal[]; salesCountFormatted?: string; productRatingFormatted?: string } {
  
  const allSignals = deriveTrustSignals(promotion);
  
  // Sort by priority (lower number = higher priority)
  const sortedSignals = [...allSignals].sort((a, b) => 
    getTrustSignalPriority(a) - getTrustSignalPriority(b)
  );
  
  // Apply priority rules: platform guarantee first, then high sales, then product rating
  // Filter out generic signals that will be represented by formatted values
  const topSignals: TrustSignal[] = [];
  
  for (const signal of sortedSignals) {
    if (topSignals.length >= 3) break;
    
    // Skip these generic signals as they'll be shown as formatted values
    if (signal === TrustSignal.HIGH_SALES || signal === TrustSignal.GOOD_PRODUCT_RATING) {
      continue;
    }
    
    // Add platform-specific or other important signals
    topSignals.push(signal);
  }
  
  // If we still have space, add back some generic signals
  if (topSignals.length < 3) {
    const remainingGeneric = sortedSignals.filter(signal => 
      (signal === TrustSignal.HIGH_SALES || signal === TrustSignal.GOOD_PRODUCT_RATING) &&
      !topSignals.includes(signal)
    );
    
    for (const signal of remainingGeneric) {
      if (topSignals.length >= 3) break;
      topSignals.push(signal);
    }
  }
  
  // Prepare formatted values for display
  const salesCountFormatted = formatSalesCount(promotion.salesCount);
  const productRatingFormatted = formatRating(promotion.productRating);
  
  return {
    signals: topSignals,
    salesCountFormatted,
    productRatingFormatted
  };
}

/**
 * Generate compact display text for trust signals
 * Example: "Oficial · 5 mil+ vendas · ⭐ 4.8"
 * Follows priority rules: platform guarantee first, then sales count, then product rating
 */
export function getCompactTrustDisplay(promotion: {
  officialStore?: boolean;
  salesCount?: number;
  productRating?: number;
  sellerRating?: number;
  marketplace?: string;
  trustSignals?: string[];
  soldBy?: string | null;
  deliveredBy?: string | null;
}): string {
  const { signals, salesCountFormatted, productRatingFormatted } = getCompactTrustSignals(promotion);
  
  const parts: string[] = [];
  
  // Always show the highest priority trust signal label first
  if (signals.length > 0) {
    parts.push(getTrustSignalLabel(signals[0]));
  }
  
  // Add sales count if available (and not already represented as HIGH_SALES signal)
  if (salesCountFormatted && !signals.includes(TrustSignal.HIGH_SALES)) {
    parts.push(salesCountFormatted);
  }
  
  // Add product rating if available (and not already represented as GOOD_PRODUCT_RATING signal)
  if (productRatingFormatted && !signals.includes(TrustSignal.GOOD_PRODUCT_RATING)) {
    parts.push(productRatingFormatted);
  }
  
  // Add second and third trust signals if we have space
  if (signals.length > 1 && parts.length < 3) {
    parts.push(getTrustSignalLabel(signals[1]));
  }
  
  if (signals.length > 2 && parts.length < 3) {
    parts.push(getTrustSignalLabel(signals[2]));
  }
  
  // Fallback: if we have sales count as a signal but not as formatted value, show it
  if (signals.includes(TrustSignal.HIGH_SALES) && !salesCountFormatted && promotion.salesCount && promotion.salesCount >= 1000) {
    parts.push(getTrustSignalLabel(TrustSignal.HIGH_SALES));
  }
  
  // Fallback: if we have product rating as a signal but not as formatted value, show it
  if (signals.includes(TrustSignal.GOOD_PRODUCT_RATING) && !productRatingFormatted && promotion.productRating && promotion.productRating >= 4.7) {
    parts.push(getTrustSignalLabel(TrustSignal.GOOD_PRODUCT_RATING));
  }
  
  // Ensure we have at most 3 parts
  const displayParts = parts.slice(0, 3);
  
  // Join with middle dot separator
  return displayParts.join(' · ');
}