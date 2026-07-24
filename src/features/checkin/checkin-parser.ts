const rawTokenPattern = /^[A-Za-z0-9_-]{43}$/;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CheckinScanIssue = 'invalid-code' | 'wrong-group';

export class CheckinScanError extends Error {
  public constructor(
    public readonly issue: CheckinScanIssue,
    message: string
  ) {
    super(message);
    this.name = 'CheckinScanError';
  }
}

export function parseCheckinPayload(payload: string, expectedGroupId: string): string {
  let url: URL;
  try {
    url = new URL(payload);
  } catch {
    throw new CheckinScanError(
      'invalid-code',
      'That is not a valid Ruckus check-in code.'
    );
  }
  const groupId = url.pathname.replace(/^\/+/, '');
  const token = url.searchParams.get('token');
  if (
    url.protocol !== 'campusclash:' ||
    url.hostname !== 'check-in' ||
    !uuidPattern.test(groupId) ||
    !token ||
    !rawTokenPattern.test(token)
  ) {
    throw new CheckinScanError(
      'invalid-code',
      'That QR is not a valid Ruckus check-in code.'
    );
  }
  if (groupId !== expectedGroupId) {
    throw new CheckinScanError('wrong-group', 'That QR belongs to a different crew.');
  }
  return token;
}
