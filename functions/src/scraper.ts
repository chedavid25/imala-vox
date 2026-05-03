import { Browser, Page } from "puppeteer";
import * as puppeteer from "puppeteer";

/**
 * ESTRATEGIA DE PAGINACIÓN PARA PORTALES (RE/MAX, etc)
 */
async function cargarTodoElContenido(page: Page, maxPages: number = 8) {
  let intentosBotones = 0;
  const maxIntentos = 10; // Volvemos a un número moderado
  
  while (intentosBotones < maxIntentos) {
    await page.evaluate(async () => {
      window.scrollBy(0, window.innerHeight * 0.8);
    });
    await new Promise(r => setTimeout(r, 2000));

    const clickedButton = await page.evaluate(() => {
      const botones = Array.from(document.querySelectorAll('button, a.btn, .btn, [role="button"], .load-more, .ver-mas, .remax-button, .button-color-grey-border'));
      const patrones = ['ver más', 'ver mas', 'cargar más', 'cargar mas', 'load more'];
      
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
}

export interface ScrapeResult {
  success: boolean;
  mainText: string;
  items: string[];
  error?: string;
}

export async function ejecutarScrapingProfundo(url: string, maxProperties: number = 40): Promise<ScrapeResult> {
  let browser: Browser | null = null;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
    
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await cargarTodoElContenido(page);

    const linksToScrape = await page.evaluate((max) => {
      const anchors = Array.from(document.querySelectorAll('a'));
      const matches = anchors.filter(a => {
        const href = a.href.toLowerCase();
        return (href.includes('/p/') || href.includes('/propiedad/') || href.includes('/detalle/')) && !href.includes('/agent/');
      });
      return [...new Set(matches.map(a => a.href))].slice(0, max);
    }, maxProperties);

    const mainText = await page.evaluate(() => {
      const ignore = ["script", "style", "nav", "footer", "header"];
      ignore.forEach(s => document.querySelectorAll(s).forEach(el => el.remove()));
      return document.body.innerText.replace(/\s+/g, ' ').trim();
    });

    let itemsContent: string[] = [];
    const chunkSize = 2;
    for (let i = 0; i < linksToScrape.length; i += chunkSize) {
      console.log(`[Scraper] Procesando bloque ${Math.floor(i/chunkSize) + 1}...`);
      const chunk = linksToScrape.slice(i, i + chunkSize);
      const results = await Promise.all(chunk.map(async (link) => {
        const itemPage = await browser!.newPage();
        try {
          await itemPage.goto(link, { waitUntil: "domcontentloaded", timeout: 20000 });
          const content = await itemPage.evaluate(() => {
            const ignore = ["script", "style", "nav", "footer", "header"];
            ignore.forEach(s => document.querySelectorAll(s).forEach(el => el.remove()));
            return document.body.innerText.replace(/\s+/g, ' ').trim();
          });
          await itemPage.close();
          return `URL: ${link}\nCONTENIDO: ${content}\n`;
        } catch {
          await itemPage.close();
          return `URL: ${link}\nERROR: No se pudo cargar.\n`;
        }
      }));
      itemsContent.push(...results);
    }

    await browser.close();
    return {
      success: true,
      mainText: `ORIGEN: ${url}\n\nCONTENIDO PÁGINA:\n${mainText}\n\nDETALLES ITEMS:\n${itemsContent.join('\n---\n')}`,
      items: linksToScrape
    };

  } catch (e: any) {
    if (browser) await browser.close();
    return { success: false, mainText: "", items: [], error: e.message };
  }
}
