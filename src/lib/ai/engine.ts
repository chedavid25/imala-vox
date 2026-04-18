import { anthropic, MODELOS } from "./anthropic";
import { construirSystemPrompt } from "./prompts";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/types/firestore";

interface MensajeProcesar {
  wsId: string;
  agenteId: string;
  conversacionId: string;
  textoUsuario: string;
  historial?: any[]; // Últimos mensajes para contexto
  isCopiloto?: boolean;
  contactoNombre?: string;
}

/**
 * Motor central de procesamiento de mensajes de Imalá Vox
 */
export async function procesarMensajeConIA({
  wsId,
  agenteId,
  conversacionId,
  textoUsuario,
  historial = [],
  isCopiloto = false,
  contactoNombre = "Desconocido"
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
        },
        {
          type: "text",
          text: `\n\n--- INFORMACIÓN EN TIEMPO REAL ---\nEl cliente con el que estás hablando en este momento se llama: ${contactoNombre}. Dirígete por su nombre si es apropiado.`
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

    let respuestaTexto = (response.content[0] as any).text;

    // Extraer y ocultar etiquetas [ETIQUETA: Nombre]
    const etiquetasAplicadas: string[] = [];
    const etiquetaRegex = /\[ETIQUETA:\s*(.*?)\]/gi;
    
    respuestaTexto = respuestaTexto.replace(etiquetaRegex, (match: string, nombre: string) => {
      etiquetasAplicadas.push(nombre.trim());
      return ""; // Lo quitamos del texto que verá el cliente
    }).trim();

    // Extraer acción de escalada [ACCION: ESCALAR]
    const escalaRegex = /\[ACCION:\s*ESCALAR\]/gi;
    let requiereEscalada = false;
    respuestaTexto = respuestaTexto.replace(escalaRegex, () => {
      requiereEscalada = true;
      return "";
    }).trim();

    // 4. Registrar respuesta en Firestore (mensaje de 'bot')
    if (isCopiloto) {
      const convRef = adminDb
        .collection(COLLECTIONS.ESPACIOS).doc(wsId)
        .collection(COLLECTIONS.CONVERSACIONES).doc(conversacionId);
        
      await convRef.update({ sugerenciaIA: respuestaTexto });
      console.log(`[COPILOTO] Sugerencia guardada para conv ${conversacionId}`);
    } else {
      const mensajesRef = adminDb
        .collection(COLLECTIONS.ESPACIOS).doc(wsId)
        .collection(COLLECTIONS.CONVERSACIONES).doc(conversacionId)
        .collection(COLLECTIONS.MENSAJES);
      
      await mensajesRef.add({
        text: respuestaTexto,
        from: 'bot',
        creadoEl: Timestamp.now(),
        visto: false,
        metadata: {
          model: MODELOS.AGENTE,
          intent: (clasificacion.content[0] as any).text,
          etiquetasIA: etiquetasAplicadas
        }
      });
    }

    // 4.5 Persistir etiquetas en el contacto si se detectaron
    if (etiquetasAplicadas.length > 0) {
      try {
        const convSnap = await adminDb.collection(COLLECTIONS.ESPACIOS).doc(wsId).collection(COLLECTIONS.CONVERSACIONES).doc(conversacionId).get();
        const contactId = convSnap.data()?.contactId;

        if (contactId) {
          const contactRef = adminDb.collection(COLLECTIONS.ESPACIOS).doc(wsId).collection(COLLECTIONS.CONTACTOS).doc(contactId);
          const contactSnap = await contactRef.get();
          const contactData = contactSnap.data();
          
          if (contactSnap.exists) {
            // Obtener master tags para mapear nombres -> IDs y categorías
            const [tagsSnap, catsSnap] = await Promise.all([
              adminDb.collection(COLLECTIONS.ESPACIOS).doc(wsId).collection(COLLECTIONS.ETIQUETAS_CRM).get(),
              adminDb.collection(COLLECTIONS.ESPACIOS).doc(wsId).collection(COLLECTIONS.CATEGORIAS_CRM).get()
            ]);

            const allTags = tagsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            const allCats = catsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            let currentTags = contactData?.etiquetas || [];

            for (const tagName of etiquetasAplicadas) {
              const masterTag = allTags.find(t => (t as any).nombre.toLowerCase() === tagName.toLowerCase());
              if (!masterTag) continue;

              const cat = allCats.find(c => c.id === (masterTag as any).categoriaId);
              
              if ((cat as any)?.tipo === 'exclusiva') {
                // Lógica de semáforo: quitar otras de la misma categoría
                const otherTagsInCat = allTags.filter(t => t.id !== masterTag.id && (t as any).categoriaId === cat!.id).map(t => t.id);
                currentTags = currentTags.filter((tId: string) => !otherTagsInCat.includes(tId));
              }

              if (!currentTags.includes(masterTag.id)) {
                currentTags.push(masterTag.id);
              }
            }

            await contactRef.update({ etiquetas: currentTags });
            console.log(`[IA-TAGS] Etiquetas aplicadas al contacto ${contactId}: ${etiquetasAplicadas.join(", ")}`);
          }
        }
      } catch (err) {
        console.error("Error aplicando etiquetas IA al contacto:", err);
      }
    }

    // 5. Manejar Escalada (Handoff a humano)
    if (requiereEscalada) {
      try {
        const resumenResponse = await anthropic.messages.create({
          model: MODELOS.CLASIFICADOR,
          max_tokens: 150,
          system: "Eres un asistente interno. El cliente acaba de ser derivado a un operador humano. Resume en 1 o 2 líneas el estado de la situación o el pedido del cliente para que el operador humano sepa de qué trata al tomar el chat. Si el cliente dio horarios de contacto o teléfono, inclúyelos.",
          messages: [{ role: "user", content: `Consulta del cliente: "${textoUsuario}"\nRespuesta de derivación de la IA: "${respuestaTexto}"\n\nExtrae el resumen corto:` }]
        });
        
        const resumenTexto = (resumenResponse.content[0] as any).text;

        const mensajesRef = adminDb
          .collection(COLLECTIONS.ESPACIOS).doc(wsId)
          .collection(COLLECTIONS.CONVERSACIONES).doc(conversacionId)
          .collection(COLLECTIONS.MENSAJES);
          
        await mensajesRef.add({
          text: `🤖 **Derivación a Humano**\n${resumenTexto}`,
          from: 'system',
          creadoEl: Timestamp.now(),
          visto: false,
          metadata: { isInternalNote: true }
        });

        const convRef = adminDb
          .collection(COLLECTIONS.ESPACIOS).doc(wsId)
          .collection(COLLECTIONS.CONVERSACIONES).doc(conversacionId);
          
        await convRef.update({
          modoIA: 'copiloto', // Detiene la respuesta automática
          necesitaHumano: true
        });
        console.log(`[ESCALADA] Conversación ${conversacionId} escalada a humano exitosamente.`);
      } catch (err) {
        console.error("Error al escalar a humano:", err);
      }
    }

    return respuestaTexto;

  } catch (error) {
    console.error("Error en procesarMensajeConIA:", error);
    throw error;
  }
}
