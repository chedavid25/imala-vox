import puppeteer, { Browser, Page } from "puppeteer";

/**
 * Motor de Scraping Inmobiliario Profundo
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
    // 1. Lanzar el navegador con mejores argumentos de camuflaje
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox", 
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled", // Ocultar que es automatizado
        "--window-size=1920,1080"
      ]
    });

    const page = await browser.newPage();
    
    // Simular un usuario real muy específico
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36");
    await page.setExtraHTTPHeaders({
      'accept-language': 'es-ES,es;q=0.9',
      'referer': 'https://www.google.com/'
    });

    console.log(`Navegando a: ${url}`);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });

    // Esperar un momento extra para que carguen los scripts de Remax
    await new Promise(r => setTimeout(r, 5000));

    // 2. Lógica de "CARGAR MÁS" (Scroll y Clics) mejorada
    let canLoadMore = true;
    let loadCount = 0;
    const maxLoads = 15; 

    while (canLoadMore && loadCount < maxLoads) {
      console.log(`Ciclo de carga ${loadCount + 1}...`);
      
      // Scroll suave 'humano'
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

      // Buscar el botón "Ver más" con múltiples selectores posibles
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
          console.log("Pulsando botón detectado:", text);
          await btn.click();
          await new Promise(r => setTimeout(r, 4000));
          foundButton = true;
          loadCount++;
          break;
        }
      }
      
      if (!foundButton) {
        console.log("No se encontraron más botones de carga.");
        canLoadMore = false;
      }
    }

    // 3. Extraer links de las propiedades con mayor precisión
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

    console.log(`Se encontraron ${propertyLinks.length} propiedades únicas.`);

    let fullText = "";
    
    // Capturar información de contacto del agente si está disponible
    const pageTitle = await page.title();
    fullText += `ORIGEN: ${url}\nTÍTULO: ${pageTitle}\n\n`;

    // 4. Navegación profunda (entrar a cada propiedad)
    const linksToScrape = propertyLinks.slice(0, maxProperties);
    
    for (let i = 0; i < linksToScrape.length; i++) {
      const link = linksToScrape[i];
      try {
        console.log(`[${i+1}/${linksToScrape.length}] Scrapeando: ${link}`);
        const propertyPage = await browser.newPage();
        await propertyPage.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36");
        
        await propertyPage.goto(link, { waitUntil: "networkidle0", timeout: 45000 });
        await new Promise(r => setTimeout(r, 2000)); // Espera humana
        
        const details = await propertyPage.evaluate(() => {
          // Limpiar antes de extraer innerText
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
    console.error("Error en Scraping Profundo:", error);
    return {
      mainText: "",
      propertyCount: 0,
      success: false,
      error: error.message
    };
  }
}
