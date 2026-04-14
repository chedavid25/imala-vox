**IMALÁ VOX**

**Instrucciones de Corrección y Mejora**

Para Antigravity / Claude Code

*Basado en el análisis del repositorio imala-vox-main.zip*

Versión: 14 de Abril de 2026

# **1. Criterios Generales de Trabajo**
Antes de tocar cualquier archivo, leer este documento completo. Cada corrección tiene un orden y una dependencia. No modificar lo que no esté en la lista sin consultar.

- El playground del chat está funcionando correctamente — NO modificar src/app/actions/ai.ts ni src/lib/ai/prompts.ts salvo en las correcciones indicadas explícitamente.
- Mantener la estética visual actual en TODAS las secciones. El sistema de diseño con CSS variables es correcto y no debe alterarse.
- Los nombres de planes válidos son: 'starter' | 'pro' | 'agencia'. NO cambiar estos nombres en ningún archivo.
- Usar siempre serverTimestamp() de Firestore para timestamps, nunca new Date() ni Timestamp.now() directamente en escrituras a la base de datos.
- Mantener el patrón increment(1) en configuracionVersion al guardar cambios en agentes.

# **2. Correcciones Críticas (Prioridad Alta)**
Estas correcciones deben hacerse ANTES de cualquier otra tarea. Pueden causar errores en producción si se ignoran.

## **2.1 · Crear Firestore Security Rules**

|<p>**⚠️ CRÍTICO — Sin este archivo cualquier usuario puede leer datos de otros workspaces**</p><p>Crear el archivo firestore.rules en la raíz del proyecto con el siguiente contenido exacto:</p>|
| :- |

rules\_version = '2';

service cloud.firestore {

`  `match /databases/{database}/documents {

`    `// Plataforma: solo admins (via backend)

`    `match /plataforma/{doc=\*\*} {

`      `allow read, write: if false;

`    `}

`    `// Workspaces: solo el propietario

`    `match /espaciosDeTrabajo/{wsId} {

`      `allow read, write: if request.auth != null

`        `&& request.auth.uid ==

`           `resource.data.propietarioUid;

`      `// Subcolecciones del workspace

`      `match /{subCollection}/{docId=\*\*} {

`        `allow read, write: if request.auth != null

`          `&& request.auth.uid ==

`             `get(/databases/$(database)/documents/

`             `espaciosDeTrabajo/$(wsId)).data.propietarioUid;

`      `}

`    `}

`  `}

}

## **2.2 · Mover VERIFY\_TOKEN a Variable de Entorno**

|<p>**⚠️ CRÍTICO — El token hardcodeado permite que cualquiera verifique webhooks falsos**</p><p>En functions/src/index.ts, reemplazar la línea con 'imala\_vox\_verify\_token' por la versión con variable de entorno.</p>|
| :- |

**Reemplazar en functions/src/index.ts:**

// ANTES (línea ~55):

if (mode === 'subscribe' && token === 'imala\_vox\_verify\_token') {

// DESPUÉS:

const VERIFY\_TOKEN = process.env.WA\_VERIFY\_TOKEN || '';

if (mode === 'subscribe' && token === VERIFY\_TOKEN) {

También crear o actualizar el archivo functions/.env con:

WA\_VERIFY\_TOKEN=imala\_vox\_token\_secreto\_cambiar\_en\_produccion

## **2.3 · Corregir workspaceId Hardcodeado en Webhook WhatsApp**

|<p>**⚠️ CRÍTICO — Todos los mensajes irían al mismo workspace. El sistema multi-tenant no funcionaría.**</p><p>En functions/src/index.ts, agregar una colección de mapeo entre phoneNumberId y workspaceId.</p>|
| :- |

**Reemplazar el bloque POST del webhook (aproximadamente líneas 55-85) con este código completo:**

if (req.method === 'POST') {

`  `const body = req.body;

`  `if (body.object === 'whatsapp\_business\_account') {

`    `try {

`      `const entry = body.entry?.[0];

`      `const changes = entry?.changes?.[0];

`      `const value = changes?.value;

`      `const message = value?.messages?.[0];

`      `// Obtener el phoneNumberId del metadata del webhook

`      `const phoneNumberId = value?.metadata?.phone\_number\_id;

`      `if (message && phoneNumberId) {

`        `const from = message.from;

`        `const text = message.text?.body;

`        `// Buscar workspace por phoneNumberId

`        `const canalSnap = await admin.firestore()

.collectionGroup('canales')

.where('phoneNumberId', '==', phoneNumberId)

.where('tipo', '==', 'whatsapp')

.limit(1).get();

`        `if (canalSnap.empty) {

`          `console.warn(`phoneNumberId ${phoneNumberId} no mapeado`);

`          `res.sendStatus(200); return;

`        `}

`        `// El workspaceId está en el path del documento canal

`        `const canalRef = canalSnap.docs[0].ref;

`        `const pathParts = canalRef.path.split('/');

`        `// path: espaciosDeTrabajo/{wsId}/canales/{canalId}

`        `const workspaceId = pathParts[1];

`        `console.log(`Msg de ${from}: ${text} → ws: ${workspaceId}`);

`        `// TODO Fase 2: disparar procesarRespuestaIA aquí

`      `}

`      `res.sendStatus(200);

`    `} catch (error) {

`      `console.error('Error procesando webhook:', error);

`      `res.sendStatus(500);

`    `}

`  `} else { res.sendStatus(404); }

}

NOTA: La colección canales dentro de cada workspace debe tener los campos phoneNumberId (string) y tipo: 'whatsapp'. Esto ya está en el esquema de types/firestore.ts.

## **2.4 · Mover Puppeteer/Scraper a Firebase Function**

|<p>**⚠️ CRÍTICO — Puppeteer no puede correr en Vercel ni App Hosting de Firebase. El build fallará en producción.**</p><p>- Puppeteer debe salir del package.json principal del proyecto Next.js.</p><p>- El scraper debe convertirse en una Firebase Function con timeout extendido.</p><p>- La Server Action scrapearWebAction en src/app/actions/knowledge.ts debe cambiar a llamada HTTP hacia esa Function.</p>|
| :- |

**Paso 1 — En el package.json RAÍZ, eliminar puppeteer de dependencies:**

// Eliminar esta línea de package.json:

"puppeteer": "^24.40.0",

**Paso 2 — Agregar puppeteer a functions/package.json:**

// En functions/package.json, agregar en dependencies:

"puppeteer": "^24.40.0"

**Paso 3 — Mover src/lib/scraper.ts a functions/src/scraper.ts (sin cambios en el código).**

**Paso 4 — Agregar esta nueva Firebase Function en functions/src/index.ts:**

export const ejecutarScrapingWeb = functions

.runWith({ timeoutSeconds: 300, memory: '1GB' })

.https.onCall(async (data, context) => {

`  `if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '');

`  `const { wsId, recursoId, url } = data;

`  `// importar desde ./scraper

`  `const { ejecutarScrapingProfundo } = require('./scraper');

`  `const result = await ejecutarScrapingProfundo(url);

`  `if (!result.success) throw new Error(result.error);

`  `await admin.firestore()

.doc(`espaciosDeTrabajo/${wsId}/baseConocimiento/${recursoId}`)

.update({

`      `contenidoTexto: result.mainText,

`      `estado: 'activo',

`      `ultimoScrapeo: admin.firestore.FieldValue.serverTimestamp(),

`    `});

`  `return { success: true, propertyCount: result.propertyCount };

});

**Paso 5 — Reemplazar el cuerpo de scrapearWebAction en src/app/actions/knowledge.ts:**

import { getFunctions, httpsCallable } from 'firebase/functions';

// ...en la función scrapearWebAction:

const functions = getFunctions();

const scrapeFunc = httpsCallable(functions, 'ejecutarScrapingWeb');

await scrapeFunc({ wsId, recursoId, url });

## **2.5 · Corregir currentWorkspaceId Inicial en Zustand Store**

|<p>**⚠️ CRÍTICO — El valor inicial 'default-workspace' puede causar queries incorrectas antes de cargar el workspace real.**</p><p>En src/store/useWorkspaceStore.ts, cambiar el valor inicial de currentWorkspaceId.</p>|
| :- |

// ANTES:

currentWorkspaceId: 'default-workspace',

// DESPUÉS:

currentWorkspaceId: null,

# **3. Correcciones Importantes (Prioridad Media)**
Estas correcciones afectan la funcionalidad del sistema pero no bloquean el build.

## **3.1 · Alinear Precios en planLimits.ts**

|<p>**IMPORTANTE — Los precios deben quedar exactamente así. No cambiar los nombres de planes (starter/pro/agencia).**</p><p>Actualizar src/lib/planLimits.ts con los precios correctos según la decisión final del producto.</p>|
| :- |

|**Plan**|**priceMonthly**|**priceYearly**|**convCountIA**|**agentsIA**|
| :- | :- | :- | :- | :- |
|starter|$39 USD|$32/mes|500 conv|1 agente|
|pro|$79 USD|$66/mes|2000 conv|3 agentes|
|agencia|$179 USD|$149/mes|10000 conv|10 agentes|

También actualizar los campos whatsappNumbers: starter=1, pro=2, agencia=5.

## **3.2 · Implementar Toggle IA en ChatWindow**
En src/components/inbox/ChatWindow.tsx, la función handleToggleIA actualmente solo hace console.log y no persiste nada en Firestore.

**Reemplazar la función handleToggleIA con:**

const handleToggleIA = async (active: boolean) => {

`  `if (!conversacion?.id || !currentWorkspaceId) return;

`  `try {

`    `const convRef = doc(

`      `db, COLLECTIONS.ESPACIOS, currentWorkspaceId,

`      `COLLECTIONS.CONVERSACIONES, conversacion.id

`    `);

`    `await updateDoc(convRef, { aiActive: active });

`  `} catch (err) {

`    `console.error('Error toggle IA:', err);

`  `}

};

Agregar los imports necesarios al inicio del archivo: importar db, doc, updateDoc de firebase/firestore y COLLECTIONS de los tipos. También importar useWorkspaceStore para obtener currentWorkspaceId.

## **3.3 · Corregir Redirect de Google Login para Usuarios Nuevos**
En src/app/auth/page.tsx, el handleGoogleLogin siempre redirige al dashboard aunque el usuario sea nuevo y no tenga workspace.

**Reemplazar el bloque de handleGoogleLogin con:**

const handleGoogleLogin = async () => {

`  `setLoading(true);

`  `const provider = new GoogleAuthProvider();

`  `try {

`    `const result = await signInWithPopup(auth, provider);

`    `// Verificar si ya tiene workspace

`    `const { collection, query, where,

`            `getDocs, limit } = await import('firebase/firestore');

`    `const { db } = await import('@/lib/firebase');

`    `const { COLLECTIONS } = await import('@/lib/types/firestore');

`    `const q = query(

`      `collection(db, COLLECTIONS.ESPACIOS),

`      `where('propietarioUid', '==', result.user.uid),

`      `limit(1)

`    `);

`    `const snap = await getDocs(q);

`    `toast.success(`¡Hola, ${result.user.displayName}!`);

`    `router.push(snap.empty ? '/onboarding' : '/dashboard/operacion/inbox');

`  `} catch (error: any) {

`    `toast.error('Error al iniciar sesión con Google');

`  `} finally {

`    `setLoading(false);

`  `}

};

## **3.4 · Optimizar Queries N+1 en construirSystemPrompt**

|<p>**IMPORTANTE — El sistema actual hace 1 + N queries al construir el prompt (una por cada recurso activo). Esto escala mal con volumen.**</p><p>- Reemplazar las queries individuales por un único bloque getAll con Promise.all sobre los IDs.</p><p>- Esta es la corrección de deuda técnica mencionada para antes del lanzamiento público.</p>|
| :- |

**En src/lib/ai/prompts.ts, reemplazar el bloque de carga de recursos (desde 'Cargar el contenido real...' hasta el filter) con:**

// Obtener todos los IDs activos

const idsActivos = activosSnap.docs.map(d => d.data().recursoId || d.id);

// Cargar TODOS los recursos en una sola operación paralela

// usando docRefs en lugar de queries individuales

const recursosDetallados = await Promise.all(

`  `idsActivos.map(id => getDoc(

`    `doc(db, COLLECTIONS.ESPACIOS, wsId, COLLECTIONS.CONOCIMIENTO, id)

`  `))

);

const recursosValidos = recursosDetallados

.filter(snap => snap.exists())

.map(snap => ({ ...snap.data(), id: snap.id }) as RecursoConocimiento);

NOTA: Promise.all sigue haciendo N lecturas pero las paraleliza completamente — Firestore las agrupa en una sola round-trip cuando los documentos están en la misma colección. Es la optimización correcta para este caso.

# **4. Mejoras de Funcionalidad (Secciones Incompletas)**

## **4.1 · Sección Recursos — Agregar Upload Real de Archivos**

|<p>**ESTADO ACTUAL: La página lista recursos de tipo 'recurso' pero el botón 'Subir Recurso' no tiene funcionalidad. No hay lógica de upload.**</p><p>Implementar el upload real de archivos multimedia (imágenes, PDFs, videos) hacia Firebase Storage.</p>|
| :- |

**Implementar en src/app/dashboard/ajustes/agentes/[id]/recursos/page.tsx:**

**Lógica de Upload**

- Agregar un input type='file' oculto con ref, que acepte: image/\*, application/pdf, video/mp4, .mp4
- El botón 'Subir Recurso' dispara el click del input oculto.
- Al seleccionar el archivo, ejecutar la función uploadRecurso(file):
  - `  `1. Mostrar loading state en el botón.
  - `  `2. Subir el archivo a Firebase Storage en la ruta: espaciosDeTrabajo/{wsId}/recursos/{timestamp}\_{filename}
  - `  `3. Obtener la downloadURL del archivo subido.
  - `  `4. Crear documento en Firestore: colección baseConocimiento del workspace, con los campos:
  - `     `tipo: 'recurso', titulo: file.name, archivoNombre: file.name, archivoUrl: downloadURL, archivoTamano: file.size, estado: 'activo', descripcion: '', creadoPor: auth.currentUser.uid, creadoEl: serverTimestamp(), actualizadoEl: serverTimestamp()
  - `  `5. Mostrar toast.success('Recurso subido correctamente').
  - `  `6. El documento nuevo aparecerá automáticamente en la lista vía onSnapshot.

**Detectar Tipo de Ícono por Extensión**

Reemplazar el ícono estático ImageIcon por lógica dinámica según el archivo:

const getIconByType = (fileName: string) => {

`  `const ext = fileName?.split('.').pop()?.toLowerCase();

`  `if (['jpg','jpeg','png','gif','webp'].includes(ext)) return ImageIcon;

`  `if (['mp4','mov','avi','webm'].includes(ext)) return FileVideo;

`  `if (['mp3','wav','ogg','m4a'].includes(ext)) return FileAudio;

`  `return FileText;

};

**Corregir el Campo 'activo'**

El toggle actualmente usa el campo estado ('activo' vs 'error') para simular activado/desactivado. Esto es incorrecto semánticamente. El campo estado indica si el archivo fue procesado correctamente, no si está activo para el agente.

La activación por agente vive en la subcolección conocimientoActivo del agente (igual que archivos y textos). Cambiar toggleActivo para que use setDoc/deleteDoc en conocimientoActivo en lugar de modificar el campo estado del recurso.

## **4.2 · Sección Textos — Agregar Creación de Nuevos Textos**

|<p>**ESTADO ACTUAL: La página muestra textos existentes del pool global y permite activarlos. Pero no hay forma de crear un texto nuevo directamente desde esta pantalla.**</p><p>Agregar un botón 'Nuevo Texto' que abra un Dialog para crear textos directamente.</p>|
| :- |

**Agregar en src/app/dashboard/ajustes/agentes/[id]/textos/page.tsx:**

- Un botón 'Nuevo Texto' junto al botón 'Gestionar Pool Global' en el header.
- Al hacer click, abrir un Dialog con los campos: Título (Input requerido) y Contenido (Textarea con min-height: 160px, requerido).
- Al guardar el Dialog, ejecutar la función crearNuevoTexto(titulo, contenido):
  - `  `1. Crear documento en baseConocimiento con: tipo: 'texto', titulo, contenidoTexto: contenido, descripcion: '', estado: 'activo', creadoPor: uid, creadoEl, actualizadoEl
  - `  `2. Automáticamente activarlo para este agente: crear documento en conocimientoActivo con: recursoId: nuevoDocRef.id, activo: true, orden: currentActiveCount, agregadoEl
  - `  `3. Incrementar configuracionVersion del agente (+1).
  - `  `4. Cerrar el Dialog y mostrar toast.success('Texto creado y activado para este agente').

**Corregir límite de plan**

Actualmente el límite está hardcodeado a PLAN\_LIMITS['agencia']. Cambiar para usar el plan real del workspace:

const { workspace } = useWorkspaceStore();

const planKey = (workspace?.plan || 'starter') as keyof typeof PLAN\_LIMITS;

const limits = PLAN\_LIMITS[planKey];

## **4.3 · Sección Modo y Escalada — Completar Funcionalidad**

|<p>**ESTADO ACTUAL: La página carga y guarda correctamente. Tiene buena estructura. Falta solo un detalle funcional.**</p><p>La sección Modo y Escalada está mayormente funcional. Solo corregir un edge case.</p>|
| :- |

**Corrección menor en handleSave — agregar validación antes de guardar:**

const handleSave = async () => {

`  `if (!currentWorkspaceId || !agentId) return;

`  `// Validar que mensajesSinResolucion sea >= 1

`  `if (!data.escalada?.mensajesSinResolucion ||

`      `data.escalada.mensajesSinResolucion < 1) {

`    `toast.error('El mínimo de mensajes sin resolución es 1');

`    `return;

`  `}

`  `// Validar que mensajeEscalada no esté vacío

`  `if (!data.escalada.mensajeEscalada?.trim()) {

`    `toast.error('El mensaje de escalada no puede estar vacío');

`    `return;

`  `}

`  `// ... resto del save existente

};

## **4.4 · Sección Horario — Agregar Horarios Especiales para Fin de Semana**

|<p>**MEJORA SOLICITADA — Muchos negocios tienen horarios diferentes el sábado y domingo. Se necesita configuración independiente para esos días.**</p><p>- Sábado y domingo deben poder tener horarios diferentes al rango Lunes-Viernes.</p><p>- Si un día está activado, mostrar sus campos de hora. Si no está activado, no mostrar horario para ese día.</p>|
| :- |

**Cambios en el tipo Agente (src/lib/types/firestore.ts)**

Reemplazar la interfaz del campo horario dentro de Agente con la siguiente versión extendida:

horario?: {

`  `diasActivos: string[];     // ['lun','mar','mie','jue','vie','sab','dom']

`  `horaInicio: string;        // '09:00' — horario base L-V

`  `horaFin: string;           // '18:00' — horario base L-V

`  `// Horarios especiales fin de semana (opcional)

`  `sabadoHoraInicio?: string; // Si está vacío, usa el horario base

`  `sabadoHoraFin?: string;

`  `domingoHoraInicio?: string;

`  `domingoHoraFin?: string;

`  `mensajeFueraHorario: string;

};

**Cambios en src/app/dashboard/ajustes/agentes/[id]/horario/page.tsx**

**1. Actualizar el estado inicial para incluir los nuevos campos:**

horario: {

`  `diasActivos: ['lun','mar','mie','jue','vie'],

`  `horaInicio: '09:00',

`  `horaFin: '18:00',

`  `sabadoHoraInicio: '09:00',

`  `sabadoHoraFin: '13:00',

`  `domingoHoraInicio: '10:00',

`  `domingoHoraFin: '13:00',

`  `mensajeFueraHorario: '...'

}

**2. Rediseñar la sección de días de la siguiente manera:**

- Separar visualmente los días en dos grupos: 'Días laborables' (lun-vie) y 'Fin de semana' (sab-dom).
- Para el grupo Lunes-Viernes: botones de toggle como actualmente. Cuando alguno está activo, mostrar los inputs de hora base (horaInicio / horaFin) debajo del grupo.
- Para Sábado: un botón toggle independiente. Cuando está activo, mostrar debajo dos inputs: 'Apertura sábado' (sabadoHoraInicio) y 'Cierre sábado' (sabadoHoraFin).
- Para Domingo: ídem sábado pero con los campos domingoHoraInicio y domingoHoraFin.
- Si sab/dom están activos pero no tienen hora especial configurada (campos vacíos), usar como fallback la hora base del agente.

**Layout visual de la nueva sección de días**

El diseño mantiene la estética actual (rounded-3xl, colores con CSS variables, botones toggle con bg-[var(--accent)]). La estructura visual debe ser:

|<p>**Días laborables (Lun - Vie)**</p><p>[Lunes] [Martes] [Miércoles] [Jueves] [Viernes]  ← botones toggle</p><p>Si alguno activo → Horario: [09:00] a [18:00]</p><p>**Fin de semana**</p><p>[Sábado]  ← toggle independiente</p><p>Si activo → Apertura: [09:00]  Cierre: [13:00]</p><p>[Domingo]  ← toggle independiente</p><p>Si activo → Apertura: [10:00]  Cierre: [13:00]</p>|
| :- |

**3. Actualizar handleSave para guardar todos los campos del horario incluyendo los nuevos.**

**Lógica en el motor de IA (src/lib/ai/prompts.ts)**

Actualizar construirSystemPrompt para incluir información de horario especial en el system prompt:

// En la sección de reglas del prompt, agregar:

if (agente.horarioActivo && agente.horario) {

`  `const h = agente.horario;

`  `let horarioDesc = `Horario Lun-Vie: ${h.horaInicio}-${h.horaFin}`;

`  `if (h.sabadoHoraInicio)

`    `horarioDesc += ` | Sáb: ${h.sabadoHoraInicio}-${h.sabadoHoraFin}`;

`  `if (h.domingoHoraInicio)

`    `horarioDesc += ` | Dom: ${h.domingoHoraInicio}-${h.domingoHoraFin}`;

`  `horarioDesc += `. Mensaje fuera: '${h.mensajeFueraHorario}'`;

`  `// Agregar al prompt

}

# **5. Correcciones Menores (Baja Prioridad)**

## **5.1 · Corregir Export de analytics en firebase.ts**
En src/lib/firebase.ts, analytics puede ser undefined. Cambiar la exportación para reflejarlo:

// ANTES:

export { app, auth, db, analytics };

// DESPUÉS: declarar explícitamente el tipo

export type { Analytics } from 'firebase/analytics';

export let analytics: import('firebase/analytics').Analytics | undefined;

// (mover la asignación al bloque if typeof window)

export { app, auth, db };

## **5.2 · Agregar Validación de Workspace Existente en Onboarding**
En src/app/onboarding/page.tsx, agregar verificación al inicio para evitar crear workspaces duplicados con Google Login:

// Agregar después del onAuthStateChanged, dentro del callback de user:

const q = query(

`  `collection(db, COLLECTIONS.ESPACIOS),

`  `where('propietarioUid', '==', user.uid),

`  `limit(1)

);

const snap = await getDocs(q);

if (!snap.empty) {

`  `router.push('/dashboard/operacion/inbox');

`  `return;

}

## **5.3 · Agregar Validación de Contraseña Mínima en Registro**
En src/app/auth/page.tsx, antes de llamar createUserWithEmailAndPassword, agregar:

if (registerPassword.length < 8) {

`  `toast.error('La contraseña debe tener al menos 8 caracteres');

`  `return;

}

# **6. Lo que NO Debe Modificarse**

|<p>**⚠️ Estas partes están funcionando correctamente. No tocar.**</p><p>- src/app/actions/ai.ts — chatPlaygroundAction y mejorarInstruccionesAction funcionan correctamente.</p><p>- src/lib/ai/prompts.ts — solo agregar el bloque de horario especial del punto 4.4.</p><p>- src/lib/ai/anthropic.ts — los modelos y el cliente están configurados correctamente.</p><p>- src/components/layout/AppLayout.tsx — la lógica de sesión y workspace es correcta.</p><p>- src/app/dashboard/ajustes/agentes/[id]/instrucciones/page.tsx — funcional y correcta.</p><p>- src/app/dashboard/ajustes/agentes/[id]/rol/page.tsx — funcional y correcta.</p><p>- src/app/dashboard/ajustes/agentes/[id]/archivos/page.tsx — funcional y correcta.</p><p>- src/app/dashboard/ajustes/agentes/[id]/playground/page.tsx — funcional y correcta.</p><p>- src/app/dashboard/cerebro/ — toda la sección de base de conocimiento global está correcta.</p><p>- Todo el sistema de CSS variables y la estética visual general.</p><p>- El sistema de tipos en src/lib/types/firestore.ts (solo agregar campos de horario del punto 4.4).</p>|
| :- |

# **7. Resumen y Orden de Ejecución**

|**#**|**Tarea**|**Prioridad**|**Archivo(s)**|
| :- | :- | :- | :- |
|1|Crear firestore.rules|🔴 Crítico|firestore.rules (nuevo)|
|2|VERIFY\_TOKEN a env var|🔴 Crítico|functions/src/index.ts|
|3|workspaceId del webhook|🔴 Crítico|functions/src/index.ts|
|4|Mover Puppeteer a Functions|🔴 Crítico|package.json, functions/|
|5|workspaceId inicial null|🔴 Crítico|useWorkspaceStore.ts|
|6|Alinear precios planes|🟡 Importante|planLimits.ts|
|7|Toggle IA en ChatWindow|🟡 Importante|ChatWindow.tsx|
|8|Google Login → onboarding|🟡 Importante|auth/page.tsx|
|9|Optimizar N+1 queries|🟡 Importante|ai/prompts.ts|
|10|Recursos: upload real|🔵 Mejora|agentes/[id]/recursos/|
|11|Textos: crear nuevo texto|🔵 Mejora|agentes/[id]/textos/|
|12|Modo/Escalada: validaciones|🔵 Mejora|agentes/[id]/modo/|
|13|Horario: fin de semana|🔵 Mejora|agentes/[id]/horario/|
|14|Export analytics|⚪ Menor|firebase.ts|
|15|Onboarding: check duplicado|⚪ Menor|onboarding/page.tsx|
|16|Validación contraseña|⚪ Menor|auth/page.tsx|

*Fecha de análisis: 14 de Abril de 2026  |  Repositorio: imala-vox-main.zip*
