import { anthropic, MODELOS } from "./anthropic";
import { construirSystemPrompt } from "./prompts";
import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/types/firestore";

interface MensajeProcesar {
  wsId: string;
  agenteId: string;
  conversacionId: string;
  textoUsuario: string;
  historial?: any[]; // Últimos mensajes para contexto
}

/**
 * Motor central de procesamiento de mensajes de Imalá Vox
 */
export async function procesarMensajeConIA({
  wsId,
  agenteId,
  conversacionId,
  textoUsuario,
  historial = []
}: MensajeProcesar) {
  try {
    // 1. Clasificación de Intención (Modelo Haiku 4.5 - Rápido y barato)
    const clasificacion = await anthropic.messages.create({
      model: MODELOS.CLASIFICADOR,
      max_tokens: 100,
      system: "Eres un clasificador de intenciones para un CRM. Responde solo con una palabra que describa la intención (EJ: CONSULTA, QUEJA, AGENDAMIENTO, SPAM, OTRO) y un nivel de urgencia del 1 al 5.",
      messages: [{ role: "user", content: textoUsuario }]
    });

    console.log("Clasificación IA:", (clasificacion.content[0] as any).text);

    // 2. Construir System Prompt Dinámico (RAG)
    const systemPrompt = await construirSystemPrompt(wsId, agenteId);

    // 3. Generar Respuesta (Modelo Sonnet 4.6 - Inteligente y preciso)
    // Implementamos PROMPT CACHING para reducir costos en el system prompt voluminoso
    const response = await anthropic.messages.create({
      model: MODELOS.AGENTE,
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: systemPrompt,
          // @ts-ignore - Cache control es una feature avanzada del SDK de abril 2026
          cache_control: { type: "ephemeral" }
        }
      ],
      messages: [
        ...historial.map(m => ({
          role: (m.from === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: m.text as string
        })),
        { role: "user", content: textoUsuario }
      ]
    });

    const respuestaTexto = (response.content[0] as any).text;

    // 4. Registrar respuesta en Firestore (mensaje de 'bot')
    const mensajesRef = collection(db, COLLECTIONS.ESPACIOS, wsId, COLLECTIONS.CONVERSACIONES, conversacionId, COLLECTIONS.MENSAJES);
    
    await addDoc(mensajesRef, {
      text: respuestaTexto,
      from: 'bot',
      creadoEl: Timestamp.now(),
      visto: false,
      metadata: {
        model: MODELOS.AGENTE,
        intent: (clasificacion.content[0] as any).text
      }
    });

    return respuestaTexto;

  } catch (error) {
    console.error("Error en procesarMensajeConIA:", error);
    throw error;
  }
}
