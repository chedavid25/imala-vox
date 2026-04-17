'use server'

import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/types/firestore';
import { revalidatePath } from 'next/cache';

/**
 * Guarda el token de acceso de Meta de forma segura en una subcolección privada.
 * Solo accesible desde el Admin SDK.
 */
export async function guardarTokenCanal(wsId: string, canalId: string, token: string) {
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

/**
 * Llama a la API de Meta para suscribir la App a los webhooks de la Página.
 * Esto automatiza la configuración para el cliente final.
 */
export async function sincronizarWebhooks(wsId: string, canalId: string) {
  try {
    // 1. Obtener el ID de la página del documento del canal
    const canalPath = `${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CANALES}/${canalId}`;
    const canalSnap = await adminDb.doc(canalPath).get();
    
    if (!canalSnap.exists) {
      throw new Error("No se encontró el canal configurado");
    }
    
    const canalData = canalSnap.data() as any;
    const metaPageId = canalData.metaPageId;

    // 2. Obtener el token de acceso de la página desde los secretos
    const secretPath = `${canalPath}/secrets/config`;
    const secretSnap = await adminDb.doc(secretPath).get();

    if (!secretSnap.exists) {
      throw new Error("No se encontraron los secretos del canal");
    }

    const { metaAccessToken } = secretSnap.data() as any;

    if (!metaAccessToken || !metaPageId) {
      throw new Error("Faltan credenciales de Meta (Access Token o Page ID) para la sincronización");
    }

    // 2. Llamar a Meta Graph API para suscribir la App a la Página
    // Endpoint: POST /{page-id}/subscribed_apps
    const res = await fetch(`https://graph.facebook.com/v19.0/${metaPageId}/subscribed_apps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: metaAccessToken,
        subscribed_fields: [
          "messages",
          "messaging_postbacks",
          "messaging_optins",
          "message_deliveries",
          "message_reads",
          "leadgen"
        ].join(",")
      }),
    });

    const data = await res.json();

    if (!data.success) {
      console.error("Error al suscribir webhooks en Meta:", data);
      return { success: false, error: data.error?.message || "Error desconocido en Meta" };
    }

    // 3. Marcar el canal como verificado en Firestore
    await adminDb.doc(`${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CANALES}/${canalId}`).update({
      webhookVerified: true,
      actualizadoEl: Timestamp.now()
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error en sincronizarWebhooks:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Actualiza la configuración de IA del canal (Switch on/off y Agente asignado).
 */
export async function configurarCanalIA(wsId: string, canalId: string, config: { aiEnabled: boolean; agenteId: string | null }) {
  try {
    if (!wsId || !canalId) throw new Error("IDs insuficientes");

    await adminDb
      .collection(COLLECTIONS.ESPACIOS).doc(wsId)
      .collection(COLLECTIONS.CANALES).doc(canalId)
      .update({
        aiEnabled: config.aiEnabled,
        agenteId: config.agenteId,
        actualizadoEl: Timestamp.now(),
      });

    revalidatePath('/dashboard/ajustes/canales');
    return { success: true };
  } catch (error: any) {
    console.error("Error configurando IA del canal:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Envía un mensaje real a través de las APIs de Meta (WhatsApp, Instagram o Facebook).
 */
export async function enviarMensajeAccion(
  wsId: string, 
  canalId: string, 
  destinatario: string, 
  texto: string,
  media?: { url: string; tipo: 'image' | 'video' | 'document' }
) {
  try {
    if (!wsId || !canalId || !destinatario || (!texto && !media)) throw new Error("Faltan parámetros de envío");

    const canalPath = `${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CANALES}/${canalId}`;
    const canalSnap = await adminDb.doc(canalPath).get();
    if (!canalSnap.exists) throw new Error("Canal no encontrado");
    
    const canalData = canalSnap.data() as any;
    const secretSnap = await adminDb.doc(`${canalPath}/secrets/config`).get();
    if (!secretSnap.exists) throw new Error("Credenciales de canal no encontradas");
    
    const { metaAccessToken } = secretSnap.data() as any;

    let url = "";
    let body: any = {};

    if (canalData.tipo === 'whatsapp') {
      const phoneNumberId = canalData.metaPhoneNumberId;
      if (!phoneNumberId) throw new Error("ID de teléfono no configurado para WhatsApp");
      url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
      
      if (media) {
        body = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: destinatario,
          type: media.tipo,
          [media.tipo]: { link: media.url, caption: texto || "" }
        };
      } else {
        body = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: destinatario,
          type: "text",
          text: { body: texto }
        };
      }
    } else {
      // Instagram o Facebook use Messenger API
      url = `https://graph.facebook.com/v19.0/me/messages`; 
      
      if (media) {
        body = {
          recipient: { id: destinatario },
          message: {
            attachment: {
              type: media.tipo,
              payload: { url: media.url, is_selectable: true }
            }
          }
        };
      } else {
        body = {
          recipient: { id: destinatario },
          message: { text: texto }
        };
      }
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${metaAccessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Error en Meta API:", data);
      return { success: false, error: data.error?.message || "Error al enviar mensaje vía Meta" };
    }

    return { success: true, messageId: data.message_id || data.wam_id };

  } catch (error: any) {
    console.error("Error en enviarMensajeAccion:", error);
    return { success: false, error: error.message };
  }
}
