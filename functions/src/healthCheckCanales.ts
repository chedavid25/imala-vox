import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

const META_APP_SECRET = defineSecret("META_APP_SECRET");
const META_APP_ID = defineSecret("META_APP_ID");

type HealthStatus =
  | "ok"
  | "token_invalid"
  | "missing_scope"
  | "no_subscription"
  | "no_activity_30d"
  | "unknown_error";

interface HealthResult {
  healthStatus: HealthStatus;
  healthIssue: string | null;
  detalle?: string;
}

/**
 * Health check diario de todos los canales conectados a Meta.
 * Verifica validez del token, scopes y suscripción de webhooks.
 * Si algo no está bien, marca el canal y genera notificación in-app al workspace.
 */
export const healthCheckCanales = onSchedule(
  {
    schedule: "every day 08:00",
    timeZone: "America/Argentina/Buenos_Aires",
    timeoutSeconds: 540,
    memory: "512MiB",
    secrets: [META_APP_SECRET, META_APP_ID],
  },
  async (_event) => {
    const db = admin.firestore();
    const appId = META_APP_ID.value();
    const appSecret = META_APP_SECRET.value();

    logger.info("[HEALTH-CHECK] Iniciando chequeo diario de canales Meta");

    const wsSnap = await db.collection("espaciosDeTrabajo").get();
    let canalesChequeados = 0;
    let canalesConProblema = 0;

    for (const wsDoc of wsSnap.docs) {
      const wsId = wsDoc.id;
      const canalesSnap = await wsDoc.ref
        .collection("canales")
        .where("status", "==", "connected")
        .get();

      for (const canalDoc of canalesSnap.docs) {
        const canalId = canalDoc.id;
        const canalData = canalDoc.data();
        canalesChequeados++;

        try {
          const result = await chequearCanal(
            db,
            wsId,
            canalId,
            canalData,
            appId,
            appSecret
          );

          await canalDoc.ref.update({
            healthStatus: result.healthStatus,
            healthIssue: result.healthIssue,
            lastHealthCheck: admin.firestore.Timestamp.now(),
          });

          if (result.healthStatus !== "ok") {
            canalesConProblema++;
            await crearNotificacionSalud(
              db,
              wsId,
              canalId,
              canalData,
              result
            );
          } else {
            // Si volvió a OK después de estar en error, marcar como visto las notificaciones anteriores
            await marcarNotificacionesPreviasComoResueltas(db, wsId, canalId);
          }
        } catch (err: any) {
          logger.error(
            `[HEALTH-CHECK] Error chequeando canal ${canalId} en ws ${wsId}:`,
            err.message
          );
        }
      }
    }

    logger.info(
      `[HEALTH-CHECK] Completado. Canales chequeados: ${canalesChequeados}. Con problemas: ${canalesConProblema}`
    );
  }
);

async function chequearCanal(
  db: admin.firestore.Firestore,
  wsId: string,
  canalId: string,
  canalData: admin.firestore.DocumentData,
  appId: string,
  appSecret: string
): Promise<HealthResult> {
  // 1. Obtener token
  const secretSnap = await db
    .doc(`espaciosDeTrabajo/${wsId}/canales/${canalId}/secrets/config`)
    .get();

  if (!secretSnap.exists) {
    return {
      healthStatus: "token_invalid",
      healthIssue: "No existe el documento de credenciales del canal",
    };
  }
  const token = secretSnap.data()?.metaAccessToken;
  if (!token) {
    return {
      healthStatus: "token_invalid",
      healthIssue: "El campo metaAccessToken está vacío",
    };
  }

  // 2. Verificar token con debug_token
  const dbgRes = await fetch(
    `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${appId}|${appSecret}`
  );
  const dbg = (await dbgRes.json()) as any;
  const dbgData = dbg.data;

  if (!dbgRes.ok || !dbgData) {
    return {
      healthStatus: "token_invalid",
      healthIssue: "No se pudo validar el token con Meta",
    };
  }

  if (!dbgData.is_valid) {
    return {
      healthStatus: "token_invalid",
      healthIssue: `Token inválido o expirado. Reconectá la cuenta desde "Vincular con Meta".`,
      detalle: dbgData.error?.message,
    };
  }

  const scopes: string[] = dbgData.scopes || [];
  const tipo = canalData.tipo;

  // 3. Verificación específica por tipo de canal
  if (tipo === "facebook") {
    return await chequearCanalFacebook(canalData, token, scopes);
  }
  if (tipo === "instagram") {
    return await chequearCanalInstagram(canalData, token, scopes);
  }
  if (tipo === "whatsapp") {
    return await chequearCanalWhatsApp(canalData, token, scopes);
  }

  // Tipo desconocido o web — saltar
  return { healthStatus: "ok", healthIssue: null };
}

async function chequearCanalFacebook(
  canalData: admin.firestore.DocumentData,
  token: string,
  scopes: string[]
): Promise<HealthResult> {
  const pageId = canalData.metaPageId;
  if (!pageId) {
    return { healthStatus: "unknown_error", healthIssue: "Falta metaPageId" };
  }

  if (!scopes.includes("pages_messaging")) {
    return {
      healthStatus: "missing_scope",
      healthIssue:
        'El token no tiene el permiso "pages_messaging". Reconectá la página otorgando todos los permisos.',
    };
  }

  // Verificar subscribed_apps
  const subsRes = await fetch(
    `https://graph.facebook.com/v19.0/${pageId}/subscribed_apps?access_token=${encodeURIComponent(
      token
    )}`
  );
  const subs = (await subsRes.json()) as any;
  if (!subsRes.ok) {
    return {
      healthStatus: "no_subscription",
      healthIssue: `Meta rechazó la consulta de webhooks (${subs.error?.message || subsRes.status})`,
    };
  }

  const apps = subs.data || [];
  if (apps.length === 0) {
    return {
      healthStatus: "no_subscription",
      healthIssue:
        "La página no tiene ninguna app suscrita a webhooks. Volvé a sincronizar desde el botón Configurar del canal.",
    };
  }

  const fields = (apps[0].subscribed_fields || []).map((f: any) =>
    typeof f === "string" ? f : f.name
  );
  if (!fields.includes("messages")) {
    return {
      healthStatus: "no_subscription",
      healthIssue:
        'Falta la suscripción al evento "messages" en el webhook. Sincronizá nuevamente.',
    };
  }

  // Si tiene scope leads_retrieval pero no leadgen suscrito, advertir
  if (scopes.includes("leads_retrieval") && !fields.includes("leadgen")) {
    return {
      healthStatus: "no_subscription",
      healthIssue:
        'Tu cuenta tiene permiso de leads pero el webhook no está suscrito a "leadgen". Los leads de Meta Ads no van a llegar.',
    };
  }

  return { healthStatus: "ok", healthIssue: null };
}

async function chequearCanalInstagram(
  canalData: admin.firestore.DocumentData,
  token: string,
  scopes: string[]
): Promise<HealthResult> {
  if (!scopes.includes("instagram_manage_messages")) {
    return {
      healthStatus: "missing_scope",
      healthIssue:
        'El token no tiene el permiso "instagram_manage_messages". Reconectá la página.',
    };
  }

  const pageId = canalData.metaPageId;
  if (!pageId) return { healthStatus: "ok", healthIssue: null };

  const subsRes = await fetch(
    `https://graph.facebook.com/v19.0/${pageId}/subscribed_apps?access_token=${encodeURIComponent(
      token
    )}`
  );
  if (!subsRes.ok) {
    return {
      healthStatus: "no_subscription",
      healthIssue: "No se pudo verificar la suscripción del webhook de Instagram.",
    };
  }

  return { healthStatus: "ok", healthIssue: null };
}

async function chequearCanalWhatsApp(
  canalData: admin.firestore.DocumentData,
  token: string,
  scopes: string[]
): Promise<HealthResult> {
  const phoneId = canalData.metaPhoneNumberId;
  if (!phoneId) {
    return {
      healthStatus: "unknown_error",
      healthIssue: "Falta metaPhoneNumberId en el canal",
    };
  }

  if (
    !scopes.includes("whatsapp_business_messaging") &&
    !scopes.includes("whatsapp_business_management")
  ) {
    return {
      healthStatus: "missing_scope",
      healthIssue:
        "El token no tiene permisos de WhatsApp Business. Reconectá el número.",
    };
  }

  const phoneRes = await fetch(
    `https://graph.facebook.com/v19.0/${phoneId}?fields=display_phone_number,verified_name&access_token=${encodeURIComponent(
      token
    )}`
  );
  if (!phoneRes.ok) {
    const err = (await phoneRes.json()) as any;
    return {
      healthStatus: "no_subscription",
      healthIssue: `No se pudo acceder al número en Meta: ${
        err.error?.message || phoneRes.statusText
      }`,
    };
  }

  return { healthStatus: "ok", healthIssue: null };
}

async function crearNotificacionSalud(
  db: admin.firestore.Firestore,
  wsId: string,
  canalId: string,
  canalData: admin.firestore.DocumentData,
  result: HealthResult
) {
  const notiId = `canal_health_${canalId}`;
  const notiRef = db
    .collection("espaciosDeTrabajo")
    .doc(wsId)
    .collection("notificaciones");

  // Evitar duplicar: si hay notificación pendiente sin ver con mismo metadata.id, actualizar en lugar de crear
  const yaExiste = await notiRef
    .where("metadata.id", "==", notiId)
    .where("visto", "==", false)
    .limit(1)
    .get();

  const payload = {
    tipo: "alerta" as const,
    titulo: `Problema en canal: ${canalData.nombre || canalData.tipo}`,
    mensaje: result.healthIssue || "Hay un problema con este canal de Meta.",
    visto: false,
    creadoEl: admin.firestore.FieldValue.serverTimestamp(),
    metadata: {
      id: notiId,
      canalId,
      canalTipo: canalData.tipo,
      healthStatus: result.healthStatus,
    },
  };

  if (yaExiste.empty) {
    await notiRef.add(payload);
    logger.info(
      `[HEALTH-CHECK] Notificación creada para ws ${wsId}, canal ${canalId}: ${result.healthStatus}`
    );
  } else {
    // Actualizar la existente
    await yaExiste.docs[0].ref.update({
      mensaje: payload.mensaje,
      metadata: payload.metadata,
      creadoEl: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

async function marcarNotificacionesPreviasComoResueltas(
  db: admin.firestore.Firestore,
  wsId: string,
  canalId: string
) {
  const notiId = `canal_health_${canalId}`;
  const pendientes = await db
    .collection("espaciosDeTrabajo")
    .doc(wsId)
    .collection("notificaciones")
    .where("metadata.id", "==", notiId)
    .where("visto", "==", false)
    .get();

  for (const doc of pendientes.docs) {
    await doc.ref.update({
      visto: true,
      resueltoEl: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}
