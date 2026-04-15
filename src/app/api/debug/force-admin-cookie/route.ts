import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

const ADMIN_JWT_SECRET = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET || 'fallback-secret-imala-vox-2026');

export async function GET(request: NextRequest) {
  const uid = "WVyH5j52mJOOKr21H6M3THI67bZ2"; // Tu UID confirmado

  try {
    const token = await new SignJWT({ uid })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('8h')
      .sign(ADMIN_JWT_SECRET);

    const cookieStore = await cookies();
    cookieStore.set('imala-admin-session', token, {
      httpOnly: true,
      secure: false, // Desarrollo
      maxAge: 60 * 60 * 8,
      path: '/',
      sameSite: 'lax',
    });

    return NextResponse.json({ 
      success: true, 
      message: "Cookie de administrador inyectada manualmente.",
      instrucciones: "Ahora puedes ir directamente a http://localhost:3000/superadmin" 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
