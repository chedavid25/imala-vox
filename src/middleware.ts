import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Redirigir la raíz / hacia /auth
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  // Las rutas del dashboard requieren autenticación.
  // Nota: Firebase Auth se verifica en el cliente via AppLayout,
  // pero este middleware asegura que la entrada principal siempre sea controlada.
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*'
  ]
}
