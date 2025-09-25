import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Allow access to auth pages regardless of auth status
    if (req.nextUrl.pathname.startsWith('/auth/')) {
      return NextResponse.next();
    }

    // Check if user has required role for admin pages
    if (req.nextUrl.pathname.startsWith('/admin/')) {
      const roles = req.nextauth.token?.roles as string[] | undefined;
      if (!roles?.includes('admin')) {
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to auth pages without token
        if (req.nextUrl.pathname.startsWith('/auth/')) {
          return true;
        }
        
        // Require token for all other pages
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sw.js (service worker)
     * - images (public images)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|sw.js|images).*)',
  ],
};