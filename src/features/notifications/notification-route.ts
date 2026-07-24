const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const allowedPatterns = [
  /^\/groups$/,
  /^\/pending$/,
  /^\/profile$/,
  new RegExp(`^/group/${uuid}$`, 'i'),
  new RegExp(`^/group/${uuid}/chat$`, 'i'),
  new RegExp(`^/check-in/${uuid}$`, 'i')
];

export function safeNotificationRoute(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 160 || value.includes('?')) {
    return null;
  }
  return allowedPatterns.some((pattern) => pattern.test(value)) ? value : null;
}
