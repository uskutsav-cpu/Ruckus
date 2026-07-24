const rawTokenPattern = /^[A-Za-z0-9_-]{43}$/;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseCheckinPayload(payload: string, expectedGroupId: string): string {
  let url: URL;
  try {
    url = new URL(payload);
  } catch {
    throw new Error('That is not a Campus Clash check-in code.');
  }
  const groupId = url.pathname.replace(/^\/+/, '');
  const token = url.searchParams.get('token');
  if (
    url.protocol !== 'campusclash:' ||
    url.hostname !== 'check-in' ||
    !uuidPattern.test(groupId) ||
    groupId !== expectedGroupId ||
    !token ||
    !rawTokenPattern.test(token)
  ) {
    throw new Error('This code is not valid for your crew.');
  }
  return token;
}
