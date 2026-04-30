import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { wsId, recursoId, url } = await req.json();

    if (!wsId || !recursoId || !url) {
      return NextResponse.json({ success: false, error: "Faltan parámetros" }, { status: 400 });
    }

    const functionUrl = `https://us-central1-imala-vox.cloudfunctions.net/procesarScrapingWeb`;
    console.log(`[Proxy] Iniciando petición a: ${functionUrl}`);
    console.log(`[Proxy] Enviando parámetros de scraping para: ${url}`);

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wsId, 
        recursoId, 
        url,
        secret: 'imala_vox_internal_key'
      })
    });

    console.log(`[Proxy] Respuesta recibida de Cloud Function. Status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Proxy] Error de Cloud Function (${response.status}):`, errorText);
      return NextResponse.json({ 
        success: false, 
        error: `Error del motor (${response.status}): ${errorText.substring(0, 100)}` 
      }, { status: 500 }); // Siempre devolver 500 al cliente para capturarlo
    }

    const result = await response.json();
    console.log(`[Proxy] Petición completada con éxito.`);
    return NextResponse.json(result.result || result.data || result);

  } catch (error: any) {
    console.error("[Proxy] Error crítico en el proceso del proxy:", error);
    return NextResponse.json({ success: false, error: `Error interno del proxy: ${error.message}` }, { status: 500 });
  }
}
