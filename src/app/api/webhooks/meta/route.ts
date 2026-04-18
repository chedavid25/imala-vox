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

  console.log("🔔 Webhook Meta Recibido:", JSON.stringify(body, null, 2));

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
  if (body.object === 'page' || body.object === 'instagram') {
    for (const entry of body.entry || []) {
      const pageId = entry.id;

      // Soporte para Mensajes (Messenger / Instagram)
      if (entry.messaging) {
        for (const messagingItem of entry.messaging) {
          await procesarMensajeMeta(messagingItem, pageId, body.object === 'instagram');
        }
      }

      // Soporte para Leads (Formularios)
      for (const change of entry.changes || []) {
        if (change.field === 'leadgen') {
          await procesarLeadMeta(change.value, pageId);
        }
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

/**
 * Obtiene el perfil público del usuario desde la Graph API de Meta
 */
async function fetchMetaProfile(senderId: string, accessToken: string, isInstagram: boolean) {
  try {
    const fields = isInstagram ? 'username,profile_pic' : 'first_name,last_name,profile_pic';
    const res = await fetch(`https://graph.facebook.com/v19.0/${senderId}?fields=${fields}&access_token=${accessToken}`);
    
    if (!res.ok) {
      console.warn("No se pudo obtener el perfil de Meta. Usando fallback.");
      return null;
    }
    
    const data = await res.json();
    return {
      nombre: isInstagram ? data.username : `${data.first_name || ''} ${data.last_name || ''}`.trim(),
      foto: data.profile_pic || null
    };
  } catch (error) {
    console.error("Error en fetchMetaProfile:", error);
    return null;
  }
}

/**
 * Procesa mensajes entrantes de Messenger o Instagram Direct.
 */
async function procesarMensajeMeta(messagingItem: any, pageId: string, isInstagram: boolean) {
  try {
    const senderId = messagingItem.sender.id;
    const text = messagingItem.message?.text;

    if (!text) return; // Ignorar si no es texto por ahora

    // Bloquear los "echoes" (mensajes que el propio sistema/bot acaba de enviar)
    if (messagingItem.message?.is_echo) {
      return;
    }

    // 1. Identificar Workspace y Canal
    const canalType = isInstagram ? 'instagram' : 'facebook';
    const wsQuery = await adminDb
      .collectionGroup(COLLECTIONS.CANALES)
      .where(isInstagram ? 'metaInstagramId' : 'metaPageId', '==', pageId)
      .where('tipo', '==', canalType)
      .where('status', '==', 'connected')
      .limit(1)
      .get();

    if (wsQuery.empty) {
      console.warn(`❌ Mensaje de ${senderId} ignorado: Canal ${canalType} para pageId ${pageId} no encontrado en Firestore.`);
      return;
    }

    const canalDoc = wsQuery.docs[0];
    const canalData = canalDoc.data() as any;
    const wsId = canalDoc.ref.parent.parent!.id;
    const canalId = canalDoc.id;

    // 1.5 Obtener Token de Acceso para consultar perfil
    const secretSnap = await adminDb
      .doc(`${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CANALES}/${canalId}/secrets/config`)
      .get();
    const metaAccessToken = secretSnap.data()?.metaAccessToken;

    // 2. Obtener o crear contacto
    const contactosRef = adminDb.collection(`${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CONTACTOS}`);
    let contactoId = "";
    let contactoNombre = `Usuario ${canalType}`;
    let avatarUrl = null;

    const contactSnap = await contactosRef.where('metaId', '==', senderId).limit(1).get();

    if (contactSnap.empty) {
      // Intentar obtener perfil real de Meta
      if (metaAccessToken) {
        const profile = await fetchMetaProfile(senderId, metaAccessToken, isInstagram);
        if (profile) {
          contactoNombre = profile.nombre || contactoNombre;
          avatarUrl = profile.foto || null;
        }
      }

      const res = await contactosRef.add({
        nombre: contactoNombre,
        avatarUrl,
        metaId: senderId,
        canalOrigen: canalType,
        aiBlocked: false,
        esContactoCRM: false, // Inician como prospectos de chat, no en el CRM real
        creadoEl: Timestamp.now()
      });
      contactoId = res.id;
    } else {
      const cDoc = contactSnap.docs[0];
      contactoId = cDoc.id;
      const cData = cDoc.data();
      
      // Si el nombre sigue siendo el genérico, intentamos actualizarlo
      if (cData.nombre?.startsWith('Usuario ') && metaAccessToken) {
        const profile = await fetchMetaProfile(senderId, metaAccessToken, isInstagram);
        if (profile) {
          contactoNombre = profile.nombre || contactoNombre;
          avatarUrl = profile.foto || null;
          await cDoc.ref.update({ nombre: contactoNombre, avatarUrl });
        } else {
          contactoNombre = cData.nombre;
        }
      } else {
        contactoNombre = cData.nombre;
      }
    }

    // 3. Obtener o crear conversación
    const convRef = adminDb.collection(`${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CONVERSACIONES}`);
    let convId = "";
    const convSnap = await convRef
      .where('contactoId', '==', contactoId)
      .where('canalId', '==', canalId)
      .limit(1)
      .get();

    if (convSnap.empty) {
      const res = await convRef.add({
        contactoId,
        contactoNombre, // Denormalización para el Inbox
        canal: canalType, // Denormalización para el Inbox
        canalId,
        agenteId: canalData.agenteId || null,
        ultimoMensaje: text,
        ultimaActividad: Timestamp.now(),
        unreadCount: 1,
        modoIA: 'auto',
        creadoEl: Timestamp.now()
      });
      convId = res.id;
      console.log(`🆕 Conversación creada: ${convId}`);
    } else {
      convId = convSnap.docs[0].id;
      console.log(`💬 Conversación existente: ${convId}`);
      await convRef.doc(convId).update({
        ultimoMensaje: text,
        contactoNombre,
        canal: canalType,
        ultimaActividad: Timestamp.now(),
        unreadCount: (convSnap.docs[0].data().unreadCount || 0) + 1
      });
    }

    // 4. Guardar mensaje
    await convRef.doc(convId).collection(COLLECTIONS.MENSAJES).add({
      text,
      from: 'user',
      creadoEl: Timestamp.now(),
      visto: false
    });

    // 5. Trigger IA si está habilitado
    if (canalData.aiEnabled && canalData.agenteId) {
      console.log(`IA activada para ${canalType}. Agente: ${canalData.agenteId}`);
      
      const cDocSnap = await contactosRef.doc(contactoId).get();
      if (cDocSnap.exists && cDocSnap.data()?.aiBlocked) {
         console.log(`Contacto ${senderId} bloqueado para IA. Sin respuesta automática.`);
         return;
      }
      
      const convDocSnap = await convRef.doc(convId).get();
      const convData = convDocSnap.data();
      if (convData?.modoIA === 'pausado') {
         console.log(`Conversación ${convId} pausada, sin respuesta IA.`);
         return;
      }
      
      let modoAgenteDefault = 'auto';
      const agenteDoc = await adminDb.doc(`${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.AGENTES}/${canalData.agenteId}`).get();
      if (agenteDoc.exists) {
         modoAgenteDefault = agenteDoc.data()?.modoDefault || 'auto';
      }
      
      const isCopiloto = convData?.modoIA === 'copiloto' || modoAgenteDefault === 'copiloto';

      const historialSnap = await convRef.doc(convId)
          .collection(COLLECTIONS.MENSAJES)
          .orderBy('creadoEl', 'desc')
          .limit(30)
          .get();
          
      const historial = historialSnap.docs.reverse().map(d => ({
         from: d.data().from,
         text: d.data().text
      }));
      // Remover último msg (es el actual) para no duplicarlo en el context
      if (historial.length > 0) historial.pop(); 
      
      const { procesarMensajeConIA } = await import('@/lib/ai/engine');
      const { enviarMensajeAccion } = await import('@/app/actions/channels');

      try {
        const respuestaIA = await procesarMensajeConIA({
           wsId,
           agenteId: canalData.agenteId,
           conversacionId: convId,
           textoUsuario: text,
           historial,
           isCopiloto,
           contactoNombre
        });

        if (!isCopiloto && respuestaIA) {
           await enviarMensajeAccion(wsId, canalId, senderId, respuestaIA);
           
           // Incrementar mensajes IA en el workspace
           const FieldValue = require('firebase-admin').firestore.FieldValue;
           await adminDb.doc(`${COLLECTIONS.ESPACIOS}/${wsId}`).update({
             "uso.convCount": FieldValue.increment(1)
           });
           
           console.log(`✅ Respuesta IA completada para Meta (${canalType}) - sender: ${senderId}`);
        }
      } catch (error) {
         console.error('Error durante procesamiento de IA en webhook:', error);
      }
    }

  } catch (err) {
    console.error('Error procesando mensaje de Meta:', err);
  }
}
