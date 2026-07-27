const STORE_DOMAINS: ReadonlyArray<{ domains: readonly string[]; storeName: string }> = [
  { domains: ['amazon.com.br', 'link.amazon'], storeName: 'Amazon' },
  { domains: ['mercadolivre.com.br', 'meli.la'], storeName: 'MercadoLivre' },
  {
    domains: ['magazineluiza.com.br', 'magalu.com', 'magazineluiza.onelink.me'],
    storeName: 'MagazineLuiza',
  },
  { domains: ['shopee.com.br'], storeName: 'Shopee' },
  { domains: ['aliexpress.com'], storeName: 'AliExpress' },
  { domains: ['paguemenos.com.br'], storeName: 'PagueMenos' },
];

function matchesDomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

export function resolveStoreFromOfferUrl(value: string): string | null {
  const input = value.trim();
  if (!input) return null;

  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(input) ? input : `https://${input}`);
    let hostname = url.hostname.toLowerCase().replace(/\.$/, '');
    if (hostname.startsWith('www.')) hostname = hostname.slice(4);

    for (const store of STORE_DOMAINS) {
      if (store.domains.some((domain) => matchesDomain(hostname, domain))) {
        return store.storeName;
      }
    }
  } catch {
    return null;
  }

  return null;
}
