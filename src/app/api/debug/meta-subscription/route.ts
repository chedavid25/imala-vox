import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { COLLECTIONS } from '@/lib/types/firestore';

// GET /api/debug/meta-subscription?metaPageId=YYY
export async function GET(req: NextRequest) {
  const adminSecret = req.headers.get('x-admin-secret');
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const metaPageIdParam = req.nextUrl.searchParams.get('metaPageId');

  if (!metaPageIdParam) {
    return NextResponse.json({ error: 'metaPageId es requerido' }, { status: 400 });
  }

  try {
    // 1. Buscar el canal globalmente usando collectionGroup
    // Filtramos por status: connected para que coincida con el índice
    const q = await adminDb
      .collectionGroup(COLLECTIONS.CANALES)
      .where('metaPageId', '==', metaPageIdParam)
      .where('status', '==', 'connected')
      .limit(1)
      .get();
    
    if (q.empty) {
      return NextResponse.json({ error: `No se encontró ningún canal CONECTADO con metaPageId: ${metaPageIdParam}` }, { status: 404 });
    }

    const canalDoc = q.docs[0];
    const canalData = canalDoc.data();
    const canalId = canalDoc.id;
    const wsId = canalDoc.ref.parent.parent?.id;

    if (!wsId) {
      return NextResponse.json({ error: 'No se pudo determinar el Workspace ID' }, { status: 500 });
    }

    const secretPath = `${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CANALES}/${canalId}/secrets/config`;
    const secretSnap = await adminDb.doc(secretPath).get();
    
    if (!secretSnap.exists) {
      return NextResponse.json({ error: 'Faltan secretos de Meta', wsId, canalId }, { status: 404 });
    }

    const { metaAccessToken } = secretSnap.data() as any;

    const [subsRes, permsRes, debugRes] = await Promise.all([
      fetch(`https://graph.facebook.com/v19.0/${metaPageIdParam}/subscribed_apps?access_token=${encodeURIComponent(metaAccessToken)}`),
      fetch(`https://graph.facebook.com/v19.0/me/permissions?access_token=${encodeURIComponent(metaAccessToken)}`),
      fetch(`https://graph.facebook.com/v19.0/debug_token?input_token=${encodeURIComponent(metaAccessToken)}&access_token=${encodeURIComponent(metaAccessToken)}`)
    ]);

    return NextResponse.json({
      wsId,
      canalId,
      metaPageId: metaPageIdParam,
      subscribedApps: await subsRes.json(),
      tokenPermissions: await permsRes.json(),
      tokenDebug: await debugRes.json(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
