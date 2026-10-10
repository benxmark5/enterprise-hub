// src/lib/referral/attribution.ts
'use client';

import { supabase } from '@/lib/supabase/client';

const REF_COOKIE = 'gh_ref';

/** Read the referral cookie, or null if absent. */
export function readRefCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${REF_COOKIE}=`));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

/** Clear the referral cookie after it has been consumed. */
export function clearRefCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${REF_COOKIE}=; Max-Age=0; path=/; SameSite=Lax`;
}

/**
 * After a successful signup, link the referral cookie to the new user.
 * - Idempotent: safe to call twice (uses upsert-ish semantics).
 * - Silently no-ops if there is no cookie or the marketer is unknown.
 * - Called client-side; relies on the anon Supabase client.
 */
export async function attributeSignup(userId: string): Promise<void> {
  const code = readRefCookie();
  if (!code) return;

  try {
    // Find the marketer by code
    const { data: marketer, error: mErr } = await supabase
      .from('marketers')
      .select('id, status')
      .eq('referral_code', code)
      .maybeSingle();

    if (mErr) throw mErr;
    if (!marketer) {
      // Unknown code — just clear the cookie and bail
      clearRefCookie();
      return;
    }

    // Only attribute to approved (or pending, your call) marketers
    if (marketer.status !== 'approved') {
      clearRefCookie();
      return;
    }

    // Guard: has this user already been attributed?
    const { data: existing } = await supabase
      .from('referral_attributions')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existing) {
      const now = new Date();
      const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await supabase.from('referral_attributions').insert({
        marketer_id: marketer.id,
        referral_code: code,
        user_id: userId,
        clicked_at: now.toISOString(),
        converted_at: now.toISOString(),
        expires_at: expires.toISOString(),
      });

      // Log the signup conversion (0 commission — purchase events come later)
      await supabase.from('marketer_conversions').insert({
        marketer_id: marketer.id,
        user_id: userId,
        conversion_type: 'signup',
        amount_usd: 0,
        commission_usd: 0,
      });

      // Bump the marketer's counter
      const { data: current } = await supabase
        .from('marketers')
        .select('total_conversions')
        .eq('id', marketer.id)
        .single();

      if (current) {
        await supabase
          .from('marketers')
          .update({ total_conversions: (current.total_conversions ?? 0) + 1 })
          .eq('id', marketer.id);
      }
    }

    // Consume the cookie — one-shot
    clearRefCookie();
  } catch (err) {
    // Attribution failing must never block signup
    console.error('[referral] attributeSignup failed:', err);
  }
}