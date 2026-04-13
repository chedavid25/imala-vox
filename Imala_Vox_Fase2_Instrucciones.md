# IMALÁ VOX — Instrucciones Fase 2 para Antigravity
## Configuración del Agente IA + Base de Conocimiento

---

## CONTEXTO

Esta es la Fase 2 del proyecto Imalá Vox. Ya tenés la Fase 0 (scaffolding) y la Fase 1 
(inbox + contactos + WhatsApp) implementadas.

La Fase 2 agrega todo lo relacionado a la **configuración del agente de IA** y su 
**base de conocimiento personalizada por workspace**. Cada cliente del SaaS configura 
su propio agente de forma independiente.

Referencia visual: capturas de Atendium adjuntas (instrucciones.png, roles.png, 
archivos.png, recursos.png, texto_plano.png, webs.png, etiquetas.png).

---

## ARQUITECTURA DE IA — LEER ANTES DE CODEAR

### Dos modelos, dos roles distintos

```typescript
const MODELO_CLASIFICADOR = "claude-haiku-4-5-20251001"
// Uso: detectar intención del mensaje, sugerir etiquetas automáticas

const MODELO_AGENTE = "claude-sonnet-4-6"
// Uso: generar la respuesta al cliente, consultar base de conocimiento
```

### Prompt caching — OBLIGATORIO desde el día 1

```typescript
const response = await anthropic.messages.create({
  model: MODELO_AGENTE,
  max_tokens: 1024,
  system: [
    {
      type: "text",
      text: construirSystemPrompt(agente),
      cache_control: { type: "ephemeral" } // <-- CRÍTICO: reduce costos 90%
    }
  ],
  messages: ultimosMensajes // últimos 10 mensajes del hilo
})
```

### Verificación de aiBlocked — ANTES de cualquier llamada a la API

```typescript
async function procesarMensajeEntrante(mensaje, conversacion, workspace) {
  // 1. Verificar que el contacto no es Personal
  const contacto = await obtenerContacto(conversacion.contactoId)
  if (contacto.aiBlocked === true) {
    await registrarMensajeSinRespuesta(conversacion.id, mensaje)
    return
  }

  // 2. Verificar modo del agente en esta conversación
  if (conversacion.modoAgente === 'pausado') return

  // 3. Verificar límites del plan
  const dentroDelLimite = await checkLimitesPlantilla(workspace.id)
  if (!dentroDelLimite) {
    await notificarLimiteSuperado(workspace)
    return
  }

  // 4. Clasificar intención con Haiku (barato)
  const intencion = await clasificarMensaje(mensaje.contenido)

  // 5. Copiloto: generar sugerencia sin enviar
  if (conversacion.modoAgente === 'copiloto') {
    const sugerencia = await generarRespuesta(mensaje, conversacion, workspace, intencion)
    await guardarSugerencia(conversacion.id, sugerencia)
    await notificarOperador(conversacion.id)
    return
  }

  // 6. Auto-reply: generar y enviar
  const respuesta = await generarRespuesta(mensaje, conversacion, workspace, intencion)
  await enviarMensajeWhatsApp(conversacion.canalId, respuesta)
  await incrementarContadorConv(workspace.id)
}
```

---

## ARQUITECTURA DE LA BASE DE CONOCIMIENTO — CRÍTICO

### Principio: los recursos son COMPARTIDOS a nivel workspace

Los archivos, textos y sitios web se cargan UNA SOLA VEZ a nivel workspace.
Cada agente tiene un switch para activar o desactivar cada recurso individualmente.
Esto permite que múltiples agentes compartan el mismo archivo sin duplicarlo.

```
WORKSPACE
├── baseConocimiento/          ← recursos compartidos del workspace
│     ├── {recursoId}          ← el archivo/texto/web en sí
│     └── ...
└── agentes/
      ├── {agenteId}/
      │     ├── configuracion   ← instrucciones, rol, comportamiento
      │     └── conocimientoActivo/   ← qué recursos usa este agente
      │           ├── {recursoId}: { activo: true, orden: 1 }
      │           └── ...
      └── {otroAgenteId}/
            ├── configuracion
            └── conocimientoActivo/
                  ├── {recursoId}: { activo: false, orden: 0 }  ← mismo archivo, desactivado
                  └── ...
```

---

## ESTRUCTURA DE FIRESTORE — COLECCIONES NUEVAS EN FASE 2

### Colección: baseConocimiento/{recursoId} (nivel workspace)

```
espaciosDeTrabajo/{wsId}/baseConocimiento/{recursoId}
  tipo: 'archivo' | 'texto' | 'web' | 'recurso'
  titulo: string
  descripcion: string             // para que el agente sepa cuándo usarlo
  contenidoTexto: string          // texto extraído (para archivo/texto/web)
  archivoUrl: string | null       // Storage URL
  archivoNombre: string | null
  archivoTamano: number | null    // en bytes
  webUrl: string | null           // URL original (solo tipo web)
  ultimoScrapeo: Timestamp | null
  frecuenciaActualizacion: string | null  // 'manual'|'diaria'|'semanal'
  estado: 'procesando' | 'activo' | 'error'
  errorMensaje: string | null
  creadoPor: string               // uid del usuario que lo subió
  creadoEl: Timestamp
  actualizadoEl: Timestamp
  // NO tiene campo 'activo' aquí — eso vive en conocimientoActivo por agente
```

### Subcolección: conocimientoActivo/{recursoId} (nivel agente)

```
espaciosDeTrabajo/{wsId}/agentes/{agenteId}/conocimientoActivo/{recursoId}
  // El ID del documento es el mismo que el recursoId en baseConocimiento
  activo: boolean     // switch que el usuario controla por agente
  orden: number       // prioridad de consulta (menor = más prioritario)
  agregadoEl: Timestamp
```

### Documento: agentes/{agenteId}

```
espaciosDeTrabajo/{wsId}/agentes/{agenteId}
  nombre: string
  avatar: string | null
  activo: boolean

  // IDENTIDAD
  instrucciones: string           // system prompt libre, máx 8000 chars
  rolPublico: string              // quién es el cliente del agente
  rolAgente: string               // cuál es el rol del agente

  // COMPORTAMIENTO
  modoDefault: 'auto' | 'copiloto'
  strictMode: boolean
  horarioActivo: boolean
  horario: {
    diasActivos: string[]         // ['lun','mar','mie','jue','vie']
    horaInicio: string            // "09:00"
    horaFin: string               // "18:00"
    mensajeFueraHorario: string
  }
  escalada: {
    mensajesSinResolucion: number // default: 5
    mensajeEscalada: string
    notificarEmail: boolean
  }

  configuracionVersion: number    // se incrementa en cada cambio para invalidar caché
  creadoEl: Timestamp
  actualizadoEl: Timestamp
```

### Subcolección: etiquetasAgente/{etiquetaId} (nivel agente)

```
espaciosDeTrabajo/{wsId}/agentes/{agenteId}/etiquetasAgente/{etiquetaId}
  nombre: string
  instruccionIA: string           // cuándo aplicar esta etiqueta
  color: string                   // hex
  activa: boolean
```

---

## PANTALLAS A CONSTRUIR

La sección completa vive en la ruta: `/dashboard/ajustes/agente`

### Estructura del sidebar de configuración

```
AGENTE: [nombre del agente]

IDENTIDAD
  → Instrucciones
  → Rol y público
  → Horario

CONOCIMIENTO
  → Archivos         (recursos compartidos del workspace + switch por agente)
  → Recursos         (multimedia para enviar al cliente)
  → Textos           (bloques de texto del workspace + switch por agente)
  → Sitios web       (URLs del workspace + switch por agente)

COMPORTAMIENTO
  → Etiquetas
  → Modo y escalada
```

---

## PANTALLA 1 — INSTRUCCIONES

**Ruta:** `/dashboard/ajustes/agente/instrucciones`

```tsx
// Textarea grande (mín 400px alto) — contador de chars (máx 8000)
// Barra de snippets rápidos sobre el textarea:
//   [📋 Seguir pasos] [❓ Hacer preguntas] [📎 Enviar recurso] [🏷️ Usar plantillas]
// Cada snippet inserta texto en la posición del cursor

const SNIPPETS = {
  "Seguir pasos":    "Seguí estos pasos en orden:\n1. \n2. \n3. ",
  "Hacer preguntas": "Si no tenés la información, preguntá brevemente: ",
  "Enviar recurso":  "Si el cliente pregunta sobre [tema], enviá el recurso [nombre].",
  "Usar plantillas": "Respondé usando esta estructura:\n- Saludo\n- Respuesta\n- Cierre",
}

// Al guardar: incrementar configuracionVersion en el documento del agente
```

---

## PANTALLA 2 — ROL Y PÚBLICO OBJETIVO

**Ruta:** `/dashboard/ajustes/agente/rol`

```tsx
// Campo 1: "¿Con quién va a hablar tu agente?"
// Límite: 300 chars — guardado en agente.rolPublico

// Campo 2: "¿Cuál es el rol de tu agente?"
// Límite: 300 chars — guardado en agente.rolAgente

// Estos dos campos se inyectan al inicio del system prompt,
// ANTES de las instrucciones manuales.
```

---

## PANTALLA 3 — ARCHIVOS

**Ruta:** `/dashboard/ajustes/agente/conocimiento/archivos`

**IMPORTANTE: arquitectura de dos niveles**

Esta pantalla tiene DOS vistas:

### Vista A — Gestión global (accesible desde el sidebar del workspace, no del agente)
Ruta: `/dashboard/ajustes/conocimiento/archivos`

```tsx
// Lista de TODOS los archivos del workspace con:
// - Nombre, tamaño, tipo, estado (Procesado / Error)
// - "Usado por X agentes" (contar documentos activos en conocimientoActivo)
// - Botón eliminar (solo si ningún agente lo tiene activo)
// - Botón descargar

// Zona drag & drop para subir nuevos archivos
// Consejo: "Es mejor varios archivos bien segmentados que uno solo con todo"
// Formatos: .txt .md .pdf .docx .csv .json .html
```

### Vista B — Configuración por agente (dentro del agente específico)
Ruta: `/dashboard/ajustes/agente/conocimiento/archivos`

```tsx
// Lista de TODOS los archivos del workspace
// Por cada archivo, mostrar:
// - Ícono tipo archivo
// - Nombre y tamaño
// - Estado del procesamiento (badge)
// - Campo descripción EDITABLE por agente:
//   "¿Para qué sirve este archivo en este agente?"
//   (puede ser distinta por agente para el mismo archivo)
// - SWITCH: activo/inactivo para ESTE agente  ← el diferenciador clave
//   Cuando se activa/desactiva: crear/actualizar doc en conocimientoActivo/{recursoId}

// Barra de uso: "3 / 5 archivos activos en este agente" (según límite del plan)

// Botón "Ir a gestión de archivos del workspace" → navega a Vista A
```

---

## PANTALLA 4 — RECURSOS (multimedia para enviar al cliente)

**Ruta:** `/dashboard/ajustes/agente/conocimiento/recursos`

```tsx
// DIFERENTE de los archivos de entrenamiento:
// Estos son archivos que el agente ENVÍA al cliente (imágenes, PDFs, videos)

// Zona drag & drop
// Mensaje: "Lo que subas aquí lo enviará el agente a tus clientes cuando corresponda"
// Consejo: "La descripción es clave para que el agente sepa cuándo enviar cada archivo"
// Formatos: imágenes (jpg/png/webp), PDF, MP4, MP3

// Por cada recurso:
// - Preview thumbnail (imágenes)
// - Nombre y tamaño
// - Campo descripción OBLIGATORIO: "¿Cuándo debe enviar el agente este archivo?"
//   Ej: "Enviar cuando el cliente pregunte por el contrato de alquiler"
// - Switch activo/inactivo
// - Botón eliminar

// NOTA: estos recursos también viven en baseConocimiento con tipo: 'recurso'
// El agente los referencia desde las instrucciones para saber cuándo enviarlos
```

---

## PANTALLA 5 — TEXTOS PLANOS

**Ruta:** `/dashboard/ajustes/agente/conocimiento/textos`

**Misma arquitectura de dos niveles que Archivos.**

```tsx
// Vista global del workspace: lista todos los textos, quién los usa
// Vista por agente: lista todos los textos del workspace con switch por agente

// Formulario nuevo texto (en vista global):
// - Campo Título: placeholder "Ej: Política de devoluciones"
// - Campo Texto: textarea, máx 3000 chars con contador
// - Botón "Agregar texto"

// Casos de uso sugeridos (chips clickeables que pre-llenan el formulario):
// "Horarios de atención" | "Preguntas frecuentes" | "Política de precios"
// "Proceso de contratación" | "Datos de contacto"

// Contador por agente: "X / 20 textos activos en este agente"
```

---

## PANTALLA 6 — SITIOS WEB

**Ruta:** `/dashboard/ajustes/agente/conocimiento/webs`

**Misma arquitectura de dos niveles. Los sitios web pertenecen al workspace.**

```tsx
// Vista global: gestión de todos los sitios web del workspace
// Vista por agente: lista todos los sitios con switch para activar/desactivar

// Formulario nuevo sitio (4 pasos, en vista global):
// PASO 1: URL del sitio (input + validación)
// PASO 2: Descripción para el agente (textarea 300 chars)
// PASO 3: Modo — "Leer solo esta URL" | "Buscar todos los vínculos (máx 20 páginas)"
// PASO 4: Frecuencia — Manual | Diaria | Semanal | Mensual

// Por cada sitio:
// - URL con favicon
// - Estado: "Procesando..." | "✓ Activo — X páginas indexadas" | "✗ Error"
// - Fecha del último scrapeo
// - Botón "Actualizar ahora"
// - En vista de agente: switch activo/inactivo para este agente
```

### Cloud Function: scrapearSitioWeb()

```typescript
async function scrapearSitioWeb(url: string, modoCompleto: boolean) {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setUserAgent('Mozilla/5.0 (compatible; ImalàVoxBot/1.0)')
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
  
  const texto = await page.evaluate(() => {
    const elementos = document.querySelectorAll('p, h1, h2, h3, h4, li, td')
    return Array.from(elementos)
      .map(el => el.textContent?.trim())
      .filter(t => t && t.length > 20)
      .join('\n')
  })
  
  await browser.close()
  return texto.slice(0, 50000) // máx 50k chars por página
}
```

---

## PANTALLA 7 — ETIQUETAS

**Ruta:** `/dashboard/ajustes/agente/comportamiento/etiquetas`

```tsx
// Tabla de etiquetas existentes: Nombre | Instrucción de IA | Acciones

// Formulario nueva etiqueta:
// - Nombre: "Ej: DEMO, INTERESADO, PROPIETARIO"
// - Instrucción para la IA (opcional, 100 chars):
//   "Ej: Aplicá esta etiqueta si el cliente manifiesta intención de compra..."
// - Selector de color: 8 colores predefinidos + picker personalizado

// IMPORTANTE: estas etiquetas son específicas de este agente.
// Son DISTINTAS de las etiquetas de relación del CRM (Personal/Laboral/Lead).

// La IA (Haiku) lee estas etiquetas en cada mensaje y puede aplicarlas
// automáticamente según la instrucción configurada.
```

---

## PANTALLA 8 — MODO Y ESCALADA

**Ruta:** `/dashboard/ajustes/agente/comportamiento/modo`

```tsx
// SECCIÓN 1: Modo de respuesta por defecto
// Toggle: "Auto-reply" vs "Copiloto"
// Nota: "Podés cambiar el modo por conversación desde el Inbox"

// SECCIÓN 2: Modo estricto (strictMode)
// Toggle on/off
// Label: "Solo responder con información de la base de conocimiento"
// Descripción explicativa para el usuario

// SECCIÓN 3: Reglas de escalada
// Input numérico: "Escalar si hay X mensajes sin resolución" (default: 5)
// Textarea: "Mensaje al escalar"
// Toggle: "Notificarme por email cuando se escale"
```

---

## FUNCIÓN CENTRAL: construirSystemPrompt()

```typescript
async function construirSystemPrompt(agenteId: string, wsId: string): Promise<string> {
  const agente = await getDoc(`espaciosDeTrabajo/${wsId}/agentes/${agenteId}`)

  // Cargar solo los recursos ACTIVOS para este agente específico
  const activosSnap = await getDocs(
    `espaciosDeTrabajo/${wsId}/agentes/${agenteId}/conocimientoActivo`,
    where('activo', '==', true),
    orderBy('orden')
  )

  // Para cada recurso activo, cargar el contenido desde baseConocimiento
  const recursosActivos = await Promise.all(
    activosSnap.docs.map(async (doc) => {
      const recurso = await getDoc(`espaciosDeTrabajo/${wsId}/baseConocimiento/${doc.id}`)
      return recurso
    })
  )

  // Separar por tipo
  const conocimiento = recursosActivos.filter(r => r.tipo !== 'recurso')
  const recursos = recursosActivos.filter(r => r.tipo === 'recurso')

  // Cargar etiquetas del agente
  const etiquetas = await getDocs(
    `espaciosDeTrabajo/${wsId}/agentes/${agenteId}/etiquetasAgente`,
    where('activa', '==', true)
  )

  // Cargar catálogo de objetos activos
  const objetos = await getDocs(
    `espaciosDeTrabajo/${wsId}/objetos`,
    where('estado', '==', 'activo'),
    limit(50)
  )

  return `
## IDENTIDAD
${agente.rolAgente}

## PÚBLICO
${agente.rolPublico}

## INSTRUCCIONES
${agente.instrucciones}

## BASE DE CONOCIMIENTO
${conocimiento.map(r =>
  `### ${r.titulo}${r.descripcion ? `\n(${r.descripcion})` : ''}\n${r.contenidoTexto}`
).join('\n\n---\n\n')}

## RECURSOS DISPONIBLES PARA ENVIAR AL CLIENTE
${recursos.map(r => `- "${r.titulo}": ${r.descripcion}`).join('\n')}

## CATÁLOGO DE PROPIEDADES/PRODUCTOS
${objetos.docs.map(o =>
  `- ${o.titulo} | Precio: ${o.precio} | ${JSON.stringify(o.caracteristicas)}`
).join('\n')}

## ETIQUETAS QUE PODÉS APLICAR
${etiquetas.docs.map(e => `- "${e.nombre}": ${e.instruccionIA}`).join('\n')}

## REGLAS GLOBALES
- Respondé siempre en el mismo idioma que el cliente.
- Nunca inventes precios, disponibilidades ni datos específicos.
${agente.strictMode
  ? '- MODO ESTRICTO: Solo respondé con información de la base de conocimiento. Si no la tenés, escalá al operador humano.'
  : ''}
- Si el cliente pide hablar con una persona más de una vez, escalá la conversación.
`.trim()
}
```

---

## TRIGGER DE INVALIDACIÓN DE CACHÉ

```typescript
// Cuando se modifica baseConocimiento o conocimientoActivo de cualquier agente,
// incrementar configuracionVersion para que Claude genere un nuevo caché

export const onConocimientoCambiado = onDocumentWritten(
  'espaciosDeTrabajo/{wsId}/baseConocimiento/{docId}',
  async (event) => {
    // Incrementar versión en TODOS los agentes que tienen este recurso activo
    const agentesConRecurso = await getDocs(
      collectionGroup('conocimientoActivo'),
      where('__name__', '==', event.params.docId),
      where('activo', '==', true)
    )
    for (const agente of agentesConRecurso.docs) {
      await updateDoc(agente.ref.parent.parent, {
        configuracionVersion: increment(1),
        actualizadoEl: serverTimestamp()
      })
    }
  }
)

export const onActivacionCambiada = onDocumentWritten(
  'espaciosDeTrabajo/{wsId}/agentes/{agenteId}/conocimientoActivo/{docId}',
  async (event) => {
    await updateDoc(
      `espaciosDeTrabajo/${event.params.wsId}/agentes/${event.params.agenteId}`,
      { configuracionVersion: increment(1), actualizadoEl: serverTimestamp() }
    )
  }
)
```

---

## LÍMITES POR PLAN

```typescript
export const LIMITES_AGENTE = {
  starter: {
    agentes: 1,
    archivosActivosPorAgente: 5,      // cuántos archivos puede activar un agente
    archivosWorkspace: 10,            // cuántos archivos puede subir el workspace
    textosActivosPorAgente: 10,
    textosWorkspace: 15,
    sitiosActivosPorAgente: 2,
    sitiosWorkspace: 5,
    etiquetasPorAgente: 10,
    recursosMB: 50
  },
  pro: {
    agentes: 3,
    archivosActivosPorAgente: 20,
    archivosWorkspace: 50,
    textosActivosPorAgente: 20,
    textosWorkspace: 40,
    sitiosActivosPorAgente: 10,
    sitiosWorkspace: 20,
    etiquetasPorAgente: 30,
    recursosMB: 200
  },
  agencia: {
    agentes: 10,
    archivosActivosPorAgente: 100,
    archivosWorkspace: 300,
    textosActivosPorAgente: 50,
    textosWorkspace: 150,
    sitiosActivosPorAgente: 30,
    sitiosWorkspace: 100,
    etiquetasPorAgente: 100,
    recursosMB: 1000
  }
}

// En la UI mostrar DOS contadores:
// "Archivos del workspace: 8 / 10"  (límite del workspace)
// "Activos en este agente: 3 / 5"   (límite por agente)
```

---

## DEPENDENCIAS NPM

```bash
npm install pdf-parse mammoth puppeteer
npm install zod react-hook-form @hookform/resolvers
npm install @radix-ui/react-tabs @radix-ui/react-toggle @radix-ui/react-switch
```

---

## ORDEN DE IMPLEMENTACIÓN

1. Migrar estructura Firestore: crear baseConocimiento a nivel workspace + conocimientoActivo por agente
2. Actualizar /lib/planLimits.ts con los nuevos límites duales
3. Pantalla de gestión global de archivos del workspace
4. Pantalla Instrucciones del agente
5. Pantalla Rol y Público
6. Pantalla Archivos del agente (Vista B con switches) + Cloud Function procesarArchivo()
7. Pantalla Textos con arquitectura compartida
8. Pantalla Sitios web + Cloud Function scrapearSitioWeb()
9. Pantalla Recursos (multimedia para enviar)
10. Pantalla Etiquetas
11. Pantalla Modo y Escalada
12. Implementar construirSystemPrompt() con prompt caching
13. Integrar con procesarMensajeEntrante() de Fase 1
14. Agregar toggle auto/copiloto en el Inbox por conversación
15. Triggers de invalidación de caché

---

## NOTAS FINALES

- Cada workspace tiene un pool de recursos compartidos (baseConocimiento).
- Cada agente decide qué recursos activa desde ese pool (conocimientoActivo).
- Un mismo archivo puede estar activo en el agente de ventas e inactivo en el de administración.
- Al eliminar un archivo del workspace, verificar que ningún agente lo tenga activo primero.
- La UI debe mostrar claramente cuántos agentes usan cada recurso para que el usuario no elimine algo que se está usando.
