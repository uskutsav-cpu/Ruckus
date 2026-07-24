export function jsonError(message: string, status: number, code: string): Response {
  return Response.json({ error: message, code }, { status });
}

export function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

export function publicDatabaseError(message: string): {
  message: string;
  status: number;
  code: string;
} {
  const mapping: Record<string, { message: string; status: number; code: string }> = {
    AUTHENTICATION_REQUIRED: {
      message: 'Sign in again to continue.',
      status: 401,
      code: 'AUTHENTICATION_REQUIRED'
    },
    MATCHING_NOT_ALLOWED: {
      message: 'This activity is no longer available for matching.',
      status: 409,
      code: 'MATCHING_NOT_ALLOWED'
    },
    OVERLAPPING_GROUP_EXISTS: {
      message: 'You already have a group at an overlapping time.',
      status: 409,
      code: 'OVERLAPPING_GROUP_EXISTS'
    }
  };
  return (
    mapping[message] ?? {
      message: 'Matching is temporarily unavailable. Please try again.',
      status: 400,
      code: 'MATCHING_FAILED'
    }
  );
}
