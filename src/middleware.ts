import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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
    const adminCookie = request.cookies.get('imala-admin-session')?.value;
    
    if (!adminCookie) {
      return NextResponse.redirect(new URL('/auth', request.url));
    }

    try {
      const { jwtVerify } = await import('jose');
      const secret = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET || 'fallback-secret-imala-vox-2026');
      await jwtVerify(adminCookie, secret);
    } catch (error) {
      console.error("SuperAdmin Auth Error:", error);
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
