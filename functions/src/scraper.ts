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
    await delay(1200);
    let btn = null;
    for (const s of selectores) {
      const el = document.querySelector(s);
      if (el && el.getBoundingClientRect().height > 0) { btn = el; break; }
    }
    if (!btn) break;
    btn.click();
    await delay(2500);
  }
})();
`;

const DETAIL_EXTRACTION_SCRIPT = `
(async () => {
  const delay = ms => new Promise(r => setTimeout(r, ms));
  await delay(3500); // Esperar a que Angular renderice la página

  const data = { dom: {} };
  try {
    // 1. Intentar expandir descripción
    const expandBtn = document.querySelector('.remax-description__expand, [class*="description"] .ver-mas, button.expand, .ver-mas');
    if (expandBtn) {
        expandBtn.click();
        await delay(1000); // Esperar a que se expanda
    }

    // 2. Capturar datos visibles (DOM)
    data.dom.title = document.title;
    data.dom.description = document.querySelector('.remax-description__content, [class*="description-text"], .property-description')?.innerText;
    data.dom.price = document.querySelector('.remax-price, [class*="price-value"], .price-value')?.innerText;
    
    // 3. Capturar características técnicas del DOM
    const chips = Array.from(document.querySelectorAll('.remax-chips__item, .property-characteristics__item, [class*="characteristics"] li'));
    data.dom.chips = chips.map(c => c.innerText).join(' | ');

    // 4. Intentar sacar de __NEXT_DATA__ o similares
    if (window.__NEXT_DATA__) data.next = window.__NEXT_DATA__.props?.pageProps?.listing || window.__NEXT_DATA__.props?.pageProps?.property;
  } catch (e) {}
  return JSON.stringify(data);
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
// Función Principal (Two-Step Deep Scrape)
// ─────────────────────────────────────────────────────────────────────────────
export async function ejecutarScrapingProfundo(
  url: string,
  maxProperties: number = 20
): Promise<ScrapeResult> {
  const SPIDER_API_KEY = process.env.SPIDER_API_KEY;
  if (!SPIDER_API_KEY) return { success: false, mainText: '', items: [], error: 'Falta SPIDER_API_KEY' };

  try {
    console.log(`[Spider] Iniciando escaneo profundo en: ${url}`);
    const isDetail = esLinkDeDetalle(url);

    let mainContentRaw = '';
    let mainContentUrl = url;
    let urlsAVisitar: string[] = [];

    // PASO 1: Obtener la página principal (y descubrir links si es catálogo)
    console.log(`[Spider] Paso 1: Scrape de página principal...`);
    const mainRes = await fetch('https://api.spider.cloud/scrape', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SPIDER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        return_format: 'raw',
        request: 'chrome',
        execution_scripts: { [url]: isDetail ? DETAIL_EXTRACTION_SCRIPT : LOAD_MORE_SCRIPT }
        // Sin filter_output para preservar todos los links de propiedades
      })
    });

    if (!mainRes.ok) throw new Error(`Spider error (Main): ${mainRes.status}`);
    const mainData = await mainRes.json();
    const mainPage = Array.isArray(mainData) ? mainData[0] : (mainData.content ? mainData : Object.values(mainData)[0]);
    mainContentRaw = mainPage?.content || '';

    if (isDetail) {
      urlsAVisitar = [url];
    } else {
      const discoveredLinks = new Set<string>();
      
      // 1. Extraer links por href (Fallback)
      const hrefRegex = /href="([^"]+)"/g;
      let match;
      while ((match = hrefRegex.exec(mainContentRaw)) !== null) {
        let link = match[1];
        if (link.startsWith('/')) {
            const baseUrl = new URL(url).origin;
            link = baseUrl + link;
        }
        if (esLinkDeDetalle(link)) {
            discoveredLinks.add(link);
        }
      }
      
      // 2. Extraer slugs de __NEXT_DATA__ (RE/MAX usa Next.js)
      const nextDataMatch = mainContentRaw.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
      if (nextDataMatch) {
        try {
          const d = JSON.parse(nextDataMatch[1]);
          const pp = d?.props?.pageProps || {};
          const listingsArr = pp.listings || pp.agent?.listings || pp.properties || pp.data?.listings || [];
          if (Array.isArray(listingsArr)) {
            listingsArr.forEach((l: any) => {
              const slug = l.slug || l.listingSlug;
              if (slug) discoveredLinks.add(`https://www.remax.com.ar/listings/${slug}`);
            });
            console.log(`[Spider] __NEXT_DATA__ aportó ${listingsArr.length} slugs`);
          }
        } catch (e) {
          console.warn('[Spider] Error extrayendo __NEXT_DATA__:', e);
        }
      }

      // 3. Extraer slugs de ng-state (Angular SPA)
      const ngMatch = mainContentRaw.match(/<script id="ng-state"[^>]*>([\s\S]*?)<\/script>/i);
      if (ngMatch) {
          try {
              const d = JSON.parse(ngMatch[1].trim());
              const extractSlugs = (obj: any) => {
                  if (!obj || typeof obj !== 'object') return;
                  if (Array.isArray(obj)) {
                      obj.forEach(item => extractSlugs(item));
                  } else {
                      if (obj.slug) {
                          discoveredLinks.add(`https://www.remax.com.ar/listings/${obj.slug}`);
                      }
                      for (const k in obj) extractSlugs(obj[k]);
                  }
              };
              extractSlugs(d);
          } catch (e) {
              console.warn('[Spider] Error extrayendo slugs de ng-state:', e);
          }
      }

      console.log(`[Spider] Links descubiertos: ${discoveredLinks.size} (href) + __NEXT_DATA__ + ng-state`);
      urlsAVisitar = Array.from(discoveredLinks).filter(l => esLinkDeDetalle(l)).slice(0, maxProperties);
      console.log(`[Spider] Encontrados ${urlsAVisitar.length} links de propiedades válidos.`);
    }

    // PASO 2: Extraer detalles de cada ficha
    const fichasData: any[] = [];
    if (!isDetail && urlsAVisitar.length > 0) {
      console.log(`[Spider] Paso 2: Scrape profundo de ${urlsAVisitar.length} fichas concurrentemente...`);
      const fetchPromises = urlsAVisitar.map((fichaUrl: string): Promise<any> => {
        if (fichaUrl.includes('remax.com.ar/listings/')) {
           // Fast-path nativo para RE/MAX (Evita timeout de Spider)
           const slug = fichaUrl.split('/').pop();
           return fetch(`https://api-ar.redremax.com/remaxweb-ar/api/listings/findBySlug/${slug}`, {
               headers: { 'User-Agent': 'Mozilla/5.0' }
           })
           .then(r => r.json())
           .then((d: any) => {
               if (d?.data) {
                   const priceStr = d.data.price ? `${d.data.currency?.value || 'USD'} ${d.data.price}` : '';
                   const CDN = 'https://d1acdg20u0pmxj.cloudfront.net/';
                   const photoUrls = (d.data.photos || []).slice(0, 3).map((p: any) => {
                       const raw = p.rawValue || p.url || p.path || (typeof p === 'string' ? p : '');
                       if (!raw) return '';
                       return raw.startsWith('http') ? raw : `${CDN}${raw}`;
                   }).filter(Boolean);

                   const syntheticContent = `
                     <div class="property-detail">
                         <h1>${d.data.title || ''}</h1>
                         <p>Precio: ${priceStr}</p>
                         <p>PRECIO_VALOR: ${d.data.price || ''}</p>
                         <p>Moneda: ${d.data.currency?.value || 'USD'}</p>
                         <p>SUPERFICIE_TOTAL: ${d.data.dimensionTotalBuilt || ''} m2</p>
                         <p>SUPERFICIE_CUBIERTA: ${d.data.dimensionCovered || ''} m2</p>
                         <p>CANTIDAD_BAÑOS: ${d.data.bathrooms || ''}</p>
                         <p>Dormitorios: ${d.data.bedrooms || ''}</p>
                         <p>Ambientes: ${d.data.environments || d.data.rooms || ''}</p>
                         <p>Barrio: ${d.data.neighborhood || d.data.barrio || ''}</p>
                         <p>Localidad: ${d.data.city || d.data.localidad || ''}</p>
                         ${photoUrls.length > 0 ? `<p>Fotos: ${photoUrls.join(' | ')}</p>` : ''}
                         <p>Descripción: ${d.data.description || ''}</p>
                     </div>
                   `;
                   return { url: fichaUrl, page: { content: syntheticContent } };
               }
               return null;
           })
           .catch((e: any): null => {
               console.warn(`[RE/MAX Native] Error en ficha ${fichaUrl}:`, e.message);
               return null;
           });
        }

        // Comportamiento genérico (Spider)
        return fetch('https://api.spider.cloud/scrape', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${SPIDER_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: fichaUrl,
            return_format: 'raw',
            request: 'chrome',
            execution_scripts: { [fichaUrl]: DETAIL_EXTRACTION_SCRIPT },
            filter_output: { only_main_content: true }
          })
        })
        .then((r: Response): Promise<any> => r.json())
        .then((d: any): { url: string, page: any } => {
            const page = Array.isArray(d) ? d[0] : (d.content ? d : Object.values(d)[0]);
            return { url: fichaUrl, page };
        })
        .catch((e: any): null => {
            console.warn(`[Spider] Error scrapeando ficha ${fichaUrl}:`, e.message);
            return null;
        });
      });
      
      const results = await Promise.all(fetchPromises);
      for (const res of results) {
          if (res && res.page && res.page.content) {
              fichasData.push(res);
          }
      }
      console.log(`[Spider] Recuperadas ${fichasData.length} fichas exitosamente.`);
    } else if (isDetail) {
      fichasData.push({ url: mainContentUrl, page: mainPage });
    }

    // Procesar contenido
    const procesarPagina = (urlFicha: string, p: any): string => {
      if (!p?.content) return '';
      
      let extraInfo = "";
      const resKey = Object.keys(p.execution_results || {}).find(k => k.includes('DETAIL_EXTRACTION_SCRIPT') || k === urlFicha);
      const scriptResult = p.execution_results?.[resKey || ''];
      
      if (scriptResult) {
        try {
          const sd = JSON.parse(scriptResult);
          if (sd.dom) {
            extraInfo = `[DATOS_DOM]\nTítulo: ${sd.dom.title}\nDescripción: ${sd.dom.description}\nPrecio: ${sd.dom.price}\nChips: ${sd.dom.chips}\n`;
          }
        } catch (e) {}
      }

      const estructurado = extraerCamposPropiedad(p.content);
      
      let combined = [
        estructurado ? `[DATOS_ESTRUCTURADOS]\n${estructurado}` : '',
        extraInfo ? extraInfo : '',
        (!estructurado && !extraInfo) ? p.content.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 8000) : ''
      ].filter(Boolean).join('\n\n');
      
      return combined;
    };

    const mainContentProcessed = isDetail ? '' : procesarPagina(url, mainPage);
    const fichasText = fichasData.map((f, i) => `=== ITEM ${i+1} ===\nURL: ${f.url}\n${procesarPagina(f.url, f.page)}\n========================`).join('\n\n');

    const fullText = [
      `ORIGEN: ${url}`,
      `TIPO: ${isDetail ? 'FICHA_INDIVIDUAL' : 'CATALOGO'}`,
      '',
      isDetail ? '' : `=== INFORMACIÓN PRINCIPAL (CATÁLOGO) ===\n${mainContentProcessed}\n`,
      fichasText ? `=== DETALLES DE PROPIEDADES ===\n${fichasText}` : ''
    ].join('\n');

    return {
      success: true,
      mainText: fullText,
      items: urlsAVisitar
    };

  } catch (error: any) {
    console.error('[Spider] Fatal:', error.message);
    return { success: false, mainText: '', items: [], error: error.message };
  }
}
