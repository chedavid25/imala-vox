/**
 * Motor de Scraping con Spider API
 * Reemplaza Firecrawl/Puppeteer. Maneja paginación y deep crawl.
 */

export interface ScrapeResult {
  success: boolean;
  mainText: string;
  items: string[];
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Script de paginación para el catálogo (listado)
// ─────────────────────────────────────────────────────────────────────────────
const LOAD_MORE_SCRIPT = `
(async () => {
  const delay = ms => new Promise(r => setTimeout(r, ms));
  const selectores = ['.remax-button', '.button-color-grey-border', '.ver-mas', '.load-more', '[class*="loadMore"]', '[class*="ver-mas"]'];
  for (let i = 0; i < 12; i++) {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    await delay(1500);
    let btn = null;
    for (const s of selectores) {
      const el = document.querySelector(s);
      if (el && el.getBoundingClientRect().height > 0) { btn = el; break; }
    }
    if (!btn) break;
    btn.click();
    await delay(3000);
  }
  window.scrollTo(0, document.body.scrollHeight);
  await delay(1000);
})();
`;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de extracción (Lo que sí funciona de la versión anterior)
// ─────────────────────────────────────────────────────────────────────────────
function extraerCamposPropiedad(html: string): string | null {
  if (!html) return null;
  let dataObj: any = null;

  // 1. Intentar extraer JSON de __NEXT_DATA__
  const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (nextMatch) {
    try {
      const d = JSON.parse(nextMatch[1]);
      dataObj = d?.props?.pageProps?.listing || d?.props?.pageProps?.property || d?.props?.pageProps;
    } catch (e) {
      console.warn('[Scraper] Error parseando __NEXT_DATA__');
    }
  }

  // 2. Intentar extraer JSON de ng-state (Angular)
  if (!dataObj) {
    const ngMatch = html.match(/<script id="ng-state"[^>]*>([\s\S]*?)<\/script>/i);
    if (ngMatch) {
      try {
        // A veces el JSON de Angular viene escapado o con caracteres extraños
        let rawJson = ngMatch[1].trim();
        const d = JSON.parse(rawJson);
        for (const key in d) {
          const val = d[key]?.b?.data || d[key]?.b;
          if (val && typeof val === 'object' && (val.price || val.dimensionTotalBuilt || val.bathrooms)) {
            dataObj = val; break;
          }
        }
      } catch (e) {
        console.warn('[Scraper] Error parseando ng-state');
      }
    }
  }

  // 3. Fallback: Buscar fragmentos de JSON directos si los scripts fallan
  if (!dataObj) {
    const fallbackMatch = html.match(/"price":\s*(\d+)/i);
    if (fallbackMatch) {
      console.log('[Scraper] Usando fallback de regex para precio');
      dataObj = {
        price: parseInt(fallbackMatch[1]),
        dimensionTotalBuilt: html.match(/"dimensionTotalBuilt":\s*(\d+)/i)?.[1],
        dimensionCovered: html.match(/"dimensionCovered":\s*(\d+)/i)?.[1],
        bathrooms: html.match(/"bathrooms":\s*(\d+)/i)?.[1],
        description: html.match(/"description":\s*"([\s\S]*?)"/i)?.[1]
      };
    }
  }

  if (!dataObj || typeof dataObj !== 'object') return null;

  const lines: string[] = [];
  
  // Título
  const titulo = dataObj.title || dataObj.address || dataObj.name || dataObj.listingTitle;
  if (titulo) lines.push(`Título: ${titulo}`);

  // Descripción (Limpiar escapes de JSON si vienen del fallback)
  let desc = dataObj.description || dataObj.notes || dataObj.listingDescription;
  if (desc) {
    desc = String(desc).replace(/\\n/g, '\n').replace(/\\"/g, '"').trim();
    lines.push(`Descripción: ${desc}`);
  }

  // Precios
  const precio = dataObj.price ?? dataObj.priceValue ?? dataObj.amount;
  if (precio != null && precio > 0) {
    lines.push(`PRECIO_VALOR: ${precio}`);
    lines.push(`Precio: ${precio}`);
  }
  
  const moneda = dataObj.currency?.value ?? dataObj.currencyCode ?? dataObj.currency ?? (html.includes('USD') ? 'USD' : 'ARS');
  if (moneda) lines.push(`Moneda: ${moneda}`);

  // Medidas (Normalizar nombres de campos de RE/MAX)
  const m2T = dataObj.totalArea ?? dataObj.totalSurface ?? dataObj.surface_total ?? dataObj.total_area ?? dataObj.dimensionTotalBuilt ?? dataObj.total_built;
  const m2C = dataObj.coveredArea ?? dataObj.coveredSurface ?? dataObj.surface_covered ?? dataObj.covered_area ?? dataObj.dimensionCovered ?? dataObj.total_covered;
  
  if (m2T != null) {
    lines.push(`m² totales: ${m2T}`);
    lines.push(`METROS_TOTALES: ${m2T}`);
  }
  if (m2C != null) {
    lines.push(`m² cubiertos: ${m2C}`);
    lines.push(`SUPERFICIE_CUBIERTA: ${m2C}`);
  }

  // Ambientes, Dormitorios, Baños
  const amb = dataObj.environments ?? dataObj.rooms ?? dataObj.roomsValue ?? dataObj.totalRooms;
  const dorm = dataObj.bedrooms ?? dataObj.bedRooms ?? dataObj.bedroomsValue ?? dataObj.habitaciones;
  const ban = dataObj.bathrooms ?? dataObj.baths ?? dataObj.bathroomsValue ?? dataObj.banos ?? dataObj.totalBaths;
  
  if (amb != null) lines.push(`Ambientes: ${amb}`);
  if (dorm != null) lines.push(`Dormitorios: ${dorm}`);
  if (ban != null) {
    lines.push(`Baños: ${ban}`);
    lines.push(`CANTIDAD_BAÑOS: ${ban}`);
  }

  // Fotos
  if (Array.isArray(dataObj.photos)) {
    const photos = dataObj.photos.map((p: any) => p.url || p.fullPath || p).filter(Boolean).slice(0, 5);
    if (photos.length > 0) lines.push(`Fotos: ${photos.join(' | ')}`);
  }

  return lines.length >= 3 ? lines.join('\n') : null;
}

function esLinkDeDetalle(href: string): boolean {
  if (!href) return false;
  const h = href.toLowerCase();
  return h.includes('/listings/') || h.includes('/propiedad/') || h.includes('/ficha/') || /\/\d{6,}/.test(h);
}

// ─────────────────────────────────────────────────────────────────────────────
// Función Principal
// ─────────────────────────────────────────────────────────────────────────────
export async function ejecutarScrapingProfundo(
  url: string,
  maxProperties: number = 40
): Promise<ScrapeResult> {
  const SPIDER_API_KEY = process.env.SPIDER_API_KEY;
  if (!SPIDER_API_KEY) return { success: false, mainText: '', items: [], error: 'Falta SPIDER_API_KEY' };

  try {
    console.log(`[Spider] Procesando: ${url}`);
    const isDetail = esLinkDeDetalle(url);

    // Configuración de Spider
    const body = {
      url,
      limit: isDetail ? 1 : maxProperties + 5,
      depth: isDetail ? 0 : 1,
      return_format: 'raw', // Usamos RAW para extraer JSON/Angular si está disponible
      request: 'chrome',
      execution_scripts: isDetail ? {} : { [url]: LOAD_MORE_SCRIPT },
      filter_output: { only_main_content: true },
      wait_for: 3000,
      metadata: true
    };

    const res = await fetch(isDetail ? 'https://api.spider.cloud/scrape' : 'https://api.spider.cloud/crawl', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SPIDER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(`Spider error ${res.status}`);
    
    const rawData = await res.json();
    let pages: any[] = [];
    
    if (Array.isArray(rawData)) {
      pages = rawData;
    } else if (rawData && typeof rawData === 'object') {
      if (rawData.content) {
        // Es una respuesta de scrape simple (un solo objeto)
        pages = [rawData];
      } else {
        // Es un objeto con claves (posiblemente numéricas de un crawl)
        pages = Object.values(rawData).filter(v => v && typeof v === 'object' && (v as any).content);
      }
    }
    
    if (pages.length === 0) {
      console.error('[Spider] Respuesta inválida:', JSON.stringify(rawData).slice(0, 200));
      throw new Error('Spider no devolvió contenido válido');
    }
    
    console.log(`[Spider] Páginas procesables: ${pages.length}`);

    // Separar principal de fichas
    const mainPage = pages.find(p => p.url === url) || pages[0];
    const fichas = pages.filter(p => p.url !== mainPage.url)
                        .filter(p => p.url && esLinkDeDetalle(p.url))
                        .slice(0, maxProperties);

    // Procesar contenido
    const procesarPagina = (p: any) => {
      if (!p?.content) return '';
      const estructurado = extraerCamposPropiedad(p.content);
      if (estructurado) return estructurado;
      
      // Fallback: limpiar HTML pero manteniendo más texto
      let clean = p.content
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      return clean.slice(0, 15000); // Aumentamos el límite para no cortar descripción
    };

    const mainContent = procesarPagina(mainPage);
    const fichasText = fichas.map((f, i) => `=== ITEM ${i+1} ===\nURL: ${f.url}\n${procesarPagina(f)}\n========================`).join('\n\n');

    const fullText = [
      `ORIGEN: ${url}`,
      `TIPO: ${isDetail ? 'FICHA_INDIVIDUAL' : 'CATALOGO'}`,
      '',
      '=== INFORMACIÓN PRINCIPAL ===',
      mainContent,
      '',
      fichasText ? '=== DETALLES DE PROPIEDADES ===\n' + fichasText : ''
    ].join('\n');

    return {
      success: true,
      mainText: fullText,
      items: isDetail ? [url] : fichas.map(f => f.url)
    };

  } catch (error: any) {
    console.error('[Spider] Fatal:', error.message);
    return { success: false, mainText: '', items: [], error: error.message };
  }
}
