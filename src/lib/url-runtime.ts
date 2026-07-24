export function shouldInstallNativeUrlPolyfill(platform: string): boolean {
  return platform !== 'web';
}
