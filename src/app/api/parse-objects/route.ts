import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/types/firestore";
import { Timestamp, FieldValue } from "firebase-admin/firestore";

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
      model: "claude-3-5-sonnet-20241022",
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
        "uso.objectCount": FieldValue.increment(objetosCreados)
      }).catch((e) => console.error("[ParseObjects] Error actualizando uso:", e));

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
