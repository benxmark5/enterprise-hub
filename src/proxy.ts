import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  // Allow all requests to pass through
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};