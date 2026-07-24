const encoder = new TextEncoder();

export function isRawCheckinToken(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
}

export function createRawCheckinToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function digestCheckinToken(
  rawToken: string,
  pepper: string
): Promise<string> {
  const input = encoder.encode(`${rawToken}.${pepper}`);
  const digest = await crypto.subtle.digest('SHA-256', input);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function checkinPepper(): string | null {
  const value = Deno.env.get('CHECKIN_TOKEN_PEPPER');
  return value && value.length >= 32 ? value : null;
}
