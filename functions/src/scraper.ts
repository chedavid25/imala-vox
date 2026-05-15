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

    const photoUrls = (data.photos || []).slice(0, 3).map((p: any) => {
      const raw = p.rawValue || p.url || p.path || (typeof p === 'string' ? p : '');
      if (!raw) return '';
      return raw.startsWith('http') ? raw : `${CDN_REMAX}${raw}`;
    }).filter(Boolean);

    const lines = [
      `URL: ${originalUrl}`,
      data.title             && `Título: ${data.title}`,
      data.price != null     && `PRECIO_VALOR: ${data.price}`,
      data.price != null     && `Precio: ${data.price}`,
      (data.currency?.value || data.currency) && `Moneda: ${data.currency?.value || data.currency || 'USD'}`,
      data.description       && `Descripción: ${String(data.description).slice(0, 1000)}`,
      data.dimensionTotalBuilt  != null && `m² totales: ${data.dimensionTotalBuilt}`,
      data.dimensionCovered     != null && `m² cubiertos: ${data.dimensionCovered}`,
      (data.environments ?? data.rooms) != null && `Ambientes: ${data.environments ?? data.rooms}`,
      data.bedrooms          != null && `Dormitorios: ${data.bedrooms}`,
      data.bathrooms         != null && `Baños: ${data.bathrooms}`,
      data.garages           != null && `Cocheras: ${data.garages}`,
      (data.neighborhood || data.barrio) && `Barrio: ${data.neighborhood || data.barrio}`,
      (data.city || data.localidad)      && `Localidad: ${data.city || data.localidad}`,
      (data.propertyType?.label || data.type) && `Tipo: ${data.propertyType?.label || data.type}`,
      (data.operationType?.label || data.operation) && `Operación: ${data.operationType?.label || data.operation}`,
      data.expenses != null  && `Expensas: ${data.expenses} ARS`,
      photoUrls.length > 0   && `Fotos: ${photoUrls.join(' | ')}`,
    ].filter(Boolean).join('\n');

    console.log(`[RE/MAX API] OK: ${slug} — precio:${data.price} fotos:${photoUrls.length}`);
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
