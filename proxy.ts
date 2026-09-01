import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  // Allow all requests - no redirects
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};