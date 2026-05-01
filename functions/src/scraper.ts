import puppeteer, { Browser, Page } from "puppeteer";

/**
 * Motor de Scraping Inteligente (Versión Cloud Functions)
 * Soporta múltiples plataformas: WooCommerce, Tiendanube, Wix, MercadoLibre, Tokko, Remax.
 */

interface ScrapeResult {
  mainText: string;
  propertyCount: number;
  success: boolean;
  error?: string;
}

// ESTRATEGIA DE PAGINACIÓN MULTI-MODAL
async function cargarTodoElContenido(page: Page, maxPages: number = 8) {
  let intentosBotones = 0;
  const maxIntentos = 10;
  
  while (intentosBotones < maxIntentos) {
    // Scroll suave humano
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let total = 0;
        const distance = 150;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          total += distance;
          if (total >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve(true);
          }
        }, 80);
      });
    });
    await new Promise(r => setTimeout(r, 2500));

    // Buscar botones de carga con múltiples patrones (ES + EN)
    const clickedButton = await page.evaluate(() => {
      const patrones = [
        'ver más', 'ver mas', 'cargar más', 'cargar mas', 
        'mostrar más', 'mostrar mas', 'más resultados',
        'load more', 'show more', 'ver todas', 'ver todos',
        'siguiente página', 'next page'
      ];
      
      const botones = Array.from(document.querySelectorAll('button, a.btn, .btn, [role="button"], .load-more, .ver-mas, .loadmore, .btn-ver-mas'));
      
      for (const btn of botones) {
        const texto = btn.textContent?.toLowerCase().trim() || '';
        if (patrones.some(p => texto.includes(p))) {
          const rect = (btn as HTMLElement).getBoundingClientRect();
          const visible = rect.width > 0 && rect.height > 0;
          if (visible) {
            (btn as HTMLElement).click();
            return true;
          }
        }
      }
      return false;
    });

    if (!clickedButton) break;
    intentosBotones++;
    await new Promise(r => setTimeout(r, 3500));
  }

  // Detectar paginación por URL para navegar si es necesario
  const currentUrl = page.url();
  const paginationLinks = await page.evaluate((baseUrl: string) => {
    const links = Array.from(document.querySelectorAll('a'));
    const patterns = [
      /[?&]page=(\d+)/i,
      /[?&]pag=(\d+)/i, 
      /[?&]p=(\d+)/i,
      /\/page\/(\d+)/i,
      /\/pagina\/(\d+)/i,
      /\/p\/(\d+)\//i,
      /_Desde_(\d+)/i, // MercadoLibre
    ];
    
    const found = new Set<string>();
    for (const link of links) {
      const href = link.href;
      if (!href || href === baseUrl) continue;
      for (const pattern of patterns) {
        if (pattern.test(href)) {
          found.add(href);
          break;
        }
      }
    }
    return Array.from(found).slice(0, 8); // Máximo 8 páginas adicionales
  }, currentUrl);

  return paginationLinks;
}

export async function ejecutarScrapingProfundo(url: string, maxProperties: number = 20): Promise<ScrapeResult> {
  let browser: Browser | null = null;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        "--no-sandbox", 
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-blink-features=AutomationControlled",
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36");
    await page.setExtraHTTPHeaders({
      'accept-language': 'es-ES,es;q=0.9',
      'referer': 'https://www.google.com/'
    });

    console.log(`Navegando a: ${url}`);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
    await new Promise(r => setTimeout(r, 4000));

    // Ejecutar carga de contenido
    const extraPages = await cargarTodoElContenido(page);
    
    // Extraer links de la página principal
    const extractLinks = async (p: Page) => {
      return await p.evaluate((currentUrl: string) => {
        const urlObj = new URL(currentUrl);
        const domain = urlObj.hostname;
        const links = Array.from(document.querySelectorAll('a[href]'));
        const found = new Set<string>();
        
        for (const link of links) {
          const href = (link as HTMLAnchorElement).href;
          if (!href || !href.startsWith('http')) continue;
          
          try {
            const linkDomain = new URL(href).hostname;
            if (linkDomain !== domain && !linkDomain.includes('mercadolibre')) continue;
          } catch { continue; }
          
          const lower = href.toLowerCase();
          const path = new URL(href).pathname.toLowerCase();
          
          const esDetalle = 
            path.includes('/propiedad/') || path.includes('/property/') ||
            path.includes('/listings/') || path.includes('/ficha/') ||
            path.includes('/inmueble/') || path.includes('/departamento/') ||
            path.includes('/casa/') || path.includes('/terreno/') ||
            path.includes('/producto/') || path.includes('/product/') ||
            path.includes('/item/') || path.includes('/articulo/') ||
            path.includes('/shop/') || path.includes('/tienda/') ||
            path.includes('/productos/') ||
            /\/p\/\d+/.test(path) || /\/\d{5,}/.test(path) ||
            (path.includes('/product') && !path.includes('/product-category')) ||
            (path.includes('/collections/') && path.includes('/products/')) ||
            lower.includes('articulo.mercadolibre') || lower.includes('/mla-') ||
            path.includes('/tokkobroker.com/properties/');
          
          const esNavegacion = 
            path.includes('/categoria/') || path.includes('/category/') ||
            path.includes('/tag/') || path.includes('/page/') ||
            path.includes('/cart') || path.includes('/checkout') ||
            path.includes('/login') || path.includes('/register') ||
            path.includes('/contacto') || path.includes('/contact') ||
            path === '/' || path === '';
          
          if (esDetalle && !esNavegacion) found.add(href);
        }
        return Array.from(found);
      }, p.url());
    };

    let allItemLinks = await extractLinks(page);

    // Navegar páginas extras si existen y no tenemos suficientes links
    if (allItemLinks.length < maxProperties && extraPages.length > 0) {
      for (const extraUrl of extraPages.slice(0, 3)) {
        try {
          const extraPage = await browser.newPage();
          await extraPage.goto(extraUrl, { waitUntil: "networkidle2", timeout: 45000 });
          const newLinks = await extractLinks(extraPage);
          allItemLinks = [...new Set([...allItemLinks, ...newLinks])];
          await extraPage.close();
          if (allItemLinks.length >= maxProperties) break;
        } catch (e) {
          console.error(`Error en página extra ${extraUrl}:`, e);
        }
      }
    }

    let fullText = "";
    const pageTitle = await page.title();
    fullText += `ORIGEN: ${url}\nTÍTULO: ${pageTitle}\n\n`;

    // Navegación profunda
    const linksToScrape = allItemLinks.slice(0, maxProperties);
    console.log(`Scrapeando ${linksToScrape.length} ítems individuales...`);
    
    for (let i = 0; i < linksToScrape.length; i++) {
      const link = linksToScrape[i];
      try {
        const itemPage = await browser.newPage();
        await itemPage.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36");
        
        await itemPage.goto(link, { waitUntil: "networkidle0", timeout: 45000 });
        await new Promise(r => setTimeout(r, 2000));
        
        const details = await itemPage.evaluate(() => {
          const selectorsToRemove = ["script", "style", "nav", "footer", "header", "iframe", ".cookie-banner", "#chat-widget", ".whatsapp-btn"];
          selectorsToRemove.forEach(s => document.querySelectorAll(s).forEach(el => el.remove()));
          return document.body.innerText.replace(/\s+/g, ' ').trim();
        });

        fullText += `\n=== ITEM ${i+1} ===\nURL: ${link}\nCONTENIDO:\n${details}\n========================\n`;
        await itemPage.close();
      } catch (err) {
        console.error(`Error en ítem ${link}:`, err);
      }
    }

    await browser.close();

    return {
      mainText: fullText,
      propertyCount: linksToScrape.length,
      success: true
    };

  } catch (error: any) {
    if (browser) await (browser as Browser).close();
    return {
      mainText: "",
      propertyCount: 0,
      success: false,
      error: error.message
    };
  }
}
