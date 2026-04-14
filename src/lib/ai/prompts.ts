import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit,
  documentId 
} from "firebase/firestore";
import { COLLECTIONS, Agente, RecursoConocimiento } from "@/lib/types/firestore";

/**
 * Construye el System Prompt dinámico para el agente, integrando:
 * 1. Identidad y Rol
 * 2. Base de Conocimiento (Archivos, Textos, Webs activos)
 * 3. Recursos multimedia disponibles
 * 4. Catálogo de objetos/propiedades
 * 5. Etiquetas de comportamiento
 */
export async function construirSystemPrompt(wsId: string, agenteId: string): Promise<string> {
  // 1. Obtener datos básicos del agente
  const agenteSnap = await getDoc(doc(db, COLLECTIONS.ESPACIOS, wsId, COLLECTIONS.AGENTES, agenteId));
  if (!agenteSnap.exists()) throw new Error("Agente no encontrado");
  const agente = agenteSnap.data() as Agente;

  // 2. Obtener recursos de conocimiento ACTIVOS para este agente
  const activosSnap = await getDocs(
    query(
      collection(db, COLLECTIONS.ESPACIOS, wsId, COLLECTIONS.AGENTES, agenteId, COLLECTIONS.CONOCIMIENTO_ACTIVO),
      where("activo", "==", true)
    )
  );

  // 3. Cargar el contenido real de esos recursos de forma masiva (Evita N+1)
  const idsRecursos = activosSnap.docs.map(d => d.data().recursoId || d.id);
  
  let recursosValidos: RecursoConocimiento[] = [];
  
  if (idsRecursos.length > 0) {
    // Firestore permite hasta 30 IDs en un 'in' query
    const chunks = [];
    for (let i = 0; i < idsRecursos.length; i += 30) {
      chunks.push(idsRecursos.slice(i, i + 30));
    }

    const snaps = await Promise.all(chunks.map(chunk => 
      getDocs(query(
        collection(db, COLLECTIONS.ESPACIOS, wsId, COLLECTIONS.CONOCIMIENTO),
        where(documentId(), "in", chunk)
      ))
    ));

    recursosValidos = snaps.flatMap(s => s.docs.map(d => ({ ...d.data(), id: d.id } as RecursoConocimiento)));
  }

  // Separar recursos de entrenamiento vs recursos para enviar (multimedia)
  const conocimiento = recursosValidos.filter(r => r.tipo !== 'recurso');
  const multimedia = recursosValidos.filter(r => r.tipo === 'recurso');

  // 4. Cargar etiquetas del agente
  const etiquetasSnap = await getDocs(
    query(
      collection(db, COLLECTIONS.ESPACIOS, wsId, COLLECTIONS.AGENTES, agenteId, COLLECTIONS.ETIQUETAS_AGENTE),
      where("activa", "==", true)
    )
  );

  // 5. Cargar objetos/propiedades activos (limitado para no saturar contexto)
  const objetosSnap = await getDocs(
    query(
      collection(db, COLLECTIONS.ESPACIOS, wsId, COLLECTIONS.OBJETOS),
      where("estado", "==", "disponible"),
      limit(40)
    )
  );

  // ENSAMBLADO DEL PROMPT FINAL
  return `
## IDENTIDAD Y ROL
Tú eres el agente inteligente de atención de este negocio.
Tu rol: ${agente.rolAgente}
Tu público: ${agente.rolPublico}

## INSTRUCCIONES ESPECÍFICAS
${agente.instrucciones}

## BASE DE CONOCIMIENTO (INFORMACIÓN PARA RESPONDER)
${conocimiento.length > 0 
  ? conocimiento.map(r => `### ${r.titulo}${r.descripcion ? `\nGuía de uso: ${r.descripcion}` : ""}\nContenido:\n${r.contenidoTexto}`).join("\n\n---\n\n")
  : "No hay documentos de conocimiento cargados aún."}

## RECURSOS MULTIMEDIA (Archivos que puedes sugerir enviar)
${multimedia.length > 0
  ? multimedia.map(r => `- "${r.titulo}": ${r.descripcion}`).join("\n")
  : "No hay recursos multimedia disponibles para este agente."}

## CATÁLOGO DE OBJETOS/PROPIEDADES DISPONIBLES
${objetosSnap.docs.length > 0
  ? objetosSnap.docs.map(o => {
      const d = o.data();
      return `- ${d.titulo} | Precio: ${d.precio} | Estado: ${d.estado} | Detalle: ${JSON.stringify(d.caracteristicas)}`;
    }).join("\n")
  : "No hay objetos en el catálogo actualmente."}

## ETIQUETAS QUE PUEDES AUTO-APLICAR
Si detectas alguna de estas situaciones, indica al final de tu respuesta una línea con el formato [ETIQUETA: Nombre]:
${etiquetasSnap.docs.length > 0
  ? etiquetasSnap.docs.map(e => `- "${e.data().nombre}": ${e.data().instruccionIA}`).join("\n")
  : "No hay etiquetas configuradas."}

## REGLAS GLOBALES DE CONDUCTA
- Responde siempre en el mismo idioma que el cliente.
- Sé breve, profesional y directo.
- NO uses formato de negritas ni asteriscos (**) para resaltar texto. Responde en texto plano.
- Si no tienes la información exacta, NO LA INVENTES. Especialmente en precios o disponibilidad.
${agente.strictMode 
  ? "- MODO ESTRICTO: Solo estás autorizado a usar la información de la 'BASE DE CONOCIMIENTO'. Si la respuesta no está allí, dile al cliente que lo consultarás con un asesor humano." 
  : "- Si la información no está en el conocimiento, usa el sentido común pero aclara que es una respuesta general."}
- Si el cliente pide hablar con un humano o manifiesta frustración más de una vez, escala la conversación amablemente.
`.trim();
}
