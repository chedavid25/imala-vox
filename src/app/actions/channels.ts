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

/**
 * Elimina físicamente un canal y sus secretos de la base de datos.
 * Esto permite limpiar el dashboard de conexiones fallidas o antiguas.
 */
export async function eliminarCanal(wsId: string, canalId: string) {
  try {
    if (!wsId || !canalId) throw new Error("IDs insuficientes");

    const canalPath = `${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CANALES}/${canalId}`;
    
    // 1. Borrar secretos (subcolección)
    await adminDb.doc(`${canalPath}/secrets/config`).delete().catch(() => {});
    
    // 2. Borrar documento principal
    await adminDb.doc(canalPath).delete();

    revalidatePath('/dashboard/ajustes/canales');
    return { success: true };
  } catch (error: any) {
    console.error("Error eliminando canal:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Llama a la API de Meta para suscribir la App a los webhooks de la Página.
 * Esto automatiza la configuración para el cliente final.
 */
export async function sincronizarWebhooks(wsId: string, canalId: string) {
  try {
    const canalPath = `${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CANALES}/${canalId}`;
    const canalSnap = await adminDb.doc(canalPath).get();

    if (!canalSnap.exists) {
      throw new Error("No se encontró el canal configurado");
    }

    const canalData = canalSnap.data() as any;
    const metaPageId = canalData.metaPageId;

    const secretPath = `${canalPath}/secrets/config`;
    const secretSnap = await adminDb.doc(secretPath).get();

    if (!secretSnap.exists) {
      throw new Error("No se encontraron los secretos del canal");
    }

    const { metaAccessToken } = secretSnap.data() as any;

    if (!metaAccessToken || !metaPageId) {
      throw new Error("Faltan credenciales de Meta (Access Token o Page ID) para la sincronización");
    }

    // 🔧 FIX: subscribed_fields debe ir como QUERY STRING separado por comas,
    // NO como JSON body. Meta Graph API ignora silenciosamente los campos
    // cuando se envían en el body JSON en este endpoint.
    const subscribedFields = [
      "messages",
      "messaging_postbacks",
      "messaging_optins",
      "message_deliveries",
      "message_reads",
      "leadgen"
    ].join(",");

    const url = new URL(`https://graph.facebook.com/v19.0/${metaPageId}/subscribed_apps`);
    url.searchParams.set("subscribed_fields", subscribedFields);
    url.searchParams.set("access_token", metaAccessToken);

    const res = await fetch(url.toString(), {
      method: "POST",
      // Sin body. Sin Content-Type. Todo va por query string.
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      console.error("Error al suscribir webhooks en Meta:", {
        status: res.status,
        data
      });
      return {
        success: false,
        error: data.error?.message || `HTTP ${res.status}: Error desconocido en Meta`
      };
    }

    // 🔧 FIX: Verificar DESPUÉS de suscribir que el campo leadgen quedó activo.
    // Esto detecta casos donde Meta devuelve success:true parcial.
    const verifyRes = await fetch(
      `https://graph.facebook.com/v19.0/${metaPageId}/subscribed_apps?access_token=${encodeURIComponent(metaAccessToken)}`
    );
    const verifyData = await verifyRes.json();

    const appSubscribed = verifyData.data?.[0];
    const subscribedFieldsList: string[] = (appSubscribed?.subscribed_fields || [])
      .map((f: any) => typeof f === "string" ? f : f.name);

    const hasLeadgen = subscribedFieldsList.includes("leadgen");

    console.log(`[sincronizarWebhooks] Verificación página ${metaPageId}:`, {
      appSubscribed: !!appSubscribed,
      subscribedFields: subscribedFieldsList,
      hasLeadgen
    });

    if (!hasLeadgen) {
      return {
        success: false,
        error: "La página quedó suscrita pero el campo 'leadgen' no se activó. Verificá que el Page Access Token tenga el permiso 'leads_retrieval' y que la app tenga el producto Webhooks → Page → 'leadgen' habilitado en el panel de Meta."
      };
    }

    await adminDb.doc(canalPath).update({
      webhookVerified: true,
      subscribedFields: subscribedFieldsList,
      actualizadoEl: Timestamp.now()
    });

    return { success: true, subscribedFields: subscribedFieldsList };
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
 * Para WhatsApp Cloud API, el webhook se registra a nivel de App en el panel de Meta.
 * Esta función verifica que el token tenga acceso al Phone Number ID y marca el canal como verificado.
 */
export async function sincronizarWebhooksWhatsApp(wsId: string, canalId: string) {
  try {
    const canalPath = `${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CANALES}/${canalId}`;
    const canalSnap = await adminDb.doc(canalPath).get();
    if (!canalSnap.exists) throw new Error("Canal no encontrado");

    const canalData = canalSnap.data() as any;
    const phoneNumberId = canalData.metaPhoneNumberId;

    const secretSnap = await adminDb.doc(`${canalPath}/secrets/config`).get();
    if (!secretSnap.exists) throw new Error("No se encontraron los secretos del canal");

    const { metaAccessToken } = secretSnap.data() as any;
    if (!metaAccessToken || !phoneNumberId) {
      throw new Error("Faltan credenciales de WhatsApp (Phone Number ID o Access Token)");
    }

    // Verificar que el token tiene acceso al Phone Number ID en Meta
    const verifyRes = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}?fields=display_phone_number,verified_name&access_token=${metaAccessToken}`
    );
    const verifyData = await verifyRes.json();

    if (!verifyRes.ok || verifyData.error) {
      return {
        success: false,
        error: verifyData.error?.message || "No se pudo verificar el número. Revisá el Phone Number ID y el token."
      };
    }

    await adminDb.doc(canalPath).update({
      webhookVerified: true,
      cuenta: verifyData.display_phone_number || canalData.cuenta,
      actualizadoEl: Timestamp.now()
    });

    revalidatePath('/dashboard/ajustes/canales');
    return { success: true, phoneNumber: verifyData.display_phone_number };
  } catch (error: any) {
    console.error("Error en sincronizarWebhooksWhatsApp:", error);
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
  texto?: string,
  media?: { url: string; tipo: 'image' | 'video' | 'document' },
  senderAction?: 'typing_on' | 'typing_off' | 'mark_read'
) {
  try {
    if (!wsId || !canalId || !destinatario || (!texto && !media && !senderAction)) throw new Error("Faltan parámetros de envío");

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
      url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
      
      // Asegurar que el destinatario solo tenga números (Meta rechaza el + en sandbox)
      const destinatarioLimpio = destinatario.replace(/\D/g, '');
      console.log(`[WA-SEND] Enviando a: ${destinatarioLimpio} via ${phoneNumberId}`);
      
      if (senderAction === 'mark_read') {
        body = {
          messaging_product: "whatsapp",
          status: "read",
          message_id: texto // Para WhatsApp 'read' requiere el messageId en el campo texto
        };
      } else if (media) {
        body = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: destinatarioLimpio,
          type: media.tipo,
          [media.tipo]: { link: media.url, caption: texto || "" }
        };
      } else {
        body = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: destinatarioLimpio,
          type: "text",
          text: { body: texto }
        };
      }
    } else {
      // Instagram o Facebook use Messenger API
      url = `https://graph.facebook.com/v19.0/me/messages`; 
      
      if (senderAction) {
        body = {
          recipient: { id: destinatario },
          sender_action: senderAction
        };
      } else if (media) {
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
