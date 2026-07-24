function secretsMatch(provided: string | null, expected: string): boolean {
  if (!provided || provided.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= provided.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return mismatch === 0;
}

export function isAuthorizedCronRequest(request: Request): boolean {
  const cronSecret = Deno.env.get('CRON_SECRET');
  return Boolean(
    cronSecret &&
    cronSecret.length >= 32 &&
    secretsMatch(request.headers.get('x-campus-clash-cron-secret'), cronSecret)
  );
}
