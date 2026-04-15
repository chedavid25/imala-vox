import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
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
    
    console.log("--- PROXY DEBUG ---");
    console.log("Ruta detectada:", pathname);
    console.log("¿Hay cookie de admin?:", !!adminCookie);

    if (!adminCookie) {
      console.log("Redirigiendo a /auth por falta de cookie.");
      return NextResponse.redirect(new URL('/auth', request.url));
    }

    try {
      const { jwtVerify } = await import('jose');
      const secretKey = process.env.ADMIN_JWT_SECRET || 'fallback-secret-imala-vox-2026';
      const secret = new TextEncoder().encode(secretKey);
      
      console.log("Usando Secret Key para validar:", secretKey === 'fallback-secret-imala-vox-2026' ? "FALLBACK" : "ENV_VAR");
      
      await jwtVerify(adminCookie, secret);
      console.log("JWT Validado con éxito en el Proxy.");
    } catch (error: any) {
      console.error("SuperAdmin Auth Error en Proxy:", error.message);
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
