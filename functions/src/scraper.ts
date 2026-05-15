/**
 * Motor de Scraping — Estrategia directFetch + fichas individuales
 *
 * Fase 1: directFetch de la página principal para obtener links de propiedades.
 *         Si Spider logra encontrar más links (clicking "ver más"), los agrega.
 * Fase 2: directFetch de cada ficha individual (sin pasar por Spider).
 *         RE/MAX devuelve precio, m², expensas, fotos, etc. en el SSR HTML.
 *
 * Para imágenes RE/MAX: el path parcial "listings/UUID/UUID.jpg" se resuelve
 * con base CDN "https://d1acdg20u0pmxj.cloudfront.net/".
 */

export interface ScrapeResult {
  success: boolean;
  mainText: string;
  items: string[];
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Script para Spider Chrome — clickea "ver más" para descubrir más links
// ─────────────────────────────────────────────────────────────────────────────
const LOAD_MORE_SCRIPT = `
(async () => {
  const delay = (ms) => new Promise(r => setTimeout(r, ms));
  const patrones = ['ver más', 'ver mas', 'cargar más', 'cargar mas', 'mostrar más', 'load more', 'show more', 'más resultados'];
  let clicks = 0;
  while (clicks < 5) {
    await delay(1000);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    await delay(800);
    let boton = null;
    const todos = Array.from(document.querySelectorAll('button, a.btn, [role="button"], .btn, .remax-button, .button-color-grey-border'));
    for (const btn of todos) {
      const texto = (btn.textContent || '').toLowerCase().trim();
      const rect = btn.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && patrones.some(p => texto.includes(p))) { boton = btn; break; }
    }
    if (!boton) break;
    boton.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await delay(400);
    boton.click();
    clicks++;
    await delay(2000);
  }
  window.scrollTo(0, document.body.scrollHeight);
  await delay(1000);
})();
`;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers para links
// ─────────────────────────────────────────────────────────────────────────────
function resolverUrl(href: string, baseUrl: string): string {
  if (!href) return '';
  if (href.startsWith('http')) return href;
  if (href.startsWith('/')) {
    try { return new URL(href, baseUrl).href; } catch { return ''; }
  }
  return '';
}

function esLinkDeDetalle(href: string): boolean {
  if (!href || !href.startsWith('http')) return false;
  const path = (() => { try { return new URL(href).pathname.toLowerCase(); } catch { return ''; } })();

  if (path.includes('/listings/')) {
    if (href.includes('?')) return false;
    const slug = path.split('/listings/')[1] || '';
    const reservados = ['buy', 'sell', 'rent', 'map', 'search', 'list', 'filter', 'residential', 'commercial'];
    if (reservados.includes(slug.split('/')[0])) return false;
    return slug.length > 3;
  }
  if (path.includes('/propiedad/')) return true;
  if (path.includes('/property/') && !path.includes('/property-category')) return true;
  if (path.includes('/ficha/')) return true;
  if (path.includes('/inmueble/')) return true;
  if (/\/\d{6,}/.test(path)) return true;
  if (path.includes('/producto/')) return true;
  if (path.includes('/product/') && !path.includes('/product-category')) return true;
  if (path.includes('/productos/') && path.split('/').length > 3) return true;
  if (path.includes('/item/')) return true;
  if (path.includes('/articulo/')) return true;
  if (path.includes('/products/') && path.split('/products/')[1]?.length > 0) return true;
  if (href.includes('articulo.mercadolibre') || /\/MLA-\d+/.test(href)) return true;
  return false;
}

function extraerLinksDeHtml(html: string, baseUrl: string): string[] {
  const dominioOrigen = (() => { try { return new URL(baseUrl).hostname; } catch { return ''; } })();
  const regex = /href=["']([^"']+)["']/gi;
  const links = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    const resolved = resolverUrl(m[1], baseUrl);
    if (!resolved) continue;
    try {
      if (new URL(resolved).hostname !== dominioOrigen) continue;
    } catch { continue; }
    if (esLinkDeDetalle(resolved)) links.add(resolved);
  }
  return Array.from(links);
}

// ─────────────────────────────────────────────────────────────────────────────
// Capa 1: Fetch HTTP directo con headers de browser real
// ─────────────────────────────────────────────────────────────────────────────
async function directFetch(url: string, debug = false): Promise<{ html: string; content: string } | null> {
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
      if (debug) console.log(`[DirectFetch] HTTP ${res.status} para ${url}`);
      return null;
    }

    const html = await res.text();
    if (debug) console.log(`[DirectFetch] HTML: ${html.length} chars para ${url}`);

    // Extraer __NEXT_DATA__ si existe (Next.js)
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
    if (nextDataMatch) {
      const rawJson = nextDataMatch[1].trim();
      if (debug) console.log(`[DirectFetch] __NEXT_DATA__: ${rawJson.length} chars`);
      try {
        const nextData = JSON.parse(rawJson);
        const pageProps = nextData?.props?.pageProps || {};
        // Buscar el array de propiedades en rutas conocidas
        for (const key of ['listings', 'properties', 'results', 'initialListings', 'data']) {
          const val = pageProps[key] || pageProps.data?.[key] || pageProps.agent?.[key];
          if (Array.isArray(val) && val.length > 0) {
            if (debug) console.log(`[DirectFetch] __NEXT_DATA__.${key}: ${val.length} items`);
            return { html, content: `__NEXT_DATA__ ${key}:\n${JSON.stringify(val, null, 2).slice(0, 120000)}` };
          }
        }
        // Fallback: pageProps completo
        return { html, content: `__NEXT_DATA__:\n${JSON.stringify(pageProps, null, 2).slice(0, 80000)}` };
      } catch {
        return { html, content: rawJson.slice(0, 80000) };
      }
    }

    // Sin __NEXT_DATA__: HTML limpio (sin scripts/estilos/nav/footer)
    const cleanHtml = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<(nav|footer|header|aside|noscript)[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/\s{3,}/g, '\n')
      .trim();

    return { html, content: cleanHtml.slice(0, 80000) };

  } catch (err: any) {
    if (debug) console.error(`[DirectFetch] Error: ${err.message}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Capa 2: Spider — solo para descubrir links adicionales (no para contenido)
// ─────────────────────────────────────────────────────────────────────────────
async function spiderGetLinks(url: string, apiKey: string): Promise<string[]> {
  try {
    const response = await fetch('https://api.spider.cloud/scrape', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        return_format: 'markdown',
        request: 'chrome',
        execution_scripts: { [url]: LOAD_MORE_SCRIPT },
        return_page_links: true,
        stealth: true,
      }),
    });
    if (!response.ok) return [];
    const data = await response.json();
    const page = Array.isArray(data) ? data[0] : data;
    if (!page || page.status === 0) return [];
    const links: string[] = page.links || page.page_links || page.urls || [];
    console.log(`[Spider] Links descubiertos: ${links.length}`);
    return links;
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Función principal
// ─────────────────────────────────────────────────────────────────────────────
export async function ejecutarScrapingProfundo(
  url: string,
  maxProperties: number = 40
): Promise<ScrapeResult> {
  const SPIDER_API_KEY = process.env.SPIDER_API_KEY;

  try {
    console.log(`[Scraper] Iniciando para: ${url}`);

    // ── Fase 1: Obtener página principal y links ──────────────────────────────
    const mainResult = await directFetch(url, true);
    if (!mainResult) {
      return { success: false, mainText: '', items: [], error: 'No se pudo acceder a la página' };
    }

    const mainContent = mainResult.content;
    const mainHtml = mainResult.html;

    // Extraer links de propiedades del HTML
    let propertyLinks = extraerLinksDeHtml(mainHtml, url);
    console.log(`[Scraper] Links extraídos del HTML: ${propertyLinks.length}`);

    // Si tenemos pocos links, intentar con Spider para descubrir más (click "ver más")
    if (propertyLinks.length < 10 && SPIDER_API_KEY) {
      console.log('[Scraper] Buscando más links con Spider...');
      const spiderLinks = await spiderGetLinks(url, SPIDER_API_KEY);
      const dominioOrigen = (() => { try { return new URL(url).hostname; } catch { return ''; } })();
      const extraLinks = spiderLinks
        .map(l => resolverUrl(l, url))
        .filter(l => {
          if (!l) return false;
          try { return new URL(l).hostname === dominioOrigen; } catch { return false; }
        })
        .filter(esLinkDeDetalle)
        .filter(l => !propertyLinks.includes(l));
      if (extraLinks.length > 0) {
        console.log(`[Scraper] Spider agregó ${extraLinks.length} links adicionales`);
        propertyLinks = [...propertyLinks, ...extraLinks];
      }
    }

    propertyLinks = [...new Set(propertyLinks)].slice(0, maxProperties);
    console.log(`[Scraper] Total links de propiedades: ${propertyLinks.length}`);

    // ── Fase 2: directFetch de cada ficha individual ──────────────────────────
    const fichas: Array<{ url: string; content: string }> = [];

    if (propertyLinks.length > 0) {
      console.log('[Scraper] Fetching fichas individuales...');
      const CONCURRENCY = 3;

      for (let i = 0; i < propertyLinks.length; i += CONCURRENCY) {
        const chunk = propertyLinks.slice(i, i + CONCURRENCY);
        const results = await Promise.all(chunk.map(async (link) => {
          const result = await directFetch(link, false);
          if (result && result.content.length > 200) {
            return { url: link, content: result.content };
          }
          return null;
        }));
        const ok = results.filter(Boolean) as Array<{ url: string; content: string }>;
        fichas.push(...ok);
        console.log(`[Scraper] Bloque ${Math.ceil(i / CONCURRENCY) + 1}: ${ok.length}/${chunk.length} OK`);
      }
    }

    // ── Armar texto para el parser ────────────────────────────────────────────
    // Si tenemos fichas individuales con datos completos, usarlas como fuente principal.
    // El contenido de la página principal sirve como contexto general.
    let fullText: string;

    if (fichas.length > 0) {
      const header = [
        `ORIGEN: ${url}`,
        `FICHAS_INDIVIDUALES: ${fichas.length}`,
        `NOTA_IMAGENES_REMAX: El CDN base para fotos de RE/MAX es "https://d1acdg20u0pmxj.cloudfront.net/". Si encuentrás paths como "listings/UUID/UUID.jpg" construí la URL completa con ese prefijo.`,
        '',
        '=== CONTENIDO PÁGINA PRINCIPAL ===',
        mainContent.slice(0, 8000),
        '',
        '=== FICHAS INDIVIDUALES (fuente principal de datos) ===',
      ].join('\n');

      const fichasText = fichas.map((f, i) => [
        `--- PROPIEDAD ${i + 1} ---`,
        `URL: ${f.url}`,
        f.content.slice(0, 6000),
        `--- FIN ${i + 1} ---`,
      ].join('\n'));

      fullText = header + '\n' + fichasText.join('\n\n');
    } else {
      // Sin fichas individuales: usar solo el contenido de la página principal
      fullText = [
        `ORIGEN: ${url}`,
        `NOTA: Solo se pudo obtener la página principal (sin fichas individuales).`,
        `NOTA_IMAGENES_REMAX: El CDN base para fotos de RE/MAX es "https://d1acdg20u0pmxj.cloudfront.net/". Si encuentrás paths como "listings/UUID/UUID.jpg" construí la URL completa.`,
        '',
        '=== CONTENIDO ===',
        mainContent,
      ].join('\n');
    }

    console.log(`[Scraper] Texto total: ${fullText.length} chars, ${fichas.length} fichas`);

    return {
      success: true,
      mainText: fullText,
      items: fichas.map(f => f.url),
    };

  } catch (error: any) {
    console.error('[Scraper] Error:', error.message);
    return { success: false, mainText: '', items: [], error: error.message };
  }
}
