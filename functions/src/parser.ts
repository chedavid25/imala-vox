import { GoogleGenerativeAI } from "@google/generative-ai";
import * as admin from "firebase-admin";

const PARSE_SYSTEM_PROMPT = `Eres un extractor de datos estructurados para sitios web de propiedades e inmuebles.
Extrae CADA propiedad individual con todos sus datos disponibles. El texto puede ser markdown, HTML o texto plano.

REGLAS:
- Responde ÚNICAMENTE con JSON válido, sin texto adicional.
- Si un campo no está disponible, usa null. NUNCA inventes datos.
- Máximo 40 objetos.
- Para precios: extrae solo el número (ej: "USD 120.000" → precio: 120000, moneda: "USD").
- Si dice "Consultar" o no hay precio visible, usa precio: null.
- Para fotos: extrae URLs de imágenes de las propiedades (busca src de img, og:image, o URLs de CDN de fotos). Máximo 3 URLs por propiedad.
- Para tipo de propiedad usa: "casa", "departamento", "local", "oficina", "terreno", "campo", "otro".
- Para operacion usa: "venta" o "alquiler".

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
