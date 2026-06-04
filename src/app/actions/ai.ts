"use server";

import { genAI, MODELOS, getGeminiModel } from "@/lib/ai/gemini";
import { construirSystemPrompt } from "@/lib/ai/prompts";
import { Part } from "@google/generative-ai";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/types/firestore";
import { procesarMensajeConIA } from "@/lib/ai/engine";

// Polyfill para evitar error "DOMMatrix is not defined" en pdf-parse
if (typeof global.DOMMatrix === "undefined") {
  // @ts-ignore
  global.DOMMatrix = class DOMMatrix {};
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  attachment?: {
    name: string;
    type: string;
    base64: string;
  };
}

async function extraerTextoDeDocumento(name: string, type: string, base64: string): Promise<string> {
  const buffer = Buffer.from(base64, 'base64');
  
  if (type === "application/pdf" || name.endsWith(".pdf")) {
    const pdf = require("pdf-parse");
    const data = await pdf(buffer);
    return data.text;
  } 
  else if (type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || name.endsWith(".docx")) {
    const mammoth = require("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } 
  else if (type === "text/plain" || name.endsWith(".txt") || name.endsWith(".md") || type === "text/markdown") {
    return buffer.toString("utf-8");
  } 
  
  return "Formato de archivo no soportado para extracción de texto.";
}

/**
 * Server Action para interactuar con la IA en el Playground de pruebas.
 * No persiste mensajes en Firestore para evitar ensuciar el historial real.
 */
export async function chatPlaygroundAction(
  wsId: string,
  agenteId: string,
  userMessage: string,
  history: ChatMessage[] = [],
  attachment?: {
    name: string;
    type: string;
    base64: string;
  }
) {
  try {
    if (!wsId || !agenteId) throw new Error("Faltan parámetros de identificación.");
    
    // Obtener configuración del agente para aplicar el delay en el playground si tiene delayRespuesta
    let delayRespuesta = 0;
    const agenteDoc = await adminDb.doc(`${COLLECTIONS.ESPACIOS}/${wsId}/${COLLECTIONS.AGENTES}/${agenteId}`).get();
    if (agenteDoc.exists) {
      delayRespuesta = agenteDoc.data()?.delayRespuesta || 0;
    }

    if (delayRespuesta > 0) {
      console.log(`[PLAYGROUND-DELAY] Aplicando delay de ${delayRespuesta} segundos...`);
      await new Promise((resolve) => setTimeout(resolve, delayRespuesta * 1000));
    }

    // 1. Construir el prompt del sistema (RAG: Base de Conocimiento activa)
    const systemPrompt = await construirSystemPrompt(wsId, agenteId);

    // 2. Formatear mensajes históricos para Gemini (roles: 'user' o 'model')
    const formattedHistory = await Promise.all(
      history.map(async (msg) => {
        const parts: Part[] = [];

        if (msg.attachment) {
          const type = msg.attachment.type;
          const name = msg.attachment.name;
          const base64 = msg.attachment.base64;

          if (type.startsWith("image/") && base64) {
            let mediaType = type;
            if (mediaType === "image/jpg") {
              mediaType = "image/jpeg";
            }
            const supported = ["image/jpeg", "image/png", "image/gif", "image/webp"];
            if (!supported.includes(mediaType)) {
              mediaType = "image/jpeg";
            }

            parts.push({
              inlineData: {
                data: base64,
                mimeType: mediaType,
              },
            });
            parts.push({ text: msg.content || "Aquí está la imagen." });
          } else {
            let docText = "";
            if (base64) {
              try {
                docText = await extraerTextoDeDocumento(name, type, base64);
              } catch (e: any) {
                docText = `[Error al leer contenido de ${name}: ${e.message}]`;
              }
            }
            const textContent = docText
              ? `[Archivo adjunto: ${name}]\n--- CONTENIDO DEL ARCHIVO ---\n${docText}\n----------------------------\n\n${msg.content}`
              : msg.content;
            parts.push({ text: textContent });
          }
        } else {
          parts.push({ text: msg.content });
        }

        return {
          role: (msg.role === "user" ? "user" : "model") as "user" | "model",
          parts
        };
      })
    );

    // 3. Formatear el contenido actual del usuario
    const currentParts: Part[] = [];
    let userMessageConsolidated: string | undefined = undefined;

    if (attachment) {
      if (attachment.type.startsWith("image/")) {
        let mediaType = attachment.type;
        if (mediaType === "image/jpg") {
          mediaType = "image/jpeg";
        }
        const supported = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        if (!supported.includes(mediaType)) {
          mediaType = "image/jpeg";
        }

        currentParts.push({
          inlineData: {
            data: attachment.base64,
            mimeType: mediaType,
          },
        });
        currentParts.push({ text: userMessage || "Aquí está la imagen." });
      } else {
        let docText = "";
        try {
          docText = await extraerTextoDeDocumento(attachment.name, attachment.type, attachment.base64);
        } catch (e: any) {
          docText = `[Error al extraer texto: ${e.message}]`;
        }
        userMessageConsolidated = `[Archivo adjunto: ${attachment.name}]\n--- CONTENIDO DEL ARCHIVO ---\n${docText}\n----------------------------\n\n${userMessage}`;
        currentParts.push({
          text: userMessageConsolidated,
        });
      }
    } else {
      currentParts.push({ text: userMessage });
    }

    // 4. Inicializar modelo de Gemini con prompt de sistema
    const model = getGeminiModel(
      MODELOS.AGENTE,
      systemPrompt
    );

    const chat = model.startChat({
      history: formattedHistory,
    });

    const result = await chat.sendMessage(currentParts);
    const reply = result.response.text();

    return {
      success: true,
      reply,
      userMessageConsolidated
    };

  } catch (error: any) {
    console.error("Error en Chat Playground:", error);
    return {
      success: false,
      error: error.message || "Error al procesar la respuesta de la IA"
    };
  }
}

/**
 * Server Action para optimizar y estructurar las instrucciones de un agente.
 */
export async function mejorarInstruccionesAction(instruccionesActuales: string) {
  try {
    if (!instruccionesActuales || instruccionesActuales.trim().length < 5) {
      throw new Error("El texto es demasiado corto para optimizarlo.");
    }

    const systemPrompt = `
      Eres un experto en Prompt Engineering y Arquitectura de Agentes IA.
      Tu tarea es tomar las instrucciones crudas de un usuario para su agente de IA y transformarlas en un PROMPT MAESTRO de alto rendimiento.

      REGLAS DE OPTIMIZACIÓN:
      1. ESTILO PROFESIONAL: Usa un lenguaje claro, imperativo y profesional.
      2. ESTRUCTURA: Organiza el contenido en secciones claras usando Markdown (## CONTEXTO, ## REGLAS, ## FORMATO DE RESPUESTA, etc.).
      3. ELIMINA AMBIGÜEDAD: Si el usuario dice "ayuda con ventas", transfórmalo en "Tu misión principal es asesorar al cliente para cerrar ventas, resolviendo dudas de forma persuasiva".
      4. MANTÉN LA ESENCIA: No inventes información que el usuario no proporcionó, solo mejora CÓMO se dice.
      5. TEXTO PLANO: No uses negritas (**) ni cursivas. Devuelve solo texto plano estructurado.
      6. IDIOMA: Responde siempre en el mismo idioma en el que recibas las instrucciones.

      Tu respuesta debe ser exclusivamente el nuevo set de instrucciones optimizado.
    `.trim();

    const model = getGeminiModel(MODELOS.AGENTE, systemPrompt);
    const response = await model.generateContent(`Optimiza estas instrucciones:\n\n${instruccionesActuales}`);
    const optimizedText = response.response.text();

    return {
      success: true,
      reply: optimizedText
    };

  } catch (error: any) {
    console.error("Error al optimizar instrucciones:", error);
    return {
      success: false,
      error: error.message || "Error al conectar con la IA"
    };
  }
}

/**
 * Server Action para solicitar una sugerencia de la IA manualmente desde el CRM.
 */
export async function pedirSugerenciaIAAction(wsId: string, conversacionId: string) {
  try {
    if (!wsId || !conversacionId) throw new Error("Parámetros insuficientes.");

    // 1. Obtener datos de la conversación
    const convRef = adminDb
      .collection(COLLECTIONS.ESPACIOS).doc(wsId)
      .collection(COLLECTIONS.CONVERSACIONES).doc(conversacionId);
    
    const convSnap = await convRef.get();
    if (!convSnap.exists) throw new Error("Conversación no encontrada.");
    
    const convData = convSnap.data()!;

    // 2. Obtener historial reciente para contexto
    const historialSnap = await convRef
      .collection(COLLECTIONS.MENSAJES)
      .orderBy("creadoEl", "desc")
      .limit(30)
      .get();
    
    const messages = historialSnap.docs.reverse();
    if (messages.length === 0) throw new Error("No hay mensajes previos para analizar.");

    // Identificar el último mensaje del usuario como el disparador
    const lastUserMsg = messages.filter(m => m.data().from === 'user').pop();
    const textoUsuario = lastUserMsg?.data().text || messages[messages.length - 1].data().text;

    // Preparar historial excluyendo el mensaje disparador si es posible
    const historial = messages
      .filter(m => m.id !== lastUserMsg?.id)
      .map(d => ({
        from: d.data().from,
        text: d.data().text
      }));

    let agenteId = convData.agenteId;

    // Si la conversación no tiene agente, buscamos el del canal
    if (!agenteId && convData.canalId) {
      const canalSnap = await adminDb
        .collection(COLLECTIONS.ESPACIOS).doc(wsId)
        .collection(COLLECTIONS.CANALES).doc(convData.canalId)
        .get();
      
      if (canalSnap.exists) {
        agenteId = canalSnap.data()?.agenteId;
      }
    }

    if (!agenteId) {
      throw new Error("Este chat no tiene un agente asignado. Por favor, configura un agente en los ajustes del canal.");
    }

    // 3. Disparar el motor de IA en modo copiloto (esto actualizará 'sugerenciaIA' en Firestore)
    await procesarMensajeConIA({
      wsId,
      agenteId,
      conversacionId,
      textoUsuario,
      historial,
      isCopiloto: true,
      contactoNombre: convData.contactoNombre || "Cliente"
    });

    return { success: true };

  } catch (error: any) {
    console.error("Error al pedir sugerencia IA:", error);
    return { success: false, error: error.message || "Error al generar sugerencia" };
  }
}
