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
  // Intentar Next.js
  const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  let dataObj: any = null;
  
  if (nextMatch) {
    try {
      const d = JSON.parse(nextMatch[1]);
      dataObj = d?.props?.pageProps?.listing || d?.props?.pageProps?.property || d?.props?.pageProps;
    } catch {}
  }

  // Intentar Angular (ng-state)
  if (!dataObj) {
    const ngMatch = html.match(/<script id="ng-state"[^>]*>([\s\S]*?)<\/script>/i);
    if (ngMatch) {
      try {
        const d = JSON.parse(ngMatch[1]);
        for (const key in d) {
          const val = d[key]?.b?.data || d[key]?.b;
          if (val && typeof val === 'object' && (val.price || val.dimensionTotalBuilt)) {
            dataObj = val; break;
          }
        }
      } catch {}
    }
  }

  if (!dataObj || typeof dataObj !== 'object') return null;

  const lines: string[] = [];
  const titulo = dataObj.title || dataObj.address || dataObj.name;
  if (titulo) lines.push(`Título: ${titulo}`);

  const desc = dataObj.description || dataObj.notes;
  if (desc) lines.push(`Descripción: ${String(desc)}`);

  const precio = dataObj.price ?? dataObj.priceValue;
  if (precio != null) {
    lines.push(`PRECIO_VALOR: ${precio}`);
    lines.push(`Precio: ${precio}`);
  }
  
  const moneda = dataObj.currency?.value ?? dataObj.currencyCode ?? dataObj.currency;
  if (moneda) lines.push(`Moneda: ${moneda}`);

  const m2T = dataObj.totalArea ?? dataObj.totalSurface ?? dataObj.surface_total ?? dataObj.total_area ?? dataObj.dimensionTotalBuilt;
  const m2C = dataObj.coveredArea ?? dataObj.coveredSurface ?? dataObj.surface_covered ?? dataObj.covered_area ?? dataObj.dimensionCovered;
  if (m2T != null) lines.push(`m² totales: ${m2T}`);
  if (m2C != null) {
    lines.push(`m² cubiertos: ${m2C}`);
    lines.push(`SUPERFICIE_CUBIERTA: ${m2C}`); // Etiqueta extra para asegurar
  }

  const amb = dataObj.environments ?? dataObj.rooms ?? dataObj.roomsValue;
  const dorm = dataObj.bedrooms ?? dataObj.bedRooms ?? dataObj.bedroomsValue ?? dataObj.habitaciones;
  const ban = dataObj.bathrooms ?? dataObj.baths ?? dataObj.bathroomsValue ?? dataObj.banos;
  
  if (amb != null) lines.push(`Ambientes: ${amb}`);
  if (dorm != null) lines.push(`Dormitorios: ${dorm}`);
  if (ban != null) {
    lines.push(`Baños: ${ban}`);
    lines.push(`CANTIDAD_BAÑOS: ${ban}`);
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
      // Fallback: limpiar HTML si no hay JSON
      return p.content.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 5000);
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
