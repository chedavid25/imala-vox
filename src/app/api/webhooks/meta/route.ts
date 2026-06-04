import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/types/firestore';
import { PLAN_LIMITS } from '@/lib/planLimits';
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
    const isInstagramEvent = !!request.headers.get('instagram-api-version');
    const appSecret = (isInstagramEvent
      ? process.env.META_INSTAGRAM_APP_SECRET
      : process.env.META_APP_SECRET) || '';

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
            if (change.field === 'smb_message_echoes') {
              console.log("🔁 Procesando eco de mensaje saliente de WhatsApp (celular)...");
              await procesarEcoMensajeWhatsapp(change.value, pageId);
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

        // Soporte para Leads (Formularios) y Comentarios de Instagram
        for (const change of entry.changes || []) {
          if (change.field === 'leadgen') {
            console.log(`🎯 Lead Detectado para pageId: ${pageId}. Lead ID: ${change.value.leadgen_id}`);
            await procesarLeadMeta(change.value, pageId);
          }
          if (change.field === 'comments') {
            console.log(`💬 Comentario Instagram detectado en pageId: ${pageId}`);
            await procesarComentarioInstagram(change.value, pageId);
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
 * Obtiene los datos del workspace y resetea uso.convCount si el período mensual ya venció.
 * Usa el campo usoReiniciaEl que ya existe en el schema de Workspace.
 */
async function obtenerWsDataConReset(wsId: string): Promise<any> {
  const { Timestamp } = require('firebase-admin/firestore');
  const { FieldValue } = require('firebase-admin').firestore;

  const wsRef = adminDb.doc(`${COLLECTIONS.ESPACIOS}/${wsId}`);
  const wsSnap = await wsRef.get();
  const wsData = wsSnap.data();

  if (!wsData) return wsData;

  const usoReiniciaEl: number = wsData.usoReiniciaEl?.toMillis?.() || 0;

  if (Date.now() >= usoReiniciaEl) {
    const proximoReinicio = new Date();
    proximoReinicio.setMonth(proximoReinicio.getMonth() + 1);

    await wsRef.update({
      'uso.convCount': 0,
      usoReiniciaEl: Timestamp.fromDate(proximoReinicio),
    });

    console.log(`[RESET_MENSUAL] Workspace ${wsId}: convCount → 0. Próximo reinicio: ${proximoReinicio.toISOString()}`);
    return { ...wsData, uso: { ...wsData.uso, convCount: 0 } };
  }

  return wsData;
}

/**
 * Verifica si ya se contabilizó una sesión de IA para este contacto en las últimas 24hs.
 * Una "sesión" = todos los mensajes de un mismo contacto en un día.
 * Retorna true  → sesión nueva, hay que incrementar el contador.
 * Retorna false → sesión activa, NO incrementar.
 */
async function debeContarSesion(wsId: string, contactoId: string): Promise<boolean> {
  const { Timestamp } = require('firebase-admin/firestore');

  const sesionRef = adminDb
    .collection(COLLECTIONS.ESPACIOS).doc(wsId)
    .collection('sesionesIA').doc(contactoId);

  const snap = await sesionRef.get();
  const ahora = Date.now();
  const VENTANA_MS = 24 * 60 * 60 * 1000; // 24 horas

  if (snap.exists) {
    const ultimaSesion = snap.data()?.ultimaSesionEl?.toMillis?.() || 0;
    if (ahora - ultimaSesion < VENTANA_MS) {
      // Sesión activa — actualizar timestamp pero NO contar
      await sesionRef.update({ ultimaSesionEl: Timestamp.now() });
      return false;
    }
  }

  // Sesión nueva — registrar y contar
  await sesionRef.set({
    contactoId,
    ultimaSesionEl: Timestamp.now(),
    creadoEl: Timestamp.now(),
  });
  return true;
}

/**
 * Procesa un nuevo lead entrante de Meta Ads.
 * Replica el lead a TODOS los workspaces que tengan esa página conectada
 * (soporte para agencias que comparten la misma página en múltiples workspaces).
 */
async function procesarLeadMeta(leadData: any, pageId: string) {
  const leadId = leadData.leadgen_id;
  const formId = leadData.form_id;

  try {
    console.log(`🔍 [LEAD ${leadId}] Buscando canales facebook para pageId: ${pageId}`);
    let wsQuery;
    try {
      wsQuery = await adminDb
        .collectionGroup(COLLECTIONS.CANALES)
        .where('metaPageId', '==', pageId)
        .where('tipo', '==', 'facebook')
        .where('status', '==', 'connected')
        .get();
    } catch (indexErr: any) {
      console.error(
        `❌ [LEAD ${leadId}] Fallo en collectionGroup query — probablemente falta índice en Firestore.`,
        `Código: ${indexErr.code || 'sin código'}`,
        `Mensaje: ${indexErr.message}`
      );
      return;
    }

    const canalesValidos = wsQuery.docs;

    if (canalesValidos.length === 0) {
      console.warn(`⚠️ [LEAD ${leadId}] No se encontró ningún canal facebook con metaPageId="${pageId}" y status="connected".`);
      return;
    }

    console.log(`✅ [LEAD ${leadId}] ${canalesValidos.length} canal(es) facebook encontrado(s) — replicando lead a cada workspace`);

    // Obtener datos del lead desde Meta UNA SOLA VEZ usando el primer token disponible
    let metaLead: any = null;
    let formName: string = formId ? `Formulario (ID: ${formId})` : 'Formulario sin nombre';
    let campaignName: string = 'Campaña de Meta Ads';

    for (const canalDoc of canalesValidos) {
      const canalId = canalDoc.id;
      const wsId = canalDoc.ref.parent.parent?.id;
      if (!wsId) {
        console.error(`❌ [LEAD ${leadId}] No se pudo resolver wsId del canal ${canalId}`);
        continue;
      }

      try {
        // Obtener token del canal
        const configPath = `${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CANALES}/${canalId}/secrets/config`;
        const secretSnap = await adminDb.doc(configPath).get();
        const clienteToken = secretSnap.data()?.metaAccessToken;

        if (!clienteToken) {
          console.error(`❌ [LEAD ${leadId}] Sin token en canal ${canalId} (ws ${wsId}). Saltando.`);
          continue;
        }

        // Fetch del lead solo si aún no lo tenemos (reutilizamos entre workspaces)
        if (!metaLead) {
          const metaRes = await fetch(
            `https://graph.facebook.com/v19.0/${leadId}?fields=field_data,ad_id,ad_name,campaign_name,form_id&access_token=${clienteToken}`
          );
          if (!metaRes.ok) {
            const errorBody = await metaRes.text();
            console.error(`❌ [LEAD ${leadId}] Meta Graph respondió ${metaRes.status} con token de ws ${wsId}:`, errorBody);
            continue;
          }
          metaLead = await metaRes.json();
          if (metaLead.error) {
            console.error(`❌ [LEAD ${leadId}] Error Meta:`, JSON.stringify(metaLead.error));
            metaLead = null;
            continue;
          }
          console.log(`📋 [LEAD ${leadId}] Datos recibidos de Meta`);

          // Enriquecer nombres (también solo una vez)
          campaignName = metaLead.ad_name || metaLead.campaign_name || campaignName;
          const fId = formId || metaLead.form_id;
          if (fId) {
            try {
              const formRes = await fetch(`https://graph.facebook.com/v19.0/${fId}?fields=name&access_token=${clienteToken}`);
              if (formRes.ok) {
                const formData = await formRes.json();
                formName = formData.name || formName;
              }
            } catch {}
          }
          if (campaignName === 'Campaña de Meta Ads' && metaLead.ad_id) {
            try {
              const adRes = await fetch(`https://graph.facebook.com/v19.0/${metaLead.ad_id}?fields=campaign{name}&access_token=${clienteToken}`);
              if (adRes.ok) {
                const adData = await adRes.json();
                campaignName = adData.campaign?.name || campaignName;
              }
            } catch {}
          }
        }

        // Mapear campos del formulario
        const campos: Record<string, string> = {};
        for (const field of metaLead.field_data || []) {
          const cleanName = field.name.replace(/_/g, ' ').toUpperCase();
          campos[cleanName] = field.values?.[0] || '';
        }

        // Resolver etapa inicial del embudo en este workspace
        const etapasSnap = await adminDb
          .collection(COLLECTIONS.ESPACIOS).doc(wsId)
          .collection(COLLECTIONS.ETAPAS_EMBUDO)
          .orderBy('orden', 'asc')
          .limit(1)
          .get();
        const defaultStageId = etapasSnap.empty ? 'sin_etapa' : etapasSnap.docs[0].id;

        // Mapeo robusto de nombre
        const first_name = campos['FIRST NAME'] || campos['FIRST_NAME'] || '';
        const last_name = campos['LAST NAME'] || campos['LAST_NAME'] || '';
        const full_name = campos['FULL NAME'] || campos['FULL_NAME'] || campos['NOMBRE'] || campos['NAME'] || '';
        const nombreFinal = (first_name || last_name)
          ? `${first_name} ${last_name}`.trim()
          : (full_name || 'Nuevo Cliente Potencial');

        // Deduplicación: usar el metaLeadId como doc ID — si llega 2 veces, sobrescribe (idempotente)
        const docRef = adminDb
          .collection(COLLECTIONS.ESPACIOS).doc(wsId)
          .collection(COLLECTIONS.LEADS)
          .doc(`meta_${leadId}`);
        const existing = await docRef.get();

        if (existing.exists) {
          console.log(`⚠️ [LEAD ${leadId}] Ya existe en ws ${wsId} — actualizando timestamp solamente`);
          await docRef.update({ actualizadoEl: Timestamp.now() });
        } else {
          await docRef.set({
            origen: 'meta_ads',
            etapaId: defaultStageId,
            temperatura: 'frio',
            nombre: nombreFinal,
            email: campos['EMAIL'] || campos['EMAIL ADDRESS'] || campos['CORREO'] || campos['CORREO ELECTRONICO'] || campos['MAIL'] || null,
            telefono: campos['PHONE NUMBER'] || campos['FULL PHONE NUMBER'] || campos['TELEFONO'] || campos['PHONE'] || campos['TEL'] || campos['CELULAR'] || campos['MOVIL'] || campos['NUMERO DE TELEFONO'] || campos['NUMERO DE CELULAR'] || null,
            camposFormulario: campos,
            metaLeadId: leadId,
            metaFormId: formId || metaLead.form_id || null,
            metaPageId: pageId,
            campana: campaignName,
            formulario: formName,
            notas: '',
            convertidoAContacto: false,
            contactoId: null,
            creadoEl: Timestamp.now(),
            actualizadoEl: Timestamp.now(),
          });
          console.log(`✅ [LEAD ${leadId}] Guardado en ws ${wsId}`);
        }

        // Marcar canal con lastLeadAt (para health check)
        await canalDoc.ref.update({ lastLeadAt: Timestamp.now() });
      } catch (innerErr: any) {
        console.error(`❌ [LEAD ${leadId}] Error procesando ws ${wsId}:`, innerErr.message);
      }
    }
  } catch (err: any) {
    console.error(`❌ [LEAD ${leadId}] Error no controlado en procesarLeadMeta:`, err.message, err.stack);
  }
}

/**
 * Cuando una misma página/cuenta está conectada en múltiples workspaces (caso de
 * agencias o reconexiones), el canal "ganador" para procesar mensajes/comentarios
 * es el que tenga el actualizadoEl más reciente. Esto evita respuestas IA duplicadas
 * y respeta la última conexión activa del cliente.
 */
function pickMostRecentCanal(docs: FirebaseFirestore.QueryDocumentSnapshot[]) {
  return docs.sort((a, b) => {
    const aT = a.data().actualizadoEl?.toMillis?.() || 0;
    const bT = b.data().actualizadoEl?.toMillis?.() || 0;
    return bT - aT;
  })[0];
}

/**
 * Obtiene el perfil público del usuario desde la Graph API de Meta
 */
async function fetchMetaProfile(senderId: string, accessToken: string, isInstagram: boolean) {
  try {
    const fields = isInstagram ? 'name,username,profile_pic' : 'first_name,last_name,profile_pic';
    const res = await fetch(`https://graph.facebook.com/v19.0/${senderId}?fields=${fields}&access_token=${accessToken}`);
    
    const data = await res.json();
    
    if (!res.ok) {
      console.warn("⚠️ Error en fetchMetaProfile:", {
        status: res.status,
        data,
        isInstagram,
        senderId
      });
      return null;
    }
    
    console.log(`📸 Perfil Meta obtenido (${isInstagram ? 'IG' : 'FB'}):`, JSON.stringify(data));
    
    return {
      nombre: isInstagram ? (data.name || data.username) : `${data.first_name || ''} ${data.last_name || ''}`.trim(),
      foto: data.profile_pic || null
    };
  } catch (error) {
    console.error("❌ Error en fetchMetaProfile:", error);
    return null;
  }
}

/**
 * Procesa mensajes entrantes de Messenger o Instagram Direct.
 */
async function procesarMensajeMeta(messagingItem: any, pageId: string, isInstagram: boolean) {
  try {
    const senderId = messagingItem.sender.id;
    const text = messagingItem.message?.text as string | undefined;
    const attachments = messagingItem.message?.attachments as Array<{ type: string; payload?: { url?: string } }> | undefined;

    // Bloquear los "echoes" (mensajes que el propio sistema/bot acaba de enviar)
    if (messagingItem.message?.is_echo) return;

    if (!text && (!attachments || attachments.length === 0)) return;

    // 1. Identificar Workspace y Canal
    let canalType: 'whatsapp' | 'instagram' | 'facebook' = isInstagram ? 'instagram' : 'facebook';

    // Búsqueda multi-workspace: si una página está conectada en varios espacios,
    // procesamos en el de actualizadoEl más reciente (última conexión activa).
    let wsQuery = await adminDb
      .collectionGroup(COLLECTIONS.CANALES)
      .where(isInstagram ? 'metaInstagramId' : 'metaPageId', '==', pageId)
      .where('tipo', '==', canalType)
      .where('status', '==', 'connected')
      .get();

    // Fallback para Instagram: A veces los mensajes de IG llegan con el Page ID en lugar del IG ID
    if (wsQuery.empty && isInstagram) {
      wsQuery = await adminDb
        .collectionGroup(COLLECTIONS.CANALES)
        .where('metaPageId', '==', pageId)
        .where('tipo', '==', 'instagram')
        .where('status', '==', 'connected')
        .get();
    }

    if (wsQuery.empty) {
      console.warn(`❌ Mensaje de ${senderId} ignorado: Canal ${canalType} para pageId ${pageId} no encontrado en Firestore.`);
      return;
    }

    if (wsQuery.docs.length > 1) {
      console.log(`ℹ️ ${wsQuery.docs.length} canales encontrados para ${canalType}/${pageId} — usando el más reciente.`);
    }
    const canalDoc = pickMostRecentCanal(wsQuery.docs);
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

      contactoId = `meta_${senderId}`;
      await contactosRef.doc(contactoId).set({
        nombre: contactoNombre,
        avatarUrl,
        metaId: senderId,
        canalOrigen: canalType,
        aiBlocked: false,
        esContactoCRM: false, // Inician como prospectos de chat, no en el CRM real
        creadoEl: Timestamp.now()
      }, { merge: true });
    } else {
      const cDoc = contactSnap.docs[0];
      contactoId = cDoc.id;
      const cData = cDoc.data();
      
      // Si el nombre sigue siendo el genérico O falta el avatar, intentamos actualizarlo
      if ((!cData.avatarUrl || cData.nombre?.startsWith('Usuario ')) && metaAccessToken) {
        const profile = await fetchMetaProfile(senderId, metaAccessToken, isInstagram);
        if (profile) {
          contactoNombre = profile.nombre || cData.nombre || contactoNombre;
          avatarUrl = profile.foto || cData.avatarUrl || null;
          await cDoc.ref.update({ 
            nombre: contactoNombre, 
            avatarUrl,
            actualizadoEl: Timestamp.now() 
          });
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

    // Buscar por contactoId primero, luego filtrar por canalId en memoria
    // para evitar dependencia de índice compuesto y tolerar cambios de canalId
    const convSnap = await convRef
      .where('contactoId', '==', contactoId)
      .limit(10)
      .get();

    const convExistente = convSnap.docs.find(d => d.data().canalId === canalId)
      || convSnap.docs[0]; // fallback: misma persona en cualquier canal

    // Preview de texto para la conversación (antes de procesar adjuntos)
    const att0 = attachments?.[0];
    const textoPreviewMeta = text || `📎 ${att0?.type === 'image' ? 'Imagen' : att0?.type === 'video' ? 'Video' : att0?.type === 'audio' ? 'Audio' : 'Archivo'}`;

    if (!convExistente) {
      convId = `conv_${contactoId}_${canalId}`;
      await convRef.doc(convId).set({
        contactoId,
        contactoNombre,
        canal: canalType,
        canalId,
        agenteId: canalData.agenteId || null,
        ultimoMensaje: textoPreviewMeta,
        ultimaActividad: Timestamp.now(),
        unreadCount: 1,
        modoIA: 'auto',
        creadoEl: Timestamp.now()
      }, { merge: true });
      console.log(`🆕 Conversación creada: ${convId}`);
    } else {
      convId = convExistente.id;
      console.log(`💬 Conversación existente: ${convId}`);
      await convRef.doc(convId).update({
        ultimoMensaje: textoPreviewMeta,
        contactoNombre,
        canal: canalType,
        ultimaActividad: Timestamp.now(),
        unreadCount: (convExistente.data().unreadCount || 0) + 1
      });
    }

    // 4. Procesar adjunto si no hay texto
    let textoMensajeMeta = text || '';
    let metaMsgMetadata: { mediaUrl: string; mediaType: string; fileName: string } | undefined;

    if (!text && att0?.payload?.url) {
      try {
        const attType = att0.type === 'image' ? 'image' : att0.type === 'video' ? 'video' : att0.type === 'audio' ? 'audio' : 'document';
        const dlRes = await fetch(att0.payload.url);
        if (dlRes.ok) {
          const buffer = Buffer.from(await dlRes.arrayBuffer());
          const rawMime = (dlRes.headers.get('content-type') || 'application/octet-stream').split(';')[0].trim();
          const ext = EXT_MAP[rawMime] || 'bin';
          const fileName = `meta_${Date.now()}.${ext}`;
          const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
          if (!bucketName) {
            console.error('[META-MEDIA] NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET no configurado');
            textoMensajeMeta = `[${att0.type}]`;
            throw new Error('bucket-not-configured');
          }
          const token = crypto.randomUUID();
          const bucket = adminStorage.bucket(bucketName);
          const storagePath = `workspaces/${wsId}/inbox-media/${convId}/${fileName}`;
          const fileRefMeta = bucket.file(storagePath);
          await fileRefMeta.save(buffer, { metadata: { contentType: rawMime }, resumable: false });
          await fileRefMeta.setMetadata({ metadata: { firebaseStorageDownloadTokens: token } });
          const encodedPath = encodeURIComponent(storagePath);
          const mediaUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;
          const label = attType === 'image' ? 'Imagen' : attType === 'video' ? 'Video' : attType === 'audio' ? 'Audio' : 'Archivo';
          textoMensajeMeta = `[${label}]`;
          metaMsgMetadata = { mediaUrl, mediaType: attType, fileName };
          console.log(`[META-MEDIA] Adjunto ${attType} guardado: ${storagePath}`);
        } else {
          textoMensajeMeta = `[${att0.type}]`;
        }
      } catch (err) {
        console.error('[META-MEDIA] Error procesando adjunto:', err);
        textoMensajeMeta = `[${att0.type}]`;
      }
    }

    if (!textoMensajeMeta) return;

    // 5. Guardar mensaje y evitar duplicados
    const metaMessageId = messagingItem.message?.mid;
    const msgPayloadMeta: Record<string, unknown> = {
      text: textoMensajeMeta,
      from: 'user',
      creadoEl: Timestamp.now(),
      visto: false
    };
    if (metaMsgMetadata) msgPayloadMeta.metadata = metaMsgMetadata;

    let savedMsgIdMeta: string;
    if (metaMessageId) {
      const msgDocRef = convRef.doc(convId).collection(COLLECTIONS.MENSAJES).doc(metaMessageId);
      const msgDocSnap = await msgDocRef.get();
      if (msgDocSnap.exists) {
        console.log(`⚠️ Mensaje duplicado de Meta ignorado: ${metaMessageId}`);
        return;
      }
      await msgDocRef.set(msgPayloadMeta);
      savedMsgIdMeta = metaMessageId;
    } else {
      const addedRef = await convRef.doc(convId).collection(COLLECTIONS.MENSAJES).add(msgPayloadMeta);
      savedMsgIdMeta = addedRef.id;
    }

    // 5. Trigger IA si está habilitado
    if (canalData.aiEnabled && canalData.agenteId) {
      console.log(`IA activada para ${canalType}. Agente: ${canalData.agenteId}`);

      // Verificar límite mensual (y resetear si el período venció)
      const wsData = await obtenerWsDataConReset(wsId);
      const planActual = (wsData?.plan as "starter" | "pro" | "agencia") || "starter";
      const limiteConv = PLAN_LIMITS[planActual].convCountIA;
      const usadoConv = wsData?.uso?.convCount || 0;

      if (typeof limiteConv === "number" && usadoConv >= limiteConv) {
        console.log(`[LIMITE_PLAN] Workspace ${wsId} alcanzó ${limiteConv} sesiones. Procesamiento IA detenido.`);
        return;
      }

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
      let delayRespuesta = 0;
      const agenteDoc = await adminDb.doc(`${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.AGENTES}/${canalData.agenteId}`).get();
      if (agenteDoc.exists) {
         const agData = agenteDoc.data();
         modoAgenteDefault = agData?.modoDefault || 'auto';
         delayRespuesta = agData?.delayRespuesta || 0;
      }
      
      const isCopiloto = convData?.modoIA === 'copiloto' || modoAgenteDefault === 'copiloto';

      // DEBOUNCE: esperar sin escribir nada en Firestore para evitar race conditions
      if (!isCopiloto) {
        const esperaMs = Math.max(delayRespuesta, 1) * 1000;
        console.log(`[DEBOUNCE-META] Esperando ${esperaMs / 1000}s para conversación ${convId}...`);
        await new Promise(resolve => setTimeout(resolve, esperaMs));
      }

      // Leer historial actualizado (usado para debounce check y agrupación)
      const historialSnap = await convRef.doc(convId)
          .collection(COLLECTIONS.MENSAJES)
          .orderBy('creadoEl', 'desc')
          .limit(30)
          .get();

      const msgDocs = historialSnap.docs.reverse();

      // DEBOUNCE CHECK: si llegó un mensaje más reciente, este hilo cancela
      if (!isCopiloto) {
        const ultimoMsgUsuario = [...msgDocs].reverse().find(d => d.data().from === 'user');
        if (!ultimoMsgUsuario || ultimoMsgUsuario.id !== savedMsgIdMeta) {
          console.log(`[DEBOUNCE-META] Cancelando hilo ${savedMsgIdMeta}. El último mensaje es ${ultimoMsgUsuario?.id}.`);
          return;
        }
        console.log(`[DEBOUNCE-META] Confirmado último mensaje. Procesando...`);
      }

      // AGRUPACIÓN INTELIGENTE: agrupar mensajes consecutivos del usuario al final
      let textoProcesar = textoMensajeMeta;

      if (!isCopiloto) {
        const mensajesUsuarioConsecutivos: string[] = [];
        for (let i = msgDocs.length - 1; i >= 0; i--) {
          const mData = msgDocs[i].data();
          if (mData.from === 'user') {
            mensajesUsuarioConsecutivos.unshift(mData.text || '');
          } else {
            break;
          }
        }
        if (mensajesUsuarioConsecutivos.length > 1) {
          textoProcesar = mensajesUsuarioConsecutivos.join('\n');
          console.log(`[DEBOUNCE-META] Agrupados ${mensajesUsuarioConsecutivos.length} mensajes: "${textoProcesar.replace(/\n/g, ' | ')}"`);
        }
      }

      const historial = msgDocs.map(d => ({
         from: d.data().from,
         text: d.data().text
      }));
      // Remover último msg (es el actual o el bloque que vamos a responder) del historial de contexto de la IA
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
           textoUsuario: textoProcesar,
           historial,
           isCopiloto,
           contactoNombre
        });

        if (!isCopiloto && respuestaIA) {
           await enviarMensajeAccion(wsId, canalId, senderId, respuestaIA);

           // Solo contar si es una sesión nueva (no si el mismo contacto ya escribió en las últimas 24hs)
           const esSesionNueva = await debeContarSesion(wsId, contactoId || senderId);
           if (esSesionNueva) {
             const FieldValue = require('firebase-admin').firestore.FieldValue;
             await adminDb.doc(`${COLLECTIONS.ESPACIOS}/${wsId}`).update({
               "uso.convCount": FieldValue.increment(1)
             });
           }

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
 * Detecta si un texto es una notificación automática del sistema de WhatsApp
 * (conexión a Business Platform, cambio de número, cifrado, etc.)
 * En esos casos el agente de IA no debe responder nada.
 */
function esNotificacionSistemaWA(texto: string): boolean {
  const t = texto.toLowerCase();
  const patrones = [
    // Conexión a Meta Business Platform
    'servicio seguro de meta',
    'secure meta service',
    'usando un servicio',
    'using a secure service',
    'administrar este chat',
    'manage this chat',
    // Cambio de número de teléfono
    'cambió su número de teléfono',
    'changed their phone number',
    'ha cambiado su número',
    'changed to a new phone number',
    // Mensajes temporales / disappearing
    'mensajes temporales ya no son compatibles',
    'disappearing messages are turned off',
    'los mensajes que desaparecen',
    'desaparecen están desactivados',
    // Cifrado extremo a extremo (notificación automática)
    'mensajes y llamadas están cifrados de extremo a extremo',
    'messages and calls are end-to-end encrypted',
    'cifrado de extremo a extremo. toca para obtener',
    // Notificaciones de privacidad y seguridad de Meta
    'toca para obtener más información',
    'tap to learn more',
    'tap for more info',
    // Cuenta de WhatsApp Business
    'esta cuenta de whatsapp business',
    'this whatsapp business account',
  ];
  return patrones.some(p => t.includes(p));
}

const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'video/3gpp': '3gp',
  'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/aac': 'aac', 'audio/opus': 'opus',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
};

/**
 * Descarga un adjunto de WhatsApp y lo sube a Firebase Storage.
 * Soporta Meta Cloud API (requiere Graph API) y 360dialog (URL ya en el payload).
 */
async function procesarMediaEntranteWA(
  mediaId: string,
  accessToken: string,
  mediaType: string,
  caption: string | undefined,
  wsId: string,
  convId: string,
  directUrl?: string,      // URL ya incluida en el payload (ej: 360dialog)
  knownMimeType?: string   // mime_type ya incluido en el payload
): Promise<{ text: string; metadata: { mediaUrl: string; mediaType: string; fileName: string } } | null> {
  try {
    let downloadUrl: string;
    let mimeTypeFromApi: string | undefined;

    if (directUrl) {
      // 360dialog y proveedores que ya incluyen la URL en el webhook
      downloadUrl = directUrl;
      mimeTypeFromApi = knownMimeType;
      console.log(`[WA-MEDIA] Usando URL directa del payload para media ${mediaId}`);
    } else {
      // Meta Cloud API: obtener URL temporal desde Graph API
      const infoRes = await fetch(
        `https://graph.facebook.com/v19.0/${mediaId}?access_token=${accessToken}`
      );
      if (!infoRes.ok) {
        console.error(`[WA-MEDIA] Error obteniendo info de ${mediaId}: ${infoRes.status}`);
        return null;
      }
      const info = await infoRes.json() as { url?: string; mime_type?: string };
      if (!info.url) {
        console.error(`[WA-MEDIA] Sin URL para media ${mediaId}`);
        return null;
      }
      downloadUrl = info.url;
      mimeTypeFromApi = info.mime_type;
    }

    // Descargar el archivo
    let dlRes: Response;
    if (directUrl) {
      // 360dialog: el webhook entrega directUrl (ej. lookaside.fbsbx.com temporal).
      // La documentación oficial de 360dialog exige REEMPLAZAR la raíz "https://lookaside.fbsbx.com" 
      // por "https://waba-v2.360dialog.io" y autenticarse con el header 'D360-API-KEY'.
      const transformedUrl = directUrl.replace('https://lookaside.fbsbx.com', 'https://waba-v2.360dialog.io');
      console.log(`[WA-MEDIA] Descargando desde URL transformada de 360dialog: ${transformedUrl}`);
      
      dlRes = await fetch(transformedUrl, {
        headers: { 
          'D360-API-KEY': accessToken,
          'User-Agent': 'curl/7.64.1'
        }
      });
      console.log(`[WA-MEDIA] 360dialog transformedUrl status: ${dlRes.status}`);

      // Fallback: si dio error (ej. link lookaside expirado), intentar re-consultar la URL fresca usando GET /mediaId
      if (!dlRes.ok) {
        console.warn(`[WA-MEDIA] Falló descarga directa (${dlRes.status}). Intentando obtener URL fresca desde API 360dialog...`);
        const infoRes = await fetch(`https://waba-v2.360dialog.io/${mediaId}`, {
          headers: { 'D360-API-KEY': accessToken }
        });
        if (infoRes.ok) {
          const info = await infoRes.json() as { url?: string };
          if (info.url) {
            const freshTransformedUrl = info.url.replace('https://lookaside.fbsbx.com', 'https://waba-v2.360dialog.io');
            console.log(`[WA-MEDIA] Nueva URL fresca y transformada de 360dialog: ${freshTransformedUrl}`);
            dlRes = await fetch(freshTransformedUrl, {
              headers: { 
                'D360-API-KEY': accessToken,
                'User-Agent': 'curl/7.64.1'
              }
            });
            console.log(`[WA-MEDIA] Descarga con URL fresca status: ${dlRes.status}`);
          }
        }
      }
    } else {
      // Meta Cloud API
      dlRes = await fetch(downloadUrl, {
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'curl/7.64.1'
        }
      });
    }
    if (!dlRes.ok) {
      console.error(`[WA-MEDIA] Error descargando ${mediaId}: ${dlRes.status}`);
      return null;
    }
    const buffer = Buffer.from(await dlRes.arrayBuffer());

    // 3. Determinar extensión y tipo normalizado
    const mimeType = mimeTypeFromApi || dlRes.headers.get('content-type')?.split(';')[0].trim() || 'application/octet-stream';
    const ext = EXT_MAP[mimeType] || 'bin';
    const normalizedType = ['image', 'video', 'audio'].includes(mediaType) ? mediaType : 'document';
    const fileName = `${mediaId}.${ext}`;

    // 4. Subir a Firebase Storage con token de descarga permanente
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      console.error('[WA-MEDIA] NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET no configurado');
      return null;
    }
    const token = crypto.randomUUID();
    const bucket = adminStorage.bucket(bucketName);
    const storagePath = `workspaces/${wsId}/inbox-media/${convId}/${fileName}`;
    console.log(`[WA-MEDIA] Subiendo a bucket=${bucketName}, path=${storagePath}`);
    const fileRef = bucket.file(storagePath);
    await fileRef.save(buffer, { metadata: { contentType: mimeType }, resumable: false });
    await fileRef.setMetadata({ metadata: { firebaseStorageDownloadTokens: token } });
    const encodedPath = encodeURIComponent(storagePath);
    const mediaUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;

    const label = normalizedType === 'image' ? 'Imagen' : normalizedType === 'video' ? 'Video' : normalizedType === 'audio' ? 'Audio' : 'Archivo';
    const text = caption?.trim() || `[${label}]`;

    console.log(`[WA-MEDIA] Media ${normalizedType} guardado: ${storagePath}`);
    return { text, metadata: { mediaUrl, mediaType: normalizedType, fileName } };
  } catch (err) {
    console.error('[WA-MEDIA] Error procesando media entrante:', err);
    return null;
  }
}

/**
 * Procesa mensajes entrantes de WhatsApp Cloud API.
 */
export async function procesarMensajeWhatsapp(value: any, wabaId: string) {
  try {
    // Ignorar status updates (delivered, read, failed) — no son mensajes entrantes
    if (value.statuses?.length && !value.messages?.length) return;

    const message = value.messages?.[0];
    const contact = value.contacts?.[0];

    if (!message) return;

    // Ignorar mensajes del sistema de WhatsApp (conexión a plataforma, cambio de número, etc.)
    if (message.type === 'system' || message.type === 'reaction' || message.type === 'ephemeral') {
      console.log(`[WA] Mensaje tipo '${message.type}' ignorado — no es un mensaje de cliente.`);
      return;
    }

    const TIPOS_MEDIA_WA = ['image', 'video', 'document', 'audio', 'sticker'];
    const esMedia = TIPOS_MEDIA_WA.includes(message.type);

    if (message.type === 'text') {
      if (!message.text?.body?.trim()) return;
      if (esNotificacionSistemaWA(message.text.body)) {
        console.log(`[WA] Texto de notificación del sistema ignorado: "${message.text.body.slice(0, 80)}..."`);
        return;
      }
    } else if (!esMedia) {
      console.log(`[WA] Mensaje tipo '${message.type}' ignorado.`);
      return;
    }

    const senderId = message.from;
    const contactoNombreIncoming = contact?.profile?.name || senderId;

    // Preview de texto para mostrar en la lista de conversaciones
    const textoPreview = message.type === 'text'
      ? message.text.body
      : `📎 ${message.type === 'image' ? 'Imagen' : message.type === 'video' ? 'Video' : message.type === 'audio' ? 'Audio' : message.type === 'sticker' ? 'Sticker' : 'Archivo'}`;

    // 1. Identificar Workspace y Canal (multi-workspace: usar el más reciente si hay duplicados)
    const wsQuery = await adminDb
      .collectionGroup(COLLECTIONS.CANALES)
      .where('metaPhoneNumberId', '==', value.metadata.phone_number_id)
      .where('tipo', '==', 'whatsapp')
      .where('status', '==', 'connected')
      .get();

    if (wsQuery.empty) {
      console.warn(`❌ Mensaje de WA ${senderId} ignorado: Canal no encontrado para phone_number_id ${value.metadata.phone_number_id}. Asegúrate que el 'Phone Number ID' coincida en los ajustes del canal.`);
      return;
    }

    if (wsQuery.docs.length > 1) {
      console.log(`ℹ️ ${wsQuery.docs.length} canales WA encontrados para ${value.metadata.phone_number_id} — usando el más reciente.`);
    }
    const canalDoc = pickMostRecentCanal(wsQuery.docs);
    const canalId = canalDoc.id;
    const wsId = canalDoc.ref.parent.parent!.id;
    const canalData = canalDoc.data() as any;

    console.log(`✅ Canal WA encontrado: ${canalId} en workspace: ${wsId}. IA Habilitada: ${canalData.aiEnabled}`);

    // 2. Obtener o crear contacto
    const contactosRef = adminDb.collection(`${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CONTACTOS}`);
    let contactoId = "";
    let contactoNombre = contactoNombreIncoming;

    const contactSnap = await contactosRef.where('telefono', '==', senderId).limit(1).get();

    if (contactSnap.empty) {
      contactoId = `wa_${senderId}`;
      await contactosRef.doc(contactoId).set({
        nombre: contactoNombre,
        telefono: senderId,
        canalOrigen: 'whatsapp',
        aiBlocked: false,
        esContactoCRM: false,
        creadoEl: Timestamp.now()
      }, { merge: true });
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
      .limit(10)
      .get();

    const convExistente = convSnap.docs.find(d => d.data().canalId === canalId)
      || convSnap.docs[0];

    if (!convExistente) {
      convId = `conv_${contactoId}_${canalId}`;
      await convRef.doc(convId).set({
        contactoId,
        contactoNombre,
        canal: 'whatsapp',
        canalId,
        agenteId: canalData.agenteId || null,
        ultimoMensaje: textoPreview,
        ultimaActividad: Timestamp.now(),
        ultimoMensajeCliente: Timestamp.now(),
        unreadCount: 1,
        modoIA: 'auto',
        creadoEl: Timestamp.now()
      }, { merge: true });
      console.log(`🆕 Conversación WA creada: ${convId}`);
    } else {
      convId = convExistente.id;
      console.log(`💬 Conversación WA existente: ${convId}`);
      await convRef.doc(convId).update({
        ultimoMensaje: textoPreview,
        contactoNombre,
        ultimaActividad: Timestamp.now(),
        ultimoMensajeCliente: Timestamp.now(),
        unreadCount: (convExistente.data().unreadCount || 0) + 1
      });
    }

    // 4. Descargar media si el mensaje tiene adjunto
    let textoMensaje = message.type === 'text' ? message.text.body : textoPreview;
    let mensajeMetadata: { mediaUrl: string; mediaType: string; fileName: string } | undefined;

    if (esMedia) {
      const secretSnap = await adminDb
        .doc(`${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CANALES}/${canalId}/secrets/config`)
        .get();
      const waAccessToken = secretSnap.data()?.metaAccessToken;
      if (waAccessToken) {
        const mediaObj = message[message.type] as { id?: string; caption?: string; url?: string; mime_type?: string } | undefined;
        if (mediaObj?.id) {
          const resultado = await procesarMediaEntranteWA(
            mediaObj.id, waAccessToken, message.type, mediaObj.caption, wsId, convId,
            mediaObj.url,       // URL directa si el proveedor (ej: 360dialog) la incluye
            mediaObj.mime_type  // mime_type si ya viene en el payload
          );
          if (resultado) {
            textoMensaje = resultado.text;
            mensajeMetadata = resultado.metadata;
          }
        }
      } else {
        console.warn(`[WA-MEDIA] Sin token de acceso para canal ${canalId}, guardando sin URL de media`);
      }
    }

    // 5. Guardar mensaje y evitar duplicados
    const metaMessageId = message.id;
    const msgPayloadWA: Record<string, unknown> = {
      text: textoMensaje,
      from: 'user',
      creadoEl: Timestamp.now(),
      visto: false
    };
    if (mensajeMetadata) msgPayloadWA.metadata = mensajeMetadata;

    let savedMsgIdWA: string;
    if (metaMessageId) {
      const msgDocRef = convRef.doc(convId).collection(COLLECTIONS.MENSAJES).doc(metaMessageId);
      const msgDocSnap = await msgDocRef.get();
      if (msgDocSnap.exists) {
        console.log(`⚠️ Mensaje duplicado de WhatsApp ignorado: ${metaMessageId}`);
        return;
      }
      await msgDocRef.set(msgPayloadWA);
      savedMsgIdWA = metaMessageId;
    } else {
      const addedRef = await convRef.doc(convId).collection(COLLECTIONS.MENSAJES).add(msgPayloadWA);
      savedMsgIdWA = addedRef.id;
    }

    // 5. Trigger IA
    if (canalData.aiEnabled && canalData.agenteId) {
      // Verificar límite mensual (y resetear si el período venció)
      const wsData = await obtenerWsDataConReset(wsId);
      const planActual = (wsData?.plan as "starter" | "pro" | "agencia") || "starter";
      const limiteConv = PLAN_LIMITS[planActual].convCountIA;
      const usadoConv = wsData?.uso?.convCount || 0;

      if (typeof limiteConv === "number" && usadoConv >= limiteConv) {
        console.log(`[LIMITE_PLAN] Workspace ${wsId} alcanzó ${limiteConv} sesiones. Procesamiento IA detenido.`);
        return;
      }

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
      let delayRespuesta = 0;
      const agenteDoc = await adminDb.doc(`${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.AGENTES}/${canalData.agenteId}`).get();
      if (agenteDoc.exists) {
        const agData = agenteDoc.data();
        modoAgenteDefault = agData?.modoDefault || 'auto';
        delayRespuesta = agData?.delayRespuesta || 0;
      }

      const isCopiloto = convData?.modoIA === 'copiloto' || modoAgenteDefault === 'copiloto';

      // DEBOUNCE: esperar sin escribir nada en Firestore para evitar race conditions
      if (!isCopiloto) {
        const esperaMs = Math.max(delayRespuesta, 1) * 1000;
        console.log(`[DEBOUNCE-WA] Esperando ${esperaMs / 1000}s para conversación WA ${convId}...`);
        await new Promise(resolve => setTimeout(resolve, esperaMs));
      }

      // Leer historial actualizado (usado para debounce check y agrupación)
      const historialSnap = await convRef.doc(convId)
        .collection(COLLECTIONS.MENSAJES)
        .orderBy('creadoEl', 'desc')
        .limit(30)
        .get();

      const msgDocs = historialSnap.docs.reverse();

      // DEBOUNCE CHECK: si llegó un mensaje más reciente, este hilo cancela
      if (!isCopiloto) {
        const ultimoMsgUsuario = [...msgDocs].reverse().find(d => d.data().from === 'user');
        if (!ultimoMsgUsuario || ultimoMsgUsuario.id !== savedMsgIdWA) {
          console.log(`[DEBOUNCE-WA] Cancelando hilo ${savedMsgIdWA}. El último mensaje es ${ultimoMsgUsuario?.id}.`);
          return;
        }
        console.log(`[DEBOUNCE-WA] Confirmado último mensaje. Procesando...`);
      }

      // AGRUPACIÓN INTELIGENTE: agrupar mensajes consecutivos del usuario al final
      let textoProcesar = textoMensaje;

      if (!isCopiloto) {
        const mensajesUsuarioConsecutivos: string[] = [];
        for (let i = msgDocs.length - 1; i >= 0; i--) {
          const mData = msgDocs[i].data();
          if (mData.from === 'user') {
            mensajesUsuarioConsecutivos.unshift(mData.text || '');
          } else {
            break;
          }
        }
        if (mensajesUsuarioConsecutivos.length > 1) {
          textoProcesar = mensajesUsuarioConsecutivos.join('\n');
          console.log(`[DEBOUNCE-WA] Agrupados ${mensajesUsuarioConsecutivos.length} mensajes WA: "${textoProcesar.replace(/\n/g, ' | ')}"`);
        }
      }

      const historial = msgDocs.map(d => ({
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
          textoUsuario: textoProcesar,
          historial,
          isCopiloto,
          contactoNombre
        });

        if (!isCopiloto && respuestaIA) {
          await enviarMensajeAccion(wsId, canalId, senderId, respuestaIA);

          // Solo contar si es una sesión nueva (no si el mismo contacto ya escribió en las últimas 24hs)
          const esSesionNueva = await debeContarSesion(wsId, contactoId || senderId);
          if (esSesionNueva) {
            const FieldValue = require('firebase-admin').firestore.FieldValue;
            await adminDb.doc(`${COLLECTIONS.ESPACIOS}/${wsId}`).update({
              "uso.convCount": FieldValue.increment(1)
            });
          }

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

/**
 * Procesa comentarios de Instagram y dispara las automatizaciones configuradas.
 * Busca triggers activos que coincidan con la palabra clave (case-insensitive).
 */
async function procesarComentarioInstagram(commentData: any, pageId: string) {
  try {
    const commenterId = commentData.from?.id;
    const commentText: string = commentData.message || commentData.text || '';
    const commentId = commentData.id;

    if (!commenterId || !commentText.trim()) return;

    // Buscar canal Instagram por metaInstagramId o metaPageId (multi-workspace)
    let wsQuery = await adminDb
      .collectionGroup(COLLECTIONS.CANALES)
      .where('metaInstagramId', '==', pageId)
      .where('tipo', '==', 'instagram')
      .where('status', '==', 'connected')
      .get();

    if (wsQuery.empty) {
      wsQuery = await adminDb
        .collectionGroup(COLLECTIONS.CANALES)
        .where('metaPageId', '==', pageId)
        .where('tipo', '==', 'instagram')
        .where('status', '==', 'connected')
        .get();
    }

    if (wsQuery.empty) {
      console.warn(`[ig-comment] Canal Instagram no encontrado para pageId ${pageId}`);
      return;
    }

    if (wsQuery.docs.length > 1) {
      console.log(`[ig-comment] ${wsQuery.docs.length} canales encontrados — usando el más reciente.`);
    }
    const canalDoc = pickMostRecentCanal(wsQuery.docs);
    const canalId = canalDoc.id;
    const wsId = canalDoc.ref.parent.parent!.id;

    const secretSnap = await adminDb
      .doc(`${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CANALES}/${canalId}/secrets/config`)
      .get();
    const accessToken = secretSnap.data()?.metaAccessToken;
    if (!accessToken) {
      console.warn(`[ig-comment] Sin access token para canal ${canalId}`);
      return;
    }

    // Obtener triggers activos del workspace
    const triggersSnap = await adminDb
      .collection(`${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.AUTODISPARADORES}`)
      .where('tipo', '==', 'instagram_comment')
      .where('activo', '==', true)
      .get();

    if (triggersSnap.empty) return;

    const textNorm = commentText.trim().toUpperCase();

    for (const triggerDoc of triggersSnap.docs) {
      const trigger = triggerDoc.data();
      const keyword = (trigger.config.palabraClave || '').trim().toUpperCase();

      if (!keyword) continue;

      // Si el trigger tiene canalId, verificar que coincida
      if (trigger.config.canalId && trigger.config.canalId !== canalId) continue;

      // Detección case-insensitive: el comentario contiene la palabra clave
      if (!textNorm.includes(keyword)) continue;

      console.log(`[ig-comment] ✅ Keyword "${keyword}" detectada — disparando trigger "${trigger.nombre}"`);

      // 1. Respuesta pública al comentario
      if (trigger.config.respuestaPublica) {
        try {
          await fetch(`https://graph.facebook.com/v19.0/${commentId}/replies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: trigger.config.respuestaPublica,
              access_token: accessToken,
            }),
          });
        } catch (e) {
          console.error('[ig-comment] Error enviando respuesta pública:', e);
        }
      }

      // 2. Mensaje directo (DM) al usuario
      if (trigger.config.respuestaDM) {
        try {
          await fetch(`https://graph.facebook.com/v19.0/me/messages`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              recipient: { id: commenterId },
              message: { text: trigger.config.respuestaDM },
              messaging_type: 'RESPONSE',
            }),
          });
        } catch (e) {
          console.error('[ig-comment] Error enviando DM:', e);
        }
      }

      // Solo dispara el primer trigger que coincida
      break;
    }
  } catch (err) {
    console.error('[ig-comment] Error procesando comentario:', err);
  }
}

/**
 * Procesa mensajes de eco (respuestas enviadas desde la app de WhatsApp Business en el celular).
 */
export async function procesarEcoMensajeWhatsapp(value: any, wabaId: string) {
  try {
    const echo = value.smb_message_echoes || value.messages?.[0]; // 360dialog / Meta wrapper
    if (!echo) return;

    // Solo procesar texto en este paso inicial (se puede expandir para media en el futuro)
    const text = echo.text?.body;
    if (!text?.trim()) return;

    const recipientId = echo.to; // El número de teléfono del cliente que recibió nuestro mensaje
    const messageId = echo.message_id || echo.id;

    if (!recipientId) {
      console.warn("⚠️ Eco WA ignorado: No se encontró recipientId (campo 'to')");
      return;
    }

    // 1. Identificar Workspace y Canal buscando por el phone_number_id de los metadatos
    const wsQuery = await adminDb
      .collectionGroup(COLLECTIONS.CANALES)
      .where('metaPhoneNumberId', '==', value.metadata.phone_number_id)
      .where('tipo', '==', 'whatsapp')
      .where('status', '==', 'connected')
      .get();

    if (wsQuery.empty) {
      console.warn(`❌ Eco WA ignorado: Canal no encontrado para phone_number_id ${value.metadata.phone_number_id}`);
      return;
    }

    const canalDoc = pickMostRecentCanal(wsQuery.docs);
    const canalId = canalDoc.id;
    const wsId = canalDoc.ref.parent.parent!.id;

    // 2. Obtener o crear contacto
    const contactosRef = adminDb.collection(`${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CONTACTOS}`);
    let contactoId = "";
    let contactoNombre = recipientId;

    const contactSnap = await contactosRef.where('telefono', '==', recipientId).limit(1).get();

    if (contactSnap.empty) {
      contactoId = `wa_${recipientId}`;
      await contactosRef.doc(contactoId).set({
        nombre: contactoNombre,
        telefono: recipientId,
        canalOrigen: 'whatsapp',
        aiBlocked: false,
        esContactoCRM: false,
        creadoEl: Timestamp.now()
      }, { merge: true });
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
      .limit(10)
      .get();

    const convExistente = convSnap.docs.find(d => d.data().canalId === canalId)
      || convSnap.docs[0];

    if (!convExistente) {
      convId = `conv_${contactoId}_${canalId}`;
      await convRef.doc(convId).set({
        contactoId,
        contactoNombre,
        canal: 'whatsapp',
        canalId,
        ultimoMensaje: text,
        ultimaActividad: Timestamp.now(),
        unreadCount: 0, // Al responder nosotros, los no leídos quedan en cero
        modoIA: 'auto',
        creadoEl: Timestamp.now()
      }, { merge: true });
    } else {
      convId = convExistente.id;
      await convRef.doc(convId).update({
        ultimoMensaje: text,
        ultimaActividad: Timestamp.now(),
        unreadCount: 0 // Resetear no leídos ya que respondimos
      });
    }

    // 4. Guardar mensaje enviado (from: 'agent') para reflejarlo en la interfaz
    if (messageId) {
      const msgDocRef = convRef.doc(convId).collection(COLLECTIONS.MENSAJES).doc(messageId);
      const msgDocSnap = await msgDocRef.get();
      if (msgDocSnap.exists) {
        console.log(`⚠️ Eco de mensaje duplicado ignorado: ${messageId}`);
        return;
      }
      await msgDocRef.set({
        text,
        from: 'agent', // Guardado como agente para mostrar a la derecha
        creadoEl: Timestamp.now(),
        visto: true
      });
    } else {
      await convRef.doc(convId).collection(COLLECTIONS.MENSAJES).add({
        text,
        from: 'agent',
        creadoEl: Timestamp.now(),
        visto: true
      });
    }

    console.log(`🔁 Eco de mensaje guardado exitosamente en conv ${convId}`);
  } catch (error) {
    console.error("❌ Error procesando eco de WhatsApp:", error);
  }
}
