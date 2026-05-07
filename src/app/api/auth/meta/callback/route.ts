import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/types/firestore';
import { guardarTokenCanal, sincronizarWebhooks } from '@/app/actions/channels';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const wsId = searchParams.get('state'); // wsId pasado en el state

  console.log(`[DEBUG-OAUTH] Callback recibido - Code: ${code ? 'SÍ' : 'NO'}, State (wsId): ${wsId}`);

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
      
      // Solo intentar sincronizar webhooks si tenemos los permisos necesarios para páginas
      const tokenDebugRes = await fetch(`https://graph.facebook.com/debug_token?input_token=${pageAccessToken}&access_token=${appId}|${appSecret}`);
      const tokenDebug = await tokenDebugRes.json();
      const hasPagePerms = tokenDebug.data?.scopes?.includes('pages_messaging');
      
      if (hasPagePerms) {
        await sincronizarWebhooks(wsId, canalId);
      } else {
        console.log(`[INFO] Omitiendo sincronización de webhooks para ${pageName} (falta pages_messaging)`);
      }
      
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

  // --- DETECTION DE WHATSAPP BUSINESS (Búsqueda Profunda) ---
  try {
      console.log(`[DEBUG-WA] Iniciando búsqueda profunda de WABAs...`);
      
      // 1. Intentar obtener WABAs directas del usuario
      const wabaRes = await fetch(
        `https://graph.facebook.com/v19.0/me/whatsapp_business_accounts?access_token=${longLivedUserToken}`
      );
      const wabaData = await wabaRes.json();
      
      let allWabas = [...(wabaData.data || [])];
      console.log(`[DEBUG-WA] WABAs directas encontradas: ${allWabas.length}`);

      // 3. Intentar obtener WABAs a través de las PÁGINAS (Nuevo Fallback)
      if (pages.length > 0) {
        console.log(`[DEBUG-WA] Buscando WABAs en ${pages.length} páginas...`);
        for (const page of pages) {
          const pageWabaRes = await fetch(
            `https://graph.facebook.com/v19.0/${page.id}/whatsapp_business_accounts?access_token=${page.access_token}`
          );
          const pageWabaData = await pageWabaRes.json();
          if (pageWabaRes.ok && pageWabaData.data) {
            for (const pw of pageWabaData.data) {
              if (!allWabas.find(x => x.id === pw.id)) {
                console.log(`[DEBUG-WA] WABA encontrada a través de página ${page.name}: ${pw.id}`);
                allWabas.push(pw);
              }
            }
          }
        }
      }

      console.log(`[DEBUG-WA] Total de WABAs tras búsqueda exhaustiva: ${allWabas.length}`);

      if (allWabas.length > 0) {
        for (const waba of allWabas) {
          const wabaId = waba.id;
          console.log(`[DEBUG-WA] Revisando WABA: ${wabaId} (${waba.name || 'Sin nombre'})`);
          
          const phoneRes = await fetch(
            `https://graph.facebook.com/v19.0/${wabaId}/phone_numbers?access_token=${longLivedUserToken}`
          );
          const phoneData = await phoneRes.json();
          console.log(`[DEBUG-WA] Números en WABA ${wabaId}:`, phoneData.data?.length || 0);

          if (phoneRes.ok && phoneData.data) {
            for (const phone of phoneData.data) {
              const { id: phoneId, display_phone_number: phoneNumber, verified_name: verifiedName } = phone;
              console.log(`[DEBUG-WA] Procesando número: ${phoneNumber} (ID: ${phoneId})`);

              const waSnap = await workspaceRef
                .collection(COLLECTIONS.CANALES)
                .where('tipo', '==', 'whatsapp')
                .where('metaPhoneNumberId', '==', phoneId)
                .limit(1)
                .get();

              const waData = {
                tipo: 'whatsapp',
                nombre: verifiedName || `WhatsApp - ${phoneNumber}`,
                cuenta: phoneNumber,
                metaPhoneNumberId: phoneId,
                wabaId: wabaId,
                status: 'connected' as const,
                webhookVerified: false,
                actualizadoEl: Timestamp.now(),
              };

              let waCanalId: string;
              if (!waSnap.empty) {
                waCanalId = waSnap.docs[0].id;
                await workspaceRef.collection(COLLECTIONS.CANALES).doc(waCanalId).update(waData);
              } else {
                const waRef = await workspaceRef.collection(COLLECTIONS.CANALES).add({
                  ...waData,
                  creadoEl: Timestamp.now(),
                });
                waCanalId = waRef.id;
              }
              await guardarTokenCanal(wsId, waCanalId, longLivedUserToken);
            }
          }
        }
      } else {
        const debugToken = await fetch(`https://graph.facebook.com/debug_token?input_token=${longLivedUserToken}&access_token=${appId}|${appSecret}`);
        const debugData = await debugToken.json();
        console.warn(`[DEBUG-WA] No se encontraron WABAs. Debug del Token:`, JSON.stringify(debugData.data?.scopes || []));
      }
    } catch (waError) {
      console.error('Error detectando WhatsApp accounts:', waError);
    }
    console.log(`[EXITO-FINAL] Proceso de sincronización terminado para wsId: ${wsId}`);

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
