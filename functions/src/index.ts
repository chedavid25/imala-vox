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

  // 1. Obtener uso actual del workspace
  const workspaceDoc = await admin.firestore().collection("espaciosDeTrabajo").doc(workspaceId).get();
  
  if (!workspaceDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Espacio de trabajo no encontrado.");
  }

  const usage = workspaceDoc.data()?.uso;
  
  // 2. Obtener límites globales desde plataforma/config
  const configDoc = await admin.firestore().collection("plataforma").doc("config").get();
  const planesConfig = configDoc.data()?.planes;

  if (!planesConfig || !planesConfig[planType]) {
    // Fallback simple si no hay config en Firestore aún (para Fase 0/1)
    return { 
      allowed: true, 
      reason: "Configuración global no encontrada, permitiendo por defecto durante desarrollo." 
    };
  }

  const limit = planesConfig[planType].convCountIA;

  if (usage.convCount >= limit) {
    return {
      allowed: false,
      reason: `Has alcanzado el límite de conversaciones de tu plan (${limit}).`,
      limit,
      current: usage.convCount
    };
  }

  return { allowed: true };
});
