import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/auth/login', '/join', '/'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAuth = request.cookies.get('auth-flag')?.value === '1';

  // Public paths — allow always
  if (PUBLIC_PATHS.some((p) => pathname === p) || pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    // Redirect authenticated users from login to dashboard
    if (hasAuth && pathname === '/auth/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Protected paths — redirect to login if not authenticated
  if (!hasAuth) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
