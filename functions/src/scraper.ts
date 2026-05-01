import puppeteer, { Browser, Page } from "puppeteer";

/**
 * Motor de Scraping Inteligente (Versión Cloud Functions)
 * Optimizado para velocidad con procesamiento paralelo.
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
  const maxIntentos = 8;
  
  while (intentosBotones < maxIntentos) {
    // Scroll suave rápido
    await page.evaluate(async () => {
      window.scrollBy(0, window.innerHeight * 2);
    });
    await new Promise(r => setTimeout(r, 1500));

    const clickedButton = await page.evaluate(() => {
      const patrones = [
        'ver más', 'ver mas', 'cargar más', 'cargar mas', 
        'mostrar más', 'mostrar mas', 'más resultados',
        'load more', 'show more', 'ver todas', 'ver todos'
      ];
      const botones = Array.from(document.querySelectorAll('button, a.btn, .btn, [role="button"], .load-more, .ver-mas'));
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
    await new Promise(r => setTimeout(r, 2000));
  }

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
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
    });

    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36");
    
    console.log(`Navegando a: ${url}`);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));

    const extraPages = await cargarTodoElContenido(page);
    
    const extractLinks = async (p: Page) => {
      return await p.evaluate((currentUrl: string) => {
        const urlObj = new URL(currentUrl);
        const domain = urlObj.hostname;
        const links = Array.from(document.querySelectorAll('a[href]'));
        const found = new Set<string>();
        
        for (const link of links) {
          const href = (link as HTMLAnchorElement).href;
          if (!href || !href.startsWith('http')) continue;
          try { if (new URL(href).hostname !== domain && !href.includes('mercadolibre')) continue; } catch { continue; }
          
          const path = new URL(href).pathname.toLowerCase();
          const esDetalle = 
            path.includes('/propiedad/') || path.includes('/ficha/') ||
            path.includes('/inmueble/') || path.includes('/departamento/') ||
            path.includes('/casa/') || path.includes('/producto/') ||
            path.includes('/product/') || path.includes('/articulo/') ||
            /\/p\/\d+/.test(path) || /\/\d{5,}/.test(path) ||
            href.includes('articulo.mercadolibre') || href.includes('/mla-');
          
          if (esDetalle) found.add(href);
        }
        return Array.from(found);
      }, p.url());
    };

    let allItemLinks = await extractLinks(page);
    const linksToScrape = allItemLinks.slice(0, maxProperties);
    
    let fullText = `ORIGEN: ${url}\nTÍTULO: ${await page.title()}\n\n`;

    // PROCESAMIENTO EN PARALELO (Grupos de 5 para no saturar RAM de la función)
    const chunkSize = 5;
    for (let i = 0; i < linksToScrape.length; i += chunkSize) {
      const chunk = linksToScrape.slice(i, i + chunkSize);
      console.log(`Scrapeando grupo ${Math.floor(i/chunkSize) + 1}...`);
      
      const results = await Promise.all(chunk.map(async (link, idx) => {
        const itemPage = await browser!.newPage();
        try {
          await itemPage.goto(link, { waitUntil: "networkidle0", timeout: 30000 });
          const content = await itemPage.evaluate(() => {
            document.querySelectorAll("script, style, nav, footer, header, iframe").forEach(el => el.remove());
            return document.body.innerText.replace(/\s+/g, ' ').trim();
          });
          await itemPage.close();
          return `\n=== ITEM ${i + idx + 1} ===\nURL: ${link}\nCONTENIDO:\n${content}\n========================\n`;
        } catch (e) {
          await itemPage.close();
          return `\n=== ITEM ${i + idx + 1} ===\nURL: ${link}\nERROR: ${e}\n========================\n`;
        }
      }));
      
      fullText += results.join("");
    }

    await browser.close();
    return { mainText: fullText, propertyCount: linksToScrape.length, success: true };

  } catch (error: any) {
    if (browser) await browser.close();
    return { mainText: "", propertyCount: 0, success: false, error: error.message };
  }
}
