# Imalá Vox — Instrucciones: Reemplazar Puppeteer por Spider API

> Documento para Antigravity. Dos archivos a modificar, uno a crear. Implementar en el orden indicado.

---

## Contexto

El sistema actual usa Puppeteer en `functions/src/scraper.ts` para el scraping profundo. El problema: Puppeteer en Cloud Functions es lento (45-90 seg por escaneo), consume 2GB de memoria, y tiene lógica de paginación incompleta que no cubre todos los patrones de "Ver más" y carga infinita.

**La solución:** reemplazar Puppeteer por Spider API, que maneja proxy rotation, JavaScript rendering, paginación y deep crawl por links con una sola llamada de API. El resultado: escaneos de 10-15 segundos, sin memoria pesada, con mejor cobertura de sitios.

**Archivos a modificar:**
1. `functions/src/scraper.ts` — reemplazar la lógica de Puppeteer por Spider API
2. `functions/.env` o Firebase Functions config — agregar `SPIDER_API_KEY`
3. `functions/package.json` — quitar `puppeteer`, no hay que agregar nada (Spider es una API REST)

**Archivos a NO tocar:**
- `functions/src/index.ts` — la Cloud Function `procesarScrapingWeb` no cambia
- `functions/src/parser.ts` — el parsing con Gemini no cambia
- `functions/src/ai.ts` — no tocar
- Todo el directorio `src/` de Next.js — no tocar

---

## CAMBIO 1 — `functions/src/scraper.ts`

Reemplazar el archivo completo por el siguiente. No conservar nada del código anterior.

```typescript
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
      limit: maxProperties + 5,     // +5 por si algunos links no son fichas
      depth: 1,                       // Solo entrar 1 nivel (listado → ficha)
      return_format: 'markdown',      // Markdown limpio listo para Gemini
      request: 'chrome',              // Browser mode — necesario para JS
      execution_scripts: {
        [url]: LOAD_MORE_SCRIPT        // Script solo en la página de listado
      },
      filter_output: {
        // Filtrar para quedarse solo con links que parezcan fichas de detalle
        // Spider aplica este filtro antes de seguir los links
        only_main_content: true,
        exclude_tags: ['nav', 'footer', 'header', 'script', 'style', 'aside'],
      },
      // Esperar que la página cargue contenido dinámico
      wait_for: 2500,
      // No seguir links externos al dominio
      domain_filter: (() => {
        try { return new URL(url).hostname; } catch { return undefined; }
      })(),
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
    
    // La primera página en el array es siempre la URL de origen (el listado)
    const paginaPrincipal = crawlData.find(p => {
      try {
        return new URL(p.url).pathname === new URL(url).pathname;
      } catch {
        return p.url === url;
      }
    }) || crawlData[0];

    // Las fichas son las demás páginas que pasaron el filtro de links
    const fichas = crawlData
      .filter(p => p.url !== paginaPrincipal?.url)
      .filter(p => p.status === 200 && p.content && p.content.length > 100)
      .filter(p => esLinkDeDetalle(p.url))
      .slice(0, maxProperties);

    console.log(`[Spider] Página principal: ${paginaPrincipal?.url || 'no detectada'}`);
    console.log(`[Spider] Fichas de detalle válidas: ${fichas.length}`);

    // ── FASE 3: Armar el texto estructurado para el parser ────────────────────
    
    // Texto de la página principal (info general del negocio/agente)
    const mainText = [
      `ORIGEN: ${url}`,
      `TOTAL_ITEMS_ENCONTRADOS: ${fichas.length}`,
      '',
      '=== INFORMACIÓN GENERAL DEL SITIO ===',
      paginaPrincipal?.content?.slice(0, 3000) || 'No disponible',
      '',
    ].join('\n');

    // Texto de cada ficha individual
    const itemsText = fichas.map((ficha, i) => [
      `=== ITEM ${i + 1} ===`,
      `URL: ${ficha.url}`,
      `CONTENIDO:`,
      ficha.content?.slice(0, 4000) || 'Sin contenido', // Limitar por ficha para no inflar
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
```

---

## CAMBIO 2 — `functions/package.json`

Remover `puppeteer` de las dependencias ya que no se usa más. Localizar en `dependencies`:

```json
"puppeteer": "..."
```

Eliminar esa línea completa. No agregar nada nuevo — Spider es una API REST, no requiere SDK ni package.

Después de modificar el archivo, ejecutar en la carpeta `functions/`:

```bash
npm install
```

> Si `puppeteer` también aparece en `devDependencies`, eliminarlo de ahí también.

---

## CAMBIO 3 — Variables de entorno en Firebase Functions

Spider API Key debe estar disponible como variable de entorno en la Cloud Function. Hay dos formas dependiendo de cómo esté configurado el proyecto:

**Opción A — Firebase Functions Config (si el proyecto usa `functions.config()`):**

```bash
firebase functions:config:set spider.api_key="TU_SPIDER_API_KEY"
```

Y en `functions/src/index.ts`, agregar al inicio donde se leen las configs:

```typescript
const SPIDER_API_KEY = functions.config().spider?.api_key;
process.env.SPIDER_API_KEY = SPIDER_API_KEY;
```

**Opción B — `.env` file en functions (si el proyecto usa dotenv o Firebase Gen 2):**

Crear o editar `functions/.env`:

```
SPIDER_API_KEY=TU_SPIDER_API_KEY
```

> La API Key de Spider se obtiene en https://spider.cloud — crear cuenta gratuita, plan pay-as-you-go, no requiere tarjeta para el free tier inicial.

**Agregar también a `.gitignore` en la carpeta `functions/`:**

```
.env
.env.local
.runtimeconfig.json
```

---

## CAMBIO 4 — Ajuste de configuración de la Cloud Function en `functions/src/index.ts`

La Cloud Function `procesarScrapingWeb` actualmente está configurada con `memory: '2GB'` para aguantar Puppeteer. Con Spider eso ya no hace falta. Reducir la memoria y el timeout:

Localizar:

```typescript
export const procesarScrapingWeb = functions
  .runWith({ timeoutSeconds: 540, memory: '2GB' })
  .https.onRequest(async (req, res) => {
```

Reemplazar por:

```typescript
export const procesarScrapingWeb = functions
  .runWith({ timeoutSeconds: 120, memory: '512MB' })
  .https.onRequest(async (req, res) => {
```

**Por qué:** Spider maneja el browser en su infraestructura. La Cloud Function ahora solo hace la llamada HTTP a Spider y procesa el texto. 120 segundos y 512MB son más que suficientes, y reduce el costo de Cloud Functions en ~75%.

---

## Verificación post-implementación

Una vez desplegado (`firebase deploy --only functions`), testear con estos casos:

**Test 1 — RE/MAX con botón "Ver más":**
URL de prueba: página de propiedades de cualquier agente RE/MAX Argentina.
Resultado esperado: logs muestran `[Spider] Fichas de detalle válidas: X` con más de 6 ítems (si solo trae 6 significa que el script de paginación no funcionó).

**Test 2 — WooCommerce con paginación por URL:**
URL de prueba: cualquier tienda WooCommerce con `/shop/` o `/tienda/`.
Resultado esperado: Spider sigue los links `/product/nombre-producto/` y devuelve las fichas individuales.

**Test 3 — Sitio informativo sin catálogo:**
URL de prueba: landing page simple.
Resultado esperado: `items: []` vacío, pero `mainText` con el contenido de la página (horarios, contacto, descripción del negocio).

---

## Notas para Antigravity

**No modificar `parser.ts`:** recibe `mainText` y lo procesa con Gemini. El formato del texto que genera el nuevo scraper es compatible con el parser existente — mismo formato de `=== ITEM N ===` y `URL: ...`.

**No modificar `index.ts` (salvo el `runWith`):** la función `realizarScrapingRecursoInternal` que llama a `ejecutarScrapingProfundo` no cambia. Solo cambia lo que hace `ejecutarScrapingProfundo` internamente.

**El `src/lib/scraper.ts` de Next.js:** ese archivo es dead code — la Cloud Function usa `functions/src/scraper.ts`. No tocar ni borrar el archivo de `src/lib/` por ahora para no romper imports accidentales. El cambio real es solo en `functions/src/`.

**Sobre el rate limiting de Spider:** Spider tiene rate limiting generoso en el plan pay-as-you-go. Para el volumen de este sistema (20 clientes, escaneos ocasionales) no hay riesgo de llegar al límite. Si en el futuro escala a cientos de clientes con sync diario, agregar un delay de 2-3 segundos entre escaneos concurrentes.

**Manejo de errores:** si Spider falla (timeout, sitio bloqueado, API key incorrecta), `ejecutarScrapingProfundo` devuelve `{ success: false, error: mensaje }`. La Cloud Function ya maneja este caso y actualiza el estado del recurso en Firestore a `error`. No hay nada adicional que hacer en el manejo de errores.

---

*Fin del documento.*
