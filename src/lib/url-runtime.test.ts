import { shouldInstallNativeUrlPolyfill } from '@/lib/url-runtime';

describe('URL runtime selection', () => {
  it('preserves the browser URL implementation on web', () => {
    expect(shouldInstallNativeUrlPolyfill('web')).toBe(false);
  });

  it.each(['ios', 'android'])('installs the native URL polyfill on %s', (platform) => {
    expect(shouldInstallNativeUrlPolyfill(platform)).toBe(true);
  });
});
