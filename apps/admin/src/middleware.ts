import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/auth/login', '/forbidden'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAuth = request.cookies.get('auth-flag')?.value === '1';

  // Public paths — allow always. Authenticated users hitting the login
  // screen are redirected to the dashboard so they don't see a stale form.
  if (
    PUBLIC_PATHS.some((p) => pathname === p) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api')
  ) {
    if (hasAuth && pathname === '/auth/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Protected paths — kick anonymous visitors to login, preserving the
  // original destination via ?redirect= so we can bounce them back after
  // a successful sign-in.
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
