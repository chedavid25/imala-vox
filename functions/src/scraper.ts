export interface ScrapeResult {
  success: boolean;
  mainText: string;
  items: string[];
  error?: string;
}

const CDN_REMAX = 'https://d1acdg20u0pmxj.cloudfront.net/';

// ─────────────────────────────────────────────────────────────────────────────
// RE/MAX API nativa — fetcha una propiedad por slug sin Spider
// ─────────────────────────────────────────────────────────────────────────────
const TIPO_MAP: Record<string, string> = {
  departamento_piso: 'departamento', departamento: 'departamento',
  casa: 'casa', chalet: 'casa', duplex: 'casa',
  local_comercial: 'local', local: 'local',
  oficina: 'oficina',
  terreno: 'terreno', lote: 'terreno',
  campo: 'campo', finca: 'campo',
};

async function fetchRemaxNativo(slug: string, originalUrl: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api-ar.redremax.com/remaxweb-ar/api/listings/findBySlug/${encodeURIComponent(slug)}`,
      { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }
    );
    if (!res.ok) {
      console.warn(`[RE/MAX API] ${res.status} para slug: ${slug}`);
      return null;
    }
    const d = await res.json();
    const data = d?.data;
    if (!data) return null;

    // Fotos: usar photo.value (tiene extensión .jpg), no rawValue
    const photoUrls = (data.photos || [])
      .filter((p: any) => !p.is360)
      .slice(0, 5)
      .map((p: any) => {
        const path = p.value || p.rawValue || '';
        if (!path) return '';
        return path.startsWith('http') ? path : `${CDN_REMAX}${path}`;
      }).filter(Boolean);

    // Dirección como título principal
    const titulo = data.displayAddress || data.title || slug;

    // Tipo y operación normalizados
    const tipoRaw = (data.type?.value || '').toLowerCase();
    const tipo = TIPO_MAP[tipoRaw] || 'otro';
    const operacionRaw = (data.operation?.value || '').toLowerCase();
    const operacion = operacionRaw === 'sale' ? 'venta' : operacionRaw === 'rent' ? 'alquiler' : 'venta';

    // Localización desde geo
    const barrio = data.geo?.neighborhood || null;
    const localidad = data.geo?.citie || data.geo?.countie || null;

    const lines = [
      `URL: ${originalUrl}`,
      `Título: ${titulo}`,
      `Tipo: ${tipo}`,
      `Operación: ${operacion}`,
      data.price != null          && `PRECIO_VALOR: ${data.price}`,
      data.price != null          && `Precio: ${data.price}`,
      data.currency?.value        && `Moneda: ${data.currency.value}`,
      data.dimensionTotalBuilt != null && `m² totales: ${data.dimensionTotalBuilt}`,
      data.dimensionCovered    != null && `m² cubiertos: ${data.dimensionCovered}`,
      data.totalRooms          != null && `Ambientes: ${data.totalRooms}`,
      data.bedrooms            != null && `Dormitorios: ${data.bedrooms}`,
      data.bathrooms           != null && `Baños: ${data.bathrooms}`,
      data.parkingSpaces       != null && `Cocheras: ${data.parkingSpaces}`,
      barrio                          && `Barrio: ${barrio}`,
      localidad                       && `Localidad: ${localidad}`,
      data.expensesPrice       != null && `Expensas: ${data.expensesPrice} ARS`,
      photoUrls.length > 0            && `Fotos: ${photoUrls.join(' | ')}`,
      data.description                && `Descripción: ${data.description}`,
    ].filter(Boolean).join('\n');

    console.log(`[RE/MAX API] OK: ${titulo} — precio:${data.price} fotos:${photoUrls.length}`);
    return lines;
  } catch (e: any) {
    console.error(`[RE/MAX API] Error: ${e.message}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// directFetch — HTTP simple para páginas SSR (sin Spider)
// ─────────────────────────────────────────────────────────────────────────────
async function directFetch(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.9',
      },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Next.js: extraer __NEXT_DATA__
    const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
    if (nextMatch) {
      try {
        const d = JSON.parse(nextMatch[1]);
        const pp = d?.props?.pageProps || {};
        return `__NEXT_DATA__:\n${JSON.stringify(pp, null, 2).slice(0, 80000)}`;
      } catch { /* continuar */ }
    }

    // HTML limpio
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<(nav|footer|header|aside|noscript)[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/\s{3,}/g, '\n').trim().slice(0, 80000);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Spider scrape — para páginas SPA que necesitan JS
// ─────────────────────────────────────────────────────────────────────────────
async function spiderScrape(url: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.spider.cloud/scrape', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, return_format: 'markdown', request: 'chrome' }),
    });
    if (!res.ok) return null;
    const d = await res.json();
    const page = Array.isArray(d) ? d[0] : d;
    return page?.content || null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Función principal
// ─────────────────────────────────────────────────────────────────────────────
export async function ejecutarScrapingProfundo(
  url: string,
  _maxProperties: number = 20
): Promise<ScrapeResult> {
  console.log(`[Scraper] Iniciando para: ${url}`);

  try {
    // ── RE/MAX ficha individual → API nativa, sin Spider ─────────────────────
    const remaxMatch = url.match(/remax\.com\.ar\/listings\/([^/?#]+)/i);
    if (remaxMatch) {
      const slug = remaxMatch[1];
      console.log(`[Scraper] RE/MAX slug detectado: ${slug}`);
      const content = await fetchRemaxNativo(slug, url);
      if (content) {
        return { success: true, mainText: content, items: [url] };
      }
      // Fallback: directFetch si la API falla
      console.log('[Scraper] API nativa falló, probando directFetch...');
      const html = await directFetch(url);
      if (html) return { success: true, mainText: html, items: [url] };
    }

    // ── Cualquier otra URL: directFetch primero (gratis) ─────────────────────
    const directContent = await directFetch(url);
    if (directContent && directContent.length > 500) {
      console.log(`[Scraper] directFetch OK: ${directContent.length} chars`);
      return { success: true, mainText: directContent, items: [url] };
    }

    // ── Fallback: Spider para SPA (usa créditos) ──────────────────────────────
    const SPIDER_API_KEY = process.env.SPIDER_API_KEY;
    if (SPIDER_API_KEY) {
      console.log('[Scraper] Spider fallback...');
      const spiderContent = await spiderScrape(url, SPIDER_API_KEY);
      if (spiderContent) return { success: true, mainText: spiderContent, items: [url] };
    }

    return { success: false, mainText: '', items: [], error: 'No se pudo obtener contenido' };
  } catch (error: any) {
    console.error('[Scraper] Error:', error.message);
    return { success: false, mainText: '', items: [], error: error.message };
  }
}
