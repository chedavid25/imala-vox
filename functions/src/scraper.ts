/**
 * Motor de Scraping con Spider API — Arquitectura en dos fases
 *
 * Fase 1: Scrape la página principal con execution_scripts (clicks "ver más")
 *         y retorna todos los links descubiertos (return_page_links: true).
 * Fase 2: Scrape cada ficha de detalle individualmente en paralelo (2 a la vez).
 *
 * Esto evita depender de que Spider siga links en el crawl, lo cual no funciona
 * bien con SPAs React que hidratan componentes dinámicamente.
 */

export interface ScrapeResult {
  success: boolean;
  mainText: string;
  items: string[];
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Script inyectado en el browser de Spider para cargar todo el contenido
// antes de extraer links. Solo clickea botones que cargan contenido en la
// misma página (AJAX/infinite scroll). NO clickea links de paginación por URL.
// ─────────────────────────────────────────────────────────────────────────────
const LOAD_MORE_SCRIPT = `
(async () => {
  const delay = (ms) => new Promise(r => setTimeout(r, ms));

  const selectores = [
    '.remax-button', '.button-color-grey-border', '[class*="loadMore"]',
    '.load-more', '.ver-mas', '.ver-más', '.cargar-mas', '.cargar-más',
    '[class*="load-more"]', '[class*="ver-mas"]', '[class*="ver-más"]',
    '.load_more', '[class*="load_more"]', '[data-action="load-more"]',
    '.btn-show-more', '[class*="show-more"]',
    '[data-store="ProductList"] button',
  ];

  let clicks = 0;
  const MAX_CLICKS = 8;

  while (clicks < MAX_CLICKS) {
    await delay(800);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    await delay(600);

    let boton = null;

    for (const selector of selectores) {
      try {
        const el = document.querySelector(selector);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0 && el.offsetParent !== null) {
            boton = el;
            break;
          }
        }
      } catch (e) {}
    }

    if (!boton) {
      const patrones = [
        'ver más', 'ver mas', 'cargar más', 'cargar mas',
        'mostrar más', 'mostrar mas', 'load more', 'show more',
        'ver todas', 'ver todos', 'más resultados',
      ];
      const todos = Array.from(document.querySelectorAll('button, a.btn, [role="button"], .btn'));
      for (const btn of todos) {
        const texto = (btn.textContent || '').toLowerCase().trim();
        const rect = btn.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && patrones.some(p => texto.includes(p))) {
          boton = btn;
          break;
        }
      }
    }

    if (!boton) break;

    boton.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await delay(300);
    boton.click();
    clicks++;
    await delay(1500);
  }

  window.scrollTo(0, document.body.scrollHeight);
  await delay(800);
})();
`;

// ─────────────────────────────────────────────────────────────────────────────
// Detecta si una URL corresponde a una ficha de detalle (propiedad o producto)
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

  const path = (() => {
    try { return new URL(href).pathname.toLowerCase(); } catch { return ''; }
  })();

  if (path.includes('/listings/')) {
    // Excluir endpoints de búsqueda tipo /listings/buy?page=... o /listings/map
    if (href.includes('?')) return false;
    const slug = path.split('/listings/')[1] || '';
    const reservados = ['buy', 'sell', 'rent', 'map', 'search', 'list', 'filter'];
    if (reservados.includes(slug.split('/')[0])) return false;
    return true;
  }
  if (path.includes('/p/') && /\/p\/\d+/.test(path)) return true;
  if (path.includes('/propiedad/')) return true;
  if (path.includes('/property/')) return true;
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

async function spiderScrape(
  url: string,
  apiKey: string,
  options: Record<string, unknown> = {},
  debug = false
): Promise<{ content: string; links: string[]; url: string } | null> {
  const response = await fetch('https://api.spider.cloud/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, ...options }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`[Spider] Error HTTP ${response.status} para ${url}: ${err.slice(0, 300)}`);
    return null;
  }

  const data = await response.json();
  const page = Array.isArray(data) ? data[0] : data;

  if (debug) {
    console.log(`[Spider] Raw response keys: ${Object.keys(page || {}).join(', ')}`);
    console.log(`[Spider] status: ${page?.status}, content length: ${(page?.content || page?.markdown || page?.html || page?.text || '').length}`);
    console.log(`[Spider] Sample: ${JSON.stringify(page).slice(0, 300)}`);
  }

  // Normalizar el campo de contenido — Spider puede usar distintos nombres
  if (page && !page.content) {
    page.content = page.markdown || page.html || page.text || '';
  }

  return page ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Función principal
// ─────────────────────────────────────────────────────────────────────────────
export async function ejecutarScrapingProfundo(
  url: string,
  maxProperties: number = 40
): Promise<ScrapeResult> {
  const SPIDER_API_KEY = process.env.SPIDER_API_KEY;

  if (!SPIDER_API_KEY) {
    return { success: false, mainText: '', items: [], error: 'SPIDER_API_KEY no configurada' };
  }

  try {
    console.log(`[Spider] Iniciando scraping para: ${url}`);

    // ── FASE 1: Scrapear página principal con script y obtener links ──────────
    console.log('[Spider] Fase 1: scraping página principal...');

    const mainPage = await spiderScrape(url, SPIDER_API_KEY, {
      return_format: 'markdown',
      request: 'chrome',
      execution_scripts: { [url]: LOAD_MORE_SCRIPT },
      filter_output_main_only: true,
      return_page_links: true,
      stealth: true,   // Bypass antibot de portales como RE/MAX
    });

    if (!mainPage) throw new Error('Spider no devolvió resultado para la página principal');

    const mainContent = mainPage.content || '';
    const allLinks: string[] = mainPage.links || [];

    console.log(`[Spider] Links descubiertos en página principal: ${allLinks.length}`);

    const dominioOrigen = (() => { try { return new URL(url).hostname; } catch { return ''; } })();

    // Resolver URLs relativas y filtrar solo fichas del mismo dominio
    const detailLinks = allLinks
      .map(href => resolverUrl(href, url))
      .filter(href => {
        if (!href) return false;
        try { return new URL(href).hostname === dominioOrigen; } catch { return false; }
      })
      .filter(esLinkDeDetalle)
      .filter((v, i, a) => a.indexOf(v) === i) // deduplicar
      .slice(0, maxProperties);

    console.log(`[Spider] Fichas de detalle filtradas: ${detailLinks.length}`);
    if (detailLinks.length > 0) {
      console.log(`[Spider] Primeras fichas: ${detailLinks.slice(0, 5).join(' | ')}`);
    } else {
      console.log(`[Spider] Sin fichas. Muestra de links encontrados: ${allLinks.slice(0, 10).join(' | ')}`);
    }

    // ── FASE 2: Scrapear cada ficha de detalle (2 en paralelo) ───────────────
    const fichas: Array<{ url: string; content: string }> = [];

    if (detailLinks.length > 0) {
      console.log('[Spider] Fase 2: scraping fichas individuales...');
      const CONCURRENCY = 2;

      for (let i = 0; i < detailLinks.length; i += CONCURRENCY) {
        const chunk = detailLinks.slice(i, i + CONCURRENCY);
        const isFirstBlock = i === 0;
        const results = await Promise.all(chunk.map(async (link) => {
          const page = await spiderScrape(link, SPIDER_API_KEY, {
            return_format: 'markdown',
            request: 'chrome',
            filter_output_main_only: true,
          }, isFirstBlock);
          return (page?.content && page.content.length > 100)
            ? { url: link, content: page.content }
            : null;
        }));

        const ok = results.filter(Boolean) as Array<{ url: string; content: string }>;
        fichas.push(...ok);
        console.log(`[Spider] Bloque ${Math.ceil(i / CONCURRENCY) + 1}: ${ok.length}/${chunk.length} OK`);
      }
    }

    // ── FASE 3: Armar texto estructurado para el parser ──────────────────────
    const header = [
      `ORIGEN: ${url}`,
      `TOTAL_ITEMS_ENCONTRADOS: ${fichas.length}`,
      '',
      '=== INFORMACIÓN GENERAL DEL SITIO ===',
      mainContent.slice(0, 3000),
      '',
    ].join('\n');

    const itemsText = fichas.map((f, i) => [
      `=== ITEM ${i + 1} ===`,
      `URL: ${f.url}`,
      `CONTENIDO:`,
      f.content.slice(0, 4000),
      `========================`,
    ].join('\n'));

    const fullText = header + '\n\nDETALLES ITEMS:\n' + itemsText.join('\n---\n');

    console.log(`[Spider] Texto total: ${fullText.length} caracteres, ${fichas.length} fichas`);

    return {
      success: true,
      mainText: fullText,
      items: fichas.map(f => f.url),
    };

  } catch (error: any) {
    console.error('[Spider] Error:', error.message);
    return { success: false, mainText: '', items: [], error: error.message };
  }
}
