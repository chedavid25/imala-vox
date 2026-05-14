import { NextRequest, NextResponse } from "next/server";

const FUNCTION_URL = `https://us-central1-imala-vox.cloudfunctions.net/procesarScrapingWeb`;

export async function POST(req: NextRequest) {
  try {
    const { wsId, recursoId, url } = await req.json();

    if (!wsId || !recursoId || !url) {
      return NextResponse.json({ success: false, error: "Faltan parámetros" }, { status: 400 });
    }

    console.log(`[Proxy] Disparando scraping para: ${url}`);

    // Esperamos máximo 8s a que el request LLEGUE a la Cloud Function.
    // La Cloud Function sigue corriendo sola aunque cortemos la conexión.
    // Sin await el proceso de Vercel muere antes de enviar el request.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wsId, recursoId, url, secret: 'imala_vox_internal_key' }),
        signal: controller.signal,
      });
    } catch {
      // AbortError esperado — la Cloud Function ya recibió el request y sigue corriendo
    } finally {
      clearTimeout(timeout);
    }

    return NextResponse.json({
      success: true,
      message: "Procesamiento iniciado en segundo plano.",
      async: true,
    });

  } catch (error: any) {
    console.error("[Proxy] Error crítico:", error);
    return NextResponse.json({ success: false, error: `Error interno: ${error.message}` }, { status: 500 });
  }
}
