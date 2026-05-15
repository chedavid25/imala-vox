/**
 * Motor de Scraping — Firecrawl + directFetch
 *
 * Estrategia:
 * 1. directFetch (gratis): fetch HTTP directo con headers de browser.
 *    Extrae links de propiedades del HTML para usarlos como fuente.
 *
 * 2. Firecrawl (principal): scrape la página con actions JS para clickear
 *    "ver más" y obtener TODAS las propiedades. Retorna markdown + links.
 *
 * 3. directFetch fichas: para cada URL de propiedad encontrada, hace
 *    directFetch (gratis, confiable en sitios SSR como RE/MAX Next.js).
 *    Firecrawl solo se usa como fallback si directFetch falla.
 *
 * Esto maximiza calidad (Firecrawl para la página principal con JS actions)
 * y minimiza créditos (directFetch para fichas individuales).
 */

export interface ScrapeResult {
  success: boolean;
  mainText: string;
  items: string[];
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Script JS para clickear "ver más" (usado tanto en Firecrawl como fallback)
// ─────────────────────────────────────────────────────────────────────────────
const LOAD_MORE_JS = `
(async () => {
  const delay = ms => new Promise(r => setTimeout(r, ms));
  const patrones = ['ver más','ver mas','cargar más','cargar mas','mostrar más','load more','show more','ver todas','ver todos','más resultados'];
  for (let clicks = 0; clicks < 10; clicks++) {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    await delay(1000);
    const todos = Array.from(document.querySelectorAll('button,[role="button"],.btn,.remax-button,.button-color-grey-border,[class*="loadMore"],[class*="load-more"],[class*="ver-mas"],[class*="show-more"]'));
    const boton = todos.find(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && patrones.some(p => (el.textContent||'').toLowerCase().includes(p));
    });
    if (!boton) break;
    boton.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await delay(400);
    boton.click();
    await delay(2500);
  }
  window.scrollTo(0, document.body.scrollHeight);
  await delay(1000);
})();
`;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de URLs
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
  if (path.includes('/propiedad/') || path.includes('/inmueble/') || path.includes('/ficha/')) return true;
  if (path.includes('/property/') && !path.endsWith('/property/')) return true;
  if (/\/\d{6,}/.test(path)) return true;
  if (path.includes('/producto/') || path.includes('/item/') || path.includes('/articulo/')) return true;
  if (path.includes('/product/') && !path.includes('/product-category')) return true;
  if (path.includes('/products/') && path.split('/products/')[1]?.length > 0) return true;
  if (path.includes('/productos/') && path.split('/').length > 3) return true;
  if (href.includes('articulo.mercadolibre') || /\/MLA-\d+/.test(href)) return true;
  return false;
}

function filtrarLinksDeDetalle(links: string[], baseUrl: string): string[] {
  const dominio = (() => { try { return new URL(baseUrl).hostname; } catch { return ''; } })();
  return [...new Set(
    links
      .map(l => resolverUrl(l, baseUrl))
      .filter(l => {
        if (!l) return false;
        try { return new URL(l).hostname === dominio; } catch { return false; }
      })
      .filter(esLinkDeDetalle)
  )];
}

function extraerLinksDeHtml(html: string, baseUrl: string): string[] {
  const regex = /href=["']([^"'#?][^"']*?)["']/gi;
  const links: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) links.push(m[1]);
  return filtrarLinksDeDetalle(links, baseUrl);
}

// ─────────────────────────────────────────────────────────────────────────────
// Extracción estructurada de ficha individual desde __NEXT_DATA__ (RE/MAX, etc.)
// ─────────────────────────────────────────────────────────────────────────────
function extraerCamposPropiedad(pp: Record<string, any>): string | null {
  const listing = pp.listing || pp.property || pp.inmueble || pp.propiedad || pp.unit;
  if (!listing || typeof listing !== 'object') return null;

  const lines: string[] = [];

  if (listing.title || listing.address) lines.push(`Título: ${listing.title || listing.address}`);
  if (listing.description) lines.push(`Descripción: ${String(listing.description).slice(0, 500)}`);

  // Precio — puede ser número o string
  if (listing.price != null) lines.push(`Precio: ${listing.price}`);
  if (listing.currency || listing.currencyCode) lines.push(`Moneda: ${listing.currency || listing.currencyCode}`);

  // Tipo / operación
  if (listing.type || listing.propertyType) lines.push(`Tipo: ${listing.type || listing.propertyType}`);
  if (listing.operationType || listing.operation || listing.listingType)
    lines.push(`Operación: ${listing.operationType || listing.operation || listing.listingType}`);

  // Medidas
  // Medidas - Soporte para múltiples nomenclaturas (RE/MAX, etc.)
  const m2Totales = listing.totalArea ?? listing.totalSurface ?? listing.surface_total ?? listing.total_area;
  const m2Cubiertos = listing.coveredArea ?? listing.coveredSurface ?? listing.surface_covered ?? listing.covered_area;
  const m2Terreno = listing.landArea ?? listing.landSurface ?? listing.surface_land ?? listing.land_area;

  if (m2Totales != null) lines.push(`m² totales: ${m2Totales}`);
  if (m2Cubiertos != null) lines.push(`m² cubiertos: ${m2Cubiertos}`);
  if (m2Terreno != null) lines.push(`m² terreno: ${m2Terreno}`);

  // Ambientes y Habitaciones
  const ambientes = listing.environments ?? listing.rooms ?? listing.roomsValue;
  const dormitorios = listing.bedrooms ?? listing.bedRooms ?? listing.bedroomsValue ?? listing.habitaciones;
  const banios = listing.bathrooms ?? listing.baths ?? listing.bathroomsValue ?? listing.banos;
  const cocheras = listing.garages ?? listing.parking ?? listing.parkingValue ?? listing.cocheras;

  if (ambientes != null) lines.push(`Ambientes: ${ambientes}`);
  if (dormitorios != null) lines.push(`Dormitorios: ${dormitorios}`);
  if (banios != null) lines.push(`Baños: ${banios}`);
  if (cocheras != null) lines.push(`Cocheras: ${cocheras}`);

  // Ubicación
  if (listing.neighborhood || listing.barrio) lines.push(`Barrio: ${listing.neighborhood || listing.barrio}`);
  if (listing.city || listing.localidad) lines.push(`Localidad: ${listing.city || listing.localidad}`);
  if (listing.province || listing.state) lines.push(`Provincia: ${listing.province || listing.state}`);

  // Fotos — construir URLs completas RE/MAX si es necesario
  const rawPhotos = listing.photos || listing.images || listing.fotos || listing.media;
  if (Array.isArray(rawPhotos) && rawPhotos.length > 0) {
    const urls = rawPhotos.slice(0, 5).map((p: any) => {
      const raw = typeof p === 'string' ? p : (p?.url || p?.path || p?.src || p?.filename || '');
      if (!raw) return '';
      if (raw.startsWith('http')) return raw;
      if (raw.startsWith('listings/')) return `https://d1acdg20u0pmxj.cloudfront.net/${raw}`;
      return raw;
    }).filter(Boolean);
    if (urls.length) lines.push(`Fotos: ${urls.join(' | ')}`);
  }

  // Expensas
  if (listing.expenses != null || listing.expensas != null)
    lines.push(`Expensas: ${listing.expenses ?? listing.expensas} ARS`);

  return lines.length >= 3 ? lines.join('\n') : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// directFetch: HTTP simple con headers de browser (gratis, funciona en SSR)
// ─────────────────────────────────────────────────────────────────────────────
async function directFetch(url: string, debug = false): Promise<{ html: string; text: string } | null> {
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
    if (!res.ok) { if (debug) console.log(`[DirectFetch] ${res.status} para ${url}`); return null; }
    const html = await res.text();
    if (debug) console.log(`[DirectFetch] ${html.length} chars: ${url}`);

    // Next.js: extraer __NEXT_DATA__
    const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
    if (nextMatch) {
      try {
        const d = JSON.parse(nextMatch[1]);
        const pp = d?.props?.pageProps || {};

        // Primero: intentar extracción estructurada de ficha individual
        const structured = extraerCamposPropiedad(pp);
        if (structured) {
          if (debug) console.log(`[DirectFetch] Extracción estructurada OK: ${structured.length} chars`);
          return { html, text: structured };
        }

        // Segundo: buscar arrays de listados (página principal del agente)
        for (const key of ['listings','properties','results','initialListings','data']) {
          const val = pp[key] || pp.data?.[key] || pp.agent?.[key];
          if (Array.isArray(val) && val.length > 0) {
            if (debug) console.log(`[DirectFetch] __NEXT_DATA__.${key}: ${val.length} items`);
            return { html, text: `__NEXT_DATA__ ${key}:\n${JSON.stringify(val, null, 2).slice(0, 100000)}` };
          }
        }

        // Fallback: pageProps completo
        if (debug) console.log(`[DirectFetch] __NEXT_DATA__ pageProps completo: ${JSON.stringify(pp).length} chars`);
        return { html, text: `__NEXT_DATA__:\n${JSON.stringify(pp, null, 2).slice(0, 80000)}` };
      } catch { /* continuar con HTML limpio */ }
    }

    // HTML limpio sin scripts/estilos/nav/footer
    const clean = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<(nav|footer|header|aside|noscript)[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/\s{3,}/g, '\n').trim();
    return { html, text: clean.slice(0, 80000) };
  } catch (e: any) {
    if (debug) console.error(`[DirectFetch] Error: ${e.message}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Firecrawl scrape — con soporte para actions JS
// ─────────────────────────────────────────────────────────────────────────────
async function firecrawlScrape(
  url: string,
  apiKey: string,
  options: Record<string, unknown> = {},
  debug = false
): Promise<{ markdown: string; links: string[] } | null> {
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, ...options }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[Firecrawl] HTTP ${res.status}: ${err.slice(0, 200)}`);
      return null;
    }

    const data = await res.json();
    if (debug) {
      console.log(`[Firecrawl] success: ${data.success}`);
      console.log(`[Firecrawl] markdown: ${(data.data?.markdown || '').length} chars`);
      console.log(`[Firecrawl] links: ${(data.data?.links || []).length}`);
      console.log(`[Firecrawl] Sample: ${(data.data?.markdown || '').slice(0, 300)}`);
    }

    if (!data.success) {
      console.error(`[Firecrawl] Error: ${data.error || 'unknown'}`);
      return null;
    }

    return {
      markdown: data.data?.markdown || data.data?.content || '',
      links: data.data?.links || [],
    };
  } catch (e: any) {
    console.error(`[Firecrawl] Error: ${e.message}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Función principal
// ─────────────────────────────────────────────────────────────────────────────
export async function ejecutarScrapingProfundo(
  url: string,
  maxProperties: number = 40
): Promise<ScrapeResult> {
  const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
  const SPIDER_API_KEY = process.env.SPIDER_API_KEY;

  try {
    console.log(`[Scraper] Iniciando para: ${url}`);

    // ── Fase 1a: directFetch para extraer links del HTML ──────────────────────
    const mainDirect = await directFetch(url, true);
    let propertyLinks = mainDirect ? extraerLinksDeHtml(mainDirect.html, url) : [];
    console.log(`[Scraper] Links del HTML: ${propertyLinks.length}`);

    // ── Fase 1b: Firecrawl para la página principal (con click "ver más") ─────
    let mainContent = mainDirect?.text || '';

    if (FIRECRAWL_API_KEY) {
      console.log('[Scraper] Firecrawl página principal...');
      const fcMain = await firecrawlScrape(url, FIRECRAWL_API_KEY, {
        formats: ['markdown', 'links'],
        onlyMainContent: false,
        waitFor: 2000,
        actions: [
          { type: 'scroll', direction: 'down' },
          { type: 'wait', milliseconds: 1000 },
          { type: 'executeJavascript', script: LOAD_MORE_JS },
          { type: 'wait', milliseconds: 3000 },
          { type: 'scroll', direction: 'down' },
          { type: 'wait', milliseconds: 1000 },
        ],
      }, true);

      if (fcMain) {
        // Usar markdown de Firecrawl si es más rico que el HTML directo
        if (fcMain.markdown.length > mainContent.length) {
          mainContent = fcMain.markdown;
          console.log(`[Scraper] Firecrawl content: ${mainContent.length} chars`);
        }
        // Agregar links de Firecrawl
        const fcLinks = filtrarLinksDeDetalle(fcMain.links, url);
        const nuevos = fcLinks.filter(l => !propertyLinks.includes(l));
        if (nuevos.length > 0) {
          console.log(`[Scraper] Firecrawl agregó ${nuevos.length} links`);
          propertyLinks = [...propertyLinks, ...nuevos];
        }
      }
    }

    // ── Fallback: Spider si Firecrawl no está disponible ──────────────────────
    if (propertyLinks.length < 5 && SPIDER_API_KEY) {
      console.log('[Scraper] Spider fallback para links...');
      try {
        const res = await fetch('https://api.spider.cloud/scrape', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${SPIDER_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, return_format: 'markdown', request: 'chrome', return_page_links: true, stealth: true }),
        });
        if (res.ok) {
          const d = await res.json();
          const page = Array.isArray(d) ? d[0] : d;
          if (page?.status !== 0) {
            const spLinks = filtrarLinksDeDetalle(page?.links || [], url).filter(l => !propertyLinks.includes(l));
            if (spLinks.length > 0) { console.log(`[Scraper] Spider agregó ${spLinks.length} links`); propertyLinks = [...propertyLinks, ...spLinks]; }
          }
        }
      } catch { /* ignorar */ }
    }

    propertyLinks = [...new Set(propertyLinks)].slice(0, maxProperties);
    console.log(`[Scraper] Total links: ${propertyLinks.length}`);

    // ── Fase 2: Scrape fichas individuales ────────────────────────────────────
    const fichas: Array<{ url: string; content: string }> = [];

    if (propertyLinks.length > 0) {
      const CONCURRENCY = 3;
      for (let i = 0; i < propertyLinks.length; i += CONCURRENCY) {
        const chunk = propertyLinks.slice(i, i + CONCURRENCY);
        const results = await Promise.all(chunk.map(async (link) => {
          // Intentar directFetch primero (gratis)
          const direct = await directFetch(link, false);
          if (direct && direct.text.length > 200) return { url: link, content: direct.text };

          // Fallback: Firecrawl
          if (FIRECRAWL_API_KEY) {
            const fc = await firecrawlScrape(link, FIRECRAWL_API_KEY, {
              formats: ['markdown'],
              onlyMainContent: false,
              waitFor: 1000,
            }, false);
            if (fc && fc.markdown.length > 100) return { url: link, content: fc.markdown };
          }
          return null;
        }));
        const ok = results.filter(Boolean) as Array<{ url: string; content: string }>;
        fichas.push(...ok);
        console.log(`[Scraper] Bloque ${Math.ceil(i / CONCURRENCY) + 1}: ${ok.length}/${chunk.length} OK`);
      }
    }

    // ── Armar texto para el parser ────────────────────────────────────────────
    const fullText = fichas.length > 0
      ? [
          `ORIGEN: ${url}`,
          `FICHAS: ${fichas.length}`,
          `NOTA_IMAGENES: Para RE/MAX el CDN base es "https://d1acdg20u0pmxj.cloudfront.net/".`,
          `NOTA_DATOS: Prestá especial atención a las medidas (m² totales y cubiertos) y cantidad de baños. En RE/MAX suelen aparecer al principio del texto de la ficha o en el bloque de características.`,
          '',
          '=== PÁGINA PRINCIPAL ===',
          mainContent.slice(0, 8000),
          '',
          '=== FICHAS INDIVIDUALES ===',
          ...fichas.map((f, i) => [
            `--- PROPIEDAD ${i + 1} ---`,
            `URL: ${f.url}`,
            f.content.slice(0, 6000),
            `--- FIN ${i + 1} ---`,
          ].join('\n')),
        ].join('\n')
      : [
          `ORIGEN: ${url}`,
          `NOTA: Solo página principal disponible.`,
          `NOTA_IMAGENES: Para RE/MAX el CDN base es "https://d1acdg20u0pmxj.cloudfront.net/".`,
          '',
          '=== CONTENIDO ===',
          mainContent,
        ].join('\n');

    console.log(`[Scraper] Texto total: ${fullText.length} chars, ${fichas.length} fichas`);

    return { success: true, mainText: fullText, items: fichas.map(f => f.url) };

  } catch (error: any) {
    console.error('[Scraper] Error:', error.message);
    return { success: false, mainText: '', items: [], error: error.message };
  }
}
