"use server";

import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/types/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { PLAN_LIMITS } from "@/lib/planLimits";
import { v4 as uuidv4 } from "uuid";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
console.log("RESEND_API_KEY cargada:", !!process.env.RESEND_API_KEY);

/**
 * Invita a un usuario a un workspace creando un token de invitación.
 */
export async function invitarUsuarioAction(wsId: string, email: string, role: string = "operador") {
  console.log(`📩 Iniciando invitación: ${email} en workspace ${wsId} como ${role}`);
  try {
    const wsRef = adminDb.collection(COLLECTIONS.ESPACIOS).doc(wsId);
    const wsSnap = await wsRef.get();
    
    if (!wsSnap.exists) throw new Error("Espacio no encontrado");
    const wsData = wsSnap.data()!;
    
    // Verificar límites
    const currentMembersSnap = await wsRef.collection(COLLECTIONS.MIEMBROS).get();
    const currentInvitationsSnap = await wsRef.collection("invitaciones").where("status", "==", "pendiente").get();
    
    const limit = PLAN_LIMITS[wsData.plan as keyof typeof PLAN_LIMITS].seats;
    const totalCount = currentMembersSnap.size + currentInvitationsSnap.size;

    if (totalCount >= limit) {
      throw new Error(`Has alcanzado el límite de ${limit} usuarios para el plan ${wsData.plan}.`);
    }

    const invitationToken = uuidv4();
    const invitationData = {
      email,
      role,
      status: "pendiente",
      wsId,
      wsName: wsData.nombre,
      creadoEl: Timestamp.now(),
      venceEl: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 7 días
      token: invitationToken
    };

    await wsRef.collection("invitaciones").doc(invitationToken).set(invitationData);

    // Enlace de invitación robusto (incluye wsId para evitar búsquedas lentas o errores de índices)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteLink = `${baseUrl}/auth/join/${invitationToken}?wsId=${wsId}`;
    
    // Enviar el correo usando Resend
    if (process.env.RESEND_API_KEY) {
      try {
        const response = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "Imalá Vox <onboarding@resend.dev>",
          to: email,
          subject: `Invitación a unirte a ${wsData.nombre} en Imalá Vox`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #c8ff00; font-style: italic;">¡Hola!</h2>
              <p>Has sido invitado a unirte al espacio de trabajo <strong>${wsData.nombre}</strong> en Imalá Vox como <strong>${role}</strong>.</p>
              <div style="margin: 30px 0; text-align: center;">
                <a href="${inviteLink}" style="background-color: #c8ff00; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Aceptar Invitación</a>
              </div>
              <p style="color: #666; font-size: 12px;">Si el botón no funciona, podés copiar y pegar este enlace en tu navegador:</p>
              <p style="color: #666; font-size: 12px; word-break: break-all;">${inviteLink}</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 11px; color: #999;">Esta invitación expira en 7 días.</p>
            </div>
          `
        });
        console.log("Respuesta de Resend:", response);
      } catch (emailError) {
        console.error("Error enviando email:", emailError);
        // No bloqueamos el flujo si solo falla el correo, ya que devolvemos el link para copiado manual
      }
    }
    
    return { 
      success: true, 
      token: invitationToken,
      link: `/auth/join/${invitationToken}?wsId=${wsId}` 
    };

  } catch (error: any) {
    console.error("Error en invitación:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Procesa la aceptación de una invitación
 */
export async function aceptarInvitacionAction(token: string, user: { uid: string, email: string, displayName: string }, wsId?: string) {
  try {
    let inviteDoc;

    if (wsId) {
      // Búsqueda directa y eficiente
      const docRef = adminDb.collection(COLLECTIONS.ESPACIOS).doc(wsId).collection("invitaciones").doc(token);
      const snap = await docRef.get();
      if (!snap.exists) throw new Error("Invitación no válida o expirada.");
      inviteDoc = snap;
    } else {
      // Fallback a búsqueda global (requiere índices)
      const inviteSnap = await adminDb.collectionGroup("invitaciones")
        .where("token", "==", token)
        .where("status", "==", "pendiente")
        .get();

      if (inviteSnap.empty) throw new Error("Invitación no válida o expirada.");
      inviteDoc = inviteSnap.docs[0];
    }

    const inviteData = inviteDoc.data()!;
    const finalWsId = inviteData.wsId;

    if (inviteData.status !== "pendiente") {
      throw new Error("Esta invitación ya fue utilizada o ha expirado.");
    }

    if (inviteData.email !== user.email) {
      throw new Error("Esta invitación fue enviada a otro correo.");
    }

    // 1. Agregar como miembro al workspace
    await adminDb.collection(COLLECTIONS.ESPACIOS).doc(finalWsId)
      .collection(COLLECTIONS.MIEMBROS).doc(user.uid).set({
        email: user.email,
        nombre: user.displayName,
        rol: inviteData.role,
        creadoEl: Timestamp.now(),
        status: "activo"
      });

    // 2. Marcar invitación como aceptada
    await inviteDoc.ref.update({ status: "aceptada", aceptadaPor: user.uid, aceptadaEl: Timestamp.now() });

    return { success: true, wsId: finalWsId };

  } catch (error: any) {
    console.error("Error al aceptar invitación:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Cancela una invitación pendiente
 */
export async function cancelarInvitacionAction(wsId: string, token: string) {
  console.log(`🗑️ Intentando cancelar invitación con token: ${token} en workspace: ${wsId}`);
  try {
    await adminDb
      .collection(COLLECTIONS.ESPACIOS)
      .doc(wsId)
      .collection("invitaciones")
      .doc(token)
      .delete();

    return { success: true };
  } catch (error: any) {
    console.error("Error al cancelar invitación:", error);
    return { success: false, error: error.message };
  }
}
