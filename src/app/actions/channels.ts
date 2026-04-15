'use server'

import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/types/firestore";

/**
 * Guarda el token de acceso de Meta de forma segura en una subcolección privada.
 * Solo accesible desde el Admin SDK.
 */
export async function guardarTokenCanal(wsId: string, canalId: string, token: string) {
  try {
    if (!wsId || !canalId || !token) {
      throw new Error("Parámetros insuficientes para guardar el secreto del canal");
    }

    const secretPath = `${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CANALES}/${canalId}/secrets/config`;
    
    await adminDb.doc(secretPath).set({ 
      metaAccessToken: token, 
      actualizadoEl: Timestamp.now() 
    });

    return { success: true };
  } catch (error) {
    console.error("Error guardando token de canal:", error);
    return { success: false, error: "No se pudo guardar la configuración segura del canal" };
  }
}
