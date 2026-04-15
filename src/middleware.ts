import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Redirigir la raíz / hacia /auth
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  // 2. Redirigir /dashboard/operacion a /dashboard/operacion/inbox
  if (pathname === '/dashboard/operacion' || pathname === '/dashboard/operacion/') {
    return NextResponse.redirect(new URL('/dashboard/operacion/inbox', request.url))
  }

  // 3. Proteger rutas /superadmin
  if (pathname.startsWith('/superadmin')) {
    const adminCookie = request.cookies.get('imala-admin-session');
    if (!adminCookie) {
      return NextResponse.redirect(new URL('/auth', request.url));
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/superadmin/:path*'
  ]
}
