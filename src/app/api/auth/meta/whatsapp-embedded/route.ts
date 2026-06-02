import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/types/firestore';

export async function POST(req: NextRequest) {
  try {
    const { code, phoneNumberId, wabaId, wsId, pageUrl } = await req.json();

    if (!code || !wsId) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    // 1. Intercambiar code por short-lived token.
    // El SDK de Meta asocia el code a la URL donde se llamó FB.login(),
    // por lo que el intercambio debe incluir ese mismo redirect_uri.
    // Si no llega pageUrl (compat), reintentamos sin redirect_uri.
    const buildExchangeUrl = (redirect?: string) =>
      `https://graph.facebook.com/v19.0/oauth/access_token` +
      `?client_id=${appId}` +
      `&client_secret=${appSecret}` +
      `&code=${code}` +
      (redirect ? `&redirect_uri=${encodeURIComponent(redirect)}` : '');

    let shortRes = await fetch(buildExchangeUrl(pageUrl));
    let shortData = await shortRes.json();

    // Fallback: si falla con pageUrl, probar sin redirect_uri
    if (!shortRes.ok || shortData.error) {
      const firstError = shortData.error?.message || 'Error al obtener token de acceso';
      console.warn('[whatsapp-embedded] Reintentando sin redirect_uri. Error previo:', firstError);
      
      shortRes = await fetch(buildExchangeUrl());
      shortData = await shortRes.json();
      
      if (!shortRes.ok || shortData.error) {
        console.error('[whatsapp-embedded] Ambos intentos fallaron. Error segundo:', shortData?.error?.message);
        throw new Error(firstError);
      }
    }

    const shortToken = shortData.access_token;

    // 2. Intercambiar por long-lived token (60 días)
    const longRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`
    );
    const longData = await longRes.json();
    const accessToken = longData.access_token || shortToken;

    // 3. Obtener datos del número desde la WABA si no vinieron en el evento
    let finalPhoneNumberId = phoneNumberId;
    let finalWabaId = wabaId;
    let displayName = 'WhatsApp Business';
    let phoneNumber = '';

    if (!finalPhoneNumberId && finalWabaId) {
      const phoneRes = await fetch(
        `https://graph.facebook.com/v19.0/${finalWabaId}/phone_numbers?fields=id,display_phone_number,verified_name&access_token=${accessToken}`
      );
      if (phoneRes.ok) {
        const phoneData = await phoneRes.json();
        const first = phoneData.data?.[0];
        if (first) {
          finalPhoneNumberId = first.id;
          displayName = first.verified_name || displayName;
          phoneNumber = first.display_phone_number || '';
        }
      }
    }

    // Si tampoco tenemos WABA, buscar WABAs del usuario
    if (!finalPhoneNumberId) {
      const wabaRes = await fetch(
        `https://graph.facebook.com/v19.0/me/whatsapp_business_accounts?access_token=${accessToken}`
      );
      if (wabaRes.ok) {
        const wabaData = await wabaRes.json();
        const firstWaba = wabaData.data?.[0];
        if (firstWaba) {
          finalWabaId = firstWaba.id;
          const phoneRes2 = await fetch(
            `https://graph.facebook.com/v19.0/${finalWabaId}/phone_numbers?fields=id,display_phone_number,verified_name&access_token=${accessToken}`
          );
          if (phoneRes2.ok) {
            const phoneData2 = await phoneRes2.json();
            const first2 = phoneData2.data?.[0];
            if (first2) {
              finalPhoneNumberId = first2.id;
              displayName = first2.verified_name || displayName;
              phoneNumber = first2.display_phone_number || '';
            }
          }
        }
      }
    }

    if (!finalPhoneNumberId) {
      throw new Error('No se encontró ningún número de WhatsApp Business en tu cuenta. Verificá que tu número esté registrado en Meta Business.');
    }

    // 4. Verificar si el canal ya existe (evitar duplicados)
    const canalesRef = adminDb.collection(`${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CANALES}`);
    const existingSnap = await canalesRef
      .where('metaPhoneNumberId', '==', finalPhoneNumberId)
      .where('tipo', '==', 'whatsapp')
      .limit(1)
      .get();

    let canalId: string;

    if (!existingSnap.empty) {
      // Canal existente — actualizar token
      canalId = existingSnap.docs[0].id;
      await existingSnap.docs[0].ref.update({
        status: 'connected',
        nombre: displayName,
        metaWABAId: finalWabaId || '',
        actualizadoEl: Timestamp.now(),
      });
      console.log(`[whatsapp-embedded] Canal existente actualizado: ${canalId}`);
    } else {
      // Canal nuevo
      canalId = `wa_${finalPhoneNumberId}`;
      await canalesRef.doc(canalId).set({
        tipo: 'whatsapp',
        nombre: displayName,
        cuenta: phoneNumber || finalPhoneNumberId,
        metaPhoneNumberId: finalPhoneNumberId,
        metaWABAId: finalWabaId || '',
        status: 'connected',
        webhookVerified: false,
        aiEnabled: false,
        agenteId: null,
        creadoEl: Timestamp.now(),
        actualizadoEl: Timestamp.now(),
      });
      console.log(`[whatsapp-embedded] Canal nuevo creado: ${canalId}`);
    }

    // 5. Guardar token en subcolección privada
    await adminDb
      .doc(`${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CANALES}/${canalId}/secrets/config`)
      .set({ metaAccessToken: accessToken, actualizadoEl: Timestamp.now() });

    return NextResponse.json({ success: true, canalId });

  } catch (error: any) {
    console.error('[whatsapp-embedded] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
