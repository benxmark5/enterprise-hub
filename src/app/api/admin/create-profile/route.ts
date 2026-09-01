import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, email, full_name, role = 'admin' } = body || {};

    if (!id || !email) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    if (!SERVICE_ROLE_KEY || !SUPABASE_URL) {
      return NextResponse.json({ error: 'Missing Supabase service role or url env' }, { status: 500 });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const profileRow = {
      id,
      email,
      full_name,
      role,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin.from('profiles').upsert([profileRow], { onConflict: 'id' });

    if (error) {
      console.error('Supabase upsert error:', error);
      return NextResponse.json({ error }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('create-profile route error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
