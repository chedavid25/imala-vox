import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
export const genAI = new GoogleGenerativeAI(apiKey);

export const MODELOS = {
  CLASIFICADOR: "gemini-2.5-flash-lite", // Ultra económico para tareas simples
  AGENTE: "gemini-3-flash",              // El más rápido y capaz de nueva generación
  EXTRACTOR: "gemini-2.5-flash",         // Balanceado para RAG y extracción
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
