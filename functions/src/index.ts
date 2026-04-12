import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

/**
 * checkLimitesPlantilla
 * Disparador: Antes de cada acción del agente (Llamada interna)
 * Responsabilidad: Lee uso actual vs plataforma/config.planes — bloquea si supera límite
 */
export const checkLimitesPlantilla = functions.https.onCall(async (data, context) => {
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
export const recibirMensajeWhatsApp = functions.https.onRequest(async (req, res) => {
  // 1. Verificación del Webhook (GET)
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    // Se recomienda guardar el VERIFY_TOKEN en las variables de entorno de functions
    if (mode === "subscribe" && token === "imala_vox_verify_token") {
      res.status(200).send(challenge);
      return;
    } else {
      res.sendStatus(403);
      return;
    }
  }

  // 2. Recepción del Mensaje (POST)
  if (req.method === "POST") {
    const body = req.body;

    if (body.object === "whatsapp_business_account") {
      try {
        // Estructura simplificada de Meta:
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];

        if (message) {
          const from = message.from; // Teléfono del cliente
          const text = message.text?.body;
          const workspaceId = "default_workspace"; // Lógica para determinar el workspace vía WABA ID

          console.log(`Mensaje recibido de ${from}: ${text}`);

          // Aquí se dispararía la lógica de:
          // 1. Buscar/Crear contacto
          // 2. Crear/Actualizar conversación
          // 3. Guardar mensaje en Firestore
          // 4. Disparar procesarRespuestaIA
        }

        res.sendStatus(200);
      } catch (error) {
        console.error("Error procesando webhook:", error);
        res.sendStatus(500);
      }
    } else {
      res.sendStatus(404);
    }
  }
});

/**
 * procesarRespuestaIA
 * Disparador: Manual (Llamada interna tras recibir un mensaje)
 * Responsabilidad: Esqueleto para procesar el mensaje con Claude y generar respuesta.
 */
export const procesarRespuestaIA = functions.https.onCall(async (data, context) => {
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
