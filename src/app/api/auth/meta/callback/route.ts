import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/types/firestore';
import crypto from 'crypto';

/**
 * Callback OAuth de Meta. Flujo de 2 pasos:
 *  1. (Acá) Intercambia code → tokens, lista páginas y WABAs disponibles,
 *     guarda todo en `_pendingConnections/{sessionId}` con TTL 10 min, y redirige
 *     al selector para que el usuario elija qué conectar en ESTE workspace.
 *  2. (En /seleccionar) El usuario tilda lo que quiere → `finalize-connection`
 *     crea los canales y propaga el token a otros workspaces que ya tengan la
 *     misma página conectada.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const wsId = searchParams.get('state'); // wsId pasado en el state

  console.log(`[OAUTH-CALLBACK] Code: ${code ? 'SÍ' : 'NO'}, wsId: ${wsId}`);

  if (!code || !wsId) {
    return NextResponse.redirect(new URL('/dashboard/ajustes/canales?error=missing_params', req.url));
  }

  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = `${new URL(req.url).origin}/api/auth/meta/callback`;

  try {
    // 1. Intercambiar code por Short-Lived User Token
    const shortTokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&client_secret=${appSecret}&code=${code}`
    );
    const shortTokenData = await shortTokenRes.json();

    if (!shortTokenRes.ok) {
      console.error('[OAUTH-CALLBACK] Error Short Token:', shortTokenData);
      throw new Error(shortTokenData.error?.message || 'Error al obtener token corto');
    }

    const shortToken = shortTokenData.access_token;

    // 2. Intercambiar por Long-Lived User Token (60 días)
    const longTokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`
    );
    const longTokenData = await longTokenRes.json();

    if (!longTokenRes.ok) {
      console.error('[OAUTH-CALLBACK] Error Long Token:', longTokenData);
      throw new Error(longTokenData.error?.message || 'Error al obtener token largo');
    }

    const longLivedUserToken = longTokenData.access_token;

    // 3. Fetch páginas + cuentas IG vinculadas
    const accountsRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=name,access_token,instagram_business_account{id,username,name}&access_token=${longLivedUserToken}`
    );
    const accountsData = await accountsRes.json();

    if (!accountsRes.ok) {
      console.error('[OAUTH-CALLBACK] Error me/accounts:', accountsData);
      throw new Error(accountsData.error?.message || 'Error al obtener cuentas');
    }

    const pages = (accountsData.data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      accessToken: p.access_token,
      instagram: p.instagram_business_account
        ? {
            id: p.instagram_business_account.id,
            username: p.instagram_business_account.username,
            name: p.instagram_business_account.name,
          }
        : null,
    }));

    // 4. Fetch WABAs (búsqueda exhaustiva)
    const wabas: any[] = [];
    try {
      const wabaRes = await fetch(
        `https://graph.facebook.com/v19.0/me/whatsapp_business_accounts?fields=id,name&access_token=${longLivedUserToken}`
      );
      const wabaData = await wabaRes.json();
      const directWabas = wabaData.data || [];

      // También buscar WABAs a través de páginas (fallback)
      for (const page of pages) {
        const pageWabaRes = await fetch(
          `https://graph.facebook.com/v19.0/${page.id}/whatsapp_business_accounts?access_token=${page.accessToken}`
        );
        const pageWabaData = await pageWabaRes.json();
        if (pageWabaRes.ok && pageWabaData.data) {
          for (const pw of pageWabaData.data) {
            if (!directWabas.find((x: any) => x.id === pw.id)) directWabas.push(pw);
          }
        }
      }

      // Para cada WABA, traer los teléfonos
      for (const waba of directWabas) {
        const phoneRes = await fetch(
          `https://graph.facebook.com/v19.0/${waba.id}/phone_numbers?fields=id,display_phone_number,verified_name&access_token=${longLivedUserToken}`
        );
        const phoneData = await phoneRes.json();
        const phones = (phoneData.data || []).map((p: any) => ({
          id: p.id,
          displayPhone: p.display_phone_number,
          verifiedName: p.verified_name,
        }));
        wabas.push({ id: waba.id, name: waba.name || `WABA ${waba.id}`, phones });
      }
    } catch (waErr) {
      console.warn('[OAUTH-CALLBACK] Error buscando WABAs:', waErr);
    }

    // 5. Si no hay nada que mostrar, redirigir con error útil
    if (pages.length === 0 && wabas.length === 0) {
      const debugRes = await fetch(`https://graph.facebook.com/debug_token?input_token=${longLivedUserToken}&access_token=${appId}|${appSecret}`);
      const debugData = await debugRes.json();
      console.warn('[OAUTH-CALLBACK] No hay páginas ni WABAs. Scopes:', debugData.data?.scopes || []);
      const msg = encodeURIComponent('No se detectaron páginas ni cuentas de WhatsApp. Verificá ser Administrador y haber seleccionado los activos en el dialog de Meta.');
      return NextResponse.redirect(new URL(`/dashboard/ajustes/canales?error=${msg}`, req.url));
    }

    // 6. Guardar todo en sesión temporal (TTL ~10 min)
    const sessionId = crypto.randomBytes(16).toString('hex');
    const expiraEn = Timestamp.fromMillis(Date.now() + 10 * 60 * 1000); // 10 min

    await adminDb
      .doc(`${COLLECTIONS.ESPACIOS}/${wsId}/_pendingConnections/${sessionId}`)
      .set({
        wsId,
        userToken: longLivedUserToken,
        pages,
        wabas,
        creadoEl: Timestamp.now(),
        expiraEn,
      });

    console.log(`[OAUTH-CALLBACK] Sesión ${sessionId} creada para wsId ${wsId}. Pages: ${pages.length}, WABAs: ${wabas.length}`);

    // 7. Redirigir al selector
    const selectorUrl = new URL('/dashboard/ajustes/canales/seleccionar', req.url);
    selectorUrl.searchParams.set('session', sessionId);
    return NextResponse.redirect(selectorUrl);

  } catch (error: any) {
    console.error('[OAUTH-CALLBACK] Error:', error);
    const errorMsg = encodeURIComponent(error.message || 'Error desconocido');
    const errorUrl = new URL('/dashboard/ajustes/canales', req.url);
    errorUrl.searchParams.set('error', errorMsg);
    return NextResponse.redirect(errorUrl);
  }
}
