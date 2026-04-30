import puppeteer, { Browser } from "puppeteer";

/**
 * Motor de Scraping Inmobiliario Profundo (Versión Functions)
 * Diseñado para portales como Remax que usan carga dinámica y botones "Ver más".
 */

interface ScrapeResult {
  mainText: string;
  propertyCount: number;
  success: boolean;
  error?: string;
}

export async function ejecutarScrapingProfundo(url: string, maxProperties: number = 20): Promise<ScrapeResult> {
  let browser: Browser | null = null;
  
  try {
    // 1. Lanzar el navegador con argumentos de camuflaje y estabilidad para la nube
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        "--no-sandbox", 
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage", // Importante para contenedores con poca RAM
        "--disable-gpu",
        "--disable-blink-features=AutomationControlled", // Ocultar automatización
      ]
    });

    const page = await browser.newPage();
    
    // Simular un usuario real
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36");
    await page.setExtraHTTPHeaders({
      'accept-language': 'es-ES,es;q=0.9',
      'referer': 'https://www.google.com/'
    });

    console.log(`Navegando a: ${url}`);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });

    // Esperar carga inicial
    await new Promise(r => setTimeout(r, 5000));

    // 2. Lógica de "CARGAR MÁS" (Scroll y Clics)
    let canLoadMore = true;
    let loadCount = 0;
    const maxLoads = 15; 

    while (canLoadMore && loadCount < maxLoads) {
      // Scroll suave
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 100;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;
            if (totalHeight >= scrollHeight) {
              clearInterval(timer);
              resolve(true);
            }
          }, 100);
        });
      });

      await new Promise(r => setTimeout(r, 3000));

      // Buscar botón "Ver más"
      const buttons = await page.$$("button, a.btn, .btn-primary");
      let foundButton = false;

      for (const btn of buttons) {
        const text = await btn.evaluate(el => el.textContent?.toLowerCase() || "");
        if (text.includes("ver más") || text.includes("cargar más")) {
          const isIntersecting = await btn.isIntersectingViewport();
          if (!isIntersecting) {
            await btn.evaluate(el => el.scrollIntoView());
            await new Promise(r => setTimeout(r, 1000));
          }
          await btn.click();
          await new Promise(r => setTimeout(r, 4000));
          foundButton = true;
          loadCount++;
          break;
        }
      }
      
      if (!foundButton) {
        canLoadMore = false;
      }
    }

    // 3. Extraer links
    const propertyLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      return links
        .map(a => a.href)
        .filter(href => {
          const lower = href.toLowerCase();
          return (lower.includes("/p/") || lower.includes("/propiedad/") || lower.includes("/listings/")) 
                 && !lower.includes("google.com") 
                 && !lower.includes("facebook.com");
        })
        .filter((value, index, self) => self.indexOf(value) === index);
    });

    let fullText = "";
    const pageTitle = await page.title();
    fullText += `ORIGEN: ${url}\nTÍTULO: ${pageTitle}\n\n`;

    // 4. Navegación profunda
    const linksToScrape = propertyLinks.slice(0, maxProperties);
    
    for (let i = 0; i < linksToScrape.length; i++) {
      const link = linksToScrape[i];
      try {
        const propertyPage = await browser.newPage();
        await propertyPage.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36");
        
        await propertyPage.goto(link, { waitUntil: "networkidle0", timeout: 45000 });
        await new Promise(r => setTimeout(r, 2000));
        
        const details = await propertyPage.evaluate(() => {
          const selectorsToRemove = ["script", "style", "nav", "footer", "header", "iframe", ".cookie-banner", "#chat-widget"];
          selectorsToRemove.forEach(s => document.querySelectorAll(s).forEach(el => el.remove()));
          return document.body.innerText.replace(/\s+/g, ' ').trim();
        });

        fullText += `\n=== PROPIEDAD ${i+1} ===\nURL: ${link}\nCONTENIDO:\n${details}\n========================\n`;
        await propertyPage.close();
      } catch (err) {
        console.error(`Error en propiedad ${link}:`, err);
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
