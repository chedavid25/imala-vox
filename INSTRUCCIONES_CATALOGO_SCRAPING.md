# Imalá Vox — Instrucciones de implementación: Catálogo Inteligente + Scraping IA

> Documento para Antigravity. Implementar en el orden exacto indicado. No alterar nombres de archivos, rutas ni interfaces salvo que se indique explícitamente. Leer cada sección completa antes de escribir código.

---

## Contexto general

El sistema ya tiene un pipeline de scraping web funcional:
`webs/page.tsx` → `POST /api/proxy-scraper` → Cloud Function `procesarScrapingWeb` → guarda texto en `baseConocimiento/{recursoId}` → `prompts.ts` inyecta ese texto al agente.

El problema actual: el scraper devuelve texto crudo sin estructura. Eso es aceptable para información general (horarios, FAQ), pero inutilizable para catálogos de productos o propiedades porque la IA no puede identificar con precisión dónde empieza y termina cada ítem.

**Objetivo de esta implementación:**
1. Mejorar el scraper para manejar paginación y "ver más" en cualquier sitio
2. Agregar una etapa de parsing con IA (Claude) que convierte el texto crudo en objetos estructurados
3. Guardar esos objetos en `COLLECTIONS.OBJETOS` (colección ya existente pero vacía)
4. Construir la UI del catálogo en `/dashboard/cerebro/catalogo/page.tsx`
5. Mejorar el formato del catálogo en el system prompt de los agentes

El resultado: cuando un usuario indexa `https://suinmobiliaria.com/propiedades`, el sistema extrae automáticamente cada propiedad como un `Objeto` editable, y los agentes pueden consultarlos con precisión.

---

## PASO 1 — Actualizar `src/lib/types/firestore.ts`

**Acción:** Reemplazar la interfaz `Objeto` existente por la versión ampliada. No modificar nada más del archivo.

```typescript
export interface Objeto {
  id?: string;
  tipo: 'propiedad' | 'producto';
  titulo: string;
  precio: number;
  moneda: 'ARS' | 'USD' | 'EUR';
  descripcion: string;
  fotos: string[];
  caracteristicas: Record<string, any>;
  // Para propiedades: { tipo, m2, dormitorios, banios, ambientes, barrio, localidad, operacion: 'venta'|'alquiler'|'alquiler_temporal', orientacion, piso, expensas }
  // Para productos: { sku, categoria, stock, variantes, marca, peso, dimensiones }
  urlFuente?: string;           // URL del ítem individual (ej: la ficha de la propiedad)
  urlOriginWeb?: string;        // URL del sitio padre que se indexó
  recursoOrigenId?: string;     // ID del doc en baseConocimiento del que se extrajo
  estado: 'disponible' | 'vendido' | 'reservado' | 'pausado';
  creadoEl: Timestamp;
  actualizadoEl: Timestamp;
}
```

---

## PASO 2 — Crear `src/app/api/parse-objects/route.ts`

Este endpoint recibe el texto scrapeado, llama a Claude para extraer estructura, y graba en Firestore.

**Archivo completo a crear:**

```typescript
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/types/firestore";
import { Timestamp } from "firebase-admin/firestore";

const anthropic = new Anthropic();

const PARSE_SYSTEM_PROMPT = `Eres un extractor de datos estructurados especializado en sitios web de negocios argentinos.
A partir de texto scrapeado de un sitio web, debes identificar y extraer dos tipos de información:

1. INFO_GENERAL del negocio: nombre, descripción, horarios, teléfonos, emails, dirección, redes sociales, whatsapp
2. OBJETOS del catálogo: cada producto o propiedad individual con todos sus datos

REGLAS CRÍTICAS:
- Responde ÚNICAMENTE con JSON válido. Sin texto antes ni después. Sin bloques de código markdown.
- Si un campo no está disponible, usa null (no string vacío ni "no especificado")
- Para precios: solo el número sin símbolos ni separadores de miles. Si dice "USD 150,000" → precio: 150000, moneda: "USD"
- Para propiedades argentinas: detectar si es venta o alquiler por el contexto
- Si el sitio NO tiene productos/propiedades claros (ej: es solo una landing informativa), retornar objetos: []
- Máximo 50 objetos por extracción

Responde con este formato JSON exacto:
{
  "info_general": {
    "nombre_negocio": string | null,
    "descripcion": string | null,
    "horarios": string | null,
    "telefono": string | null,
    "whatsapp": string | null,
    "email": string | null,
    "direccion": string | null,
    "redes": string | null
  },
  "tipo_catalogo": "propiedad" | "producto" | "mixto" | "ninguno",
  "objetos": [
    {
      "titulo": string,
      "precio": number | null,
      "moneda": "ARS" | "USD" | "EUR",
      "descripcion": string,
      "estado": "disponible" | "vendido" | "reservado",
      "urlFuente": string | null,
      "fotos": [],
      "caracteristicas": {
        // Para propiedades:
        // "tipo": "casa" | "departamento" | "local" | "oficina" | "terreno" | "campo" | "otro"
        // "operacion": "venta" | "alquiler" | "alquiler_temporal"
        // "m2": number | null
        // "m2_cubiertos": number | null
        // "dormitorios": number | null
        // "banios": number | null
        // "ambientes": number | null
        // "cochera": boolean | null
        // "piso": string | null
        // "barrio": string | null
        // "localidad": string | null
        // "expensas": number | null
        // "orientacion": string | null
        
        // Para productos:
        // "sku": string | null
        // "categoria": string | null
        // "marca": string | null
        // "stock": number | null
      }
    }
  ]
}`;

export async function POST(req: NextRequest) {
  try {
    const { rawText, sourceUrl, wsId, recursoId } = await req.json();

    if (!rawText || !wsId || !recursoId) {
      return NextResponse.json({ success: false, error: "Faltan parámetros" }, { status: 400 });
    }

    // Limitar texto para no exceder contexto (Claude puede manejar ~180k tokens, pero limitamos a lo práctico)
    const textToProcess = rawText.slice(0, 120000);

    console.log(`[ParseObjects] Iniciando extracción IA para recurso ${recursoId}, ${textToProcess.length} chars`);

    // Llamar a Claude para extraer estructura
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      system: PARSE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Sitio web origen: ${sourceUrl}\n\nTexto scrapeado:\n${textToProcess}`
        }
      ]
    });

    const rawJson = (response.content[0] as any).text;
    
    let parsed: any;
    try {
      parsed = JSON.parse(rawJson);
    } catch (parseError) {
      // Intentar limpiar si Claude agregó markdown por error
      const cleaned = rawJson.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    }

    const { info_general, tipo_catalogo, objetos } = parsed;

    // 1. Actualizar el recurso de conocimiento con info general estructurada
    if (info_general) {
      const infoTexto = Object.entries(info_general)
        .filter(([_, v]) => v !== null)
        .map(([k, v]) => `${k.replace(/_/g, ' ').toUpperCase()}: ${v}`)
        .join('\n');

      await adminDb
        .collection(COLLECTIONS.ESPACIOS).doc(wsId)
        .collection(COLLECTIONS.CONOCIMIENTO).doc(recursoId)
        .update({
          contenidoTexto: infoTexto,
          tipoCatalogo: tipo_catalogo,
          estado: 'activo',
          actualizadoEl: Timestamp.now(),
          ultimoScrapeo: Timestamp.now()
        });
    }

    // 2. Guardar objetos extraídos en COLLECTIONS.OBJETOS
    let objetosCreados = 0;

    if (objetos && objetos.length > 0) {
      // Eliminar objetos anteriores de esta misma fuente para evitar duplicados en re-scrape
      const existentesSnap = await adminDb
        .collection(COLLECTIONS.ESPACIOS).doc(wsId)
        .collection(COLLECTIONS.OBJETOS)
        .where("recursoOrigenId", "==", recursoId)
        .get();

      const batch = adminDb.batch();

      // Borrar anteriores
      existentesSnap.docs.forEach(d => batch.delete(d.ref));

      // Crear nuevos
      for (const obj of objetos.slice(0, 50)) {
        const ref = adminDb
          .collection(COLLECTIONS.ESPACIOS).doc(wsId)
          .collection(COLLECTIONS.OBJETOS)
          .doc();

        batch.set(ref, {
          tipo: tipo_catalogo === 'producto' ? 'producto' : 'propiedad',
          titulo: obj.titulo || 'Sin título',
          precio: obj.precio || 0,
          moneda: obj.moneda || 'ARS',
          descripcion: obj.descripcion || '',
          fotos: obj.fotos || [],
          caracteristicas: obj.caracteristicas || {},
          urlFuente: obj.urlFuente || null,
          urlOriginWeb: sourceUrl || null,
          recursoOrigenId: recursoId,
          estado: obj.estado || 'disponible',
          creadoEl: Timestamp.now(),
          actualizadoEl: Timestamp.now()
        });
        objetosCreados++;
      }

      await batch.commit();
    }

    // 3. Actualizar contador en el workspace
    await adminDb
      .collection(COLLECTIONS.ESPACIOS).doc(wsId)
      .update({
        "uso.objectCount": adminDb.FieldValue ? 
          (adminDb as any).FieldValue.increment(objetosCreados) : 
          objetosCreados
      }).catch(() => {}); // No crítico si falla

    console.log(`[ParseObjects] Completado: ${objetosCreados} objetos extraídos`);

    return NextResponse.json({ 
      success: true, 
      objetosCreados,
      tipoCatalogo: tipo_catalogo,
      infoGeneral: info_general
    });

  } catch (error: any) {
    console.error("[ParseObjects] Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
```

---

## PASO 3 — Modificar `src/app/api/proxy-scraper/route.ts`

**Acción:** Después de recibir respuesta exitosa de la Cloud Function, disparar el parsing en paralelo (fire-and-forget). El proxy debe retornar al cliente inmediatamente sin esperar el parsing.

**Reemplazar el archivo completo por:**

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { wsId, recursoId, url } = await req.json();

    if (!wsId || !recursoId || !url) {
      return NextResponse.json({ success: false, error: "Faltan parámetros" }, { status: 400 });
    }

    const functionUrl = `https://us-central1-imala-vox.cloudfunctions.net/procesarScrapingWeb`;
    console.log(`[Proxy] Iniciando scraping para: ${url}`);

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wsId,
        recursoId,
        url,
        secret: 'imala_vox_internal_key'
      })
    });

    console.log(`[Proxy] Cloud Function respondió con status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Proxy] Error de Cloud Function (${response.status}):`, errorText);
      return NextResponse.json({
        success: false,
        error: `Error del motor (${response.status}): ${errorText.substring(0, 100)}`
      }, { status: 500 });
    }

    const result = await response.json();
    const rawText = result.result?.mainText || result.data?.mainText || result.mainText || "";

    // Disparar parsing IA en background (sin await — no bloqueamos al usuario)
    if (rawText && rawText.length > 100) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      fetch(`${baseUrl}/api/parse-objects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, sourceUrl: url, wsId, recursoId })
      }).catch(err => console.error('[Proxy] Error disparando parse-objects:', err));
    }

    return NextResponse.json({ success: true, ...result.result || result });

  } catch (error: any) {
    console.error("[Proxy] Error crítico:", error);
    return NextResponse.json({ success: false, error: `Error interno: ${error.message}` }, { status: 500 });
  }
}
```

**Importante:** Agregar `NEXT_PUBLIC_APP_URL=https://tu-dominio.com` al `.env.production` si no existe.

---

## PASO 4 — Mejorar la Cloud Function `procesarScrapingWeb`

> Este paso modifica la lógica de scraping del lado del servidor (Firebase Functions). El archivo relevante es `functions/src/index.ts` o similar — verificar la estructura del repo de Functions si existe separado.

Si la Cloud Function usa el código de `src/lib/scraper.ts` como referencia, actualizar la lógica de extracción de links y paginación con lo siguiente. Si no, aplicar estos cambios directamente en la Cloud Function.

### Problema actual con paginación

El scraper actual solo busca botones con texto "ver más" o "cargar más". Esto falla en:
- Paginación numérica (`/page/2`, `?page=2`, `?pag=2`)
- Botones con texto en inglés (`Load more`, `Show more`)
- Infinite scroll sin botón visible
- Tienda Nube, WooCommerce, Shopify con paginación por query params

### Lógica de paginación mejorada

Reemplazar el bloque de "CARGAR MÁS" del scraper con esta lógica:

```typescript
// ESTRATEGIA DE PAGINACIÓN MULTI-MODAL
async function cargarTodoElContenido(page: any, maxPages: number = 8) {
  let paginasVisitadas = 0;
  
  // Estrategia 1: Scroll infinito + botones "ver más"
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
      
      const botones = Array.from(document.querySelectorAll('button, a.btn, .btn, [role="button"], .load-more, .ver-mas, .loadmore'));
      
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

  // Estrategia 2: Detectar paginación por URL
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
```

Integrar llamando a `cargarTodoElContenido(page)` antes de extraer los links de ítems, y navegar las páginas de paginación adicionales detectadas.

### Mejora en extracción de links de ítems

Reemplazar el bloque de `propertyLinks` por esta versión que cubre más plataformas:

```typescript
const itemLinks = await page.evaluate((currentUrl: string) => {
  const url = new URL(currentUrl);
  const domain = url.hostname;
  
  const links = Array.from(document.querySelectorAll('a[href]'));
  const found = new Set<string>();
  
  for (const link of links) {
    const href = (link as HTMLAnchorElement).href;
    if (!href || !href.startsWith('http')) continue;
    
    // Excluir dominios externos
    try {
      const linkDomain = new URL(href).hostname;
      if (linkDomain !== domain) continue;
    } catch { continue; }
    
    const lower = href.toLowerCase();
    const path = new URL(href).pathname.toLowerCase();
    
    // Patrones de páginas de detalle (propiedades + productos)
    const esDetalle = 
      // Inmobiliarias
      path.includes('/propiedad/') || path.includes('/property/') ||
      path.includes('/listings/') || path.includes('/ficha/') ||
      path.includes('/inmueble/') || path.includes('/departamento/') ||
      path.includes('/casa/') || path.includes('/terreno/') ||
      // Formato numérico (ej: tokko, remax)
      /\/p\/\d+/.test(path) || /\/\d{5,}/.test(path) ||
      // E-commerce
      path.includes('/producto/') || path.includes('/product/') ||
      path.includes('/item/') || path.includes('/articulo/') ||
      path.includes('/shop/') || path.includes('/tienda/') ||
      // WooCommerce
      (path.includes('/product') && !path.includes('/product-category')) ||
      // Tienda Nube
      path.includes('/productos/') ||
      // Shopify
      path.includes('/collections/') && path.includes('/products/') ||
      // MercadoLibre
      lower.includes('articulo.mercadolibre') || lower.includes('/MLA-') ||
      // Tokko Broker
      path.includes('/tokkobroker.com/properties/');
    
    // Excluir páginas de navegación
    const esNavegacion = 
      path.includes('/categoria/') || path.includes('/category/') ||
      path.includes('/tag/') || path.includes('/page/') ||
      path.includes('/cart') || path.includes('/checkout') ||
      path.includes('/login') || path.includes('/register') ||
      path.includes('/contacto') || path.includes('/contact') ||
      path === '/' || path === '';
    
    if (esDetalle && !esNavegacion) {
      found.add(href);
    }
  }
  
  return Array.from(found);
}, page.url());
```

---

## PASO 5 — Actualizar `src/lib/ai/prompts.ts`

**Acción:** Mejorar la sección del catálogo en el system prompt para que la IA use los datos de forma más efectiva.

Localizar el bloque `## CATÁLOGO DE OBJETOS/PROPIEDADES DISPONIBLES` en `construirSystemPrompt` y reemplazarlo:

```typescript
// 5. Cargar objetos/propiedades activos (limitado para no saturar contexto)
const objetosSnap = await adminDb
  .collection(COLLECTIONS.ESPACIOS).doc(wsId)
  .collection(COLLECTIONS.OBJETOS)
  .where("estado", "==", "disponible")
  .limit(60)
  .get();

const objetosFormateados = objetosSnap.docs.map(o => {
  const d = o.data();
  const c = d.caracteristicas || {};
  
  if (d.tipo === 'propiedad') {
    const partes = [
      d.titulo,
      d.precio > 0 ? `${d.moneda || 'USD'} ${d.precio.toLocaleString('es-AR')}` : null,
      c.operacion ? c.operacion.toUpperCase() : null,
      c.ambientes ? `${c.ambientes} amb` : null,
      c.dormitorios ? `${c.dormitorios} dorm` : null,
      c.m2 ? `${c.m2}m²` : null,
      c.barrio || c.localidad || null,
      c.tipo || null,
      c.expensas ? `Expensas: ARS ${c.expensas.toLocaleString('es-AR')}` : null,
      d.urlFuente ? `Ver ficha: ${d.urlFuente}` : null
    ].filter(Boolean);
    return `• ${partes.join(' | ')}`;
  } else {
    const partes = [
      d.titulo,
      d.precio > 0 ? `${d.moneda || 'ARS'} ${d.precio.toLocaleString('es-AR')}` : null,
      c.marca || null,
      c.categoria || null,
      c.stock != null ? `Stock: ${c.stock}` : null,
      c.sku ? `SKU: ${c.sku}` : null,
      d.descripcion ? d.descripcion.slice(0, 100) : null
    ].filter(Boolean);
    return `• ${partes.join(' | ')}`;
  }
}).join('\n');
```

Y actualizar el template del prompt:

```typescript
## CATÁLOGO DE PRODUCTOS/PROPIEDADES DISPONIBLES
${objetosSnap.docs.length > 0
  ? `Tenés ${objetosSnap.docs.length} ítem(s) disponibles. Cuando el cliente pregunte por opciones, filtrá según sus criterios y recomendá los más relevantes. Si pregunta por precio de un ítem específico que no está en la lista, decí que vas a consultar.\n\n${objetosFormateados}`
  : "No hay ítems en el catálogo actualmente. Si el cliente pregunta por productos o propiedades, derivar a un asesor humano."}
```

---

## PASO 6 — Crear `src/app/dashboard/cerebro/catalogo/page.tsx`

Esta es la UI principal del catálogo. Leer completamente antes de implementar.

### Comportamiento general

- Carga objetos desde `COLLECTIONS.OBJETOS` del workspace actual con `onSnapshot`
- Permite filtrar por `tipo` (propiedad/producto), `estado` y `recursoOrigenId` (sitio fuente)
- Cada card muestra datos resumidos + acciones: editar, cambiar estado, eliminar
- Modal de edición con campos dinámicos según el tipo
- Badge por sitio de origen con link a la sección de webs
- Respeta límites del plan (`catalogObjects` de `planLimits.ts`)

### Estructura del componente

```
CatalogoPage
├── Header (título + contador + botón "Agregar manual")
├── BarraFiltros (tipo | estado | sitio origen)
├── Grid de ObjetoCards (o empty state)
└── ModalEdicion (Dialog)
```

### Código completo

```tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import {
  collection, onSnapshot, query, deleteDoc, doc,
  updateDoc, serverTimestamp, addDoc
} from "firebase/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { COLLECTIONS, Objeto } from "@/lib/types/firestore";
import {
  LayoutGrid, Building2, ShoppingCart, Plus, Pencil, Trash2,
  ExternalLink, Loader2, Globe, Filter, Home, DollarSign,
  Maximize2, BedDouble, Bath, MapPin, Tag, Package,
  CheckCircle2, Clock, XCircle, PauseCircle, Search
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

type ObjetoConId = Objeto & { id: string };

const ESTADO_CONFIG = {
  disponible: { label: 'Disponible', icon: CheckCircle2, bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  vendido:    { label: 'Vendido',    icon: XCircle,      bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     dot: 'bg-red-500' },
  reservado:  { label: 'Reservado',  icon: Clock,        bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  pausado:    { label: 'Pausado',    icon: PauseCircle,  bg: 'bg-[var(--bg-input)]', border: 'border-[var(--border-light)]', text: 'text-[var(--text-tertiary-light)]', dot: 'bg-[var(--text-tertiary-light)]' },
};

export default function CatalogoPage() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [objetos, setObjetos] = useState<ObjetoConId[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [filtroFuente, setFiltroFuente] = useState<string>("todos");
  const [editando, setEditando] = useState<ObjetoConId | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState<Partial<Objeto>>({});

  useEffect(() => {
    if (!currentWorkspaceId) return;

    const q = query(
      collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.OBJETOS)
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ ...d.data(), id: d.id })) as ObjetoConId[];
      // Ordenar: disponibles primero, luego por título
      docs.sort((a, b) => {
        if (a.estado === 'disponible' && b.estado !== 'disponible') return -1;
        if (b.estado === 'disponible' && a.estado !== 'disponible') return 1;
        return a.titulo.localeCompare(b.titulo);
      });
      setObjetos(docs);
      setLoading(false);
    });

    return () => unsub();
  }, [currentWorkspaceId]);

  // Fuentes únicas para el filtro
  const fuentesUnicas = useMemo(() => {
    const map = new Map<string, string>();
    objetos.forEach(o => {
      if (o.recursoOrigenId && o.urlOriginWeb) {
        map.set(o.recursoOrigenId, new URL(o.urlOriginWeb).hostname);
      }
    });
    return Array.from(map.entries());
  }, [objetos]);

  // Filtrado
  const objetosFiltrados = useMemo(() => {
    return objetos.filter(o => {
      if (filtroTipo !== 'todos' && o.tipo !== filtroTipo) return false;
      if (filtroEstado !== 'todos' && o.estado !== filtroEstado) return false;
      if (filtroFuente !== 'todos' && o.recursoOrigenId !== filtroFuente) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        return (
          o.titulo.toLowerCase().includes(q) ||
          o.descripcion.toLowerCase().includes(q) ||
          JSON.stringify(o.caracteristicas).toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [objetos, filtroTipo, filtroEstado, filtroFuente, busqueda]);

  const abrirEdicion = (obj: ObjetoConId) => {
    setEditando(obj);
    setForm({ ...obj });
  };

  const cerrarEdicion = () => {
    setEditando(null);
    setForm({});
  };

  const guardarEdicion = async () => {
    if (!editando || !currentWorkspaceId) return;
    setGuardando(true);
    try {
      await updateDoc(
        doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.OBJETOS, editando.id),
        { ...form, actualizadoEl: serverTimestamp() }
      );
      toast.success("Objeto actualizado");
      cerrarEdicion();
    } catch (err) {
      toast.error("Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (obj: ObjetoConId) => {
    if (!confirm(`¿Eliminar "${obj.titulo}"?`)) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId!, COLLECTIONS.OBJETOS, obj.id));
      toast.success("Eliminado");
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const cambiarEstado = async (obj: ObjetoConId, nuevoEstado: Objeto['estado']) => {
    try {
      await updateDoc(
        doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId!, COLLECTIONS.OBJETOS, obj.id),
        { estado: nuevoEstado, actualizadoEl: serverTimestamp() }
      );
    } catch {
      toast.error("Error al cambiar estado");
    }
  };

  const disponibles = objetos.filter(o => o.estado === 'disponible').length;
  const propiedades = objetos.filter(o => o.tipo === 'propiedad').length;
  const productos = objetos.filter(o => o.tipo === 'producto').length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[var(--text-primary-light)] tracking-tight">
            Catálogo de Objetos
          </h1>
          <p className="text-sm text-[var(--text-tertiary-light)]">
            Productos y propiedades extraídos automáticamente de tus sitios indexados.
          </p>
        </div>
      </div>

      {/* Stats rápidas */}
      {objetos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', valor: objetos.length, icon: LayoutGrid },
            { label: 'Disponibles', valor: disponibles, icon: CheckCircle2 },
            { label: 'Propiedades', valor: propiedades, icon: Building2 },
            { label: 'Productos', valor: productos, icon: ShoppingCart },
          ].map(stat => (
            <div key={stat.label} className="bg-[var(--bg-card)] border border-[var(--border-light)] rounded-2xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--bg-input)] border border-[var(--border-light)] flex items-center justify-center shrink-0">
                <stat.icon className="w-4 h-4 text-[var(--text-secondary-light)]" />
              </div>
              <div>
                <p className="text-xl font-bold text-[var(--text-primary-light)] leading-none">{stat.valor}</p>
                <p className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Barra de filtros */}
      {objetos.length > 0 && (
        <div className="flex flex-wrap gap-3 items-center">
          {/* Búsqueda */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary-light)]" />
            <Input
              placeholder="Buscar..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="pl-10 bg-[var(--bg-input)] border-[var(--border-light)] rounded-xl h-9 text-sm"
            />
          </div>

          {/* Filtro tipo */}
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-36 bg-[var(--bg-card)] border-[var(--border-light)] rounded-xl h-9 text-xs font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              <SelectItem value="propiedad">Propiedades</SelectItem>
              <SelectItem value="producto">Productos</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro estado */}
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-36 bg-[var(--bg-card)] border-[var(--border-light)] rounded-xl h-9 text-xs font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="disponible">Disponible</SelectItem>
              <SelectItem value="reservado">Reservado</SelectItem>
              <SelectItem value="vendido">Vendido</SelectItem>
              <SelectItem value="pausado">Pausado</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro fuente */}
          {fuentesUnicas.length > 1 && (
            <Select value={filtroFuente} onValueChange={setFiltroFuente}>
              <SelectTrigger className="w-44 bg-[var(--bg-card)] border-[var(--border-light)] rounded-xl h-9 text-xs font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las fuentes</SelectItem>
                {fuentesUnicas.map(([id, hostname]) => (
                  <SelectItem key={id} value={id}>{hostname}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {(filtroTipo !== 'todos' || filtroEstado !== 'todos' || filtroFuente !== 'todos' || busqueda) && (
            <button
              onClick={() => { setFiltroTipo('todos'); setFiltroEstado('todos'); setFiltroFuente('todos'); setBusqueda(''); }}
              className="text-xs font-bold text-[var(--text-tertiary-light)] hover:text-[var(--text-primary-light)] transition-colors px-2 py-1.5 rounded-lg hover:bg-[var(--bg-input)]"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Contenido principal */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--text-tertiary-light)]" />
        </div>
      ) : objetos.length === 0 ? (
        // Empty state — sin objetos en absoluto
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-light)] flex items-center justify-center">
            <LayoutGrid className="w-8 h-8 text-[var(--text-tertiary-light)]" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm font-bold text-[var(--text-secondary-light)]">El catálogo está vacío</p>
            <p className="text-xs text-[var(--text-tertiary-light)] max-w-xs">
              Indexá un sitio web con productos o propiedades y el sistema los extraerá automáticamente.
            </p>
          </div>
          <Link
            href="/dashboard/cerebro/conocimiento/webs"
            className={cn(buttonVariants(), "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] h-9 px-5 font-black text-[10px] uppercase tracking-widest rounded-xl mt-2")}
          >
            Ir a Sitios Web
          </Link>
        </div>
      ) : objetosFiltrados.length === 0 ? (
        // Empty state — filtros sin resultados
        <div className="flex flex-col items-center justify-center py-16 space-y-3 opacity-60">
          <Filter className="w-8 h-8 text-[var(--text-tertiary-light)]" />
          <p className="text-sm font-bold text-[var(--text-secondary-light)]">Sin resultados para estos filtros</p>
        </div>
      ) : (
        // Grid de cards
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {objetosFiltrados.map(obj => (
            <ObjetoCard
              key={obj.id}
              obj={obj}
              onEditar={() => abrirEdicion(obj)}
              onEliminar={() => eliminar(obj)}
              onCambiarEstado={(estado) => cambiarEstado(obj, estado)}
            />
          ))}
        </div>
      )}

      {/* Modal de edición */}
      <Dialog open={!!editando} onOpenChange={(open) => !open && cerrarEdicion()}>
        <DialogContent className="bg-[var(--bg-card)] border-[var(--border-light)] max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[var(--text-primary-light)]">
              Editar {editando?.tipo === 'propiedad' ? 'Propiedad' : 'Producto'}
            </DialogTitle>
          </DialogHeader>

          {editando && (
            <div className="space-y-5 py-2">
              {/* Campos comunes */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-[11px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">Título</Label>
                  <Input
                    value={form.titulo || ''}
                    onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                    className="bg-[var(--bg-input)] border-[var(--border-light)] rounded-xl h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">Precio</Label>
                  <Input
                    type="number"
                    value={form.precio || ''}
                    onChange={e => setForm(f => ({ ...f, precio: Number(e.target.value) }))}
                    className="bg-[var(--bg-input)] border-[var(--border-light)] rounded-xl h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">Moneda</Label>
                  <Select value={form.moneda || 'USD'} onValueChange={v => setForm(f => ({ ...f, moneda: v as any }))}>
                    <SelectTrigger className="bg-[var(--bg-input)] border-[var(--border-light)] rounded-xl h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="ARS">ARS</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">Estado</Label>
                  <Select value={form.estado || 'disponible'} onValueChange={v => setForm(f => ({ ...f, estado: v as any }))}>
                    <SelectTrigger className="bg-[var(--bg-input)] border-[var(--border-light)] rounded-xl h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disponible">Disponible</SelectItem>
                      <SelectItem value="reservado">Reservado</SelectItem>
                      <SelectItem value="vendido">Vendido</SelectItem>
                      <SelectItem value="pausado">Pausado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 space-y-1.5">
                  <Label className="text-[11px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">Descripción</Label>
                  <Textarea
                    value={form.descripcion || ''}
                    onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                    className="bg-[var(--bg-input)] border-[var(--border-light)] rounded-xl text-sm resize-none"
                    rows={3}
                  />
                </div>
              </div>

              {/* Campos específicos de propiedades */}
              {editando.tipo === 'propiedad' && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest border-t border-[var(--border-light)] pt-4">Características de la propiedad</p>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: 'operacion', label: 'Operación', tipo: 'select', opciones: ['venta', 'alquiler', 'alquiler_temporal'] },
                      { key: 'tipo', label: 'Tipo', tipo: 'select', opciones: ['casa', 'departamento', 'local', 'oficina', 'terreno', 'campo', 'otro'] },
                      { key: 'ambientes', label: 'Ambientes', tipo: 'number' },
                      { key: 'dormitorios', label: 'Dormitorios', tipo: 'number' },
                      { key: 'banios', label: 'Baños', tipo: 'number' },
                      { key: 'm2', label: 'M² totales', tipo: 'number' },
                      { key: 'm2_cubiertos', label: 'M² cubiertos', tipo: 'number' },
                      { key: 'expensas', label: 'Expensas (ARS)', tipo: 'number' },
                      { key: 'barrio', label: 'Barrio', tipo: 'text' },
                      { key: 'localidad', label: 'Localidad', tipo: 'text' },
                    ].map(campo => (
                      <div key={campo.key} className="space-y-1.5">
                        <Label className="text-[11px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">{campo.label}</Label>
                        {campo.tipo === 'select' ? (
                          <Select
                            value={form.caracteristicas?.[campo.key] || ''}
                            onValueChange={v => setForm(f => ({ ...f, caracteristicas: { ...f.caracteristicas, [campo.key]: v } }))}
                          >
                            <SelectTrigger className="bg-[var(--bg-input)] border-[var(--border-light)] rounded-xl h-9 text-sm">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              {campo.opciones!.map(op => (
                                <SelectItem key={op} value={op}>{op.charAt(0).toUpperCase() + op.slice(1).replace('_', ' ')}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            type={campo.tipo}
                            value={form.caracteristicas?.[campo.key] || ''}
                            onChange={e => setForm(f => ({
                              ...f,
                              caracteristicas: {
                                ...f.caracteristicas,
                                [campo.key]: campo.tipo === 'number' ? Number(e.target.value) : e.target.value
                              }
                            }))}
                            className="bg-[var(--bg-input)] border-[var(--border-light)] rounded-xl h-9 text-sm"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Campos específicos de productos */}
              {editando.tipo === 'producto' && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest border-t border-[var(--border-light)] pt-4">Características del producto</p>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: 'sku', label: 'SKU', tipo: 'text' },
                      { key: 'marca', label: 'Marca', tipo: 'text' },
                      { key: 'categoria', label: 'Categoría', tipo: 'text' },
                      { key: 'stock', label: 'Stock', tipo: 'number' },
                    ].map(campo => (
                      <div key={campo.key} className="space-y-1.5">
                        <Label className="text-[11px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">{campo.label}</Label>
                        <Input
                          type={campo.tipo}
                          value={form.caracteristicas?.[campo.key] || ''}
                          onChange={e => setForm(f => ({
                            ...f,
                            caracteristicas: {
                              ...f.caracteristicas,
                              [campo.key]: campo.tipo === 'number' ? Number(e.target.value) : e.target.value
                            }
                          }))}
                          className="bg-[var(--bg-input)] border-[var(--border-light)] rounded-xl h-9 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* URL fuente */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">URL de la ficha (opcional)</Label>
                <Input
                  value={form.urlFuente || ''}
                  onChange={e => setForm(f => ({ ...f, urlFuente: e.target.value }))}
                  placeholder="https://..."
                  className="bg-[var(--bg-input)] border-[var(--border-light)] rounded-xl h-10 text-sm"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-4 border-t border-[var(--border-light)]">
            <Button
              variant="outline"
              onClick={cerrarEdicion}
              className="h-9 px-4 bg-[var(--bg-card)] border-[var(--border-light)] text-[var(--text-primary-light)] font-bold text-xs hover:bg-[var(--bg-input)] rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={guardarEdicion}
              disabled={guardando}
              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] h-9 px-5 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-xl shadow-[var(--accent)]/20"
            >
              {guardando && <Loader2 className="w-3 h-3 animate-spin mr-2" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Componente ObjetoCard ───────────────────────────────────────────────────

function ObjetoCard({
  obj,
  onEditar,
  onEliminar,
  onCambiarEstado,
}: {
  obj: ObjetoConId;
  onEditar: () => void;
  onEliminar: () => void;
  onCambiarEstado: (estado: Objeto['estado']) => void;
}) {
  const estadoCfg = ESTADO_CONFIG[obj.estado] || ESTADO_CONFIG.disponible;
  const c = obj.caracteristicas || {};
  const esPropiedad = obj.tipo === 'propiedad';

  const precioFormateado = obj.precio > 0
    ? `${obj.moneda || 'USD'} ${obj.precio.toLocaleString('es-AR')}`
    : 'Consultar precio';

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-light)] rounded-2xl p-5 hover:border-[var(--border-light-strong)] transition-all flex flex-col gap-4 group">
      
      {/* Header de la card */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[var(--bg-input)] border border-[var(--border-light)] flex items-center justify-center shrink-0">
            {esPropiedad
              ? <Building2 className="w-4 h-4 text-[var(--text-secondary-light)]" />
              : <ShoppingCart className="w-4 h-4 text-[var(--text-secondary-light)]" />
            }
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--text-primary-light)] truncate">{obj.titulo}</p>
            <p className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">
              {esPropiedad ? c.operacion || 'Propiedad' : 'Producto'}
            </p>
          </div>
        </div>

        {/* Badge de estado */}
        <Select value={obj.estado} onValueChange={onCambiarEstado}>
          <SelectTrigger className={cn(
            "h-7 px-2.5 rounded-full border text-[9px] font-black uppercase tracking-wider w-auto gap-1.5",
            estadoCfg.bg, estadoCfg.border, estadoCfg.text
          )}>
            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", estadoCfg.dot)} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="disponible">Disponible</SelectItem>
            <SelectItem value="reservado">Reservado</SelectItem>
            <SelectItem value="vendido">Vendido</SelectItem>
            <SelectItem value="pausado">Pausado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Precio */}
      <div className="text-lg font-bold text-[var(--text-primary-light)]">
        {precioFormateado}
        {esPropiedad && c.expensas && (
          <span className="text-xs font-medium text-[var(--text-tertiary-light)] ml-2">
            + ARS {c.expensas.toLocaleString('es-AR')} exp.
          </span>
        )}
      </div>

      {/* Características en chips */}
      <div className="flex flex-wrap gap-1.5">
        {esPropiedad ? (
          <>
            {c.tipo && <Chip icon={Home} label={c.tipo} />}
            {c.m2 && <Chip icon={Maximize2} label={`${c.m2}m²`} />}
            {c.dormitorios && <Chip icon={BedDouble} label={`${c.dormitorios} dorm`} />}
            {c.banios && <Chip icon={Bath} label={`${c.banios} baños`} />}
            {(c.barrio || c.localidad) && <Chip icon={MapPin} label={c.barrio || c.localidad} />}
          </>
        ) : (
          <>
            {c.marca && <Chip icon={Tag} label={c.marca} />}
            {c.categoria && <Chip icon={Package} label={c.categoria} />}
            {c.stock != null && <Chip icon={Package} label={`Stock: ${c.stock}`} />}
            {c.sku && <Chip icon={Tag} label={`SKU: ${c.sku}`} />}
          </>
        )}
      </div>

      {/* Descripción truncada */}
      {obj.descripcion && (
        <p className="text-xs text-[var(--text-secondary-light)] leading-relaxed line-clamp-2">
          {obj.descripcion}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--border-light)] mt-auto">
        {/* Sitio origen */}
        {obj.urlOriginWeb ? (
          <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-tertiary-light)] font-medium">
            <Globe className="w-3 h-3" />
            <span className="truncate max-w-[120px]">
              {new URL(obj.urlOriginWeb).hostname}
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-[var(--text-tertiary-light)]">Manual</span>
        )}

        {/* Acciones */}
        <div className="flex items-center gap-1">
          {obj.urlFuente && (
            <a
              href={obj.urlFuente}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-[var(--text-tertiary-light)] hover:text-[var(--text-primary-light)] hover:bg-[var(--bg-input)] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            onClick={onEditar}
            className="p-1.5 rounded-lg text-[var(--text-tertiary-light)] hover:text-[var(--text-primary-light)] hover:bg-[var(--bg-input)] transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onEliminar}
            className="p-1.5 rounded-lg text-[var(--text-tertiary-light)] hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente Chip ─────────────────────────────────────────────────────────

function Chip({ icon: Icon, label }: { icon: React.ElementType; label: string | number }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--bg-input)] border border-[var(--border-light)] text-[10px] font-bold text-[var(--text-secondary-light)]">
      <Icon className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}
```

---

## PASO 7 — Agregar badge de objetos en `src/app/dashboard/cerebro/conocimiento/webs/page.tsx`

**Acción:** En la lista de webs indexadas, mostrar cuántos objetos se extrajeron de cada una. Este es un cambio menor al archivo existente.

En el bloque `useEffect` que carga las webs, agregar una query paralela que cuenta objetos por `recursoOrigenId`:

```typescript
// Dentro del useEffect de webs, después del onSnapshot:
// Cargar conteo de objetos por fuente
const objetosSnap = await getDocs(
  query(
    collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.OBJETOS)
  )
);
const conteoPorFuente: Record<string, number> = {};
objetosSnap.docs.forEach(d => {
  const rid = d.data().recursoOrigenId;
  if (rid) conteoPorFuente[rid] = (conteoPorFuente[rid] || 0) + 1;
});
// Agregar el conteo a cada web
setWebs(docs.map(d => ({ ...d, usageCount: conteoPorFuente[d.id] || 0 })));
```

Y en la UI de cada web, donde actualmente muestra `Agentes: {w.usageCount}`, reemplazar por:

```tsx
{w.usageCount > 0 ? (
  <Link
    href={`/dashboard/cerebro/catalogo?fuente=${w.id}`}
    className="flex items-center gap-1 hover:text-[var(--accent-active)] transition-colors"
  >
    <LayoutGrid className="w-3 h-3" />
    {w.usageCount} objetos
  </Link>
) : (
  <span className="flex items-center gap-1">
    <LayoutGrid className="w-3 h-3" />
    0 objetos
  </span>
)}
```

---

## PASO 8 — Agregar soporte de query param `fuente` en la página del catálogo

En `CatalogoPage`, leer el query param `fuente` de la URL para pre-filtrar por origen:

```typescript
import { useSearchParams } from "next/navigation";

// Dentro del componente:
const searchParams = useSearchParams();
useEffect(() => {
  const fuente = searchParams.get('fuente');
  if (fuente) setFiltroFuente(fuente);
}, [searchParams]);
```

---

## Notas para Antigravity

### Imports necesarios (verificar que existen)
- `@anthropic-ai/sdk` — ya está en el proyecto (usado en `src/lib/ai/anthropic.ts`)
- `firebase-admin` — ya está (usado en `src/lib/firebase-admin.ts`)
- `firebase/firestore` — cliente, para `webs/page.tsx`
- Componentes UI: `Dialog`, `Select`, `Input`, `Label`, `Textarea`, `Button`, `Badge` — todos existen en `src/components/ui/`

### Variable de entorno necesaria
Agregar a `.env.local` y `.env.production`:
```
NEXT_PUBLIC_APP_URL=https://imala-vox.web.app
```
(o el dominio real del deploy)

### Sobre el FieldValue en Admin SDK
En el endpoint `parse-objects`, el `FieldValue.increment` se importa así:
```typescript
import { FieldValue } from "firebase-admin/firestore";
// Uso:
FieldValue.increment(objetosCreados)
```
No usar `adminDb.FieldValue` — no existe en la API moderna.

### Reglas de Firestore
Verificar que `firestore.rules` permite lectura/escritura en `espaciosDeTrabajo/{wsId}/objetos` para usuarios autenticados del workspace. Si hay una regla genérica que cubre todas las subcolecciones del espacio, ya está cubierto.

### No tocar
- `src/lib/ai/anthropic.ts` — dejar intacto
- `src/lib/firebase-admin.ts` — dejar intacto  
- `src/app/dashboard/cerebro/conocimiento/` — solo modificar `webs/page.tsx` con los cambios del PASO 7
- El sistema de Cloud Function existente — solo agregar la lógica de paginación mejorada indicada en PASO 4; no reescribir todo

### Orden de implementación obligatorio
1 → 2 → 3 → 5 → 6 → 7 → 8 → 4 (el PASO 4 es el más riesgoso porque toca la Cloud Function; hacerlo último cuando todo lo demás ya funciona y se puede testear el parsing con texto manual)

---

*Fin del documento. Implementar en el orden indicado.*
