import { withSupabase } from '@supabase/server';
import type { Database } from '../_shared/database.types.ts';

import { jsonError } from '../_shared/http.ts';

const allowedLeadTypes = new Set([
  'student_club',
  'campus_media',
  'student_government',
  'residence',
  'campus_activities',
  'university',
  'other'
]);

type LeadBody = {
  campusName?: unknown;
  organizationName?: unknown;
  contactName?: unknown;
  contactEmail?: unknown;
  leadType?: unknown;
  message?: unknown;
  website?: unknown;
};

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin');
  const configuredOrigin = Deno.env.get('PUBLIC_SITE_ORIGIN');
  const localOrigin =
    origin?.startsWith('http://localhost:') || origin?.startsWith('http://127.0.0.1:');
  if (!origin || (!localOrigin && origin !== configuredOrigin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin'
  };
}

function withCors(response: Response, request: Request): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(request))) {
    headers.set(key, value);
  }
  return new Response(response.body, { status: response.status, headers });
}

function cleanText(value: unknown, maximum: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (
    !trimmed ||
    trimmed.length > maximum ||
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(trimmed)
  ) {
    return null;
  }
  return trimmed;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}

function sourceAddress(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

export default {
  fetch: withSupabase<Database>({ auth: 'none' }, async (request, context) => {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }
    if (request.method !== 'POST') {
      return withCors(
        jsonError('Method not allowed.', 405, 'METHOD_NOT_ALLOWED'),
        request
      );
    }

    let body: LeadBody;
    try {
      body = (await request.json()) as LeadBody;
    } catch {
      return withCors(jsonError('Invalid request body.', 400, 'INVALID_BODY'), request);
    }
    if (typeof body.website === 'string' && body.website.trim()) {
      return withCors(Response.json({ accepted: true }, { status: 202 }), request);
    }

    const campusName = cleanText(body.campusName, 160);
    const organizationName = cleanText(body.organizationName, 160);
    const contactName = cleanText(body.contactName, 100);
    const contactEmail = cleanText(body.contactEmail, 254)?.toLowerCase() ?? null;
    const leadType = cleanText(body.leadType, 40);
    const message = cleanText(body.message, 3000);
    const emailValid = contactEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail);
    const linkCount = message?.match(/https?:\/\//gi)?.length ?? 0;
    if (
      !campusName ||
      campusName.length < 2 ||
      !organizationName ||
      organizationName.length < 2 ||
      !contactName ||
      contactName.length < 2 ||
      !emailValid ||
      !leadType ||
      !allowedLeadTypes.has(leadType) ||
      !message ||
      message.length < 10 ||
      linkCount > 5
    ) {
      return withCors(
        jsonError('Check the form fields and try again.', 400, 'INVALID_LEAD'),
        request
      );
    }

    const pepper =
      Deno.env.get('PARTNERSHIP_RATE_LIMIT_PEPPER') ??
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!pepper) {
      console.error(
        JSON.stringify({ level: 'error', event: 'partnership.config_missing' })
      );
      return withCors(
        jsonError(
          'Partnership requests are temporarily unavailable.',
          503,
          'NOT_CONFIGURED'
        ),
        request
      );
    }
    const sourceHash = await sha256(`${pepper}:${sourceAddress(request)}`);
    const oneHourAgo = new Date(Date.now() - 60 * 60_000).toISOString();
    const { count, error: countError } = await context.supabaseAdmin
      .from('partnership_leads')
      .select('id', { count: 'exact', head: true })
      .eq('source_hash', sourceHash)
      .gte('created_at', oneHourAgo);
    if (countError) {
      console.error(
        JSON.stringify({
          level: 'error',
          event: 'partnership.rate_lookup_failed',
          code: countError.code
        })
      );
      return withCors(jsonError('Try again later.', 503, 'LEAD_UNAVAILABLE'), request);
    }
    if ((count ?? 0) >= 5) {
      return withCors(jsonError('Try again later.', 429, 'RATE_LIMITED'), request);
    }

    const { error } = await context.supabaseAdmin.from('partnership_leads').insert({
      campus_name: campusName,
      organization_name: organizationName,
      contact_name: contactName,
      contact_email: contactEmail,
      lead_type: leadType,
      message,
      source_hash: sourceHash
    });
    if (error) {
      console.error(
        JSON.stringify({
          level: 'error',
          event: 'partnership.insert_failed',
          code: error.code
        })
      );
      return withCors(jsonError('Try again later.', 503, 'LEAD_UNAVAILABLE'), request);
    }

    console.info(
      JSON.stringify({ level: 'info', event: 'partnership.submitted', leadType })
    );
    return withCors(Response.json({ accepted: true }, { status: 202 }), request);
  })
};
