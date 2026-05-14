/**
 * Motor de Scraping con Spider API
 * Reemplaza Puppeteer. Maneja paginación, "Ver más", infinite scroll
 * y deep crawl (entrar en cada ficha) con una sola llamada de API.
 */

export interface ScrapeResult {
  success: boolean;
  mainText: string;
  items: string[];
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Script de paginación inyectado en Spider Browser Mode
// Se ejecuta en el browser antes de extraer el contenido.
// Carga todos los resultados haciendo click en "Ver más" / "Load More"
// y también maneja infinite scroll.
// ─────────────────────────────────────────────────────────────────────────────
const LOAD_MORE_SCRIPT = `
(async () => {
  const delay = (ms) => new Promise(r => setTimeout(r, ms));

  const selectores = [
    // RE/MAX Argentina
    '.remax-button', '.button-color-grey-border', '[class*="loadMore"]',
    // Genéricos español
    '.load-more', '.ver-mas', '.ver-más', '.cargar-mas', '.cargar-más',
    '[class*="load-more"]', '[class*="ver-mas"]', '[class*="ver-más"]',
    // Genéricos inglés
    '.load_more', '[class*="load_more"]', '[data-action="load-more"]',
    // Tokko Broker
    '.btn-show-more', '[class*="show-more"]',
    // WooCommerce
    '.woocommerce-pagination a.next', '.next.page-numbers',
    // Tienda Nube
    '[data-store="ProductList"] button',
    // Botones genéricos por role
    'button[role="button"]'
  ];

  let clicks = 0;
  const MAX_CLICKS = 12;

  while (clicks < MAX_CLICKS) {
    await delay(1800);

    // Scroll suave para activar lazy load e infinite scroll
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    await delay(1200);

    let boton = null;

    // Intentar por selectores CSS
    for (const selector of selectores) {
      try {
        const el = document.querySelector(selector);
        if (el) {
          const rect = el.getBoundingClientRect();
          const visible = rect.width > 0 && rect.height > 0 && el.offsetParent !== null;
          if (visible) {
            boton = el;
            break;
          }
        }
      } catch (e) {}
    }

    // Si no encontró por selector, buscar por texto del botón
    if (!boton) {
      const patrones = [
        'ver más', 'ver mas', 'cargar más', 'cargar mas',
        'mostrar más', 'mostrar mas', 'load more', 'show more',
        'ver todas', 'ver todos', 'más resultados', 'siguiente'
      ];

      const todosLosBotones = Array.from(
        document.querySelectorAll('button, a.btn, [role="button"], .btn')
      );

      for (const btn of todosLosBotones) {
        const texto = (btn.textContent || '').toLowerCase().trim();
        const rect = btn.getBoundingClientRect();
        const visible = rect.width > 0 && rect.height > 0;
        if (visible && patrones.some(p => texto.includes(p))) {
          boton = btn;
          break;
        }
      }
    }

    if (!boton) break; // No hay más botón — terminamos

    boton.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await delay(600);
    boton.click();
    clicks++;
    await delay(2500); // Esperar que carguen los nuevos items
  }

  // Scroll final para asegurarse que todo está cargado
  window.scrollTo(0, document.body.scrollHeight);
  await delay(1500);
})();
`;

// ─────────────────────────────────────────────────────────────────────────────
// Patrones de URLs de detalle por plataforma
// Spider sigue estos links para entrar en cada ficha individual
// ─────────────────────────────────────────────────────────────────────────────
function esLinkDeDetalle(href: string): boolean {
  if (!href || !href.startsWith('http')) return false;

  const path = (() => {
    try { return new URL(href).pathname.toLowerCase(); } catch { return ''; }
  })();

  // Propiedades
  if (path.includes('/p/') && /\/p\/\d+/.test(path)) return true;
  if (path.includes('/propiedad/')) return true;
  if (path.includes('/property/')) return true;
  if (path.includes('/listings/')) return true;
  if (path.includes('/ficha/')) return true;
  if (path.includes('/inmueble/')) return true;
  if (/\/\d{6,}/.test(path)) return true; // IDs numéricos largos (Tokko, RE/MAX)

  // Productos
  if (path.includes('/producto/')) return true;
  if (path.includes('/product/') && !path.includes('/product-category')) return true;
  if (path.includes('/productos/') && path.split('/').length > 3) return true;
  if (path.includes('/item/')) return true;
  if (path.includes('/articulo/')) return true;

  // WooCommerce
  if (path.includes('/?p=')) return true;

  // Shopify
  if (path.includes('/products/') && path.split('/products/')[1]?.length > 0) return true;

  // MercadoLibre
  if (href.includes('articulo.mercadolibre') || /\/MLA-\d+/.test(href)) return true;

  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Función principal de scraping con Spider API
// ─────────────────────────────────────────────────────────────────────────────
export async function ejecutarScrapingProfundo(
  url: string,
  maxProperties: number = 40
): Promise<ScrapeResult> {
  const SPIDER_API_KEY = process.env.SPIDER_API_KEY;

  if (!SPIDER_API_KEY) {
    console.error('[Spider] Error: SPIDER_API_KEY no definida en variables de entorno.');
    return { success: false, mainText: '', items: [], error: 'SPIDER_API_KEY no configurada' };
  }

  try {
    console.log(`[Spider] Iniciando scraping profundo para: ${url}`);
    console.log(`[Spider] Máximo de ítems: ${maxProperties}`);

    // ── FASE 1: Crawl del listado con paginación ──────────────────────────────
    // Spider carga la página, ejecuta el script de "Ver más", y luego
    // sigue automáticamente los links de fichas individuales (depth: 1).

    const crawlBody = {
      url,
      limit: maxProperties + 5,      // +5 por si algunos links no son fichas
      depth: 1,                        // Solo entrar 1 nivel (listado → ficha)
      return_format: 'markdown',       // Markdown limpio listo para Gemini
      request: 'chrome',               // Browser mode — necesario para JS
      execution_scripts: {
        [url]: LOAD_MORE_SCRIPT         // Script solo en la página de listado
      },
      filter_output_main_only: true,
    };

    console.log('[Spider] Enviando request de crawl...');

    const crawlResponse = await fetch('https://api.spider.cloud/crawl', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SPIDER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(crawlBody),
    });

    if (!crawlResponse.ok) {
      const errorText = await crawlResponse.text();
      console.error(`[Spider] Error HTTP ${crawlResponse.status}:`, errorText);
      throw new Error(`Spider API error ${crawlResponse.status}: ${errorText.slice(0, 200)}`);
    }

    const crawlData = await crawlResponse.json() as Array<{
      url: string;
      content: string;
      status: number;
      error?: string;
    }>;

    if (!Array.isArray(crawlData) || crawlData.length === 0) {
      console.warn('[Spider] Respuesta vacía o no es array:', typeof crawlData);
      throw new Error('Spider no devolvió resultados');
    }

    console.log(`[Spider] Páginas recibidas: ${crawlData.length}`);

    // ── FASE 2: Separar página principal de fichas de detalle ─────────────────

    const paginaPrincipal = crawlData.find(p => {
      try {
        return new URL(p.url).pathname === new URL(url).pathname;
      } catch {
        return p.url === url;
      }
    }) || crawlData[0];

    const fichas = crawlData
      .filter(p => p.url !== paginaPrincipal?.url)
      .filter(p => p.status === 200 && p.content && p.content.length > 100)
      .filter(p => esLinkDeDetalle(p.url))
      .slice(0, maxProperties);

    console.log(`[Spider] Página principal: ${paginaPrincipal?.url || 'no detectada'}`);
    console.log(`[Spider] Fichas de detalle válidas: ${fichas.length}`);

    // ── FASE 3: Armar el texto estructurado para el parser ────────────────────

    const mainText = [
      `ORIGEN: ${url}`,
      `TOTAL_ITEMS_ENCONTRADOS: ${fichas.length}`,
      '',
      '=== INFORMACIÓN GENERAL DEL SITIO ===',
      paginaPrincipal?.content?.slice(0, 3000) || 'No disponible',
      '',
    ].join('\n');

    const itemsText = fichas.map((ficha, i) => [
      `=== ITEM ${i + 1} ===`,
      `URL: ${ficha.url}`,
      `CONTENIDO:`,
      ficha.content?.slice(0, 4000) || 'Sin contenido',
      `========================`,
    ].join('\n'));

    const fullText = mainText + '\n\nDETALLES ITEMS:\n' + itemsText.join('\n---\n');

    console.log(`[Spider] Texto total generado: ${fullText.length} caracteres`);
    console.log(`[Spider] Scraping completado exitosamente.`);

    return {
      success: true,
      mainText: fullText,
      items: fichas.map(f => f.url),
    };

  } catch (error: any) {
    console.error('[Spider] Error en scraping:', error.message);
    return {
      success: false,
      mainText: '',
      items: [],
      error: error.message,
    };
  }
}
