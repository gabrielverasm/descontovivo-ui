import { UI_VERSION } from './app-version';

describe('UI_VERSION', () => {
  it('exposes the current patch version', () => {
    expect(UI_VERSION).toBe('0.5.30');
  });
});
