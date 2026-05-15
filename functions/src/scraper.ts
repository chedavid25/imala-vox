/**
 * Motor de Scraping — Arquitectura en dos capas
 *
 * Capa 1 (GRATIS, sin Spider): Fetch HTTP directo con headers de browser.
 *   - Funciona para sitios SSR: RE/MAX (Next.js), WooCommerce, Shopify,
 *     Tienda Nube, Tokko Broker, MercadoLibre, etc.
 *   - Extrae __NEXT_DATA__ JSON (Next.js) si existe → datos estructurados perfectos.
 *   - Si no, devuelve el HTML limpio (sin scripts/styles/nav/footer).
 *
 * Capa 2 (Spider): Solo si Capa 1 devuelve < 500 chars útiles.
 *   - Para SPAs puras que necesitan JavaScript para renderizar.
 *   - Usa request: 'smart' (Spider decide http vs chrome automáticamente).
 *   - filter_output_main_only: false para no perder contenido de tarjetas.
 *
 * NO visita fichas individuales — trabaja solo con la página enviada por el usuario.
 */

export interface ScrapeResult {
  success: boolean;
  mainText: string;
  items: string[];
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Capa 1: Fetch HTTP directo (gratis, confiable para SSR)
// ─────────────────────────────────────────────────────────────────────────────
async function directFetch(url: string, debug = false): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
        'Cache-Control': 'max-age=0',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (!res.ok) {
      console.log(`[DirectFetch] HTTP ${res.status} para ${url}`);
      return null;
    }

    const html = await res.text();
    if (debug) console.log(`[DirectFetch] HTML total: ${html.length} chars`);

    // ── Estrategia A: Extraer __NEXT_DATA__ (Next.js SSR) ──────────────────
    // Next.js embebe TODOS los datos de la página en un JSON gigante.
    // Para RE/MAX, contiene listings con precio, m², fotos, etc.
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
    if (nextDataMatch) {
      const rawJson = nextDataMatch[1].trim();
      if (debug) console.log(`[DirectFetch] __NEXT_DATA__ encontrado: ${rawJson.length} chars`);

      try {
        const nextData = JSON.parse(rawJson);
        // Buscar el array de propiedades/listings en distintas rutas posibles
        const pageProps = nextData?.props?.pageProps || {};
        const candidatos = [
          pageProps.listings,
          pageProps.properties,
          pageProps.results,
          pageProps.data?.listings,
          pageProps.data?.properties,
          pageProps.initialListings,
          pageProps.agent?.listings,
        ].filter(Boolean);

        if (candidatos.length > 0) {
          const listings = candidatos[0];
          if (debug) console.log(`[DirectFetch] Listings encontrados en __NEXT_DATA__: ${Array.isArray(listings) ? listings.length : 'object'}`);
          // Devolver el JSON de listings como texto estructurado
          return `__NEXT_DATA__ listings:\n${JSON.stringify(listings, null, 2).slice(0, 120000)}`;
        }

        // Si no encontramos listings directamente, devolver pageProps completo
        if (debug) console.log('[DirectFetch] __NEXT_DATA__ sin array de listings obvio, usando pageProps');
        return `__NEXT_DATA__:\n${JSON.stringify(pageProps, null, 2).slice(0, 80000)}`;
      } catch {
        // JSON inválido — usar el raw truncado
        return `__NEXT_DATA__ (raw):\n${rawJson.slice(0, 80000)}`;
      }
    }

    // ── Estrategia B: HTML limpio (para sitios SSR sin Next.js) ────────────
    // Eliminamos ruido (scripts, estilos, nav, footer) y dejamos el contenido.
    const cleanHtml = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<(nav|footer|header|aside|noscript)[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/\s{3,}/g, '\n')
      .trim();

    if (debug) console.log(`[DirectFetch] HTML limpio: ${cleanHtml.length} chars`);
    return cleanHtml.slice(0, 100000);

  } catch (err: any) {
    console.error(`[DirectFetch] Error: ${err.message}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Capa 2: Spider API (para SPAs que necesitan JS)
// ─────────────────────────────────────────────────────────────────────────────
async function spiderScrape(
  url: string,
  apiKey: string,
  options: Record<string, unknown> = {},
  debug = false
): Promise<string | null> {
  const response = await fetch('https://api.spider.cloud/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, ...options }),
  });

  if (!response.ok) {
    console.error(`[Spider] HTTP ${response.status}`);
    return null;
  }

  const data = await response.json();
  const page = Array.isArray(data) ? data[0] : data;

  if (debug) {
    console.log(`[Spider] Keys: ${Object.keys(page || {}).join(', ')}`);
    console.log(`[Spider] status: ${page?.status}`);
    console.log(`[Spider] Sample: ${JSON.stringify(page).slice(0, 400)}`);
  }

  if (!page || page.status === 0) return null;

  const content = page.content || page.markdown || page.html || page.text || '';
  if (debug) console.log(`[Spider] content: ${content.length} chars`);

  return content || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Función principal
// ─────────────────────────────────────────────────────────────────────────────
export async function ejecutarScrapingProfundo(
  url: string,
  _maxProperties: number = 40
): Promise<ScrapeResult> {
  const SPIDER_API_KEY = process.env.SPIDER_API_KEY;

  try {
    console.log(`[Scraper] Iniciando para: ${url}`);

    // ── Capa 1: Fetch HTTP directo ────────────────────────────────────────────
    console.log('[Scraper] Capa 1: fetch HTTP directo...');
    let content = await directFetch(url, true);
    const contentLen = content?.length ?? 0;
    console.log(`[Scraper] Capa 1 resultado: ${contentLen} chars`);

    // ── Capa 2: Spider como fallback ──────────────────────────────────────────
    if (contentLen < 500) {
      if (!SPIDER_API_KEY) {
        console.log('[Scraper] Sin SPIDER_API_KEY y Capa 1 insuficiente. Usando lo que hay.');
      } else {
        console.log('[Scraper] Capa 2: Spider (SPA fallback)...');
        const spiderContent = await spiderScrape(url, SPIDER_API_KEY, {
          return_format: 'markdown',
          request: 'smart',
          filter_output_main_only: false,
          return_page_links: true,
          stealth: true,
        }, true);

        if (spiderContent && spiderContent.length > contentLen) {
          content = spiderContent;
          console.log(`[Scraper] Capa 2 resultado: ${content.length} chars`);
        }
      }
    }

    if (!content || content.length < 100) {
      return {
        success: false,
        mainText: '',
        items: [],
        error: `No se pudo obtener contenido del sitio. El sitio puede requerir JavaScript avanzado o estar bloqueando el acceso.`,
      };
    }

    const fullText = [
      `ORIGEN: ${url}`,
      `CHARS_CAPTURADOS: ${content.length}`,
      '',
      '=== CONTENIDO ===',
      content,
    ].join('\n');

    console.log(`[Scraper] Texto total para parser: ${fullText.length} chars`);

    return {
      success: true,
      mainText: fullText,
      items: [],
    };

  } catch (error: any) {
    console.error('[Scraper] Error:', error.message);
    return { success: false, mainText: '', items: [], error: error.message };
  }
}
