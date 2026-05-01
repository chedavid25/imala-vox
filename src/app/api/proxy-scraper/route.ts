import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { wsId, recursoId, url } = await req.json();

    if (!wsId || !recursoId || !url) {
      return NextResponse.json({ success: false, error: "Faltan parámetros" }, { status: 400 });
    }

    const functionUrl = `https://us-central1-imala-vox.cloudfunctions.net/procesarScrapingWeb`;
    console.log(`[Proxy] Iniciando scraping para: ${url}`);

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wsId,
        recursoId,
        url,
        secret: 'imala_vox_internal_key'
      })
    });

    console.log(`[Proxy] Cloud Function respondió con status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Proxy] Error de Cloud Function (${response.status}):`, errorText);
      return NextResponse.json({
        success: false,
        error: `Error del motor (${response.status}): ${errorText.substring(0, 100)}`
      }, { status: 500 });
    }

    const result = await response.json();
    const rawText = result.result?.mainText || result.data?.mainText || result.mainText || "";

    // Disparar parsing IA en background (sin await — no bloqueamos al usuario)
    if (rawText && rawText.length > 100) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      console.log(`[Proxy] Disparando parse-objects para ${url} en ${baseUrl}`);
      fetch(`${baseUrl}/api/parse-objects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, sourceUrl: url, wsId, recursoId })
      }).catch(err => console.error('[Proxy] Error disparando parse-objects:', err));
    }

    return NextResponse.json({ success: true, ...result.result || result });

  } catch (error: any) {
    console.error("[Proxy] Error crítico:", error);
    return NextResponse.json({ success: false, error: `Error interno: ${error.message}` }, { status: 500 });
  }
}
