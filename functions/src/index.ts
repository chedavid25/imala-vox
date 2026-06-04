import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import {
  procesarConIA,
  enviarMensajeWhatsApp,
  obtenerOCrearContacto,
  obtenerOCrearConversacion,
  extraerMetadatosIA
} from "./ai";

admin.initializeApp();

// Cron diario: health check de canales Meta (ver healthCheckCanales.ts)
export { healthCheckCanales } from "./healthCheckCanales";

/**
 * validarLimitesWorkspaceInternal
 * Helper interno para verificar límites sin necesidad de contexto de autenticación
 */
async function validarLimitesWorkspaceInternal(workspaceId: string) {
  const db = admin.firestore();
  const workspaceDoc = await db.collection("espaciosDeTrabajo").doc(workspaceId).get();
  if (!workspaceDoc.exists) return { allowed: false, reason: "Workspace no encontrado" };
  
  const data = workspaceDoc.data()!;
  const planType = data.plan || "starter";
  const usage = data.uso || { convCount: 0 };

  const configDoc = await db.collection("plataforma").doc("config").get();
  const planesConfig = configDoc.data()?.planes;

  if (!planesConfig || !planesConfig[planType]) {
    return { allowed: true, reason: "Configuración de plan no encontrada, permitiendo por defecto." };
  }

  const limit = planesConfig[planType].convCountIA;
  if (usage.convCount >= limit) {
    // ── Emitir Notificación de Sistema (solo si no existe una reciente sin ver) ──
    const notificacionesRef = db.collection("espaciosDeTrabajo").doc(workspaceId).collection("notificaciones");
    const yaNotificado = await notificacionesRef
      .where("metadata.id", "==", "limite_plan_ia")
      .where("visto", "==", false)
      .limit(1)
      .get();
    
    if (yaNotificado.empty) {
      await notificacionesRef.add({
        tipo: 'alerta',
        titulo: 'Límite de mensajes IA alcanzado',
        mensaje: `Tu plan (${planType}) ha llegado al límite de ${limit} conversaciones. El agente dejará de responder automáticamente hasta el próximo ciclo.`,
        visto: false,
        creadoEl: admin.firestore.FieldValue.serverTimestamp(),
        metadata: { id: "limite_plan_ia", planType, limit }
      });
    }

    return { allowed: false, reason: `Límite de mensajes IA alcanzado (${limit}).` };
  }

  return { allowed: true, planType };
}

/**
 * checkLimitesPlantilla
 * Disparador: Antes de cada acción del agente (Llamada interna)
 * Responsabilidad: Lee uso actual vs plataforma/config.planes — bloquea si supera límite
 */
export const checkLimitesPlantilla = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "El usuario debe estar autenticado.");
  }

  const workspaceId = data.workspaceId;
  if (!workspaceId) {
    throw new functions.https.HttpsError("invalid-argument", "Falta workspaceId.");
  }

  const result = await validarLimitesWorkspaceInternal(workspaceId);
  return result;
});

/**
 * recibirMensajeWhatsApp (WEBHOOK)
 * Disparador: HTTP (Webhook de Facebook/Meta)
 * Responsabilidad: Valida el webhook (GET) y procesa mensajes entrantes (POST).
 */
export const recibirMensajeWhatsApp = functions.https.onRequest(async (req: functions.https.Request, res: functions.Response) => {
  // 1. Verificación del Webhook (GET)
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    // WA_VERIFY_TOKEN debe estar configurado en las variables de entorno de functions
    const VERIFY_TOKEN = process.env.WA_VERIFY_TOKEN || 'imala_vox_verify_token';

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      res.status(200).send(challenge);
      return;
    } else {
      res.sendStatus(403);
      return;
    }
  }

  // 2. Recepción del Mensaje (POST)
  if (req.method === 'POST') {
    const body = req.body;
    if (body.object === 'whatsapp_business_account') {
      try {
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];
        const status = value?.statuses?.[0];
        // Obtener el phoneNumberId del metadata del webhook
        const phoneNumberId = value?.metadata?.phone_number_id;

        // Si es una actualización de estado de un mensaje saliente (enviado por la empresa)
        if (status && phoneNumberId) {
          const from = status.recipient_id;
          if (from) {
            const db = admin.firestore();
            const canalSnap = await db
              .collectionGroup('canales')
              .where('metaPhoneNumberId', '==', phoneNumberId)
              .where('tipo', '==', 'whatsapp')
              .limit(1).get();

            if (!canalSnap.empty) {
              const canalDoc = canalSnap.docs[0];
              const workspaceId = canalDoc.ref.path.split('/')[1];
              
              const contactoSnap = await db
                .collection(`espaciosDeTrabajo/${workspaceId}/contactos`)
                .where("telefono", "==", from)
                .limit(1).get();

              if (!contactoSnap.empty) {
                const contactoId = contactoSnap.docs[0].id;
                
                const convSnap = await db
                  .collection(`espaciosDeTrabajo/${workspaceId}/conversaciones`)
                  .where("contactoId", "==", contactoId)
                  .where("canalId", "==", canalDoc.id)
                  .limit(1).get();

                if (!convSnap.empty) {
                  await convSnap.docs[0].ref.update({
                    unreadCount: 0,
                    ultimaActividad: admin.firestore.FieldValue.serverTimestamp()
                  });
                  console.log(`💬 Conversación ${convSnap.docs[0].id} marcada como leída por mensaje saliente a ${from}`);
                }
              }
            }
          }
        }

        if (message && phoneNumberId) {
          const from = message.from;
          let text = message.text?.body || "";

          // ── Buscar workspace por phoneNumberId ──
          const canalSnap = await admin.firestore()
            .collectionGroup('canales')
            .where('metaPhoneNumberId', '==', phoneNumberId)
            .where('tipo', '==', 'whatsapp')
            .limit(1).get();

          if (canalSnap.empty) {
            console.warn(`phoneNumberId ${phoneNumberId} no mapeado a ningún workspace`);
            res.sendStatus(200); return;
          }

          const canalDoc = canalSnap.docs[0];
          const canalData = canalDoc.data();
          const workspaceId = canalDoc.ref.path.split('/')[1];
          const canalId = canalDoc.id;
          const accessToken = canalData.whatsappToken || process.env.WHATSAPP_ACCESS_TOKEN || '';

          console.log(`📩 Msg de ${from}: "${text}" → ws: ${workspaceId}`);

          // ── 0. Validar Límites del Plan ──
          const limitesCheck = await validarLimitesWorkspaceInternal(workspaceId);
          if (!limitesCheck.allowed) {
            console.log(`🚫 Límite de plan alcanzado para ${workspaceId}: ${limitesCheck.reason}`);
            // TODO: Podríamos enviar un mensaje de alerta al operador aquí
            res.sendStatus(200); return;
          }

          // ── 1. Obtener o crear contacto ──
          const contactoDoc = await obtenerOCrearContacto(workspaceId, from);
          const contactoData = contactoDoc.data()!;

          // ── 1b. Opt-out de difusión ──
          const msgUpper = text.trim().toUpperCase();
          if (msgUpper === 'SALIR' || msgUpper === 'STOP') {
            await contactoDoc.ref.update({
              optOut: true,
              actualizadoEl: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`📵 Opt-out registrado para ${from}`);
            res.sendStatus(200); return;
          }

          // ── 3. Obtener agente asignado o activo ──
          let agenteId = canalData.agenteId;
          if (!agenteId) {
            const agentesSnap = await admin.firestore()
              .collection(`espaciosDeTrabajo/${workspaceId}/agentes`)
              .where('activo', '==', true)
              .limit(1)
              .get();
            if (!agentesSnap.empty) {
              agenteId = agentesSnap.docs[0].id;
            }
          }

          let modoAgenteDefault = 'auto';
          if (agenteId) {
            const agenteDoc = await admin.firestore()
              .doc(`espaciosDeTrabajo/${workspaceId}/agentes/${agenteId}`)
              .get();
            if (agenteDoc.exists) {
              modoAgenteDefault = agenteDoc.data()?.modoDefault || 'auto';
            }
          } else {
            console.warn(`No hay agentes disponibles para responder en ws ${workspaceId}`);
          }

          // ── 4. Obtener o crear conversación ──
          const convDoc = await obtenerOCrearConversacion(
            workspaceId, contactoDoc.id, agenteId, canalId
          );
          const convId = convDoc.id;
          const convData = convDoc.data()!;

          // ── 5. Procesar Media (si aplica) y descargar archivo desde Meta ──
          const type = message.type;
          let mediaMetadata: any = null;
          
          if (type === "image" || type === "document" || type === "video" || type === "audio") {
            const mediaData = message[type];
            const mediaId = mediaData?.id;
            const mimeType = mediaData?.mime_type || "";
            const fileName = mediaData?.filename || (type === "image" ? "image.jpg" : "file");
            
            // Asignar texto de respaldo inmediatamente para que el mensaje no se pierda si falla la descarga
            text = text || `[${type === 'image' ? 'Imagen' : type === 'video' ? 'Video' : 'Archivo'}: ${fileName}]`;

            if (mediaId && accessToken) {
              try {
                console.log(`Descargando media de WhatsApp: ${mediaId} (${type})`);
                const metaMediaUrl = `https://graph.facebook.com/v18.0/${mediaId}`;
                const metaRes = await fetch(metaMediaUrl, {
                  headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                
                if (metaRes.ok) {
                  const metaJSON = await metaRes.json();
                  const downloadUrlMeta = metaJSON.url;
                  
                  if (downloadUrlMeta) {
                    const mediaRes = await fetch(downloadUrlMeta, {
                      headers: { 'Authorization': `Bearer ${accessToken}` }
                    });
                    
                    if (mediaRes.ok) {
                      const arrayBuffer = await mediaRes.arrayBuffer();
                      const buffer = Buffer.from(arrayBuffer);
                      
                      const bucket = admin.storage().bucket();
                      const storagePath = `workspaces/${workspaceId}/chat-media/${convId}/${mediaId}_${fileName}`;
                      const storageFile = bucket.file(storagePath);
                      
                      await storageFile.save(buffer, {
                        metadata: { contentType: mimeType }
                      });
                      
                      const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media`;
                      
                      mediaMetadata = {
                        mediaUrl: downloadUrl,
                        mediaType: type,
                        fileName: fileName
                      };
                      
                      text = text || `[${type === 'image' ? 'Imagen' : type === 'video' ? 'Video' : 'Archivo'}: ${fileName}]`;
                      console.log(`✅ Media subida a Storage: ${downloadUrl}`);
                    }
                  }
                }
              } catch (mediaErr) {
                console.error("Error procesando media de WhatsApp:", mediaErr);
              }
            }
          }

          if (!text && !mediaMetadata) {
            console.log("Mensaje sin texto ni media procesable, ignorando.");
            res.sendStatus(200); return;
          }

          // ── 6. Guardar mensaje entrante en Firestore ──
          await admin.firestore()
            .collection(`espaciosDeTrabajo/${workspaceId}/conversaciones/${convId}/mensajes`)
            .add({
              text,
              from: 'user',
              creadoEl: admin.firestore.Timestamp.now(),
              visto: false,
              ...(mediaMetadata ? { metadata: mediaMetadata } : {})
            });

          // Actualizar datos de la conversación
          const convRef = admin.firestore().doc(`espaciosDeTrabajo/${workspaceId}/conversaciones/${convId}`);
          const seraRespondidoPorIA = canalData.aiEnabled && 
                                     contactoData.aiBlocked !== true && 
                                     convData.modoIA !== 'pausado';

          await convRef.update({
            ultimoMensaje: text,
            ultimaActividad: admin.firestore.FieldValue.serverTimestamp(),
            ultimoMensajeCliente: admin.firestore.FieldValue.serverTimestamp(),
            ...(!seraRespondidoPorIA ? { unreadCount: admin.firestore.FieldValue.increment(1) } : {})
          });

          // ── 7. Retornos tempranos para flujo de la IA ──
          if (contactoData.aiBlocked === true) {
            console.log(`Contacto ${from} bloqueado para IA. Solo guardado.`);
            res.sendStatus(200); return;
          }

          if (!canalData.aiEnabled) {
            console.log(`IA desactivada para el canal ${canalId}. Solo guardando mensaje.`);
            res.sendStatus(200); return;
          }

          if (convData.modoIA === 'pausado') {
            console.log(`Conversación ${convId} pausada, sin respuesta IA. Solo guardado.`);
            res.sendStatus(200); return;
          }

          // ── 7. Historial para contexto ──
          const histSnap = await admin.firestore()
            .collection(`espaciosDeTrabajo/${workspaceId}/conversaciones/${convId}/mensajes`)
            .orderBy('creadoEl', 'desc')
            .limit(10)
            .get();
          const historial = histSnap.docs.reverse().map(d => ({
            from: d.data().from as string,
            text: d.data().text as string
          }));

          // ── 8. Procesar con IA ──
          const respuestaIA = await procesarConIA({
            wsId: workspaceId,
            agenteId,
            conversacionId: convId,
            textoUsuario: text,
            historialUltimos: historial
          });

          // ── 9. Post-procesamiento (Etiquetas y Recursos) ──
          const { textoLimpio, etiquetas, recursos } = extraerMetadatosIA(respuestaIA);

          // Aplicar etiquetas al contacto si existen
          if (etiquetas.length > 0) {
            await contactoDoc.ref.update({
              etiquetasIA: admin.firestore.FieldValue.arrayUnion(...etiquetas),
              actualizadoEl: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`🏷️ Etiquetas aplicadas a ${from}: ${etiquetas.join(', ')}`);
          }

          // ── 10. Modo copiloto: guardar sugerencia sin enviar ──
          if (convData.modoIA === 'copiloto' || modoAgenteDefault === 'copiloto') {
            await admin.firestore()
              .doc(`espaciosDeTrabajo/${workspaceId}/conversaciones/${convId}`)
              .update({ sugerenciaIA: textoLimpio });
            console.log(`[COPILOTO] Sugerencia guardada para conv ${convId}`);
            res.sendStatus(200); return;
          }

          // ── 11. Auto-reply: enviar por WhatsApp ──
          
          // Primero enviamos el texto limpio
          if (textoLimpio) {
            await enviarMensajeWhatsApp({ phoneNumberId, accessToken, destinatario: from, texto: textoLimpio });
          }

          // Luego enviamos los recursos si existen
          for (const nombreRecurso of recursos) {
            // Buscar recurso en la base de conocimiento
            const recursosSnap = await admin.firestore()
              .collection(`espaciosDeTrabajo/${workspaceId}/baseConocimiento`)
              .where('tipo', '==', 'recurso')
              .where('titulo', '==', nombreRecurso)
              .limit(1)
              .get();

            if (!recursosSnap.empty) {
              const rData = recursosSnap.docs[0].data();
              if (rData.archivoUrl) {
                // Determinar tipo de media basado en extensión o tipo guardado
                let mediaType: "image" | "document" | "audio" | "video" = "document";
                const ext = rData.archivoNombre?.split('.').pop()?.toLowerCase();
                if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) mediaType = "image";
                if (['mp4', 'mov'].includes(ext)) mediaType = "video";
                if (['mp3', 'wav', 'ogg'].includes(ext)) mediaType = "audio";

                await enviarMensajeWhatsApp({ 
                  phoneNumberId, 
                  accessToken, 
                  destinatario: from, 
                  media: {
                    type: mediaType,
                    url: rData.archivoUrl,
                    caption: rData.descripcion || undefined,
                    filename: rData.archivoNombre
                  }
                });
                console.log(`📎 Recurso enviado: ${nombreRecurso}`);
              }
            }
          }

          // Incrementar contador de mensajes IA
          await admin.firestore().doc(`espaciosDeTrabajo/${workspaceId}`).update({
            "uso.convCount": admin.firestore.FieldValue.increment(1)
          });

          console.log(`✅ Respuesta IA completada para ${from}`);
        }
        res.sendStatus(200);
      } catch (error) {
        console.error('Error procesando webhook:', error);
        res.sendStatus(500);
      }
    } else { res.sendStatus(404); }
  }
});

/**
 * procesarRespuestaIA
 * Disparador: Manual (Llamada interna tras recibir un mensaje)
 * Responsabilidad: Esqueleto para procesar el mensaje con Claude y generar respuesta.
 */
export const procesarRespuestaIA = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  const { workspaceId, conversationId, userMessage, historial } = data;

  console.log(`Procesando respuesta IA para workspace ${workspaceId}, conv ${conversationId}`);

  try {
    // Obtener agente activo
    const agentesSnap = await admin.firestore()
      .collection(`espaciosDeTrabajo/${workspaceId}/agentes`)
      .where('activo', '==', true)
      .limit(1)
      .get();

    if (agentesSnap.empty) throw new Error("No hay agentes activos");
    const agenteId = agentesSnap.docs[0].id;

    const respuestaIA = await procesarConIA({
      wsId: workspaceId,
      agenteId,
      conversacionId: conversationId,
      textoUsuario: userMessage,
      historialUltimos: historial || []
    });

    return { status: 'success', respuesta: respuestaIA };
  } catch (error: any) {
    console.error("Error en procesarRespuestaIA:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * autoActualizarWebs
 * Disparador: Programado (Cada 24 horas - 03:00 AM)
 * Responsabilidad: Busca webs con frecuencia 'diaria', 'semanal' o 'mensual' y lanza re-escaneo.
 */
export const autoActualizarWebs = functions.pubsub.schedule('0 3 * * *')
  .timeZone('America/Argentina/Buenos_Aires')
  .onRun(async (context: functions.EventContext): Promise<void> => {
    console.log("Iniciando tarea programada de actualización de webs...");
    const db = admin.firestore();
    const workspaces = await db.collection("espaciosDeTrabajo").get();
    
    for (const ws of workspaces.docs) {
      const wsId = ws.id;
      const websSnapshot = await ws.ref.collection("baseConocimiento")
        .where("tipo", "==", "web")
        .where("frecuenciaActualizacion", "in", ["diaria", "semanal", "mensual"])
        .get();

      for (const webDoc of websSnapshot.docs) {
        const data = webDoc.data();
        const ultimaVez = data.ultimoScrapeo?.toDate() || new Date(0);
        const hoy = new Date();
        const diffDias = Math.floor((hoy.getTime() - ultimaVez.getTime()) / (1000 * 3600 * 24));

        let debeActualizar = false;
        if (data.frecuenciaActualizacion === 'diaria' && diffDias >= 1) debeActualizar = true;
        if (data.frecuenciaActualizacion === 'semanal' && diffDias >= 7) debeActualizar = true;
        if (data.frecuenciaActualizacion === 'mensual' && diffDias >= 30) debeActualizar = true;

        if (debeActualizar && data.webUrl) {
          console.log(`Ejecutando re-escaneo automático para: ${data.webUrl}`);
          try {
            await realizarScrapingRecursoInternal(wsId, webDoc.id, data.webUrl);
          } catch (error) {
            console.error(`Error actualizando web ${webDoc.id} en ws ${wsId}:`, error);
          }
        }
      }
    }
    return;
});

/**
 * realizarScrapingRecursoInternal
 * Helper compartido para ejecutar el scraping y actualizar Firestore.
 */
async function realizarScrapingRecursoInternal(wsId: string, recursoId: string, url: string) {
  const { ejecutarScrapingProfundo } = require('./scraper');
  const db = admin.firestore();
  const docRef = db.doc(`espaciosDeTrabajo/${wsId}/baseConocimiento/${recursoId}`);

  const logProgreso = async (msg: string) => {
    console.log(`[Scraper][${recursoId}] ${msg}`);
    await docRef.update({ errorInfo: `Progreso: ${msg}` }).catch(() => {});
  };

  try {
    await logProgreso("Iniciando navegación...");
    const result = await ejecutarScrapingProfundo(url);

    if (!result.success) {
      await docRef.update({ 
        estado: 'error', 
        errorInfo: `Error: ${result.error || 'Desconocido'}` 
      });
      throw new Error(result.error);
    }

    await logProgreso("Scraping finalizado. Guardando texto...");
    // Actualizar el documento en Firestore con éxito
    await docRef.update({
      contenidoTexto: result.mainText,
      estado: 'activo',
      ultimoScrapeo: admin.firestore.FieldValue.serverTimestamp(),
    });

    await logProgreso(`Scraping finalizado. Texto capturado: ${Math.round(result.mainText.length / 1024)} KB. Iniciando Parsing...`);

    // --- NUEVO: PARSING DE OBJETOS LOCAL (Evita timeouts de Vercel) ---
    try {
      const { ejecutarParsingObjetos } = require('./parser');
      await logProgreso(`Iniciando Parsing IA localmente...`);
      
      const parseResult = await ejecutarParsingObjetos({
        rawText: result.mainText,
        sourceUrl: url,
        wsId,
        recursoId
      });

      console.log(`[Scraper] Parsing IA completado: ${parseResult.objetosCreados} objetos.`);
      await logProgreso(`Finalizado: ${parseResult.objetosCreados} objetos extraídos exitosamente.`);
    } catch (parseErr: any) {
      console.error(`[Scraper] Error en Parsing IA local:`, parseErr);
      await logProgreso(`Error en Parsing: ${parseErr.message}`);
    }

    return result;
  } catch (error: any) {
    await docRef.update({ 
      estado: 'error', 
      errorInfo: `Error: ${error.message}` 
    });
    throw error;
  }
}

/**
 * ejecutarScrapingWeb
 * Disparador: HTTPS (onCall)
 * Responsabilidad: Ejecuta el scraper profundo en un entorno con recursos suficientes (1GB RAM).
 */
export const procesarScrapingWeb = functions
  .runWith({ timeoutSeconds: 300, memory: '512MB' })
  .https.onRequest(async (req, res) => {
    // Manejar CORS manualmente para mayor seguridad
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    try {
      const { wsId, recursoId, url, secret } = req.body.data || req.body;
      
      // Validación básica de seguridad vía token secreto
      if (secret !== 'imala_vox_internal_key') {
        res.status(401).send({ success: false, error: 'No autorizado.' });
        return;
      }

      if (!wsId || !recursoId || !url) {
        res.status(400).send({ success: false, error: 'Faltan parámetros.' });
        return;
      }

      const result = await realizarScrapingRecursoInternal(wsId, recursoId, url);
      res.status(200).send({ success: true, ...result });
    } catch (error: any) {
      console.error('Error en procesarScrapingWeb:', error);
      res.status(500).send({ success: false, error: error.message || 'Error desconocido en el scraper.' });
    }
  });
/**
 * onObjetoCambiado
 * Disparador: Cuando se crea, modifica o elimina un objeto del catálogo
 * Responsabilidad: Incrementar configuracionVersion en todos los agentes
 * para que refresquen la información del catálogo en su system prompt.
 */
export const onObjetoCambiado = functions.firestore
  .document('espaciosDeTrabajo/{wsId}/objetos/{objId}')
  .onWrite(async (change, context) => {
    const { wsId } = context.params;
    try {
      const agentesSnap = await admin.firestore()
        .collection(`espaciosDeTrabajo/${wsId}/agentes`)
        .get();

      if (agentesSnap.empty) return;

      const batch = admin.firestore().batch();
      agentesSnap.docs.forEach(agenteDoc => {
        batch.update(agenteDoc.ref, {
          configuracionVersion: admin.firestore.FieldValue.increment(1),
          actualizadoEl: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      await batch.commit();
      console.log(`Caché invalidado para agentes en ws ${wsId} por cambio en catálogo.`);
    } catch (error) {
      console.error('Error en onObjetoCambiado:', error);
    }
  });

/**
 * onConocimientoCambiado
 * Disparador: Cuando se crea, modifica o elimina un recurso de baseConocimiento
 * Responsabilidad: Incrementar configuracionVersion en todos los agentes
 * que tienen este recurso activo, para invalidar el caché de Claude.
 */
export const onConocimientoCambiado = functions.firestore
  .document('espaciosDeTrabajo/{wsId}/baseConocimiento/{docId}')
  .onWrite(async (change, context) => {
    const { wsId, docId } = context.params;

    try {
      // Buscar todos los agentes del workspace
      const agentesSnap = await admin.firestore()
        .collection(`espaciosDeTrabajo/${wsId}/agentes`)
        .get();

      if (agentesSnap.empty) return;

      const batch = admin.firestore().batch();
      let afectados = 0;

      // Para cada agente, verificar si tiene este recurso activo
      await Promise.all(agentesSnap.docs.map(async (agenteDoc) => {
        const activoRef = agenteDoc.ref.collection('conocimientoActivo').doc(docId);
        const activoSnap = await activoRef.get();

        if (activoSnap.exists && activoSnap.data()?.activo) {
          batch.update(agenteDoc.ref, {
            configuracionVersion: admin.firestore.FieldValue.increment(1),
            actualizadoEl: admin.firestore.FieldValue.serverTimestamp()
          });
          afectados++;
        }
      }));

      if (afectados > 0) {
        await batch.commit();
        console.log(`Caché invalidado para ${afectados} agente(s) en ws ${wsId} por cambio en recurso ${docId}`);
      }
    } catch (error) {
      console.error('Error en onConocimientoCambiado:', error);
    }
  });

/**
 * onActivacionCambiada
 * Disparador: Cuando cambia conocimientoActivo de cualquier agente
 * Responsabilidad: Incrementar configuracionVersion del agente específico
 * para que Claude regenere el caché del system prompt.
 */
export const onActivacionCambiada = functions.firestore
  .document('espaciosDeTrabajo/{wsId}/agentes/{agenteId}/conocimientoActivo/{docId}')
  .onWrite(async (change, context) => {
    const { wsId, agenteId } = context.params;

    try {
      await admin.firestore()
        .doc(`espaciosDeTrabajo/${wsId}/agentes/${agenteId}`)
        .update({
          configuracionVersion: admin.firestore.FieldValue.increment(1),
          actualizadoEl: admin.firestore.FieldValue.serverTimestamp()
        });
      console.log(`Caché invalidado para agente ${agenteId} en ws ${wsId}`);
    } catch (error) {
      console.error('Error en onActivacionCambiada:', error);
    }
  });

/**
 * cronReseteoMensual
 * Disparador: Programado (Día 1 de cada mes)
 * Responsabilidad: Reinicia el contador de uso.convCount de todos los workspaces.
 */
export const cronReseteoMensual = functions.pubsub.schedule('0 0 1 * *')
  .timeZone('America/Argentina/Buenos_Aires')
  .onRun(async () => {
    const db = admin.firestore();
    const workspaces = await db.collection("espaciosDeTrabajo").get();
    const batch = db.batch();

    for (const ws of workspaces.docs) {
      const data = ws.data();
      const plan = data.plan || 'starter';
      const usage = data.uso?.convCount || 0;
      
      // Cálculo de excesos para plan Agencia (Límite 10,000)
      if (plan === 'agencia' && usage > 10000) {
        const exceso = usage - 10000;
        const bloques = Math.ceil(exceso / 100);
        const montoExceso = bloques * 1.80; // $1.80 cada 100 mensajes
      }

      batch.update(ws.ref, { "uso.convCount": 0 });
    }

    await batch.commit();
    console.log(`Consumo reseteado y cargos por exceso procesados para ${workspaces.size} workspaces.`);
  });

/**
 * cronAjusteARS
 * Disparador: Programado (Diario 06:00 AM)
 * Responsabilidad: Obtiene cotización Dólar Blue y actualiza precios en ARS 
 * para workspaces en Argentina.
 */
export const cronAjusteARS = functions.pubsub.schedule('0 9 1 1,4,7,10 *')
  .timeZone('America/Argentina/Buenos_Aires')
  .onRun(async () => {
    const db = admin.firestore();
    try {
      // 1. Obtener cotización Blue + 10% SPREAD
      const resp = await fetch('https://dolarapi.com/v1/dolares/blue');
      const data = await resp.json();
      const blueBase = data.venta;
      if (!blueBase) throw new Error("No se obtuvo precio del dólar");
      
      const blueConSpread = Math.round(blueBase * 1.10); // +10% de margen

      // 2. Obtener planes de la config global
      const configSnap = await db.collection("plataforma").doc("config").get();
      const planes = configSnap.data()?.planes;
      if(!planes) return;

      // 3. Procesar workspaces activos
      const workspaces = await db.collection("espaciosDeTrabajo").where('estado', '==', 'activo').get();
      
      const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN; // Requiere configuración en Functions

      for (const ws of workspaces.docs) {
        const wsData = ws.data();
        const planKey = wsData.plan || 'starter';
        const planConfig = planes[planKey];
        const ciclo = wsData.facturacion?.ciclo || 'mensual';
        
        if (planConfig) {
          const precioUSD = (ciclo === 'anual') ? planConfig.priceYearly : planConfig.priceMonthly;
          const nuevoPrecioARS = Math.round(precioUSD * blueConSpread);

          // Actualizar Firestore
          await ws.ref.update({
            "facturacion.precioARS": nuevoPrecioARS,
            "facturacion.cotizacionUsada": blueConSpread,
            "facturacion.ultimaActualizacion": admin.firestore.FieldValue.serverTimestamp()
          });

          // Si tiene suscripción MP, recrearla para aplicar nuevo precio
          const mpSubId = wsData.facturacion?.mpSuscripcionId;
          if (mpSubId && MP_ACCESS_TOKEN) {
             console.log(`Recreando suscripción ${mpSubId} para WS ${ws.id} con nuevo precio: ${nuevoPrecioARS}`);
             try {
               // A. Cancelar actual
               await fetch(`https://api.mercadopago.com/preapproval/${mpSubId}`, {
                 method: 'PUT',
                 headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
                 body: JSON.stringify({ status: 'cancelled' })
               });

               // B. El usuario deberá re-suscribirse manualmente cuando expire su periodo vigente
               // o podríamos intentar crear una nueva, pero MP requiere intervención del usuario para autorizar debito
               console.log(`Suscripción ${mpSubId} cancelada. El usuario deberá activarla nuevamente con el nuevo precio.`);
             } catch (e) {
               console.error(`Error manejando suscripción MP ${mpSubId}:`, e);
             }
          }
        }
      }

      console.log(`Ajuste trimestral completado. Dólar Blue con Spread: $${blueConSpread}`);
    } catch (err) {
      console.error("Error en cronAjusteARS:", err);
    }
  });

/**
 * cronVerificarPruebasYSuscripciones
 * Disparador: Programado (Diario 00:00 AM)
 * Responsabilidad: Bloquea workspaces con prueba vencida o pago pendiente.
 */
export const cronVerificarPruebasYSuscripciones = functions.pubsub.schedule('0 0 * * *')
  .timeZone('America/Argentina/Buenos_Aires')
  .onRun(async () => {
    const db = admin.firestore();
    const hoy = new Date();
    
    // 1. Verificar Pruebas Vencidas
    const pruebasVencidas = await db.collection("espaciosDeTrabajo")
      .where("estado", "==", "prueba")
      .where("pruebaTerminaEl", "<", admin.firestore.Timestamp.fromDate(hoy))
      .get();

    const batch = db.batch();
    pruebasVencidas.docs.forEach(ws => {
      batch.update(ws.ref, { estado: 'cancelado', "metadata.razonBloqueo": 'prueba_vencida' });
    });

    // 2. Verificar Suscripciones con Pago Vencido (Vigencia cumplida)
    const suscVencidas = await db.collection("espaciosDeTrabajo")
      .where("estado", "==", "activo")
      .where("periodoVigenteHasta", "<", admin.firestore.Timestamp.fromDate(hoy))
      .get();

    suscVencidas.docs.forEach(ws => {
      // Pasamos a pago_vencido para dar gracia de 24hs o bloquear directo
      batch.update(ws.ref, { estado: 'pago_vencido', "metadata.razonBloqueo": 'periodo_cumplido' });
    });

    await batch.commit();
    console.log(`Limpieza diaria: ${pruebasVencidas.size} pruebas vencidas, ${suscVencidas.size} pagos vencidos.`);

  });

/**
 * procesarCampañaDifusion
 * Disparador: Firestore onUpdate — cuando estado cambia a 'en_progreso'
 * Responsabilidad: Envía la plantilla WA a cada contacto filtrado con modo goteo.
 */
export const procesarCampanaDifusion = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .firestore.document("espaciosDeTrabajo/{wsId}/difusiones/{campanaId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.estado === after.estado || after.estado !== "en_progreso") return;

    const { wsId, campanaId } = context.params;
    const db = admin.firestore();
    const campanaRef = change.after.ref;

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    try {
      // ── 1. Plantilla ──
      const plantillaSnap = await db
        .doc(`espaciosDeTrabajo/${wsId}/plantillasMeta/${after.plantillaId}`)
        .get();
      if (!plantillaSnap.exists) throw new Error("Plantilla no encontrada");
      const plantilla = plantillaSnap.data()!;

      const bodyText =
        (plantilla.componentes as any[]).find((c: any) => c.type === "BODY")?.text || "";
      const rawNums: number[] = (bodyText.match(/\{\{(\d+)\}\}/g) || []).map(
        (m: string) => parseInt(m.replace(/[{}]/g, ""), 10)
      );
      const varNums: number[] = [...new Set<number>(rawNums)].sort((a, b) => a - b);
      const maxVar = varNums.length > 0 ? Math.max(...varNums) : 0;

      // ── 2. Canal WhatsApp conectado ──
      const canalesSnap = await db
        .collection(`espaciosDeTrabajo/${wsId}/canales`)
        .where("tipo", "==", "whatsapp")
        .where("status", "==", "connected")
        .limit(1)
        .get();
      if (canalesSnap.empty) throw new Error("No hay canal WhatsApp conectado");

      const canalDoc = canalesSnap.docs[0];
      const canalData = canalDoc.data();
      const canalId = canalDoc.id;
      const phoneNumberId = canalData.metaPhoneNumberId;
      if (!phoneNumberId) throw new Error("Phone Number ID no configurado en el canal");

      // ── 3. Token ──
      const secretSnap = await db
        .doc(`espaciosDeTrabajo/${wsId}/canales/${canalId}/secrets/config`)
        .get();
      if (!secretSnap.exists) throw new Error("Credenciales del canal no encontradas");
      const { metaAccessToken } = secretSnap.data() as any;

      // ── 4. Contactos ──
      const contactosSnap = await db
        .collection(`espaciosDeTrabajo/${wsId}/contactos`)
        .get();
      let contactos = contactosSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .filter((c) => !!c.telefono && !c.optOut);

      if (after.filtroEtiquetas && after.filtroEtiquetas.length > 0) {
        contactos = contactos.filter(
          (c) =>
            Array.isArray(c.etiquetas) &&
            after.filtroEtiquetas.some((tagId: string) => c.etiquetas.includes(tagId))
        );
      }

      await campanaRef.update({ "estadisticas.total": contactos.length });
      console.log(`[difusion] Campaña ${campanaId} → ${contactos.length} contactos`);

      // ── 5. Envío con goteo ──
      let enviados = 0;
      let fallidos = 0;

      for (const contacto of contactos) {
        try {
          // Construir variables en orden posicional
          const variables: string[] = [];
          for (let i = 1; i <= maxVar; i++) {
            variables.push(i === 1 ? contacto.nombre || "" : after.variableValues?.[String(i)] || "");
          }

          // Normalizar número argentino (igual que enviarPlantillaWA)
          let dest: string = contacto.telefono.replace(/\D/g, "");
          if (dest.length === 10) dest = `549${dest}`;
          if (dest.startsWith("549") && dest.length === 13) {
            const rest = dest.substring(3);
            const areaLen = rest.startsWith("11") ? 2 : 3;
            dest = `54${rest.substring(0, areaLen)}15${rest.substring(areaLen)}`;
          }

          const bodyParameters = variables.map((v) => ({ type: "text", text: v }));
          const payload: any = {
            messaging_product: "whatsapp",
            to: dest,
            type: "template",
            template: {
              name: plantilla.nombre,
              language: { code: plantilla.idioma || "es_AR" },
              ...(bodyParameters.length > 0 && {
                components: [{ type: "body", parameters: bodyParameters }],
              }),
            },
          };

          const res = await fetch(
            `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${metaAccessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            }
          );

          const data = await res.json();
          if (res.ok) {
            enviados++;
            await campanaRef.update({ "estadisticas.enviados": enviados });
          } else {
            console.warn(`[difusion] Error para ${dest}:`, data.error?.message);
            fallidos++;
            await campanaRef.update({ "estadisticas.fallidos": fallidos });
          }
        } catch (err) {
          console.error(`[difusion] Error contacto ${contacto.id}:`, err);
          fallidos++;
          await campanaRef.update({ "estadisticas.fallidos": fallidos });
        }

        // Goteo: 2–5 segundos aleatorios entre mensajes
        await sleep(2000 + Math.random() * 3000);
      }

      // ── 6. Finalizar ──
      await campanaRef.update({
        estado: "completada",
        actualizadoEl: admin.firestore.Timestamp.now(),
      });
      console.log(`[difusion] ${campanaId} completada — ${enviados} ok, ${fallidos} fallidos`);
    } catch (error: any) {
      console.error(`[difusion] Error fatal en ${campanaId}:`, error.message);
      await campanaRef.update({
        estado: "error",
        "metadata.errorMsg": error.message,
        actualizadoEl: admin.firestore.Timestamp.now(),
      });
    }
  });

/**
 * mercadopagoWebhook
 * Disparador: HTTP POST (Webhook de MercadoPago)
 * Responsabilidad: Recibe notificaciones de suscripción y activa el plan automáticamente.
 * Registrar en: https://www.mercadopago.com.ar/developers/panel/webhooks
 */
export const mercadopagoWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.sendStatus(405);
    return;
  }

  // Validar firma HMAC-SHA256 si está configurado el secret
  const signature = req.headers["x-signature"] as string | undefined;
  const requestId = req.headers["x-request-id"] as string | undefined;
  const webhookSecret = process.env.MP_WEBHOOK_SECRET;

  if (webhookSecret && signature) {
    const ts = signature.split(",").find((p) => p.startsWith("ts="))?.split("=")[1];
    const v1 = signature.split(",").find((p) => p.startsWith("v1="))?.split("=")[1];
    const resourceId = req.body?.data?.id;
    const manifest = `id:${resourceId};request-id:${requestId};ts:${ts};`;
    const expected = crypto.createHmac("sha256", webhookSecret).update(manifest).digest("hex");

    if (expected !== v1) {
      console.warn("[mp-webhook] Firma inválida — request rechazado");
      res.sendStatus(401);
      return;
    }
  }

  // Responder 200 inmediatamente (MP requiere respuesta en < 5s)
  res.sendStatus(200);

  const { type, data } = req.body || {};
  if (type !== "preapproval" || !data?.id) return;

  const preapprovalId = String(data.id);
  const db = admin.firestore();
  const accessToken = process.env.MP_ACCESS_TOKEN;

  if (!accessToken) {
    console.error("[mp-webhook] MP_ACCESS_TOKEN no configurado");
    return;
  }

  try {
    // 1. Consultar estado actualizado en MP
    const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!mpRes.ok) {
      console.error(`[mp-webhook] Error MP API ${mpRes.status} para ${preapprovalId}`);
      return;
    }
    const suscripcion = await mpRes.json();
    console.log(`[mp-webhook] preapproval ${preapprovalId} → status: ${suscripcion.status}`);

    // 2. Buscar workspace con esta suscripción
    const wsSnap = await db
      .collection("espaciosDeTrabajo")
      .where("facturacion.mpSuscripcionId", "==", preapprovalId)
      .limit(1)
      .get();

    if (wsSnap.empty) {
      console.warn(`[mp-webhook] Sin workspace para preapproval ${preapprovalId}`);
      return;
    }

    const wsDoc = wsSnap.docs[0];
    const ws = wsDoc.data();

    // 3. Mapear estado MP → estado interno
    const estadoMap: Record<string, string> = {
      authorized: "activo",
      paused:     "pago_vencido",
      cancelled:  "cancelado",
      pending:    "prueba",
    };
    const nuevoEstado = estadoMap[suscripcion.status] || "pago_vencido";
    const ciclo = ws.facturacion?.ciclo || "mensual";

    const periodoHasta = new Date();
    if (ciclo === "anual") periodoHasta.setFullYear(periodoHasta.getFullYear() + 1);
    else periodoHasta.setMonth(periodoHasta.getMonth() + 1);

    const updates: Record<string, any> = {
      estado: nuevoEstado,
      periodoVigenteHasta: admin.firestore.Timestamp.fromDate(periodoHasta),
      actualizadoEl: admin.firestore.FieldValue.serverTimestamp(),
    };

    // 4. Si el pago se confirmó y hay un plan pendiente, activarlo
    if (nuevoEstado === "activo" && ws.facturacion?.planPendiente) {
      const planPend = ws.facturacion.planPendiente as string;
      updates.plan = planPend;
      updates["facturacion.planPendiente"] = null;
      updates["facturacion.precioARS"] = suscripcion.auto_recurring?.transaction_amount || 0;
      updates["facturacion.precioFijadoEl"] = admin.firestore.FieldValue.serverTimestamp();
    }

    await wsDoc.ref.update(updates);

    if (nuevoEstado === "activo" && updates.plan) {
      await wsDoc.ref.collection("notificaciones").add({
        tipo: "info",
        titulo: "Pago confirmado",
        mensaje: `Tu plan ${updates.plan} está activo. ¡Gracias!`,
        visto: false,
        creadoEl: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`[mp-webhook] ✅ Plan ${updates.plan} activado para workspace ${wsDoc.id}`);
    } else {
      console.log(`[mp-webhook] Workspace ${wsDoc.id} → estado: ${nuevoEstado}`);
    }
  } catch (err) {
    console.error("[mp-webhook] Error procesando notificación:", err);
  }
});
