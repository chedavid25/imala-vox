import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/types/firestore";
import { procesarMensajeConIA } from "@/lib/ai/engine";
import { Timestamp } from "firebase-admin/firestore";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceId, agentId, contactId, message, canalId } = await req.json();

    if (!workspaceId || !message) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    // 1. REGISTRAR EL MENSAJE DEL USUARIO EN FIRESTORE
    // Buscamos o creamos la conversación
    const convId = `web_${contactId}`;
    const convRef = adminDb
      .collection(COLLECTIONS.ESPACIOS)
      .doc(workspaceId)
      .collection(COLLECTIONS.CONVERSACIONES)
      .doc(convId);

    const convSnap = await convRef.get();
    
    if (!convSnap.exists) {
      await convRef.set({
        id: convId,
        contactoId: contactId,
        canalId: canalId || 'web_default',
        agenteId: agentId || '',
        ultimoMensaje: message,
        ultimaActividad: Timestamp.now(),
        unreadCount: 1,
        aiActive: true,
        modoIA: 'auto',
        statusIA: 'thinking'
      });
    } else {
      await convRef.update({
        ultimoMensaje: message,
        ultimaActividad: Timestamp.now(),
        statusIA: 'thinking'
      });
    }

    // Guardar el mensaje del usuario
    await convRef.collection(COLLECTIONS.MENSAJES).add({
      text: message,
      from: 'user',
      creadoEl: Timestamp.now(),
      visto: false
    });

    // 2. PROCESAR CON EL MOTOR DE IA DE IMALÁ VOX
    const respuestaIA = await procesarMensajeConIA({
      wsId: workspaceId,
      conversacionId: convId,
      textoUsuario: message,
      agenteId: agentId || '',
      contactoNombre: "Cliente Web"
    });

    return NextResponse.json({ 
      response: respuestaIA,
      status: "success" 
    }, {
      headers: { "Access-Control-Allow-Origin": "*" }
    });

  } catch (error: any) {
    console.error("Error in widget message API:", error);
    return NextResponse.json({ error: error.message }, { 
      status: 500, 
      headers: { "Access-Control-Allow-Origin": "*" } 
    });
  }
}
