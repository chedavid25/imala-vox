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
  metaWABAId?: string;
  accessToken: string;
}) {
  try {
    if (!wsId) throw new Error("ID de espacio de trabajo no proporcionado");

    // 1. Validación específica por tipo: probar el endpoint correcto que CONFIRMA
    //    que el token tiene acceso al recurso específico (no solo "es válido").
    //    Para WhatsApp consultamos el phone number directamente; para FB/IG la página.
    let verificacionUrl: string;
    if (datos.tipo === 'whatsapp') {
      if (!datos.metaPhoneNumberId) {
        return { success: false, error: 'Falta el Phone Number ID' };
      }
      verificacionUrl = `https://graph.facebook.com/v19.0/${datos.metaPhoneNumberId}?fields=display_phone_number,verified_name&access_token=${datos.accessToken}`;
    } else if (datos.metaPageId) {
      verificacionUrl = `https://graph.facebook.com/v19.0/${datos.metaPageId}?fields=name&access_token=${datos.accessToken}`;
    } else {
      verificacionUrl = `https://graph.facebook.com/v19.0/me?access_token=${datos.accessToken}`;
    }

    const verificacion = await fetch(verificacionUrl);
    if (!verificacion.ok) {
      const errData = await verificacion.json().catch(() => ({}));
      const metaErr = errData.error?.message || 'Token inválido o sin acceso al recurso';
      return {
        success: false,
        error: `${metaErr}. Verificá que el token sea válido y tenga acceso al ${datos.tipo === 'whatsapp' ? 'Phone Number ID' : 'recurso'} que ingresaste.`,
      };
    }

    // 2. Buscar canal existente por el ID específico (no por tipo solo),
    //    para no sobreescribir otros canales WhatsApp/FB/IG ya conectados.
    let query = adminDb
      .collection(COLLECTIONS.ESPACIOS).doc(wsId)
      .collection(COLLECTIONS.CANALES)
      .where('tipo', '==', datos.tipo);
    if (datos.tipo === 'whatsapp' && datos.metaPhoneNumberId) {
      query = query.where('metaPhoneNumberId', '==', datos.metaPhoneNumberId);
    } else if (datos.tipo === 'facebook' && datos.metaPageId) {
      query = query.where('metaPageId', '==', datos.metaPageId);
    } else if (datos.tipo === 'instagram' && datos.metaInstagramId) {
      query = query.where('metaInstagramId', '==', datos.metaInstagramId);
    }
    const canalesSnap = await query.limit(1).get();

    let canalId: string;

    const baseData = {
      tipo: datos.tipo,
      nombre: datos.nombre,
      cuenta: datos.cuenta,
      metaPageId: datos.metaPageId || null,
      metaPhoneNumberId: datos.metaPhoneNumberId || null,
      metaInstagramId: datos.metaInstagramId || null,
      metaWABAId: datos.metaWABAId || null,
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

export async function conectarCanal360dialog(wsId: string, datos: {
  nombre: string;
  metaPhoneNumberId: string;
  accessToken: string;
}) {
  try {
    if (!wsId) throw new Error("ID de espacio de trabajo no proporcionado");
    if (!datos.metaPhoneNumberId || !datos.accessToken) {
      return { success: false, error: 'Faltan parámetros obligatorios (Phone Number ID o API Key)' };
    }

    const canalesSnap = await adminDb
      .collection(COLLECTIONS.ESPACIOS).doc(wsId)
      .collection(COLLECTIONS.CANALES)
      .where('tipo', '==', 'whatsapp')
      .where('metaPhoneNumberId', '==', datos.metaPhoneNumberId)
      .limit(1)
      .get();

    let canalId: string;

    const baseData = {
      tipo: 'whatsapp',
      provider: '360dialog',
      nombre: datos.nombre || 'WhatsApp 360dialog',
      cuenta: datos.metaPhoneNumberId,
      metaPhoneNumberId: datos.metaPhoneNumberId,
      status: 'connected' as const,
      webhookVerified: true,
      actualizadoEl: Timestamp.now(),
    };

    if (!canalesSnap.empty) {
      canalId = canalesSnap.docs[0].id;
      await adminDb
        .collection(COLLECTIONS.ESPACIOS).doc(wsId)
        .collection(COLLECTIONS.CANALES).doc(canalId)
        .update(baseData);
    } else {
      const canalRef = await adminDb
        .collection(COLLECTIONS.ESPACIOS).doc(wsId)
        .collection(COLLECTIONS.CANALES)
        .add({
          ...baseData,
          creadoEl: Timestamp.now(),
        });
      canalId = canalRef.id;
    }

    await guardarTokenCanal(wsId, canalId, datos.accessToken);

    revalidatePath('/dashboard/ajustes/canales');
    return { success: true, canalId };
  } catch (error: any) {
    console.error('Error conectando canal 360dialog:', error);
    return { success: false, error: error.message || "Error interno al conectar 360dialog" };
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

    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    // Verificar permisos del token ANTES de intentar suscribir
    const debugTokenRes = await fetch(`https://graph.facebook.com/debug_token?input_token=${metaAccessToken}&access_token=${appId}|${appSecret}`);
    const debugToken = await debugTokenRes.json();
    const currentScopes: string[] = debugToken.data?.scopes || [];
    const tokenExpired = debugToken.data?.is_valid === false;

    if (tokenExpired) {
      return {
        success: false,
        error: "El token de acceso expiró. Usá el botón '¿Token expirado? Actualizar token' o reconectá la página desde 'Conectar con Meta'."
      };
    }

    if (!currentScopes.includes('pages_messaging')) {
      return {
        success: false,
        error: "El token no tiene el permiso 'pages_messaging'. Hacé clic en 'Conectar con Meta' nuevamente y asegurate de aprobar todos los permisos solicitados sin desmarcar ninguno."
      };
    }

    const fields = ["messages", "messaging_postbacks", "messaging_optins", "message_deliveries", "message_reads"];

    // Solo suscribir leadgen si tenemos permiso expreso
    if (currentScopes.includes('leads_retrieval')) {
      fields.push("leadgen");
    }

    const url = new URL(`https://graph.facebook.com/v19.0/${metaPageId}/subscribed_apps`);
    url.searchParams.set("subscribed_fields", fields.join(","));
    url.searchParams.set("access_token", metaAccessToken);

    const res = await fetch(url.toString(), { method: "POST" });
    const data = await res.json();

    if (!res.ok || !data.success) {
      console.error("Error al suscribir webhooks en Meta:", { status: res.status, data });
      const errorCode = data.error?.code;
      if (errorCode === 200 || data.error?.message?.includes('pages_messaging')) {
        return {
          success: false,
          error: "Meta rechazó la suscripción por falta de permisos. Reconectá la página desde 'Conectar con Meta' y aprobá todos los permisos que solicita."
        };
      }
      return {
        success: false,
        error: `Error de Meta (código ${errorCode ?? res.status}). Intentá reconectar el canal desde 'Conectar con Meta'.`
      };
    }

    // 🔧 Verificar qué campos quedaron realmente activos
    const verifyRes = await fetch(
      `https://graph.facebook.com/v19.0/${metaPageId}/subscribed_apps?access_token=${encodeURIComponent(metaAccessToken)}`
    );
    const verifyData = await verifyRes.json();
    const appSubscribed = verifyData.data?.[0];
    const subscribedFieldsList: string[] = (appSubscribed?.subscribed_fields || [])
      .map((f: any) => typeof f === "string" ? f : f.name);

    const hasMessages = subscribedFieldsList.includes("messages");

    if (hasMessages) {
      await adminDb.doc(canalPath).update({
        webhookVerified: true,
        actualizadoEl: Timestamp.now()
      });
      return { success: true };
    }

    return { 
      success: false, 
      error: "No se pudo activar la mensajería. Asegúrate de haber concedido el permiso 'pages_messaging' durante la conexión." 
    };
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
    // Nota: whatsapp_business_account puede fallar en números de prueba, por eso lo hacemos opcional
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

    // Intentar obtener el WABA ID solo si no lo tenemos, pero no bloquear si falla
    let wabaId = canalData.metaWABAId || null;
    if (!wabaId) {
      const wabaRes = await fetch(
        `https://graph.facebook.com/v19.0/${phoneNumberId}?fields=whatsapp_business_account&access_token=${metaAccessToken}`
      );
      const wabaData = await wabaRes.json();
      wabaId = wabaData.whatsapp_business_account?.id || null;
    }

    await adminDb.doc(canalPath).update({
      webhookVerified: true,
      cuenta: verifyData.display_phone_number || canalData.cuenta,
      ...(wabaId && { metaWABAId: wabaId }),
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
  senderAction?: 'typing_on' | 'typing_off' | 'mark_read',
  tag?: 'CONFIRMED_EVENT_UPDATE' | 'POST_PURCHASE_UPDATE' | 'ACCOUNT_UPDATE' | 'HUMAN_AGENT'
) {
  try {
    console.log("[enviarMensajeAccion] Iniciando envío de mensaje:", { wsId, canalId, destinatario, textoLength: texto?.length });

    if (!wsId || !canalId || !destinatario || (!texto && !media && !senderAction)) {
      console.warn("[enviarMensajeAccion] Faltan parámetros de envío");
      throw new Error("Faltan parámetros de envío");
    }

    const canalPath = `${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CANALES}/${canalId}`;
    console.log("[enviarMensajeAccion] Buscando canal en Firestore en la ruta:", canalPath);
    const canalSnap = await adminDb.doc(canalPath).get();
    
    if (!canalSnap.exists) {
      console.error(`[enviarMensajeAccion] Canal no encontrado. Ruta consultada: ${canalPath}`);
      throw new Error(`Canal no encontrado (ID: ${canalId}, Workspace: ${wsId})`);
    }
    
    const canalData = canalSnap.data() as any;
    console.log("[enviarMensajeAccion] Canal encontrado:", { tipo: canalData.tipo, nombre: canalData.nombre });
    const secretSnap = await adminDb.doc(`${canalPath}/secrets/config`).get();
    if (!secretSnap.exists) throw new Error("Credenciales de canal no encontradas");
    
    const { metaAccessToken } = secretSnap.data() as any;

    let url = "";
    let body: any = {};

    if (canalData.tipo === 'whatsapp') {
      if (canalData.provider === '360dialog') {
        url = `https://waba-v2.360dialog.io/messages`;
      } else {
        const phoneNumberId = canalData.metaPhoneNumberId;
        if (!phoneNumberId) throw new Error("ID de teléfono no configurado para WhatsApp");
        url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
      }
      
      // Normalizar número argentino al formato legacy que usa la API de WhatsApp:
      // E.164 "5493513376865" (con 9) → legacy "54351153376865" (con 15)
      // El webhook entrega formato E.164 pero WhatsApp API espera el formato con 15
      let destinatarioLimpio = destinatario.replace(/\D/g, '');

      // 10 dígitos = solo área + local sin código de país → normalizar primero
      if (destinatarioLimpio.length === 10) {
        destinatarioLimpio = `549${destinatarioLimpio}`;
      }

      // Argentina móvil: Asegurar que tenga el prefijo 549 si es un número local de 10 dígitos
      if (destinatarioLimpio.length === 10) {
        destinatarioLimpio = `549${destinatarioLimpio}`;
      }
      // Nota: Eliminamos la inserción del "15" legacy ya que la Cloud API v19+ 
      // prefiere el formato E.164 directo (549...) para evitar errores de envío.

      console.log(`[WA-SEND] Enviando a: ${destinatarioLimpio} (original: ${destinatario})`);
      
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
          },
          ...(tag && { messaging_type: "MESSAGE_TAG", tag })
        };
      } else {
        body = {
          recipient: { id: destinatario },
          message: { text: texto },
          ...(tag ? { messaging_type: "MESSAGE_TAG", tag } : { messaging_type: "RESPONSE" })
        };
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    if (canalData.provider === '360dialog') {
      headers["D360-API-KEY"] = metaAccessToken;
    } else {
      headers["Authorization"] = `Bearer ${metaAccessToken}`;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    let data = await res.json();
    
    if (!res.ok) {
      console.error("Error en Meta API:", data);
      
      // Mensaje amigable para ventana de 24hs cerrada (Error #10)
      if (data.error?.code === 10) {
        return { 
          success: false, 
          error: "La ventana de 24hs de Meta está cerrada. Para volver a chatear, el cliente debe enviarte un nuevo mensaje o debés contactarlo desde la App oficial de Facebook/Instagram." 
        };
      }

      const errMsg = data.error?.message || "";
      if (
        errMsg.includes("must be granted before impersonating a user's page") ||
        errMsg.includes("pages_messaging") ||
        errMsg.includes("pages_read_user_content")
      ) {
        return {
          success: false,
          error: "El canal no tiene los permisos de mensajería necesarios. Por favor, ve a Ajustes > Canales, desconectá el canal y volvé a conectarlo asegurándote de otorgar todos los permisos solicitados de Facebook/Instagram (incluyendo páginas y mensajería)."
        };
      }

      return { success: false, error: errMsg || "Error al enviar mensaje vía Meta" };
    }

    return { success: true, messageId: data.message_id || data.wam_id };

  } catch (error: any) {
    console.error("Error en enviarMensajeAccion:", error);
    return { success: false, error: error.message };
  }
}

export interface PlantillaWA {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  components: Array<{
    type: string;
    text?: string;
    buttons?: any[];
  }>;
}

/**
 * Lista las plantillas aprobadas del WABA asociado al canal WhatsApp.
 * Si el canal no tiene metaWABAId almacenado, lo obtiene en tiempo real desde Meta.
 */
export async function listarPlantillasWA(wsId: string, canalId: string): Promise<{ success: boolean; plantillas?: PlantillaWA[]; error?: string }> {
  try {
    const canalPath = `${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CANALES}/${canalId}`;
    const [canalSnap, secretSnap] = await Promise.all([
      adminDb.doc(canalPath).get(),
      adminDb.doc(`${canalPath}/secrets/config`).get()
    ]);

    if (!canalSnap.exists) throw new Error("Canal no encontrado");
    if (!secretSnap.exists) throw new Error("Credenciales del canal no encontradas");

    const canalData = canalSnap.data() as any;
    const { metaAccessToken } = secretSnap.data() as any;

    let wabaId: string = canalData.metaWABAId;

    // Si no está guardado, intentar obtenerlo en tiempo real
    if (!wabaId && canalData.metaPhoneNumberId) {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${canalData.metaPhoneNumberId}?fields=whatsapp_business_account&access_token=${metaAccessToken}`
      );
      const data = await res.json();
      wabaId = data.whatsapp_business_account?.id;
      if (wabaId) {
        await adminDb.doc(canalPath).update({ metaWABAId: wabaId, actualizadoEl: Timestamp.now() });
      }
    }

    if (!wabaId) {
      return { success: false, error: "No se encontró el WABA ID. Re-sincronizá el canal en Ajustes → Canales." };
    }

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${wabaId}/message_templates?status=APPROVED&fields=id,name,language,status,category,components&limit=100&access_token=${metaAccessToken}`
    );
    const data = await res.json();

    if (!res.ok || data.error) {
      return { success: false, error: data.error?.message || "No se pudieron obtener las plantillas" };
    }

    return { success: true, plantillas: data.data || [] };
  } catch (error: any) {
    console.error("Error en listarPlantillasWA:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Envía una plantilla aprobada por Meta a un destinatario WhatsApp.
 * Se usa cuando la ventana de 24hs está cerrada.
 */
export async function enviarPlantillaWA(
  wsId: string,
  canalId: string,
  destinatario: string,
  templateName: string,
  languageCode: string,
  variables: string[]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const canalPath = `${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CANALES}/${canalId}`;
    const [canalSnap, secretSnap] = await Promise.all([
      adminDb.doc(canalPath).get(),
      adminDb.doc(`${canalPath}/secrets/config`).get()
    ]);

    if (!canalSnap.exists) throw new Error("Canal no encontrado");
    if (!secretSnap.exists) throw new Error("Credenciales del canal no encontradas");

    const canalData = canalSnap.data() as any;
    const { metaAccessToken } = secretSnap.data() as any;
    const phoneNumberId = canalData.metaPhoneNumberId;
    if (!phoneNumberId) throw new Error("Phone Number ID no configurado");

    // Normalización argentina igual que enviarMensajeAccion
    let dest = destinatario.replace(/\D/g, '');
    if (dest.length === 10) dest = `549${dest}`;
    if (dest.startsWith('549') && dest.length === 13) {
      const rest = dest.substring(3);
      const areaLen = rest.startsWith('11') ? 2 : 3;
      dest = `54${rest.substring(0, areaLen)}15${rest.substring(areaLen)}`;
    }

    const bodyParameters = variables.map(v => ({ type: "text", text: v }));

    const body: any = {
      messaging_product: "whatsapp",
      to: dest,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(bodyParameters.length > 0 && {
          components: [{ type: "body", parameters: bodyParameters }]
        })
      }
    };

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${metaAccessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }
    );

    const data = await res.json();
    if (!res.ok) {
      console.error("[enviarPlantillaWA] Error Meta:", data);
      return { success: false, error: data.error?.message || "Error al enviar la plantilla" };
    }

    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error: any) {
    console.error("Error en enviarPlantillaWA:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Valida y actualiza el Access Token de un canal existente (WhatsApp, Instagram o Facebook).
 */
export async function actualizarTokenAcceso(wsId: string, canalId: string, nuevoToken: string) {
  try {
    if (!wsId || !canalId || !nuevoToken) throw new Error("Parámetros insuficientes");

    // 1. Verificar que el token es válido consultando Meta Graph API
    const verificacion = await fetch(
      `https://graph.facebook.com/v19.0/me?access_token=${nuevoToken}`
    );

    if (!verificacion.ok) {
      const errData = await verificacion.json().catch(() => ({}));
      return { 
        success: false, 
        error: `El nuevo token no es válido. Meta respondió: ${errData.error?.message || 'Token inválido o expirado'}` 
      };
    }

    // 2. Guardar el nuevo token en la subcolección privada
    await guardarTokenCanal(wsId, canalId, nuevoToken);

    // 3. Asegurarse de que el canal esté marcado como conectado
    await adminDb
      .collection(COLLECTIONS.ESPACIOS).doc(wsId)
      .collection(COLLECTIONS.CANALES).doc(canalId)
      .update({
        status: 'connected',
        actualizadoEl: Timestamp.now(),
      });

    revalidatePath('/dashboard/ajustes/canales');
    return { success: true };

  } catch (error: any) {
    console.error('Error actualizando token:', error);
    return { success: false, error: error.message || "Error interno al actualizar token" };
  }
}

/**
 * Obtiene el token de acceso actual (solo bajo demanda del cliente).
 * Se recomienda precaución al usar esto en el frontend.
 */
export async function obtenerTokenCanal(wsId: string, canalId: string) {
  try {
    const secretPath = `${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.CANALES}/${canalId}/secrets/config`;
    const secretSnap = await adminDb.doc(secretPath).get();
    
    if (!secretSnap.exists) return { success: false, error: "No se encontraron secretos" };
    
    const { metaAccessToken } = secretSnap.data() as any;
    return { success: true, token: metaAccessToken };
  } catch (error: any) {
    console.error("Error obteniendo token:", error);
    return { success: false, error: error.message };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Selector post-OAuth: el callback guarda páginas/WABAs en _pendingConnections
// y redirige al selector. Estas acciones leen la sesión y finalizan la conexión.
// ────────────────────────────────────────────────────────────────────────────

type PendingPage = {
  id: string;
  name: string;
  accessToken: string;
  instagram: { id: string; username: string; name?: string } | null;
};

type PendingWaba = {
  id: string;
  name: string;
  phones: { id: string; displayPhone: string; verifiedName: string }[];
};

/**
 * Lee la sesión temporal del OAuth y devuelve las opciones de conexión
 * disponibles (sin exponer tokens al cliente).
 */
export async function obtenerPendingConnection(wsId: string, sessionId: string) {
  try {
    const docRef = adminDb.doc(`${COLLECTIONS.ESPACIOS}/${wsId}/_pendingConnections/${sessionId}`);
    const snap = await docRef.get();
    if (!snap.exists) return { success: false, error: 'Sesión no encontrada o expirada' };

    const data = snap.data() as any;
    const expira: number = data.expiraEn?.toMillis?.() || 0;
    if (Date.now() > expira) {
      await docRef.delete().catch(() => {});
      return { success: false, error: 'La sesión expiró. Iniciá la conexión nuevamente.' };
    }

    return {
      success: true,
      pages: (data.pages || []).map((p: PendingPage) => ({
        id: p.id,
        name: p.name,
        instagram: p.instagram, // no contiene token
      })),
      wabas: (data.wabas || []).map((w: PendingWaba) => ({
        id: w.id,
        name: w.name,
        phones: w.phones,
      })),
    };
  } catch (error: any) {
    console.error('Error en obtenerPendingConnection:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Propaga un access token a TODOS los workspaces que ya tengan esa misma
 * página/IG/teléfono conectado, sin modificar ningún otro campo del canal.
 * Esto evita romper conexiones existentes cuando se reconecta en otro workspace.
 */
async function propagarTokenCrossWorkspace(
  field: 'metaPageId' | 'metaInstagramId' | 'metaPhoneNumberId',
  value: string,
  newToken: string,
  exceptWsId: string
) {
  try {
    const snap = await adminDb
      .collectionGroup(COLLECTIONS.CANALES)
      .where(field, '==', value)
      .get();

    let count = 0;
    for (const doc of snap.docs) {
      const otherWsId = doc.ref.parent.parent?.id;
      if (!otherWsId || otherWsId === exceptWsId) continue;
      await adminDb
        .doc(`${COLLECTIONS.ESPACIOS}/${otherWsId}/${COLLECTIONS.CANALES}/${doc.id}/secrets/config`)
        .set({ metaAccessToken: newToken, actualizadoEl: Timestamp.now() }, { merge: true });
      count++;
    }
    if (count > 0) {
      console.log(`[TOKEN-PROPAGATE] ${field}=${value} → token actualizado en ${count} workspace(s) adicionales`);
    }
  } catch (err: any) {
    console.error(`[TOKEN-PROPAGATE] Error propagando ${field}=${value}:`, err.message);
  }
}

/**
 * Suscribe la página a los webhooks de Meta (mensajes + leads si tiene scope).
 * Versión interna usada al finalizar la conexión — no llama a revalidatePath.
 */
async function suscribirWebhooksPagina(metaPageId: string, pageAccessToken: string) {
  try {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const debugRes = await fetch(`https://graph.facebook.com/debug_token?input_token=${pageAccessToken}&access_token=${appId}|${appSecret}`);
    const debugData = await debugRes.json();
    const scopes: string[] = debugData.data?.scopes || [];

    const fields = ['messages', 'messaging_postbacks', 'messaging_optins', 'message_deliveries', 'message_reads'];
    if (scopes.includes('leads_retrieval')) fields.push('leadgen');

    const url = new URL(`https://graph.facebook.com/v19.0/${metaPageId}/subscribed_apps`);
    url.searchParams.set('subscribed_fields', fields.join(','));
    url.searchParams.set('access_token', pageAccessToken);
    const res = await fetch(url.toString(), { method: 'POST' });
    const data = await res.json();
    return { success: !!data.success, hasLeadgen: fields.includes('leadgen') };
  } catch (err: any) {
    console.error('[suscribirWebhooksPagina] Error:', err.message);
    return { success: false, hasLeadgen: false };
  }
}

/**
 * Finaliza la conexión: crea/actualiza solo los canales seleccionados,
 * propaga tokens a otros workspaces, y elimina la sesión temporal.
 */
export async function finalizarConexion(
  wsId: string,
  sessionId: string,
  selection: {
    pageIds: string[];           // FB pages a conectar
    instagramPageIds: string[];  // FB pages cuya IG también conectar
    wabaPhoneIds: string[];      // ids de teléfono WABA a conectar
  }
) {
  try {
    const sessionRef = adminDb.doc(`${COLLECTIONS.ESPACIOS}/${wsId}/_pendingConnections/${sessionId}`);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) return { success: false, error: 'Sesión no encontrada o expirada' };

    const sessionData = sessionSnap.data() as any;
    const expira: number = sessionData.expiraEn?.toMillis?.() || 0;
    if (Date.now() > expira) {
      await sessionRef.delete().catch(() => {});
      return { success: false, error: 'La sesión expiró. Iniciá la conexión nuevamente.' };
    }

    const pages: PendingPage[] = sessionData.pages || [];
    const wabas: PendingWaba[] = sessionData.wabas || [];
    const userToken: string = sessionData.userToken;

    const workspaceRef = adminDb.doc(`${COLLECTIONS.ESPACIOS}/${wsId}`);
    let conectadosCount = 0;
    const errores: string[] = [];

    // ─── Procesar Páginas FB seleccionadas ───
    for (const pageId of selection.pageIds) {
      const page = pages.find(p => p.id === pageId);
      if (!page) continue;
      try {
        const existing = await workspaceRef
          .collection(COLLECTIONS.CANALES)
          .where('tipo', '==', 'facebook')
          .where('metaPageId', '==', page.id)
          .limit(1)
          .get();

        const baseData = {
          tipo: 'facebook',
          nombre: page.name,
          metaPageId: page.id,
          status: 'connected' as const,
          webhookVerified: false,
          actualizadoEl: Timestamp.now(),
        };

        let canalId: string;
        if (!existing.empty) {
          canalId = existing.docs[0].id;
          await existing.docs[0].ref.update(baseData);
        } else {
          const ref = await workspaceRef.collection(COLLECTIONS.CANALES).add({ ...baseData, creadoEl: Timestamp.now() });
          canalId = ref.id;
        }

        await guardarTokenCanal(wsId, canalId, page.accessToken);
        await propagarTokenCrossWorkspace('metaPageId', page.id, page.accessToken, wsId);

        const subRes = await suscribirWebhooksPagina(page.id, page.accessToken);
        if (subRes.success) {
          await workspaceRef.collection(COLLECTIONS.CANALES).doc(canalId).update({ webhookVerified: true });
        }
        conectadosCount++;
      } catch (err: any) {
        console.error(`[finalizarConexion] Error procesando página ${pageId}:`, err.message);
        errores.push(`Página ${page.name}: ${err.message}`);
      }

      // ─── IG asociada (si el usuario tildó la sub-opción) ───
      if (page.instagram && selection.instagramPageIds.includes(page.id)) {
        try {
          const igExisting = await workspaceRef
            .collection(COLLECTIONS.CANALES)
            .where('tipo', '==', 'instagram')
            .where('metaInstagramId', '==', page.instagram.id)
            .limit(1)
            .get();

          const igData = {
            tipo: 'instagram',
            nombre: `Instagram - ${page.instagram.username || page.name}`,
            cuenta: page.name,
            metaPageId: page.id,
            metaInstagramId: page.instagram.id,
            status: 'connected' as const,
            webhookVerified: true,
            actualizadoEl: Timestamp.now(),
          };

          let igCanalId: string;
          if (!igExisting.empty) {
            igCanalId = igExisting.docs[0].id;
            await igExisting.docs[0].ref.update(igData);
          } else {
            const ref = await workspaceRef.collection(COLLECTIONS.CANALES).add({ ...igData, creadoEl: Timestamp.now() });
            igCanalId = ref.id;
          }
          await guardarTokenCanal(wsId, igCanalId, page.accessToken);
          await propagarTokenCrossWorkspace('metaInstagramId', page.instagram.id, page.accessToken, wsId);

          // Suscribir IG fields al webhook de la página
          try {
            const igUrl = new URL(`https://graph.facebook.com/v19.0/${page.id}/subscribed_apps`);
            igUrl.searchParams.set('subscribed_fields', 'instagram_manage_comments,instagram_manage_messages,messages');
            igUrl.searchParams.set('access_token', page.accessToken);
            await fetch(igUrl.toString(), { method: 'POST' });
          } catch {}
          conectadosCount++;
        } catch (err: any) {
          console.error(`[finalizarConexion] Error procesando IG de página ${pageId}:`, err.message);
          errores.push(`Instagram de ${page.name}: ${err.message}`);
        }
      }
    }

    // ─── Procesar teléfonos WABA seleccionados ───
    for (const phoneId of selection.wabaPhoneIds) {
      const waba = wabas.find(w => w.phones.some(p => p.id === phoneId));
      const phone = waba?.phones.find(p => p.id === phoneId);
      if (!waba || !phone) continue;
      try {
        const existing = await workspaceRef
          .collection(COLLECTIONS.CANALES)
          .where('tipo', '==', 'whatsapp')
          .where('metaPhoneNumberId', '==', phone.id)
          .limit(1)
          .get();

        const waData = {
          tipo: 'whatsapp',
          nombre: phone.verifiedName || `WhatsApp - ${phone.displayPhone}`,
          cuenta: phone.displayPhone,
          metaPhoneNumberId: phone.id,
          metaWABAId: waba.id,
          status: 'connected' as const,
          webhookVerified: false,
          actualizadoEl: Timestamp.now(),
        };

        let waCanalId: string;
        if (!existing.empty) {
          waCanalId = existing.docs[0].id;
          await existing.docs[0].ref.update(waData);
        } else {
          const ref = await workspaceRef.collection(COLLECTIONS.CANALES).add({ ...waData, creadoEl: Timestamp.now() });
          waCanalId = ref.id;
        }
        await guardarTokenCanal(wsId, waCanalId, userToken);
        await propagarTokenCrossWorkspace('metaPhoneNumberId', phone.id, userToken, wsId);
        conectadosCount++;
      } catch (err: any) {
        console.error(`[finalizarConexion] Error procesando WABA phone ${phoneId}:`, err.message);
        errores.push(`WhatsApp ${phone.displayPhone}: ${err.message}`);
      }
    }

    // ─── Limpieza ───
    await sessionRef.delete().catch(() => {});
    revalidatePath('/dashboard/ajustes/canales');

    return {
      success: true,
      conectados: conectadosCount,
      errores: errores.length ? errores : null,
    };
  } catch (error: any) {
    console.error('Error en finalizarConexion:', error);
    return { success: false, error: error.message };
  }
}
