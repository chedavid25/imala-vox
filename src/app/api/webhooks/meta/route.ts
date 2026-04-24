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
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

// POST — recibir eventos de Meta (mensajes + leads)
export async function POST(request: NextRequest) {
  console.log("[META-WEBHOOK-IN]", {
    timestamp: new Date().toISOString(),
    headers: Object.fromEntries(request.headers.entries()),
    url: request.url,
    method: request.method,
  });

  try {
    const rawBody = await request.text();
    if (!rawBody) {
      console.warn("⚠️ Webhook recibido con cuerpo vacío");
      return NextResponse.json({ status: 'empty' });
    }

    const body = JSON.parse(rawBody);
    console.log("🔔 Webhook Meta Recibido:", JSON.stringify(body, null, 2));

    // 1. Verificar firma HMAC (X-Hub-Signature-256)
    const signature = request.headers.get('x-hub-signature-256');
    const appSecret = process.env.META_APP_SECRET || '';
    
    if (signature && appSecret) {
      const expectedSignature = crypto
        .createHmac('sha256', appSecret)
        .update(rawBody)
        .digest('hex');

      if (signature !== `sha256=${expectedSignature}`) {
        console.warn('⚠️ Firma de webhook no coincide');
        
        // En producción, rechazamos con 403 si la firma no es válida
        if (process.env.NODE_ENV === 'production') {
          return new NextResponse('Invalid signature', { status: 403 });
        }
      }
    }

    // 2. Procesar el objeto (mensajes o leads) de forma síncrona para asegurar la persistencia en Serverless
    if (body.object === 'page' || body.object === 'instagram' || body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        const pageId = entry.id;

        // Soporte para WhatsApp Cloud API
        if (body.object === 'whatsapp_business_account') {
          for (const change of entry.changes || []) {
            if (change.field === 'messages') {
              console.log("🟢 Procesando mensaje de WhatsApp...");
              await procesarMensajeWhatsapp(change.value, pageId);
            }
          }
        }

        // Soporte para Mensajes (Messenger / Instagram)
        if (entry.messaging) {
          for (const messagingItem of entry.messaging) {
            console.log(`📩 Procesando mensaje de ${messagingItem.sender.id}`);
            await procesarMensajeMeta(messagingItem, pageId, body.object === 'instagram');
          }
        }

        // Soporte para Leads (Formularios)
        for (const change of entry.changes || []) {
          if (change.field === 'leadgen') {
            console.log(`🎯 Lead Detectado para pageId: ${pageId}. Lead ID: ${change.value.leadgen_id}`);
            await procesarLeadMeta(change.value, pageId);
          }
        }
      }
    }

    // SIEMPRE responder 200 OK inmediatamente para evitar retries de Meta
    return NextResponse.json({ status: 'ok' });
    
  } catch (error: any) {
    console.error("❌ Error crítico al recibir webhook:", error.message);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 200 }); // Retornamos 200 para que Meta no reintente
  }
}

/**
 * Procesa un nuevo lead entrante de Meta Ads.
 * Utiliza búsqueda multi-tenant para encontrar el token del cliente.
 */
async function procesarLeadMeta(leadData: any, pageId: string) {
  const leadId = leadData.leadgen_id;
  const formId = leadData.form_id;

  try {
    // 1. Buscar en Firestore qué workspace tiene esa página conectada
    console.log(`🔍 [LEAD ${leadId}] Buscando canal para pageId: ${pageId}`);
    let wsQuery;
    try {
      wsQuery = await adminDb
        .collectionGroup(COLLECTIONS.CANALES)
        .where('metaPageId', '==', pageId)
        .where('status', '==', 'connected')
        .limit(1)
        .get();
    } catch (indexErr: any) {
      // Error típico cuando falta el índice compuesto en Firestore
      console.error(
        `❌ [LEAD ${leadId}] Fallo en collectionGroup query — probablemente falta índice en Firestore.`,
        `Código: ${indexErr.code || 'sin código'}`,
        `Mensaje: ${indexErr.message}`
      );
      return;
    }

    if (wsQuery.empty) {
      console.warn(`⚠️ [LEAD ${leadId}] No se encontró ningún canal con metaPageId="${pageId}" y status="connected". Verificá que la página esté conectada en la app.`);
      return;
    }

    const canalDoc = wsQuery.docs[0];
    const canalId = canalDoc.id;
    const wsId = canalDoc.ref.parent.parent?.id;

    if (!wsId) {
      console.error(`❌ [LEAD ${leadId}] No se pudo resolver el workspaceId desde la ruta del canal.`);
      return;
    }

    console.log(`✅ [LEAD ${leadId}] Canal encontrado: ${canalId} en workspace: ${wsId}`);

    // 2. Obtener el token de acceso
    const configPath = `${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CANALES}/${canalId}/secrets/config`;
    console.log(`🔑 [LEAD ${leadId}] Obteniendo token de: ${configPath}`);
    const secretSnap = await adminDb.doc(configPath).get();

    if (!secretSnap.exists) {
      console.error(`❌ [LEAD ${leadId}] El documento secrets/config no existe en la ruta: ${configPath}`);
      return;
    }

    const clienteToken = secretSnap.data()?.metaAccessToken;
    if (!clienteToken) {
      console.error(`❌ [LEAD ${leadId}] El campo metaAccessToken está vacío en secrets/config del canal ${canalId}`);
      return;
    }

    // 3. Obtener datos del lead desde Meta
    console.log(`📡 [LEAD ${leadId}] Consultando Meta Graph API...`);
    const metaRes = await fetch(
      `https://graph.facebook.com/v19.0/${leadId}?fields=field_data,ad_name,campaign_name,form_id&access_token=${clienteToken}`
    );

    if (!metaRes.ok) {
      const errorBody = await metaRes.text();
      console.error(`❌ [LEAD ${leadId}] Meta Graph API respondió ${metaRes.status}. Respuesta:`, errorBody);
      return;
    }

    const metaLead = await metaRes.json();

    if (metaLead.error) {
      console.error(`❌ [LEAD ${leadId}] Error en respuesta de Meta:`, JSON.stringify(metaLead.error));
      return;
    }

    console.log(`📋 [LEAD ${leadId}] Datos recibidos de Meta:`, JSON.stringify(metaLead));

    const campaignName = metaLead.ad_name || metaLead.campaign_name || 'Campaña de Meta Ads';

    // 4. Mapear campos del formulario
    const campos: Record<string, string> = {};
    for (const field of metaLead.field_data || []) {
      campos[field.name] = field.values?.[0] || '';
    }

    // 5. Resolver Etapa del Embudo (dinámica para evitar IDs fantasmas)
    const etapasSnap = await adminDb
      .collection(COLLECTIONS.ESPACIOS)
      .doc(wsId)
      .collection(COLLECTIONS.ETAPAS_EMBUDO)
      .orderBy('orden', 'asc')
      .limit(1)
      .get();

    let defaultStageId: string;
    if (!etapasSnap.empty) {
      defaultStageId = etapasSnap.docs[0].id;
      console.log(`🏷️ [LEAD ${leadId}] Etapa inicial: "${etapasSnap.docs[0].data().nombre}" (${defaultStageId})`);
    } else {
      defaultStageId = 'sin_etapa';
      console.warn(`⚠️ [LEAD ${leadId}] No hay etapas de embudo en workspace ${wsId}. El lead se guardará con etapaId="sin_etapa". Creá al menos una etapa en la app.`);
    }

    // 6. Mapeo de nombre robusto (Meta usa varios nombres de campos)
    const first_name = campos.first_name || '';
    const last_name = campos.last_name || '';
    const full_name = campos.full_name || campos.nombre || campos.name || '';
    const nombreFinal = (first_name || last_name)
      ? `${first_name} ${last_name}`.trim()
      : (full_name || 'Nuevo Cliente Potencial');

    // 7. Guardar en Firestore del Workspace
    console.log(`💾 [LEAD ${leadId}] Guardando lead en Firestore para workspace ${wsId}...`);
    const docRef = await adminDb
      .collection(COLLECTIONS.ESPACIOS)
      .doc(wsId)
      .collection(COLLECTIONS.LEADS)
      .add({
        origen: 'meta_ads',
        etapaId: defaultStageId,
        temperatura: 'frio',
        nombre: nombreFinal,
        email: campos.email || campos.email_address || null,
        telefono: campos.phone_number || campos.telefono || campos.phone || null,
        camposFormulario: campos,
        metaLeadId: leadId,
        metaFormId: formId || metaLead.form_id || null,
        metaPageId: pageId,
        campana: campaignName,
        formulario: leadData.form_name || metaLead.form_name || 'Formulario sin nombre',
        notas: '',
        convertidoAContacto: false,
        contactoId: null,
        creadoEl: Timestamp.now(),
        actualizadoEl: Timestamp.now(),
      });

    console.log(`✅ [LEAD ${leadId}] Guardado exitosamente. Doc ID: ${docRef.id} en workspace ${wsId}`);
  } catch (err: any) {
    console.error(`❌ [LEAD ${leadId}] Error no controlado en procesarLeadMeta:`, err.message, err.stack);
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
    let canalType: 'whatsapp' | 'instagram' | 'facebook' = isInstagram ? 'instagram' : 'facebook';
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
      if (cDocSnap.exists) {
        const isBlocked = await isAIBlockedForContact(wsId, cDocSnap.data());
        if (isBlocked) {
           console.log(`Contacto ${senderId} bloqueado para IA (por contacto, etiqueta o categoría). Sin respuesta automática.`);
           return;
        }
      }
      
      const convDocSnap = await convRef.doc(convId).get();
      const convData = convDocSnap.data();
      
      // BLOQUEO CRÍTICO: Solo responder automáticamente si el modo es 'auto'
      if (convData?.modoIA !== 'auto') {
         console.log(`IA en modo ${convData?.modoIA || 'desconocido'}. No se enviará respuesta automática.`);
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
        // ACTIVAR INDICADOR DE ESCRITURA
        if (!isCopiloto) {
          // En Messenger/Instagram siempre enviamos 'typing_on'
          await enviarMensajeAccion(wsId, canalId, senderId, undefined, undefined, 'typing_on');
          // Pequeña espera para que el cliente note el "Escribiendo"
          await new Promise(resolve => setTimeout(resolve, 1500));
        }

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

/**
 * Procesa mensajes entrantes de WhatsApp Cloud API.
 */
async function procesarMensajeWhatsapp(value: any, wabaId: string) {
  try {
    const message = value.messages?.[0];
    const contact = value.contacts?.[0];
    
    if (!message || message.type !== 'text') return;

    const senderId = message.from;
    const text = message.text.body;
    const contactoNombreIncoming = contact?.profile?.name || senderId;

    // 1. Identificar Workspace y Canal
    const wsQuery = await adminDb
      .collectionGroup(COLLECTIONS.CANALES)
      .where('metaPhoneNumberId', '==', value.metadata.phone_number_id)
      .where('tipo', '==', 'whatsapp')
      .where('status', '==', 'connected')
      .limit(1)
      .get();

    if (wsQuery.empty) {
      console.warn(`❌ Mensaje de WA ${senderId} ignorado: Canal no encontrado para phone_number_id ${value.metadata.phone_number_id}`);
      return;
    }

    const canalDoc = wsQuery.docs[0];
    const canalId = canalDoc.id;
    const wsId = canalDoc.ref.parent.parent!.id;
    const canalData = canalDoc.data() as any;

    // 2. Obtener o crear contacto
    const contactosRef = adminDb.collection(`${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CONTACTOS}`);
    let contactoId = "";
    let contactoNombre = contactoNombreIncoming;

    const contactSnap = await contactosRef.where('telefono', '==', senderId).limit(1).get();

    if (contactSnap.empty) {
      const res = await contactosRef.add({
        nombre: contactoNombre,
        telefono: senderId,
        canalOrigen: 'whatsapp',
        aiBlocked: false,
        esContactoCRM: false,
        creadoEl: Timestamp.now()
      });
      contactoId = res.id;
    } else {
      const cDoc = contactSnap.docs[0];
      contactoId = cDoc.id;
      contactoNombre = cDoc.data().nombre || contactoNombre;
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
        contactoNombre,
        canal: 'whatsapp',
        canalId,
        agenteId: canalData.agenteId || null,
        ultimoMensaje: text,
        ultimaActividad: Timestamp.now(),
        unreadCount: 1,
        modoIA: 'auto',
        creadoEl: Timestamp.now()
      });
      convId = res.id;
      console.log(`🆕 Conversación WA creada: ${convId}`);
    } else {
      convId = convSnap.docs[0].id;
      console.log(`💬 Conversación WA existente: ${convId}`);
      await convRef.doc(convId).update({
        ultimoMensaje: text,
        contactoNombre,
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

    // 5. Trigger IA
    if (canalData.aiEnabled && canalData.agenteId) {
      const cDocSnap = await contactosRef.doc(contactoId).get();
      if (cDocSnap.exists) {
        const isBlocked = await isAIBlockedForContact(wsId, cDocSnap.data());
        if (isBlocked) {
          console.log(`Contacto WA ${senderId} bloqueado para IA. Sin respuesta automática.`);
          return;
        }
      }

      const convDocSnap = await convRef.doc(convId).get();
      const convData = convDocSnap.data();

      if (convData?.modoIA !== 'auto') {
        console.log(`IA en modo ${convData?.modoIA || 'desconocido'}. No se enviará respuesta automática.`);
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
      if (historial.length > 0) historial.pop();

      const { procesarMensajeConIA } = await import('@/lib/ai/engine');
      const { enviarMensajeAccion } = await import('@/app/actions/channels');

      try {
        await enviarMensajeAccion(wsId, canalId, senderId, message.id, undefined, 'mark_read');

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

          const FieldValue = require('firebase-admin').firestore.FieldValue;
          await adminDb.doc(`${COLLECTIONS.ESPACIOS}/${wsId}`).update({
            "uso.convCount": FieldValue.increment(1)
          });

          console.log(`✅ Respuesta IA completada para WhatsApp - sender: ${senderId}`);
        }
      } catch (e) {
        console.error("Error IA WA:", e);
      }
    }
  } catch (err) {
    console.error('Error procesando WA:', err);
  }
}

/**
 * Helper para verificar si la IA está bloqueada para un contacto 
 * por el contacto mismo, sus etiquetas o sus categorías.
 */
async function isAIBlockedForContact(wsId: string, contactoData: any) {
  // 1. Bloqueo manual directo
  if (contactoData.aiBlocked) return true;

  const tagIds = contactoData.etiquetas || [];
  if (tagIds.length === 0) return false;

  try {
    // 2. Obtener etiquetas del contacto
    const tagsRef = adminDb.collection(COLLECTIONS.ESPACIOS).doc(wsId).collection(COLLECTIONS.ETIQUETAS_CRM);
    const tagsSnap = await tagsRef.get();
    const allTags = tagsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
    
    const contactTags = allTags.filter(t => tagIds.includes(t.id));
    
    // Si alguna etiqueta bloquea la IA
    if (contactTags.some(t => t.aiBlocked)) {
      console.log(`[CASCADE-BLOCK] Bloqueado por etiqueta: ${contactTags.find(t => t.aiBlocked)?.nombre}`);
      return true;
    }

    // 3. Obtener categorías de esas etiquetas
    const categoryIds = Array.from(new Set(contactTags.map(t => t.categoriaId)));
    if (categoryIds.length === 0) return false;

    const catsRef = adminDb.collection(COLLECTIONS.ESPACIOS).doc(wsId).collection(COLLECTIONS.CATEGORIAS_CRM);
    const catsSnap = await catsRef.get();
    const allCats = catsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

    const contactCats = allCats.filter(c => categoryIds.includes(c.id));

    // Si alguna categoría bloquea la IA
    if (contactCats.some(c => c.aiBlocked)) {
      console.log(`[CASCADE-BLOCK] Bloqueado por categoría: ${contactCats.find(c => c.aiBlocked)?.nombre}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error verificando bloqueo en cascada:", error);
    return false; // Ante la duda, permitimos (o podrías bloquear por seguridad)
  }
}
