import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy Scraper (Versión Asíncrona)
 * Evita el timeout de Vercel (10-15s) delegando todo el trabajo pesado a Cloud Functions.
 */

export async function POST(req: NextRequest) {
  try {
    const { wsId, recursoId, url } = await req.json();

    if (!wsId || !recursoId || !url) {
      return NextResponse.json({ success: false, error: "Faltan parámetros" }, { status: 400 });
    }

    const functionUrl = `https://us-central1-imala-vox.cloudfunctions.net/procesarScrapingWeb`;
    console.log(`[Proxy] Disparando scraping asíncrono para: ${url}`);

    // Llamamos a la Cloud Function pero NO esperamos a que termine el scraping profundo.
    // Simplemente nos aseguramos de que la petición fue enviada.
    // Usamos un fetch sin await o con un timeout muy corto para soltar la conexión.
    
    fetch(functionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wsId,
        recursoId,
        url,
        secret: 'imala_vox_internal_key'
      })
    }).catch(err => console.error(`[Proxy] Error en background fetch:`, err));

    // Respondemos inmediatamente al cliente para evitar el 500 de Vercel
    return NextResponse.json({ 
      success: true, 
      message: "Procesamiento iniciado en segundo plano. Los objetos aparecerán en el catálogo en breve.",
      async: true 
    });

  } catch (error: any) {
    console.error("[Proxy] Error crítico:", error);
    return NextResponse.json({ success: false, error: `Error interno: ${error.message}` }, { status: 500 });
  }
}
