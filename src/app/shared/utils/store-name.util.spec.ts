import { resolveStoreDisplayName } from './store-name.util';

describe('resolveStoreDisplayName', () => {
  it('shortens Amazon.com.br to Amazon', () => {
    expect(resolveStoreDisplayName('Amazon.com.br')).toBe('Amazon');
    expect(resolveStoreDisplayName(' amazon.com.br ')).toBe('Amazon');
  });

  it('keeps other store names as they are', () => {
    expect(resolveStoreDisplayName('Mercado Livre')).toBe('Mercado Livre');
  });

  it('returns an empty string for unknown stores', () => {
    expect(resolveStoreDisplayName('Loja não identificada')).toBe('');
    expect(resolveStoreDisplayName('loja-nao-identificada')).toBe('');
    expect(resolveStoreDisplayName(undefined)).toBe('');
  });
});
