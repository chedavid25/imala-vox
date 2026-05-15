import { GoogleGenerativeAI } from "@google/generative-ai";
import * as admin from "firebase-admin";

const PARSE_SYSTEM_PROMPT = `Eres un extractor de datos estructurados para sitios web de propiedades e inmuebles.
Extrae CADA propiedad individual con todos sus datos disponibles. El texto puede ser markdown, HTML, JSON o texto plano.

REGLAS GENERALES:
- Responde ÚNICAMENTE con JSON válido, sin texto adicional ni bloques de código.
- Si un campo no está disponible, usa null. NUNCA inventes datos.
- Máximo 40 objetos.

REGLAS DE PRECIOS (MUY IMPORTANTE):
- Si ves "PRECIO_VALOR: 155000", ese es el precio exacto.
- El precio puede aparecer como: "155.000 USD", "USD 155.000", "$ 155.000".
- Argentina usa PUNTO como separador de miles y COMA como decimal en textos:
  "259.000" en texto argentino → precio: 259000
- Si no hay etiqueta, buscá el primer número grande seguido de "USD" o "Dólares".
- moneda: "USD" si dice USD/dólares, "ARS" si dice ARS/pesos.

REGLAS DE MEDIDAS:
- "m² totales", "m2 totales", "superficie total" → campo m2
- "m² cubiertos", "m2 cubiertos", "superficie cubierta", "SUPERFICIE_CUBIERTA" → campo m2_cubiertos
- "m² terreno", "m2 terreno", "superficie terreno" → m2_terreno (o m2 si no hay otro)
- Buscá siempre el símbolo "m²" o "m2". Si ves "172 m² totales", m2 es 172.
- Ambientes: 4, Dormitorios: 3, Baños: 2, CANTIDAD_BAÑOS: 2.
- IMPORTANTE: El campo de baños en el JSON debe llamarse "banios" (sin ñ).
- Si ves "52 años antigüedad", ignoralo (no es medida).

EJEMPLOS DE EXTRACCIÓN (RE/MAX):
- "155.000 USD ... 172 m² totales 172 m² cubiertos 5 ambientes 2 baños 4 dormitorios"
  -> precio: 155000, moneda: "USD", m2: 172, m2_cubiertos: 172, ambientes: 5, banios: 2, dormitorios: 4
- "USD 59.000 ... 600 m² terreno"
  -> precio: 59000, moneda: "USD", m2: 600 (terreno se mapea a m2 si no hay otro)

REGLAS DE FOTOS:
- Extrae URLs completas de imágenes de las propiedades.
- Si ves líneas como "Fotos: url1 | url2 | url3", extraé esas URLs.
- Para RE/MAX: si ves paths como "listings/UUID/UUID.jpg" sin dominio, construí la URL completa como "https://d1acdg20u0pmxj.cloudfront.net/listings/UUID/UUID.jpg"
- Ignorá imágenes de logos, avatares, íconos o SVGs del sitio.
- Máximo 3 URLs por propiedad.

REGLAS DE TIPO:
- tipo: "casa", "departamento", "local", "oficina", "terreno", "campo", "otro"
- operacion: "venta" o "alquiler"

Formato JSON de respuesta:
{
  "tipo_catalogo": "propiedad",
  "objetos": [
    {
      "titulo": string,
      "precio": number | null,
      "moneda": "ARS" | "USD" | "EUR",
      "descripcion": string,
      "urlFuente": string | null,
      "fotos": string[],
      "caracteristicas": {
        "mls_id": string | null,
        "tipo": string,
        "operacion": "venta" | "alquiler",
        "ambientes": number | null,
        "dormitorios": number | null,
        "banios": number | null,
        "m2": number | null,
        "m2_cubiertos": number | null,
        "expensas": number | null,
        "barrio": string | null,
        "localidad": string | null
      }
    }
  ]
}`;

export async function ejecutarParsingObjetos(params: {
  rawText: string;
  sourceUrl: string;
  wsId: string;
  recursoId: string;
}) {
  const { rawText, sourceUrl, wsId, recursoId } = params;
  const db = admin.firestore();
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[Parser] Error: GEMINI_API_KEY no definida.");
    throw new Error("API Key de Gemini no configurada");
  }

  console.log(`[Parser] Iniciando Gemini 2.5 Flash para ${wsId}...`);
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction: PARSE_SYSTEM_PROMPT });
  
  const textToProcess = rawText.slice(0, 400000);
  
  try {
    const result = await model.generateContent(`Texto a procesar:\n${textToProcess}`);
    const responseText = result.response.text();
    console.log(`[Parser] Respuesta recibida (${responseText.length} bytes)`);
    console.log(`[Parser] Muestra Gemini: ${responseText.slice(0, 600)}`);

    const cleanedJson = responseText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanedJson);
    const objetos = parsed.objetos || [];
    
    console.log(`[Parser] Procesando ${objetos.length} objetos...`);

    if (objetos.length > 0) {
      const batch = db.batch();
      
      // Borrar anteriores
      const prevs = await db.collection(`espaciosDeTrabajo/${wsId}/objetos`)
        .where("recursoOrigenId", "==", recursoId).get();
      prevs.docs.forEach(d => batch.delete(d.ref));

      for (const obj of objetos.slice(0, 40)) {
        const ref = db.collection(`espaciosDeTrabajo/${wsId}/objetos`).doc();
        batch.set(ref, {
          titulo: obj.titulo || '',
          precio: obj.precio ?? null,
          moneda: obj.moneda || 'USD',
          descripcion: obj.descripcion || '',
          urlFuente: obj.urlFuente ?? null,
          fotos: Array.isArray(obj.fotos) ? obj.fotos.filter(Boolean).slice(0, 3) : [],
          tipo: 'propiedad',
          caracteristicas: {
            mls_id: obj.caracteristicas?.mls_id ?? null,
            tipo: obj.caracteristicas?.tipo || 'otro',
            operacion: obj.caracteristicas?.operacion || 'venta',
            ambientes: obj.caracteristicas?.ambientes ?? null,
            dormitorios: obj.caracteristicas?.dormitorios ?? null,
            banios: obj.caracteristicas?.banios ?? null,
            m2: obj.caracteristicas?.m2 ?? null,
            m2_cubiertos: obj.caracteristicas?.m2_cubiertos ?? null,
            expensas: obj.caracteristicas?.expensas ?? null,
            barrio: obj.caracteristicas?.barrio ?? null,
            localidad: obj.caracteristicas?.localidad ?? null,
          },
          urlOriginWeb: sourceUrl,
          recursoOrigenId: recursoId,
          estado: 'disponible',
          creadoEl: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      await batch.commit();
      console.log(`[Parser] Batch completado exitosamente.`);
    }

    return { objetosCreados: objetos.length };
  } catch (err: any) {
    console.error("[Parser] Error crítico en Gemini o Firestore:", err);
    throw err;
  }
}
