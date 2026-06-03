import { NextRequest, NextResponse } from 'next/server';
import { procesarMensajeWhatsapp } from '../meta/route';

// GET — verificación (por si 360dialog o el usuario quieren probar el endpoint con un ping)
export async function GET(request: NextRequest) {
  return new NextResponse('Webhook 360dialog Activo', { status: 200 });
}

// POST — recibir eventos de 360dialog (idénticos a la estructura de WhatsApp Business API)
export async function POST(request: NextRequest) {
  console.log("[360DIALOG-WEBHOOK-IN]", {
    timestamp: new Date().toISOString(),
    url: request.url,
    method: request.method,
  });

  try {
    const rawBody = await request.text();
    if (!rawBody) {
      console.warn("⚠️ Webhook de 360dialog recibido con cuerpo vacío");
      return NextResponse.json({ status: 'empty' });
    }

    const body = JSON.parse(rawBody);
    console.log("🔔 Webhook 360dialog Recibido:", JSON.stringify(body, null, 2));

    // Procesar el objeto (mensajes o cambios) de la misma forma que Meta
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        const wabaId = entry.id;

        for (const change of entry.changes || []) {
          if (change.field === 'messages') {
            console.log("🟢 [360dialog] Procesando mensaje de WhatsApp...");
            await procesarMensajeWhatsapp(change.value, wabaId);
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    console.error("❌ Error crítico en webhook de 360dialog:", error.message);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 200 });
  }
}
