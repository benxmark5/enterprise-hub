// src/proxy.ts
import { NextResponse, type NextRequest } from 'next/server';

const REF_COOKIE = 'gh_ref';
const REF_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const PREFIX = 'MARK-';
const CODE_RE = /^MARK-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

/**
 * Normalize a raw ?ref= value into canonical form, or return null.
 * Accepts: "7k2p9x", "mark-7k2p9x", " MARK-7K2P9X ", etc.
 */
function normalizeReferralCode(raw: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, '');
  if (!cleaned) return null;
  const withPrefix = cleaned.startsWith(PREFIX) ? cleaned : PREFIX + cleaned;
  return CODE_RE.test(withPrefix) ? withPrefix : null;
}

export async function proxy(request: NextRequest) {
  const res = NextResponse.next();

  // ---- Referral capture (last-click wins) ----
  const code = normalizeReferralCode(request.nextUrl.searchParams.get('ref'));
  if (code) {
    res.cookies.set(REF_COOKIE, code, {
      maxAge: REF_MAX_AGE,
      path: '/',
      sameSite: 'lax',
      httpOnly: false, // signup client code must read this
      secure: process.env.NODE_ENV === 'production',
    });
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};