import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/types/firestore';
import { guardarTokenCanal, sincronizarWebhooks } from '@/app/actions/channels';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const wsId = searchParams.get('state'); // wsId pasado en el state

  if (!code || !wsId) {
    return NextResponse.redirect(new URL('/dashboard/ajustes/canales?error=missing_params', req.url));
  }

  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/meta/callback`;

  try {
    // 1. Intercambiar code por Short-Lived User Token
    const shortTokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&client_secret=${appSecret}&code=${code}`
    );
    const shortTokenData = await shortTokenRes.json();

    if (!shortTokenRes.ok) {
      console.error('Meta OAuth Error (Short Token):', shortTokenData);
      throw new Error(shortTokenData.error?.message || 'Error al obtener token corto');
    }

    const shortToken = shortTokenData.access_token;

    // 2. Intercambiar Short-Lived por Long-Lived User Token (60 días)
    const longTokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`
    );
    const longTokenData = await longTokenRes.json();

    if (!longTokenRes.ok) {
      console.error('Meta OAuth Error (Long Token):', longTokenData);
      throw new Error(longTokenData.error?.message || 'Error al obtener token largo');
    }

    const longLivedUserToken = longTokenData.access_token;

    // 3. Obtener lista de Páginas de Facebook del usuario con sus cuentas de Instagram vinculadas
    const accountsRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=name,access_token,instagram_business_account&access_token=${longLivedUserToken}`
    );
    const accountsData = await accountsRes.json();

    if (!accountsRes.ok) {
      console.error('Meta Graph API Error (Accounts):', accountsData);
      throw new Error(accountsData.error?.message || 'Error al obtener cuentas');
    }

    const pages = accountsData.data || [];

    // 4. Iterar sobre las páginas y sincronizar
    const workspaceRef = adminDb.doc(`${COLLECTIONS.ESPACIOS}/${wsId}`);
    const newPageIds: string[] = [];

    for (const page of pages) {
      const { id: metaPageId, name: pageName, access_token: pageAccessToken } = page;

      // Buscar si ya existe un canal de Facebook con este metaPageId en este wsId
      const canalesSnap = await workspaceRef
        .collection(COLLECTIONS.CANALES)
        .where('tipo', '==', 'facebook')
        .where('metaPageId', '==', metaPageId)
        .limit(1)
        .get();

      let canalId: string;
      const baseData = {
        tipo: 'facebook',
        nombre: pageName,
        metaPageId: metaPageId,
        status: 'connected' as const,
        webhookVerified: false,
        actualizadoEl: Timestamp.now(),
      };

      if (!canalesSnap.empty) {
        // Actualizar canal existente
        canalId = canalesSnap.docs[0].id;
        await workspaceRef.collection(COLLECTIONS.CANALES).doc(canalId).update(baseData);
      } else {
        // Crear nuevo canal
        const canalRef = await workspaceRef.collection(COLLECTIONS.CANALES).add({
          ...baseData,
          creadoEl: Timestamp.now(),
        });
        canalId = canalRef.id;
      }

      // Guardar el Page Access Token (que no expira) en secretos
      await guardarTokenCanal(wsId, canalId, pageAccessToken);
      
      // Sincronizar automáticamente los webhooks de esta página (incluye leadgen)
      await sincronizarWebhooks(wsId, canalId);
      
      newPageIds.push(metaPageId);

      // --- DETECTION DE INSTAGRAM VINCULADO ---
      if (page.instagram_business_account) {
        const igId = page.instagram_business_account.id;
        
        // Buscar si ya existe canal de Instagram
        const igSnap = await workspaceRef
          .collection(COLLECTIONS.CANALES)
          .where('tipo', '==', 'instagram')
          .where('metaInstagramId', '==', igId)
          .limit(1)
          .get();

        const igData = {
          tipo: 'instagram',
          nombre: `Instagram - ${pageName}`,
          cuenta: pageName,
          metaPageId: metaPageId,
          metaInstagramId: igId,
          status: 'connected' as const,
          webhookVerified: true, // Se asocia al webhook de la página
          actualizadoEl: Timestamp.now(),
        };

        let igCanalId: string;
        if (!igSnap.empty) {
          igCanalId = igSnap.docs[0].id;
          await workspaceRef.collection(COLLECTIONS.CANALES).doc(igCanalId).update(igData);
        } else {
          const igRef = await workspaceRef.collection(COLLECTIONS.CANALES).add({
            ...igData,
            creadoEl: Timestamp.now(),
          });
          igCanalId = igRef.id;
        }
        
        // Compartir el mismo token de la página para Instagram
        await guardarTokenCanal(wsId, igCanalId, pageAccessToken);
      }
    }

    // 5. Actualizar canalesPageIds en el workspace
    if (newPageIds.length > 0) {
      await workspaceRef.update({
        canalesPageIds: FieldValue.arrayUnion(...newPageIds),
        actualizadoEl: Timestamp.now(),
      });
    }

    // 6. Redirigir al dashboard con éxito
    // Usamos una URL relativa para evitar problemas de protocolo (http vs https) al saltar entre ngrok y localhost
    const successUrl = new URL('/dashboard/ajustes/canales', req.url);
    successUrl.searchParams.set('success', 'true');
    return NextResponse.redirect(successUrl);

  } catch (error: any) {
    console.error('Meta Auth Callback Error:', error);
    const errorMsg = encodeURIComponent(error.message || 'Error desconocido');
    const errorUrl = new URL('/dashboard/ajustes/canales', req.url);
    errorUrl.searchParams.set('error', errorMsg);
    return NextResponse.redirect(errorUrl);
  }
}
