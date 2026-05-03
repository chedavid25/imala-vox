import * as admin from "firebase-admin";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const MODELO_CLASIFICADOR = "claude-haiku-4-5-20251001";
const MODELO_AGENTE = "claude-sonnet-4-6";

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT BUILDER — versión Functions (usa Admin SDK directamente)
// ─────────────────────────────────────────────────────────────────────────────
export async function construirSystemPromptAdmin(wsId: string, agenteId: string): Promise<string> {
  const db = admin.firestore();

  // 1. Datos del agente
  const agenteSnap = await db.doc(`espaciosDeTrabajo/${wsId}/agentes/${agenteId}`).get();
  if (!agenteSnap.exists) throw new Error("Agente no encontrado");
  const agente = agenteSnap.data()!;

  // 2. Recursos activos para este agente
  const activosSnap = await db
    .collection(`espaciosDeTrabajo/${wsId}/agentes/${agenteId}/conocimientoActivo`)
    .where("activo", "==", true)
    .get();

  // 3. Cargar contenido (getAll es más eficiente que N parallel gets)
  let recursosValidos: admin.firestore.DocumentData[] = [];
  if (activosSnap.docs.length > 0) {
    const refs = activosSnap.docs.map(d =>
      db.doc(`espaciosDeTrabajo/${wsId}/baseConocimiento/${d.data().recursoId || d.id}`)
    );
    const snaps = await db.getAll(...refs);
    recursosValidos = snaps.filter(s => s.exists).map(s => ({ ...s.data(), id: s.id }));
  }

  const conocimiento = recursosValidos.filter(r => r.tipo !== "recurso");
  const multimedia = recursosValidos.filter(r => r.tipo === "recurso");

  // 4. Etiquetas
  const etiquetasSnap = await db
    .collection(`espaciosDeTrabajo/${wsId}/agentes/${agenteId}/etiquetasAgente`)
    .where("activa", "==", true)
    .get();

  // 5. Catálogo de objetos (aumentamos un poco el límite y sumamos descripción)
  const objetosSnap = await db
    .collection(`espaciosDeTrabajo/${wsId}/objetos`)
    .where("estado", "==", "disponible")
    .limit(50)
    .get();

  return `
## IDENTIDAD Y ROL
Tú eres el agente inteligente de atención de este negocio.
Tu rol: ${agente.rolAgente}
Tu público: ${agente.rolPublico}

## INSTRUCCIONES ESPECÍFICAS
${agente.instrucciones}

## BASE DE CONOCIMIENTO
${conocimiento.length > 0
  ? conocimiento.map((r: any) => `### ${r.titulo}\n${r.contenidoTexto}`).join("\n\n---\n\n")
  : "No hay documentos de conocimiento cargados aún."}

## RECURSOS QUE PUEDES ENVIAR AL CLIENTE
${multimedia.length > 0
  ? multimedia.map((r: any) => `- "${r.titulo}": ${r.descripcion}`).join("\n")
  : "No hay recursos multimedia disponibles."}

## CATÁLOGO DE OBJETOS/PROPIEDADES DISPONIBLES
${objetosSnap.docs.length > 0
  ? objetosSnap.docs.map(o => {
      const d = o.data();
      const c = d.caracteristicas || {};
      const specs = d.tipo === 'propiedad' 
        ? `${c.tipo || ''} ${c.operacion || ''} en ${c.barrio || c.localidad || ''}. ${c.dormitorios || 0} dorm, ${c.m2 || 0}m2.`
        : `${c.marca || ''} ${c.categoria || ''}`;
      
      return `- ${d.titulo} | ${specs} | Precio: ${d.moneda || 'ARS'} ${d.precio} | Link: ${d.urlFuente || 'N/A'} | Descripción: ${d.descripcion || 'Sin descripción'}`;
    }).join("\n")
  : "No hay objetos en el catálogo actualmente."}

## ETIQUETAS QUE PUEDES AUTO-APLICAR
Si detectas alguna de estas situaciones, incluye al final de tu respuesta: [ETIQUETA: Nombre]
${etiquetasSnap.docs.length > 0
  ? etiquetasSnap.docs.map(e => `- "${e.data().nombre}": ${e.data().instruccionIA}`).join("\n")
  : "No hay etiquetas configuradas."}

## REGLAS GLOBALES DE CONDUCTA
- Responde siempre en el mismo idioma que el cliente.
- Sé breve, profesional y directo.
- NO uses negritas (**) ni asteriscos en tus respuestas. Solo texto plano.
- Si no tienes la información exacta, NO LA INVENTES. Si el usuario pregunta por disponibilidad, precios o busca algo específico, utiliza SIEMPRE los datos del catálogo de abajo. Sé flexible con los términos (si busca una "casa" y tenés un "departamento", menciónalo como opción). No digas que no tenés algo sin antes revisar exhaustivamente esta lista.
${agente.strictMode
  ? "- MODO ESTRICTO: Solo usa información de la BASE DE CONOCIMIENTO. Si no está allí, dice que consultarás con un asesor."
  : "- Si la info no está en el conocimiento, usa el sentido común pero aclara que es una respuesta general."}
- Si el cliente pide hablar con un humano más de una vez, escala amablemente.
`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// MOTOR DE IA — procesa y genera respuesta
// ─────────────────────────────────────────────────────────────────────────────
export async function procesarConIA(params: {
  wsId: string;
  agenteId: string;
  conversacionId: string;
  textoUsuario: string;
  historialUltimos: { from: string; text: string }[];
}): Promise<string> {
  const { wsId, agenteId, conversacionId, textoUsuario, historialUltimos } = params;
  const db = admin.firestore();

  // 1. Clasificar intención (Haiku - barato)
  const clasificacion = await anthropic.messages.create({
    model: MODELO_CLASIFICADOR,
    max_tokens: 100,
    system: `Eres un clasificador de intenciones experto para un sistema de atención al cliente.
Analiza el mensaje del usuario y responde estrictamente en este formato JSON:
{
  "categoria": "CONSULTA" | "QUEJA" | "AGENDAMIENTO" | "SPAM" | "OTRO",
  "urgencia": 1-5,
  "resumen": "breve resumen de 5 palabras"
}`,
    messages: [{ role: "user", content: textoUsuario }]
  });
  
  let intencion = "OTRO";
  let metadataClasificacion = {};
  try {
    const content = (clasificacion.content[0] as any).text;
    metadataClasificacion = JSON.parse(content);
    intencion = (metadataClasificacion as any).categoria;
  } catch (e) {
    console.error("Error parseando clasificación:", e);
  }


  // 2. Construir System Prompt (RAG con la base de conocimiento)
  const systemPrompt = await construirSystemPromptAdmin(wsId, agenteId);

  // 3. Generar respuesta (Sonnet con Prompt Caching)
  const mensajes = [
    ...historialUltimos.map(m => ({
      role: (m.from === "user" ? "user" : "assistant") as "user" | "assistant",
      content: m.text
    })),
    { role: "user" as const, content: textoUsuario }
  ];

  const response = await anthropic.messages.create({
    model: MODELO_AGENTE,
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: systemPrompt,
        // @ts-ignore - Prompt caching
        cache_control: { type: "ephemeral" }
      }
    ],
    messages: mensajes
  });

  const respuestaTexto = (response.content[0] as any).text;

  // 4. Guardar respuesta del bot en Firestore
  await db
    .collection(`espaciosDeTrabajo/${wsId}/conversaciones/${conversacionId}/mensajes`)
    .add({
      text: respuestaTexto,
      from: "bot",
      creadoEl: admin.firestore.Timestamp.now(),
      visto: false,
      metadata: { 
        model: MODELO_AGENTE, 
        intent: intencion,
        ...metadataClasificacion
      }
    });

  // 5. Actualizar conversación
  await db.doc(`espaciosDeTrabajo/${wsId}/conversaciones/${conversacionId}`).update({
    ultimoMensaje: respuestaTexto,
    ultimaActividad: admin.firestore.FieldValue.serverTimestamp(),
    unreadCount: admin.firestore.FieldValue.increment(1)
  });

  return respuestaTexto;
}

// ─────────────────────────────────────────────────────────────────────────────
// WHATSAPP API — envía texto o multimedia al cliente
// ─────────────────────────────────────────────────────────────────────────────
export async function enviarMensajeWhatsApp(params: {
  phoneNumberId: string;
  accessToken: string;
  destinatario: string;
  texto?: string;
  media?: {
    type: "image" | "document" | "audio" | "video";
    url: string;
    caption?: string;
    filename?: string;
  };
}): Promise<void> {
  const { phoneNumberId, accessToken, destinatario, texto, media } = params;

  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  
  let body: any = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: destinatario,
  };

  if (media) {
    body.type = media.type;
    body[media.type] = { 
      link: media.url,
      ...(media.caption ? { caption: media.caption } : {}),
      ...(media.filename ? { filename: media.filename } : {})
    };
  } else if (texto) {
    body.type = "text";
    body.text = { preview_url: false, body: texto };
  } else {
    throw new Error("Se debe proporcionar texto o media.");
  }

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const errorBody = await resp.text();
    throw new Error(`WhatsApp API error ${resp.status}: ${errorBody}`);
  }

  console.log(`✅ Mensaje (${media ? media.type : 'texto'}) enviado a ${destinatario}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// IA HELPERS — extracción de metadatos
// ─────────────────────────────────────────────────────────────────────────────
export function extraerMetadatosIA(texto: string): { 
  textoLimpio: string; 
  etiquetas: string[]; 
  recursos: string[];
} {
  const etiquetas: string[] = [];
  const recursos: string[] = [];
  
  // Extraer etiquetas: [ETIQUETA: Nombre]
  const regexEtiquetas = /\[ETIQUETA:\s*([^\]]+)\]/gi;
  let match;
  while ((match = regexEtiquetas.exec(texto)) !== null) {
    etiquetas.push(match[1].trim());
  }

  // Extraer recursos: [ENVIAR_RECURSO: Nombre]
  const regexRecursos = /\[ENVIAR_RECURSO:\s*([^\]]+)\]/gi;
  while ((match = regexRecursos.exec(texto)) !== null) {
    recursos.push(match[1].trim());
  }

  // Limpiar el texto de los tags
  const textoLimpio = texto
    .replace(regexEtiquetas, "")
    .replace(regexRecursos, "")
    .trim();

  return { textoLimpio, etiquetas, recursos };
}


// ─────────────────────────────────────────────────────────────────────────────
// HELPERS — contactos y conversaciones
// ─────────────────────────────────────────────────────────────────────────────
export async function obtenerOCrearContacto(wsId: string, telefono: string) {
  const db = admin.firestore();
  const contactosRef = db.collection(`espaciosDeTrabajo/${wsId}/contactos`);

  const snap = await contactosRef.where("telefono", "==", telefono).limit(1).get();
  if (!snap.empty) return snap.docs[0];

  // Crear nuevo contacto
  const nuevoRef = await contactosRef.add({
    telefono,
    nombre: telefono, // Se actualiza cuando tengamos el nombre
    aiBlocked: false,
    creadoEl: admin.firestore.FieldValue.serverTimestamp(),
    actualizadoEl: admin.firestore.FieldValue.serverTimestamp()
  });

  return await nuevoRef.get();
}

export async function obtenerOCrearConversacion(wsId: string, contactoId: string, agenteId: string, canalId: string) {
  const db = admin.firestore();
  const convRef = db.collection(`espaciosDeTrabajo/${wsId}/conversaciones`);

  const snap = await convRef
    .where("contactoId", "==", contactoId)
    .where("canalId", "==", canalId)
    .limit(1)
    .get();

  if (!snap.empty) return snap.docs[0];

  // Crear nueva conversación
  const nuevaRef = await convRef.add({
    contactoId,
    canalId,
    agenteId,
    ultimoMensaje: "",
    ultimaActividad: admin.firestore.FieldValue.serverTimestamp(),
    unreadCount: 0,
    aiActive: true,
    modoIA: "auto",
    statusIA: "idle",
    creadoEl: admin.firestore.FieldValue.serverTimestamp()
  });

  return await nuevaRef.get();
}
