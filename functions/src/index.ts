import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

admin.initializeApp();

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
  const planType = data.planType; // 'starter' | 'pro' | 'agencia'

  if (!workspaceId || !planType) {
    throw new functions.https.HttpsError("invalid-argument", "Faltan parámetros requeridos.");
  }

  const workspaceDoc = await admin.firestore().collection("espaciosDeTrabajo").doc(workspaceId).get();
  if (!workspaceDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Espacio de trabajo no encontrado.");
  }

  const usage = workspaceDoc.data()?.uso;
  const configDoc = await admin.firestore().collection("plataforma").doc("config").get();
  const planesConfig = configDoc.data()?.planes;

  if (!planesConfig || !planesConfig[planType]) {
    return { allowed: true, reason: "Configuración global no encontrada." };
  }

  const limit = planesConfig[planType].convCountIA;
  if (usage.convCount >= limit) {
    return { allowed: false, reason: `Límite alcanzado (${limit}).` };
  }

  return { allowed: true };
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
          
          // Buscar workspace por phoneNumberId en la subcolección 'canales'
          const canalSnap = await admin.firestore()
            .collectionGroup('canales')
            .where('phoneNumberId', '==', phoneNumberId)
            .where('tipo', '==', 'whatsapp')
            .limit(1).get();

          if (canalSnap.empty) {
            console.warn(`phoneNumberId ${phoneNumberId} no mapeado a ningún workspace`);
            res.sendStatus(200); return;
          }

          // Obtener workspaceId del path: espaciosDeTrabajo/{wsId}/canales/{canalId}
          const canalRef = canalSnap.docs[0].ref;
          const workspaceId = canalRef.path.split('/')[1];

          console.log(`Msg de ${from}: ${text} → ws: ${workspaceId}`);
          
          // TODO Fase 2: disparar procesarRespuestaIA aquí
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
    
    const workspaces = await admin.firestore().collection("espaciosDeTrabajo").get();
    
    for (const ws of workspaces.docs) {
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

        if (debeActualizar) {
          console.log(`Programando re-escaneo para: ${data.webUrl}`);
          await webDoc.ref.update({ estado: 'pendiente' });
          // NOTA: Aquí se llamaría a la lógica de scraping centralizada
        }
      }
    }
    
    return;
});

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
      // Importar dinámicamente el scraper
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

      return { success: true, propertyCount: result.propertyCount };
    } catch (error: any) {
      console.error('Error en ejecutarScrapingWeb:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Error desconocido en el scraper.');
    }
  });
