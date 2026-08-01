const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const allowedPaths = [
  /^\/public(?:\/(?:support|privacy|terms|community-guidelines|account-deletion|partnership))?$/,
  /^\/public\/event\/[a-z0-9]+(?:-[a-z0-9]+)*$/,
  /^\/public\/organization\/[a-z0-9]+(?:-[a-z0-9]+)*$/,
  /^\/public\/referral\/[a-z0-9]{6,16}$/i,
  new RegExp(`^/event/${uuid}(?:/(?:chat|check-in|manage))?$`, 'i'),
  new RegExp(`^/check-in/${uuid}$`, 'i'),
  /^\/auth\/callback$/
];

export function safeDeepLinkPath(value: string): string {
  if (!value || value.length > 2048) return '/public';
  try {
    const hasProtocol = /^[a-z][a-z0-9+.-]*:/i.test(value);
    const url = new URL(
      hasProtocol ? value : `ruckus://app${value.startsWith('/') ? '' : '/'}${value}`
    );
    if (!['ruckus:', 'campusclash:', 'https:', 'http:'].includes(url.protocol)) {
      return '/public';
    }
    const customScheme = url.protocol === 'ruckus:' || url.protocol === 'campusclash:';
    const hostPrefix =
      customScheme && url.hostname && url.hostname !== 'app' ? `/${url.hostname}` : '';
    const pathname = `${hostPrefix}${url.pathname}`.replace(/\/{2,}/g, '/');
    if (!allowedPaths.some((pattern) => pattern.test(pathname))) return '/public';
    const safeQuery =
      pathname === '/auth/callback' || pathname.startsWith('/check-in/')
        ? url.search
        : '';
    return `${pathname}${safeQuery}${pathname === '/auth/callback' ? url.hash : ''}`;
  } catch {
    return '/public';
  }
}
