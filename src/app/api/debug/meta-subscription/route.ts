import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { COLLECTIONS } from '@/lib/types/firestore';

// GET /api/debug/meta-subscription?metaPageId=YYY
// Ahora busca globalmente en todos los workspaces.
export async function GET(req: NextRequest) {
  const metaPageIdParam = req.nextUrl.searchParams.get('metaPageId');

  if (!metaPageIdParam) {
    return NextResponse.json({ error: 'metaPageId es requerido' }, { status: 400 });
  }

  try {
    // 1. Buscar el canal globalmente usando collectionGroup
    const q = await adminDb
      .collectionGroup(COLLECTIONS.CANALES)
      .where('metaPageId', '==', metaPageIdParam)
      .limit(1)
      .get();
    
    if (q.empty) {
      return NextResponse.json({ error: `No se encontró ningún canal con metaPageId: ${metaPageIdParam}` }, { status: 404 });
    }

    const canalDoc = q.docs[0];
    const canalData = canalDoc.data();
    const canalId = canalDoc.id;
    
    // Obtener el wsId desde la referencia del documento
    const wsId = canalDoc.ref.parent.parent?.id;

    if (!wsId) {
      return NextResponse.json({ error: 'No se pudo determinar el Workspace ID para este canal' }, { status: 500 });
    }

    const secretPath = `${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CANALES}/${canalId}/secrets/config`;
    const secretSnap = await adminDb.doc(secretPath).get();
    
    if (!secretSnap.exists) {
      return NextResponse.json({ 
        error: 'Canal encontrado pero no tiene secretos configurados',
        wsId,
        canalId 
      }, { status: 404 });
    }

    const { metaAccessToken } = secretSnap.data() as any;

    // 1. Consultar suscripciones en Meta
    const subsRes = await fetch(
      `https://graph.facebook.com/v19.0/${metaPageIdParam}/subscribed_apps?access_token=${encodeURIComponent(metaAccessToken)}`
    );
    const subsData = await subsRes.json();

    // 2. Consultar permisos
    const permsRes = await fetch(
      `https://graph.facebook.com/v19.0/me/permissions?access_token=${encodeURIComponent(metaAccessToken)}`
    );
    const permsData = await permsRes.json();

    // 3. Info del token
    const debugRes = await fetch(
      `https://graph.facebook.com/v19.0/debug_token?input_token=${encodeURIComponent(metaAccessToken)}&access_token=${encodeURIComponent(metaAccessToken)}`
    );
    const debugData = await debugRes.json();

    return NextResponse.json({
      wsId,
      canalId,
      metaPageId: metaPageIdParam,
      subscribedApps: subsData,
      tokenPermissions: permsData,
      tokenDebug: debugData,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
