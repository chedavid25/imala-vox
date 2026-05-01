import puppeteer, { Browser, Page } from "puppeteer";

/**
 * Motor de Scraping Inteligente (Versión Cloud Functions)
 * Optimizado para Remax, Tokko, MercadoLibre y portales inmobiliarios.
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
    // Scroll suave aleatorio para parecer humano
    await page.evaluate(async () => {
      window.scrollBy(0, window.innerHeight * (0.8 + Math.random()));
    });
    await new Promise(r => setTimeout(r, 2000 + Math.random() * 1000));

    const clickedButton = await page.evaluate(() => {
      const patrones = [
        'ver más', 'ver mas', 'cargar más', 'cargar mas', 
        'mostrar más', 'mostrar mas', 'más resultados',
        'load more', 'show more', 'view more', 'next', 'siguiente'
      ];
      
      const botones = Array.from(document.querySelectorAll('button, a.btn, .btn, [role="button"], .load-more, .ver-mas, .remax-button'));
      
      for (const btn of botones) {
        const texto = btn.textContent?.toLowerCase().trim() || '';
        if (patrones.some(p => texto.includes(p))) {
          const rect = (btn as HTMLElement).getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            (btn as HTMLElement).click();
            return true;
          }
        }
      }
      return false;
    });

    if (!clickedButton) break;
    intentosBotones++;
    await new Promise(r => setTimeout(r, 3000));
  }

  // Detectar enlaces de paginación
  const currentUrl = page.url();
  return await page.evaluate((baseUrl: string) => {
    const links = Array.from(document.querySelectorAll('a'));
    const patterns = [/[?&]page=(\d+)/i, /[?&]pag=(\d+)/i, /\/page\/(\d+)/i, /_Desde_(\d+)/i];
    const found = new Set<string>();
    for (const link of links) {
      const href = link.href;
      if (!href || href === baseUrl) continue;
      if (patterns.some(p => p.test(href))) found.add(href);
    }
    return Array.from(found).slice(0, 5);
  }, currentUrl);
}

export async function ejecutarScrapingProfundo(url: string, maxProperties: number = 20): Promise<ScrapeResult> {
  let browser: Browser | null = null;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox", 
        "--disable-setuid-sandbox", 
        "--disable-dev-shm-usage", 
        "--disable-gpu",
        "--disable-blink-features=AutomationControlled", // Camuflaje anti-bot
      ]
    });

    const page = await browser.newPage();
    // User agent moderno y real
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
    await page.setExtraHTTPHeaders({
      'accept-language': 'es-AR,es;q=0.9,en-US;q=0.8,en;q=0.7',
      'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'referer': 'https://www.google.com.ar/'
    });

    console.log(`Navegando a: ${url}`);
    // USAR domcontentloaded PARA REMAX (EVITA BLOQUEOS POR TRACKERS)
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 80000 });
    await new Promise(r => setTimeout(r, 8000)); // Espera generosa para contenido dinámico

    const extraPages = await cargarTodoElContenido(page);
    
    const extractLinks = async (p: Page) => {
      return await p.evaluate((currentUrl: string) => {
        const urlObj = new URL(currentUrl);
        const domain = urlObj.hostname.replace('www.', '');
        const links = Array.from(document.querySelectorAll('a[href]'));
        const found = new Set<string>();
        
        for (const link of links) {
          const href = (link as HTMLAnchorElement).href;
          if (!href || !href.startsWith('http')) continue;
          
          const path = new URL(href).pathname.toLowerCase();
          
          // PATRONES ESPECÍFICOS PARA REMAX, TOKKO Y E-COMMERCE
          const esDetalle = 
            path.includes('/listings/') || // Remax
            path.includes('/propiedad/') || 
            path.includes('/property/') ||
            path.includes('/ficha/') ||
            path.includes('/inmueble/') || 
            path.includes('/departamento/') ||
            path.includes('/casa/') || 
            path.includes('/producto/') ||
            path.includes('/product/') || 
            path.includes('/articulo/') ||
            path.includes('/item/') || 
            path.includes('/mla-') ||
            /\/p\/\d+/.test(path) || // Portales con /p/12345
            /\/\d{6,}/.test(path) || // Portales con IDs largos en el path
            href.includes('tokkobroker.com/properties/');
          
          // Evitar links de navegación y redes sociales
          const esNavegacion = 
            path.includes('/categoria/') || path.includes('/category/') ||
            path.includes('/tag/') || path.includes('/page/') ||
            path.includes('/search/') || path.includes('/busqueda/') ||
            path.includes('/facebook') || path.includes('/instagram') ||
            path === '/' || path === '';
          
          if (esDetalle && !esNavegacion) {
            found.add(href);
          }
        }
        return Array.from(found);
      }, p.url());
    };

    let allItemLinks = await extractLinks(page);
    
    // Si no hay suficientes links, probar en páginas extras detectadas
    if (allItemLinks.length < 5 && extraPages.length > 0) {
      console.log(`Pocos links encontrados (${allItemLinks.length}), probando páginas extras...`);
      for (const extraUrl of extraPages.slice(0, 2)) {
        try {
          const extraPage = await browser.newPage();
          await extraPage.goto(extraUrl, { waitUntil: "domcontentloaded", timeout: 40000 });
          const newLinks = await extractLinks(extraPage);
          allItemLinks = [...new Set([...allItemLinks, ...newLinks])];
          await extraPage.close();
        } catch (e) { console.error(`Error en extra page: ${e}`); }
      }
    }

    const linksToScrape = allItemLinks.slice(0, maxProperties);
    console.log(`Total de links detectados: ${allItemLinks.length}. Procesando: ${linksToScrape.length}`);
    
    // Capturar siempre el contenido de la página principal
    const mainPageContent = await page.evaluate(() => {
      const ignore = ["script", "style", "nav", "footer", "header", "iframe", ".cookie-banner", ".whatsapp-btn", "#chat-widget"];
      ignore.forEach(s => document.querySelectorAll(s).forEach(el => el.remove()));
      const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
      const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
      return `INFO_META: ${ogTitle} - ${metaDesc}\n\n` + document.body.innerText.replace(/\s+/g, ' ').trim();
    });

    let fullText = `ORIGEN: ${url}\nTÍTULO: ${await page.title()}\n\n=== PÁGINA PRINCIPAL ===\nURL: ${url}\nCONTENIDO:\n${mainPageContent}\n========================\n\n`;

    // PROCESAMIENTO EN PARALELO (Grupos de 4 para ser estables con Remax)
    const chunkSize = 4;
    for (let i = 0; i < linksToScrape.length; i += chunkSize) {
      const chunk = linksToScrape.slice(i, i + chunkSize);
      
      const results = await Promise.all(chunk.map(async (link, idx) => {
        const itemPage = await browser!.newPage();
        await itemPage.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
        try {
          // USAR domcontentloaded TAMBIÉN EN EL DETALLE
          await itemPage.goto(link, { waitUntil: "domcontentloaded", timeout: 45000 });
          await new Promise(r => setTimeout(r, 4500)); // Esperar a que carguen precios/fotos
          
          const content = await itemPage.evaluate(() => {
            // Remover basura
            const ignore = ["script", "style", "nav", "footer", "header", "iframe", ".cookie-banner", ".whatsapp-btn", "#chat-widget"];
            ignore.forEach(s => document.querySelectorAll(s).forEach(el => el.remove()));
            
            // Intentar capturar meta tags útiles antes de obtener el texto
            const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
            const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
            
            return `INFO_META: ${ogTitle} - ${metaDesc}\n\n` + document.body.innerText.replace(/\s+/g, ' ').trim();
          });
          
          await itemPage.close();
          return `\n=== ITEM ${i + idx + 1} ===\nURL: ${link}\nCONTENIDO:\n${content}\n========================\n`;
        } catch (e) {
          await itemPage.close();
          return `\n=== ITEM ${i + idx + 1} ===\nURL: ${link}\nERROR: No se pudo cargar el detalle.\n========================\n`;
        }
      }));
      
      fullText += results.join("");
    }

    await browser.close();
    
    // Validar si realmente extrajimos algo útil
    if (fullText.length < 500) {
      return { mainText: fullText, propertyCount: 0, success: false, error: "El sitio bloqueó el acceso o no se encontró contenido legible." };
    }

    return { mainText: fullText, propertyCount: linksToScrape.length, success: true };

  } catch (error: any) {
    if (browser) await browser.close();
    return { mainText: "", propertyCount: 0, success: false, error: error.message };
  }
}
