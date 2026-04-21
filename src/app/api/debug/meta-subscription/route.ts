import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { COLLECTIONS } from '@/lib/types/firestore';

// GET /api/debug/meta-subscription?wsId=XXX&canalId=YYY
// Devuelve el estado real de la suscripción de la página en Meta.
export async function GET(req: NextRequest) {
  const wsId = req.nextUrl.searchParams.get('wsId');
  const canalId = req.nextUrl.searchParams.get('canalId');

  if (!wsId || !canalId) {
    return NextResponse.json({ error: 'wsId y canalId son requeridos' }, { status: 400 });
  }

  try {
    const canalPath = `${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CANALES}/${canalId}`;
    const canalSnap = await adminDb.doc(canalPath).get();
    if (!canalSnap.exists) return NextResponse.json({ error: 'Canal no existe' }, { status: 404 });

    const { metaPageId } = canalSnap.data() as any;
    const secretSnap = await adminDb.doc(`${canalPath}/secrets/config`).get();
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
      metaPageId,
      subscribedApps: subsData,
      tokenPermissions: permsData,
      tokenDebug: debugData,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
