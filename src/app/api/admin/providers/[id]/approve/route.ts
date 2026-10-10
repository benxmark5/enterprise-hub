// src/app/api/admin/providers/[id]/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ error: 'Config missing' }, { status: 500 });
    }

    const cookieStore = await cookies();
    const authClient = createServerClient(
      SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cs) {
            try { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
            catch { /* ignore */ }
          },
        },
      }
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const note = String(body?.note || 'Approved by admin');

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: rpcResult, error } = await admin.rpc('admin_approve_provider_application', {
      p_application_id: id,
      p_actor_email: user.email ?? 'admin',
      p_actor_id: user.id,
      p_note: note,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const r = rpcResult as { ok?: boolean; error?: string; already_provider?: boolean } | null;
    if (!r?.ok) {
      return NextResponse.json({ error: r?.error || 'Approval failed' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, already_provider: r.already_provider ?? false });
  } catch (err) {
    console.error('[admin/providers/:id/approve] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}