"use server";

import { anthropic, MODELOS } from "@/lib/ai/anthropic";
import { construirSystemPrompt } from "@/lib/ai/prompts";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/types/firestore";
import { procesarMensajeConIA } from "@/lib/ai/engine";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Server Action para interactuar con la IA en el Playground de pruebas.
 * No persiste mensajes en Firestore para evitar ensuciar el historial real.
 */
export async function chatPlaygroundAction(
  wsId: string,
  agenteId: string,
  userMessage: string,
  history: ChatMessage[] = []
) {
  try {
    if (!wsId || !agenteId) throw new Error("Faltan parámetros de identificación.");

    // 1. Construir el prompt del sistema (RAG: Base de Conocimiento activa)
    const systemPrompt = await construirSystemPrompt(wsId, agenteId);

    // DEBUG: Ver qué está leyendo realmente el agente
    console.log("--- DEBUG SYSTEM PROMPT ---");
    console.log(systemPrompt);
    console.log("----------------------------");

    // 2. Llamada a Anthropic Sonnet 3.5 con Prompt Caching
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
        ...history,
        { role: "user", content: userMessage }
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

    // 3. Disparar el motor de IA en modo copiloto (esto actualizará 'sugerenciaIA' en Firestore)
    await procesarMensajeConIA({
      wsId,
      agenteId: convData.agenteId,
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
