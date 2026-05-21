"use server";

import { anthropic, MODELOS } from "@/lib/ai/anthropic";
import { construirSystemPrompt } from "@/lib/ai/prompts";
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

    // 1. Construir el prompt del sistema (RAG: Base de Conocimiento activa)
    const systemPrompt = await construirSystemPrompt(wsId, agenteId);

    // 2. Formatear mensajes históricos
    const formattedHistory = await Promise.all(
      history.map(async (msg) => {
        if (msg.attachment) {
          const type = msg.attachment.type;
          const name = msg.attachment.name;
          const base64 = msg.attachment.base64;

          if (type.startsWith("image/")) {
            return {
              role: msg.role,
              content: [
                {
                  type: "image" as const,
                  source: {
                    type: "base64" as const,
                    media_type: type as any,
                    data: base64,
                  },
                },
                {
                  type: "text" as const,
                  text: msg.content || "Aquí está la imagen.",
                },
              ],
            };
          } else {
            let docText = "";
            try {
              docText = await extraerTextoDeDocumento(name, type, base64);
            } catch (e: any) {
              docText = `[Error al leer contenido de ${name}: ${e.message}]`;
            }
            return {
              role: msg.role,
              content: `[Archivo adjunto: ${name}]\n--- CONTENIDO DEL ARCHIVO ---\n${docText}\n----------------------------\n\n${msg.content}`,
            };
          }
        }
        return {
          role: msg.role,
          content: msg.content,
        };
      })
    );

    let currentContent: any = userMessage;

    if (attachment) {
      if (attachment.type.startsWith("image/")) {
        currentContent = [
          {
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: attachment.type as any,
              data: attachment.base64,
            },
          },
          {
            type: "text" as const,
            text: userMessage || "Aquí está la imagen.",
          },
        ];
      } else {
        let docText = "";
        try {
          docText = await extraerTextoDeDocumento(attachment.name, attachment.type, attachment.base64);
        } catch (e: any) {
          docText = `[Error al extraer texto: ${e.message}]`;
        }
        currentContent = `[Archivo adjunto: ${attachment.name}]\n--- CONTENIDO DEL ARCHIVO ---\n${docText}\n----------------------------\n\n${userMessage}`;
      }
    }

    // 3. Llamada a Anthropic Sonnet 3.5 con Prompt Caching
    const response = await anthropic.messages.create({
      model: MODELOS.AGENTE,
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: systemPrompt,
          // @ts-ignore
          cache_control: { type: "ephemeral" }
        }
      ],
      messages: [
        ...formattedHistory,
        { role: "user", content: currentContent }
      ]
    });

    const reply = (response.content[0] as any).text;

    return {
      success: true,
      reply
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

    const response = await anthropic.messages.create({
      model: MODELOS.AGENTE,
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        { role: "user", content: `Optimiza estas instrucciones:\n\n${instruccionesActuales}` }
      ]
    });

    const optimizedText = (response.content[0] as any).text;

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
