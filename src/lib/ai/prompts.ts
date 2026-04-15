/**
 * construirSystemPrompt — corre en el servidor (Server Action).
 * Usa Firebase Admin SDK para bypassear las reglas de seguridad de Firestore
 * y acceder a los datos del workspace sin necesitar token de usuario.
 */
import { adminDb } from "@/lib/firebase-admin";
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
  const agenteSnap = await adminDb
    .collection(COLLECTIONS.ESPACIOS).doc(wsId)
    .collection(COLLECTIONS.AGENTES).doc(agenteId)
    .get();

  if (!agenteSnap.exists) throw new Error("Agente no encontrado");
  const agente = agenteSnap.data() as Agente;

  // 2. Obtener recursos de conocimiento ACTIVOS para este agente
  const activosSnap = await adminDb
    .collection(COLLECTIONS.ESPACIOS).doc(wsId)
    .collection(COLLECTIONS.AGENTES).doc(agenteId)
    .collection(COLLECTIONS.CONOCIMIENTO_ACTIVO)
    .where("activo", "==", true)
    .get();

  // 3. Cargar el contenido real de esos recursos (paralelizado, evita N+1)
  const idsRecursos = activosSnap.docs.map(d => (d.data().recursoId as string) || d.id);

  let recursosValidos: RecursoConocimiento[] = [];

  if (idsRecursos.length > 0) {
    // Admin SDK permite getAll() que es más eficiente que queries 'in'
    const docRefs = idsRecursos.map(id =>
      adminDb
        .collection(COLLECTIONS.ESPACIOS).doc(wsId)
        .collection(COLLECTIONS.CONOCIMIENTO).doc(id)
    );

    const recursoSnaps = await adminDb.getAll(...docRefs);
    recursosValidos = recursoSnaps
      .filter(s => s.exists)
      .map(s => ({ ...s.data(), id: s.id } as RecursoConocimiento));
  }

  // Separar recursos de entrenamiento vs recursos para enviar (multimedia)
  const conocimiento = recursosValidos.filter(r => r.tipo !== 'recurso');
  const multimedia = recursosValidos.filter(r => r.tipo === 'recurso');

  // 4. Cargar etiquetas del agente
  const etiquetasSnap = await adminDb
    .collection(COLLECTIONS.ESPACIOS).doc(wsId)
    .collection(COLLECTIONS.AGENTES).doc(agenteId)
    .collection(COLLECTIONS.ETIQUETAS_AGENTE)
    .where("activa", "==", true)
    .get();

  // 5. Cargar objetos/propiedades activos (limitado para no saturar contexto)
  const objetosSnap = await adminDb
    .collection(COLLECTIONS.ESPACIOS).doc(wsId)
    .collection(COLLECTIONS.OBJETOS)
    .where("estado", "==", "disponible")
    .limit(40)
    .get();

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

## RECURSOS MULTIMEDIA (Archivos que puedes enviar al cliente)
Si el cliente solicita un archivo, catálogo o certificado que esté en esta lista, debes incluir su nombre exacto entre corchetes en tu respuesta para que el sistema genere un enlace de descarga. 
Formato requerido: [NombreArchivo.ext]

Recursos disponibles:
${multimedia.length > 0
  ? multimedia.map(r => `- "${r.titulo}": Usa el código [${r.archivoNombre}] | Descripción: ${r.descripcion}`).join("\n")
  : "No hay recursos multimedia disponibles para enviar."}

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
${agente.horarioActivo && agente.horario
  ? (() => {
      const h = agente.horario!;
      let horarioDesc = `Horario Lun-Vie: ${h.horaInicio}-${h.horaFin}`;
      if (h.sabadoHoraInicio) horarioDesc += ` | Sáb: ${h.sabadoHoraInicio}-${h.sabadoHoraFin}`;
      if (h.domingoHoraInicio) horarioDesc += ` | Dom: ${h.domingoHoraInicio}-${h.domingoHoraFin}`;
      horarioDesc += `. Mensaje fuera: '${h.mensajeFueraHorario}'`;
      return `- HORARIO DE ATENCIÓN: ${horarioDesc}`;
    })()
  : ""}
`.trim();
}
