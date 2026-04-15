import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { COLLECTIONS } from '@/lib/types/firestore';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const adminCookie = request.cookies.get('imala-admin-session')?.value;
  const configSnap = await adminDb.doc(COLLECTIONS.PLATAFORMA_CONFIG).get();
  const config = configSnap.data();

  return NextResponse.json({
    env: {
      has_jwt_secret: !!process.env.ADMIN_JWT_SECRET,
      node_env: process.env.NODE_ENV
    },
    firestore_config: {
      exists: configSnap.exists,
      uids_count: config?.superAdminUids?.length || 0,
      uids: config?.superAdminUids || []
    },
    current_session: {
      has_admin_cookie: !!adminCookie,
      cookie_preview: adminCookie ? (adminCookie.substring(0, 10) + '...') : 'null'
    },
    status: "Si 'has_admin_cookie' es false después de loguearte, el problema está en la creación de la cookie."
  });
}
