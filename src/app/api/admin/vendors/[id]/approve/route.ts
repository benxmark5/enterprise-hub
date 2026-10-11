// src/app/api/admin/vendors/[id]/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

export async function POST(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> }
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
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const params = await context.params;
    const id = params?.id;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const note = String(body?.note || 'Approved by admin');

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: rpcResult, error } = await admin.rpc('admin_approve_vendor', {
      p_vendor_id: id,
      p_actor_email: user.email ?? 'admin',
      p_actor_id: user.id,
      p_note: note,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const r = rpcResult as { ok?: boolean; error?: string; already_approved?: boolean } | null;
    if (!r?.ok) return NextResponse.json({ error: r?.error || 'Approval failed' }, { status: 400 });

    return NextResponse.json({ ok: true, already_approved: r.already_approved ?? false });
  } catch (err) {
    console.error('[admin/vendors/:id/approve] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}