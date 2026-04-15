import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import {
  procesarConIA,
  enviarMensajeWhatsApp,
  obtenerOCrearContacto,
  obtenerOCrearConversacion,
  extraerMetadatosIA
} from "./ai";

admin.initializeApp();

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
        // Obtener el phoneNumberId del metadata del webhook
        const phoneNumberId = value?.metadata?.phone_number_id;

        if (message && phoneNumberId) {
          const from = message.from;
          const text = message.text?.body;

          // Solo procesar mensajes de texto (por ahora)
          if (!text) {
            console.log("Mensaje sin texto (imagen/audio), ignorando.");
            res.sendStatus(200); return;
          }

          // ── Buscar workspace por phoneNumberId ──
          const canalSnap = await admin.firestore()
            .collectionGroup('canales')
            .where('phoneNumberId', '==', phoneNumberId)
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

          // ── 2. Verificar aiBlocked ──
          if (contactoData.aiBlocked === true) {
            console.log(`Contacto ${from} bloqueado para IA. Sin respuesta automática.`);
            res.sendStatus(200); return;
          }

          // ── 3. Obtener agente activo del workspace ──
          const agentesSnap = await admin.firestore()
            .collection(`espaciosDeTrabajo/${workspaceId}/agentes`)
            .where('activo', '==', true)
            .limit(1)
            .get();

          if (agentesSnap.empty) {
            console.warn(`No hay agentes activos en workspace ${workspaceId}`);
            res.sendStatus(200); return;
          }

          const agenteId = agentesSnap.docs[0].id;
          const agenteData = agentesSnap.docs[0].data();

          // ── 4. Obtener o crear conversación ──
          const convDoc = await obtenerOCrearConversacion(
            workspaceId, contactoDoc.id, agenteId, canalId
          );
          const convId = convDoc.id;
          const convData = convDoc.data()!;

          // ── 5. Verificar modo ──
          if (convData.modoIA === 'pausado') {
            console.log(`Conversación ${convId} pausada, sin respuesta IA.`);
            res.sendStatus(200); return;
          }

          // ── 6. Guardar mensaje entrante ──
          await admin.firestore()
            .collection(`espaciosDeTrabajo/${workspaceId}/conversaciones/${convId}/mensajes`)
            .add({
              text,
              from: 'user',
              creadoEl: admin.firestore.Timestamp.now(),
              visto: false
            });

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
          if (convData.modoIA === 'copiloto' || agenteData.modoDefault === 'copiloto') {
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
  const { workspaceId, conversationId, userMessage } = data;

  console.log(`Procesando respuesta IA para workspace ${workspaceId}, conv ${conversationId}`);

  // TODO: Fase 2
  // 1. Consultar base de conocimiento/recursos
  // 2. Llamada a Anthropic SDK (Claude) con el contexto
  // 3. Validar límites de tokens
  // 4. Enviar mensaje respuesta vía WhatsApp Cloud API
  

  return { 
    status: 'success', 
    message: 'Esqueleto procesado — esperando implementación de Fase 2 (Cognitive).' 
  };
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
  const result = await ejecutarScrapingProfundo(url);

  if (!result.success) {
    throw new Error(result.error);
  }

  // Actualizar el documento en Firestore
  await admin.firestore()
    .doc(`espaciosDeTrabajo/${wsId}/baseConocimiento/${recursoId}`)
    .update({
      contenidoTexto: result.mainText,
      estado: 'activo',
      ultimoScrapeo: admin.firestore.FieldValue.serverTimestamp(),
    });

  return result;
}

/**
 * ejecutarScrapingWeb
 * Disparador: HTTPS (onCall)
 * Responsabilidad: Ejecuta el scraper profundo en un entorno con recursos suficientes (1GB RAM).
 */
export const ejecutarScrapingWeb = functions
  .runWith({ timeoutSeconds: 300, memory: '1GB' })
  .https.onCall(async (data: any, context: functions.https.CallableContext) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado.');
    }

    const { wsId, recursoId, url } = data;
    if (!wsId || !recursoId || !url) {
      throw new functions.https.HttpsError('invalid-argument', 'Faltan parámetros (wsId, recursoId, url).');
    }

    try {
      const result = await realizarScrapingRecursoInternal(wsId, recursoId, url);
      return { success: true, propertyCount: result.propertyCount };
    } catch (error: any) {
      console.error('Error en ejecutarScrapingWeb:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Error desconocido en el scraper.');
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
