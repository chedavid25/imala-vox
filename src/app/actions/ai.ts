"use server";

import { anthropic, MODELOS } from "@/lib/ai/anthropic";
import { construirSystemPrompt } from "@/lib/ai/prompts";

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
