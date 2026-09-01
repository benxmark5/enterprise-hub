import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const key = body?.key;

    // Server-only secret: set in your environment (not NEXT_PUBLIC)
    const ADMIN_KEY = process.env.ADMIN_BYPASS_KEY;

    if (!ADMIN_KEY) {
      return NextResponse.json({ error: 'Bypass not configured' }, { status: 403 });
    }

    if (!key || key !== ADMIN_KEY) {
      return NextResponse.json({ error: 'Invalid key' }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    // Set an HTTP-only cookie so middleware can trust it server-side
    res.cookies.set({
      name: 'admin_bypass',
      value: '1',
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch (err) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
