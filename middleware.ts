import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  // Allow access to auth pages regardless of auth status
  if (request.nextUrl.pathname.startsWith('/auth/')) {
    return NextResponse.next();
  }

  // Allow access to queue display page without authentication
  if (request.nextUrl.pathname.startsWith('/display-queue-monitor')) {
    return NextResponse.next();
  }

  // Refresh the Supabase session cookie and check there's a valid user.
  // Role-based gating (e.g. /admin/*) happens server-side per route
  // (checkPermissions) and client-side (AdminProtection), not here.
  const { response, claims } = await updateSession(request);

  if (!claims) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (session-check endpoint; must stay reachable when unauthenticated)
     * - api/queue-display (unauthenticated queue display API)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sw.js (service worker)
     * - images (public images)
     */
    '/((?!api/auth|api/queue-display|_next/static|_next/image|favicon.ico|sw.js|images).*)',
  ],
};
