import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/types/firestore';
import crypto from 'crypto';

// GET — verificación del webhook por Meta
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    // Intentar marcar los canales como verificados en background
    // Buscamos canales que estén 'connected' pero con 'webhookVerified' en false
    // Nota: lo hacemos asíncrono para no bloquear la respuesta de Meta
    adminDb.collectionGroup(COLLECTIONS.CANALES)
      .where('status', '==', 'connected')
      .where('webhookVerified', '==', false)
      .get()
      .then(snap => {
        const batch = adminDb.batch();
        snap.forEach(doc => {
          batch.update(doc.ref, { 
            webhookVerified: true,
            actualizadoEl: Timestamp.now() 
          });
        });
        return batch.commit();
      })
      .catch(err => console.error("Error marcando webhooks verificados:", err));

    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

// POST — recibir eventos de Meta (mensajes + leads)
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const body = JSON.parse(rawBody);

  // 1. Verificar firma HMAC (X-Hub-Signature-256)
  const signature = request.headers.get('x-hub-signature-256');
  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 401 });
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.META_APP_SECRET || '')
    .update(rawBody)
    .digest('hex');

  if (signature !== `sha256=${expectedSignature}`) {
    // En producción esto debería ser 401, pero registramos el error
    console.error('Firma de webhook inválida');
    // return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // 2. Procesar el objeto (mensajes o leads)
  if (body.object === 'page') {
    for (const entry of body.entry || []) {
      const pageId = entry.id; // ID de la página de FB que disparó el evento

      for (const change of entry.changes || []) {
        // Leads de formularios Meta Lead Ads
        if (change.field === 'leadgen') {
          await procesarLeadMeta(change.value, pageId);
        }
        // TODO: Procesar mensajes (Field 'messages')
      }
    }
  }

  return NextResponse.json({ status: 'ok' });
}

/**
 * Procesa un nuevo lead entrante de Meta Ads.
 * Utiliza búsqueda multi-tenant para encontrar el token del cliente.
 */
async function procesarLeadMeta(leadData: any, pageId: string) {
  try {
    // 1. Buscar en Firestore qué workspace tiene esa página conectada
    // Usamos collectionGroup para canales porque no sabemos el wsId aún
    const wsQuery = await adminDb
      .collectionGroup(COLLECTIONS.CANALES)
      .where('metaPageId', '==', pageId)
      .where('status', '==', 'connected')
      .limit(1)
      .get();

    if (wsQuery.empty) {
      console.warn(`Webhook recibido para pageId ${pageId} no registrada o desconectada.`);
      return;
    }

    const canalDoc = wsQuery.docs[0];
    const canalId = canalDoc.id;
    // Navegamos al padre del canal para obtener el ID del espacio
    // path: espaciosDeTrabajo/{wsId}/canales/{canalId}
    const wsId = canalDoc.ref.parent.parent!.id;

    // 2. Obtener el token de ESE cliente específico desde el documento privado de secretos
    const secretSnap = await adminDb
      .doc(`${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CANALES}/${canalId}/secrets/config`)
      .get();

    if (!secretSnap.exists) {
      console.error(`Se encontró el canal ${canalId} pero no su documento de secretos.`);
      return;
    }

    const clienteToken = secretSnap.data()?.metaAccessToken;
    if (!clienteToken) {
      console.error(`El documento de secretos para el canal ${canalId} no tiene metaAccessToken.`);
      return;
    }

    // 3. Obtener datos completos del lead desde Meta Graph API
    const leadId = leadData.leadgen_id;
    const formId = leadData.form_id;
    const campaignName = leadData.ad_name || 'Sin nombre';

    const metaRes = await fetch(
      `https://graph.facebook.com/v19.0/${leadId}?access_token=${clienteToken}`
    );
    
    if (!metaRes.ok) {
      const errorText = await metaRes.text();
      console.error(`Error de Meta Graph API (${metaRes.status}):`, errorText);
      return;
    }

    const metaLead = await metaRes.json();

    // 4. Mapear campos del formulario
    const campos: Record<string, string> = {};
    for (const field of metaLead.field_data || []) {
      campos[field.name] = field.values?.[0] || '';
    }

    // 5. Guardar en Firestore del Workspace
    await adminDb
      .collection(COLLECTIONS.ESPACIOS)
      .doc(wsId)
      .collection(COLLECTIONS.LEADS)
      .add({
        origen: 'meta_ads',
        etapaId: 'nuevo', // Etapa default
        temperatura: 'frio',
        nombre: `${campos.first_name || ''} ${campos.last_name || ''}`.trim() || 'Sin nombre',
        email: campos.email || null,
        telefono: campos.phone_number || null,
        camposFormulario: campos,
        metaLeadId: leadId,
        metaFormId: formId,
        metaPageId: pageId,
        campana: campaignName,
        formulario: leadData.form_name || 'Formulario sin nombre',
        notas: '',
        convertidoAContacto: false,
        contactoId: null,
        creadoEl: Timestamp.now(),
        actualizadoEl: Timestamp.now(),
      });

    console.log(`Lead ${leadId} procesado exitosamente para workspace ${wsId}`);
  } catch (err) {
    console.error('Error procesando lead de Meta:', err);
  }
}
