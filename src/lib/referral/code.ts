// src/lib/referral/code.ts
// Referral code generator — MARK-XXXXXX (6 chars, no confusables)

import { supabase } from '@/lib/supabase/client';

// Excludes 0/O, 1/I/L — the usual confusable set
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const PREFIX = 'MARK-';
const LENGTH = 6;

/**
 * Generate a single code, e.g. "MARK-7K2P9X".
 * Purely random — does NOT check uniqueness.
 */
export function generateReferralCode(): string {
  let out = '';
  for (let i = 0; i < LENGTH; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return PREFIX + out;
}

/**
 * Generate a code that is guaranteed not to already exist in `marketers`.
 * Retries up to `maxAttempts` before throwing.
 */
export async function generateUniqueReferralCode(maxAttempts = 8): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateReferralCode();
    const { data, error } = await supabase
      .from('marketers')
      .select('id')
      .eq('referral_code', code)
      .maybeSingle();

    if (error) throw error;
    if (!data) return code;
  }
  throw new Error('Could not generate a unique referral code. Try again.');
}

/**
 * Validate user-entered code shape (for public forms).
 * Accepts optional whitespace and lowercase input.
 */
export function normalizeReferralCode(raw: string): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, '');
  // allow with or without prefix
  const withPrefix = cleaned.startsWith(PREFIX) ? cleaned : PREFIX + cleaned;
  if (!/^MARK-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/.test(withPrefix)) return null;
  return withPrefix;
}