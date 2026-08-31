import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  console.log('📍 Proxy:', request.nextUrl.pathname);
  
  let response = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  
  // Allow auth pages
  if (request.nextUrl.pathname.startsWith('/auth')) {
    return response;
  }

  // Redirect to login if no session
  if (!session) {
    console.log('🔴 No session, redirecting to /auth/login');
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();
    
  if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
    console.log('🔴 Not admin, redirecting to /auth/login');
    return NextResponse.redirect(new URL('/auth/login?error=unauthorized', request.url));
  }
  
  console.log('✅ Session valid, proceeding');
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};