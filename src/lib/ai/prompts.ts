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
    const validIds = idsRecursos.filter(id => id && typeof id === 'string');
    const docRefs = validIds.map(id =>
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

  // 4. Cargar etiquetas centralizadas del CRM que tengan instrucciones para la IA
  const etiquetasSnap = await adminDb
    .collection(COLLECTIONS.ESPACIOS).doc(wsId)
    .collection(COLLECTIONS.ETIQUETAS_CRM)
    .get();
  
  const etiquetasIA = etiquetasSnap.docs
    .map(doc => doc.data())
    .filter(data => data.instruccionIA && data.instruccionIA.trim() !== "");

  // 5. Cargar objetos/propiedades activos (limitado para no saturar contexto)
  const objetosSnap = await adminDb
    .collection(COLLECTIONS.ESPACIOS).doc(wsId)
    .collection(COLLECTIONS.OBJETOS)
    .where("estado", "==", "disponible")
    .limit(60)
    .get();

  const objetosFormateados = objetosSnap.docs.map(o => {
    const d = o.data();
    const c = d.caracteristicas || {};
    
    if (d.tipo === 'propiedad') {
      const partes = [
        d.titulo,
        d.precio > 0 ? `${d.moneda || 'USD'} ${d.precio.toLocaleString('es-AR')}` : null,
        c.operacion ? c.operacion.toUpperCase() : null,
        c.ambientes ? `${c.ambientes} amb` : null,
        c.dormitorios ? `${c.dormitorios} dorm` : null,
        c.m2 ? `${c.m2}m²` : null,
        c.barrio || c.localidad || null,
        c.tipo || null,
        c.expensas ? `Expensas: ARS ${c.expensas.toLocaleString('es-AR')}` : null,
        d.urlFuente ? `Ver ficha: ${d.urlFuente}` : null
      ].filter(Boolean);
      return `• ${partes.join(' | ')}`;
    } else {
      const partes = [
        d.titulo,
        d.precio > 0 ? `${d.moneda || 'ARS'} ${d.precio.toLocaleString('es-AR')}` : null,
        c.marca || null,
        c.categoria || null,
        c.stock != null ? `Stock: ${c.stock}` : null,
        c.sku ? `SKU: ${c.sku}` : null,
        d.descripcion ? d.descripcion.slice(0, 100) : null
      ].filter(Boolean);
      return `• ${partes.join(' | ')}`;
    }
  }).join('\n');

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

## CATÁLOGO DE PRODUCTOS/PROPIEDADES DISPONIBLES
${objetosSnap.docs.length > 0
  ? `Tenés ${objetosSnap.docs.length} ítem(s) disponibles. Cuando el cliente pregunte por opciones, filtrá según sus criterios y recomendá los más relevantes. Si pregunta por precio de un ítem específico que no está en la lista, decí que vas a consultar.\n\n${objetosFormateados}`
  : "No hay ítems en el catálogo actualmente. Si el cliente pregunta por productos o propiedades, derivar a un asesor humano."}


## ETIQUETAS QUE PUEDES AUTO-APLICAR
Si detectas alguna de estas situaciones, indica al final de tu respuesta una línea con el formato [ETIQUETA: Nombre]:
${etiquetasIA.length > 0
  ? etiquetasIA.map(e => `- "${e.nombre}": ${e.instruccionIA}`).join("\n")
  : "No hay etiquetas configuradas."}

## REGLAS GLOBALES DE CONDUCTA
- Responde siempre en el mismo idioma que el cliente.
- Sé breve, profesional y directo.
- NO uses formato de negritas ni asteriscos (**) para resaltar texto. Responde en texto plano.
- Si no tienes la información exacta, NO LA INVENTES. Especialmente en precios o disponibilidad.
${agente.strictMode
  ? "- MODO ESTRICTO: Solo estás autorizado a usar la información de la 'BASE DE CONOCIMIENTO'. Si la respuesta no está allí, dile al cliente que lo consultarás con un asesor humano."
  : "- Si la información no está en el conocimiento, usa el sentido común pero aclara que es una respuesta general."}
- Si el cliente pide hablar con un humano, manifiesta frustración, o si necesitas derivar la gestión para su atención, incluye al final de tu respuesta la instrucción exacta: [ACCION: ESCALAR]. **IMPORTANTE: Cuando decidas escalar, despídete amablemente y NO le hagas más preguntas al cliente, simplemente avísale que un humano lo contactará a la brevedad.**
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
