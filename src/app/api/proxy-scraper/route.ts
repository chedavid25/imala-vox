import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { wsId, recursoId, url, token } = await req.json();

    if (!wsId || !recursoId || !url) {
      return NextResponse.json({ success: false, error: "Faltan parámetros" }, { status: 400 });
    }

    const functionUrl = `https://us-central1-imala-vox.cloudfunctions.net/ejecutarScrapingWeb`;

    console.log(`[Proxy] Llamando a Cloud Function para: ${url}`);

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify({
        data: { wsId, recursoId, url }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Proxy] Error de Cloud Function (${response.status}):`, errorText);
      return NextResponse.json({ success: false, error: `Error del motor: ${response.status}` }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result.result || result.data || result);

  } catch (error: any) {
    console.error("[Proxy] Error crítico:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
