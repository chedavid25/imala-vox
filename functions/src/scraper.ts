/**
 * Motor de Scraping con Spider API — Estrategia de página única
 *
 * Solo scrapeamos la página que el usuario nos pasa.
 * No visitamos fichas individuales (evita bloqueos de antibot).
 *
 * Estrategia dual:
 *   1. Intento HTTP simple: rápido, barato, funciona en sitios SSR
 *      (WooCommerce, Shopify, Tienda Nube, RE/MAX Next.js, Tokko, etc.)
 *   2. Si el contenido es escaso (<500 chars), reintento con Chrome
 *      para sitios que requieren JavaScript para renderizar.
 */

export interface ScrapeResult {
  success: boolean;
  mainText: string;
  items: string[];
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Script inyectado en Chrome (solo cuando el fallback Chrome es necesario)
// Clickea botones "ver más" para cargar contenido adicional
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
  const MAX_CLICKS = 6;

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
    await delay(1800);
  }

  window.scrollTo(0, document.body.scrollHeight);
  await delay(1000);
})();
`;

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
    console.error(`[Spider] Error HTTP ${response.status}: ${err.slice(0, 300)}`);
    return null;
  }

  const data = await response.json();
  const page = Array.isArray(data) ? data[0] : data;

  if (debug) {
    console.log(`[Spider] Keys: ${Object.keys(page || {}).join(', ')}`);
    console.log(`[Spider] status: ${page?.status}, content: ${(page?.content || page?.markdown || page?.html || page?.text || '').length} chars`);
    console.log(`[Spider] Sample: ${JSON.stringify(page).slice(0, 400)}`);
  }

  if (!page || page.status === 0) {
    if (debug) console.log('[Spider] Respuesta inválida o bloqueada');
    return null;
  }

  if (page && !page.content) {
    page.content = page.markdown || page.html || page.text || '';
  }

  return page ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Función principal — una sola página, sin visitar fichas individuales
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
    console.log(`[Spider] Scraping: ${url}`);

    // ── Intento 1: HTTP simple (rápido, SSR sites devuelven todo el contenido) ──
    console.log('[Spider] Intento 1: HTTP simple...');
    let mainPage = await spiderScrape(url, SPIDER_API_KEY, {
      return_format: 'markdown',
      request: 'http',
      stealth: true,
    }, true);

    const httpContent = mainPage?.content || '';
    console.log(`[Spider] HTTP content: ${httpContent.length} chars`);

    // ── Intento 2: Chrome si HTTP no trajo suficiente contenido ──────────────
    if (httpContent.length < 500) {
      console.log('[Spider] Contenido HTTP insuficiente. Intento 2: Chrome...');
      const chromePage = await spiderScrape(url, SPIDER_API_KEY, {
        return_format: 'markdown',
        request: 'chrome',
        execution_scripts: { [url]: LOAD_MORE_SCRIPT },
        return_page_links: true,
        stealth: true,
      }, true);

      if (chromePage && (chromePage.content || '').length > httpContent.length) {
        mainPage = chromePage;
        console.log(`[Spider] Chrome content: ${(mainPage.content || '').length} chars`);
      }
    }

    if (!mainPage) {
      throw new Error('Spider no pudo obtener contenido de la página');
    }

    const mainContent = mainPage.content || '';
    const allLinks: string[] = (mainPage as any).links || (mainPage as any).page_links || (mainPage as any).urls || [];

    console.log(`[Spider] Contenido final: ${mainContent.length} chars, links: ${allLinks.length}`);

    if (mainContent.length < 100 && allLinks.length === 0) {
      throw new Error(`Sitio bloqueado o sin contenido accesible (${mainContent.length} chars)`);
    }

    // Armar texto para el parser — solo la página principal
    const fullText = [
      `ORIGEN: ${url}`,
      `ESTRATEGIA: single-page (sin visitar fichas individuales)`,
      '',
      '=== CONTENIDO DE LA PÁGINA DE LISTADO ===',
      mainContent.slice(0, 100000),
    ].join('\n');

    console.log(`[Spider] Texto para parser: ${fullText.length} chars`);

    return {
      success: true,
      mainText: fullText,
      items: allLinks,
    };

  } catch (error: any) {
    console.error('[Spider] Error:', error.message);
    return { success: false, mainText: '', items: [], error: error.message };
  }
}
