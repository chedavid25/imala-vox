'use server'

import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/types/firestore';
import { revalidatePath } from 'next/cache';

/**
 * Guarda el token de acceso de Meta de forma segura en una subcolección privada.
 * Solo accesible desde el Admin SDK.
 */
async function guardarTokenCanal(wsId: string, canalId: string, token: string) {
  try {
    const secretPath = `${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CANALES}/${canalId}/secrets/config`;
    await adminDb.doc(secretPath).set({
      metaAccessToken: token,
      actualizadoEl: Timestamp.now(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error guardando token de canal:", error);
    throw new Error("No se pudo guardar la configuración segura del canal");
  }
}

export async function conectarCanalManual(wsId: string, datos: {
  tipo: 'whatsapp' | 'instagram' | 'facebook';
  nombre: string;
  cuenta: string;
  metaPageId?: string;
  metaPhoneNumberId?: string;
  metaInstagramId?: string;
  accessToken: string;
}) {
  try {
    if (!wsId) throw new Error("ID de espacio de trabajo no proporcionado");

    // 1. Verificar que el token es válido consultando Meta Graph API
    // Usamos v19.0 como base estable
    const verificacion = await fetch(
      `https://graph.facebook.com/v19.0/me?access_token=${datos.accessToken}`
    );

    if (!verificacion.ok) {
      const errData = await verificacion.json().catch(() => ({}));
      return { 
        success: false, 
        error: `El token de acceso no es válido. Meta respondió: ${errData.error?.message || 'Token inválido o expirado'}` 
      };
    }

    // 2. Buscar si ya existe un canal de este tipo en el workspace
    const canalesSnap = await adminDb
      .collection(COLLECTIONS.ESPACIOS).doc(wsId)
      .collection(COLLECTIONS.CANALES)
      .where('tipo', '==', datos.tipo)
      .limit(1)
      .get();

    let canalId: string;

    const baseData = {
      tipo: datos.tipo,
      nombre: datos.nombre,
      cuenta: datos.cuenta,
      metaPageId: datos.metaPageId || null,
      metaPhoneNumberId: datos.metaPhoneNumberId || null,
      metaInstagramId: datos.metaInstagramId || null,
      status: 'connected' as const,
      webhookVerified: false,
      actualizadoEl: Timestamp.now(),
    };

    if (!canalesSnap.empty) {
      // Actualizar canal existente
      canalId = canalesSnap.docs[0].id;
      await adminDb
        .collection(COLLECTIONS.ESPACIOS).doc(wsId)
        .collection(COLLECTIONS.CANALES).doc(canalId)
        .update(baseData);
    } else {
      // Crear nuevo canal
      const canalRef = await adminDb
        .collection(COLLECTIONS.ESPACIOS).doc(wsId)
        .collection(COLLECTIONS.CANALES)
        .add({
          ...baseData,
          creadoEl: Timestamp.now(),
        });
      canalId = canalRef.id;
    }

    // 3. Guardar token en subcolección privada
    await guardarTokenCanal(wsId, canalId, datos.accessToken);

    // 4. Guardar pageId en el documento del workspace para búsquedas rápidas delegadas
    if (datos.metaPageId) {
      const FieldValue = require('firebase-admin').firestore.FieldValue;
      await adminDb.doc(`${COLLECTIONS.ESPACIOS}/${wsId}`).update({
        canalesPageIds: FieldValue.arrayUnion(datos.metaPageId),
        actualizadoEl: Timestamp.now(),
      });
    }

    revalidatePath('/dashboard/ajustes/canales');
    return { success: true, canalId };

  } catch (error: any) {
    console.error('Error conectando canal:', error);
    return { success: false, error: error.message || "Error interno del servidor" };
  }
}

export async function desconectarCanal(wsId: string, canalId: string) {
  try {
    if (!wsId || !canalId) throw new Error("IDs insuficientes");

    await adminDb
      .collection(COLLECTIONS.ESPACIOS).doc(wsId)
      .collection(COLLECTIONS.CANALES).doc(canalId)
      .update({
        status: 'disconnected',
        actualizadoEl: Timestamp.now(),
      });

    revalidatePath('/dashboard/ajustes/canales');
    return { success: true };
  } catch (error: any) {
    console.error("Error desconectando canal:", error);
    return { success: false, error: error.message };
  }
}
