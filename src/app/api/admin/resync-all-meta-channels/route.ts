import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { COLLECTIONS } from '@/lib/types/firestore';
import { sincronizarWebhooks } from '@/app/actions/channels';

/**
 * POST /api/admin/resync-all-meta-channels
 * Re-sincroniza todos los webhooks de Meta para canales conectados.
 */
export async function POST(req: NextRequest) {
  const adminSecret = req.headers.get('x-admin-secret');

  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const results: any[] = [];

  try {
    // 1. Obtener todos los workspaces
    const workspacesSnap = await adminDb.collection(COLLECTIONS.ESPACIOS).get();
    
    for (const wsDoc of workspacesSnap.docs) {
      const wsId = wsDoc.id;
      
      // 2. Buscar canales de Meta conectados en cada workspace
      const canalesSnap = await adminDb
        .collection(COLLECTIONS.ESPACIOS)
        .doc(wsId)
        .collection(COLLECTIONS.CANALES)
        .where('tipo', 'in', ['facebook', 'instagram'])
        .where('status', '==', 'connected')
        .get();

      for (const canalDoc of canalesSnap.docs) {
        const canalId = canalDoc.id;
        const canalData = canalDoc.data();

        console.log(`[ADMIN-RESYNC] Sincronizando ws:${wsId} canal:${canalId} (${canalData.tipo})`);
        
        try {
          const res = await sincronizarWebhooks(wsId, canalId);
          results.push({
            wsId,
            canalId,
            tipo: canalData.tipo,
            success: res.success,
            error: res.success ? null : res.error
          });
        } catch (err: any) {
          results.push({
            wsId,
            canalId,
            tipo: canalData.tipo,
            success: false,
            error: err.message
          });
        }
      }
    }

    return NextResponse.json({
      processed: results.length,
      details: results
    });

  } catch (error: any) {
    console.error("Error en resync masivo:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
