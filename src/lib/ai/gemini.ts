import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
export const genAI = new GoogleGenerativeAI(apiKey);

export const MODELOS = {
  CLASIFICADOR: "gemini-2.5-flash-lite",   // Clasificación de intención — tarea simple, alto volumen
  AGENTE: "gemini-3-flash-preview",         // Respuesta del agente — tarea principal, necesita calidad
  EXTRACTOR: "gemini-2.5-flash-lite",       // Resumen de escalada — tarea simple
};

/**
 * Helper para obtener el modelo con configuración de seguridad relajada para CRM.
 * Usamos los Enums oficiales del SDK para evitar errores de tipos.
 */
export function getGeminiModel(modelName: string, systemInstruction?: string) {
  return genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: systemInstruction,
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ],
  });
}
