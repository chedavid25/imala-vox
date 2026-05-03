import { GoogleGenerativeAI } from "@google/generative-ai";
import * as admin from "firebase-admin";

const PARSE_SYSTEM_PROMPT = `Eres un extractor de datos estructurados para sitios web inmobiliarios.
Extrae OBJETOS del catálogo: cada propiedad individual con todos sus datos.

REGLAS:
- Responde ÚNICAMENTE con JSON válido.
- Si un campo no está disponible, usa null.
- Máximo 40 objetos.
- Para RE/MAX: busca el ID de propiedad (MLS) en el texto.

Formato JSON:
{
  "tipo_catalogo": "propiedad",
  "objetos": [
    {
      "titulo": string,
      "precio": number | null,
      "moneda": "ARS" | "USD" | "EUR",
      "descripcion": string,
      "urlFuente": string | null,
      "caracteristicas": {
        "mls_id": string | null,
        "tipo": string,
        "operacion": "venta" | "alquiler",
        "m2": number | null,
        "dormitorios": number | null,
        "barrio": string | null
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
          ...obj,
          tipo: 'propiedad',
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
