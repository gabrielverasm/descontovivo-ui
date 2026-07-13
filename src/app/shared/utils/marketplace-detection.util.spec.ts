import { detectMarketplace } from './marketplace-detection.util';

describe('detectMarketplace', () => {
  it('detects all configured exact hosts', () => {
    expect(detectMarketplace('https://shopee.com.br/x')?.marketplace).toBe('SHOPEE');
    expect(detectMarketplace('https://amzn.to/x')?.marketplace).toBe('AMAZON');
    expect(detectMarketplace('https://meli.la/x')?.marketplace).toBe('MERCADO_LIVRE');
    expect(detectMarketplace('https://mglu.io/x')?.marketplace).toBe('MAGALU');
    expect(detectMarketplace('https://pt.aliexpress.com/x')?.marketplace).toBe('ALIEXPRESS');
  });

  it('rejects lookalike and invalid URLs', () => {
    expect(detectMarketplace('https://shopee.com.br.evil.example/x')).toBeNull();
    expect(detectMarketplace('invalid')).toBeNull();
  });
});
