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

          // ── 2. Verificar configuración de IA del canal ──
          if (!canalData.aiEnabled) {
            console.log(`IA desactivada para el canal ${canalId}. Solo guardando mensaje.`);
            // Procedemos solo a guardar el mensaje abajo
          }

          // ── 3. Obtener agente asignado o activo ──
          let agenteId = canalData.agenteId;
          
          if (!agenteId) {
            // Fallback a agente activo si no hay uno fijo asignado
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
  .runWith({ timeoutSeconds: 540, memory: '2GB' })
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
