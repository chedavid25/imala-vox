import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { COLLECTIONS } from '@/lib/types/firestore';

// GET /api/debug/meta-subscription?wsId=XXX&metaPageId=YYY
// También acepta canalId=ZZZ si se prefiere.
export async function GET(req: NextRequest) {
  const wsId = req.nextUrl.searchParams.get('wsId');
  const canalId = req.nextUrl.searchParams.get('canalId');
  const metaPageIdParam = req.nextUrl.searchParams.get('metaPageId');

  if (!wsId || (!canalId && !metaPageIdParam)) {
    return NextResponse.json({ error: 'wsId y (canalId o metaPageId) son requeridos' }, { status: 400 });
  }

  try {
    let canalData: any;
    let finalCanalId = canalId;

    if (canalId) {
      const canalSnap = await adminDb.doc(`${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CANALES}/${canalId}`).get();
      if (canalSnap.exists) {
        canalData = canalSnap.data();
      }
    }

    if (!canalData && metaPageIdParam) {
      const q = await adminDb
        .collection(`${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CANALES}`)
        .where('metaPageId', '==', metaPageIdParam)
        .limit(1)
        .get();
      
      if (!q.empty) {
        canalData = q.docs[0].data();
        finalCanalId = q.docs[0].id;
      }
    }

    if (!canalData) {
      return NextResponse.json({ error: 'No se encontró el canal con los parámetros proporcionados' }, { status: 404 });
    }

    const metaPageId = canalData.metaPageId;
    const secretSnap = await adminDb.doc(`${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CANALES}/${finalCanalId}/secrets/config`).get();
    
    if (!secretSnap.exists) {
      return NextResponse.json({ error: 'No se encontraron secretos para este canal' }, { status: 404 });
    }

    const { metaAccessToken } = secretSnap.data() as any;

    // 1. ¿Qué apps están suscritas a esta página y con qué campos?
    const subsRes = await fetch(
      `https://graph.facebook.com/v19.0/${metaPageId}/subscribed_apps?access_token=${encodeURIComponent(metaAccessToken)}`
    );
    const subsData = await subsRes.json();

    // 2. ¿Qué permisos tiene el Page Access Token?
    const permsRes = await fetch(
      `https://graph.facebook.com/v19.0/me/permissions?access_token=${encodeURIComponent(metaAccessToken)}`
    );
    const permsData = await permsRes.json();

    // 3. Info del token (tipo, expiración)
    const debugRes = await fetch(
      `https://graph.facebook.com/v19.0/debug_token?input_token=${encodeURIComponent(metaAccessToken)}&access_token=${encodeURIComponent(metaAccessToken)}`
    );
    const debugData = await debugRes.json();

    return NextResponse.json({
      canalId: finalCanalId,
      metaPageId,
      subscribedApps: subsData,
      tokenPermissions: permsData,
      tokenDebug: debugData,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
