# **IMALÁ VOX — Instrucciones Fase 3**

## **Conexión de Canales Meta \+ Módulo de Leads**

---

## **PARTE 1 — CATÁLOGO (placeholder)**

En `src/app/dashboard/cerebro/catalogo/page.tsx`, reemplazar el contenido actual por una pantalla de "Próximamente":

tsx  
export default function CatalogoPage() {  
  return (  
    \<div className\="flex flex-col items-center justify-center h-full min-h-\[500px\] p-12 text-center space-y-6"\>  
      \<div className\="w-16 h-16 rounded-2xl bg-\[var(--bg-input)\] border border-\[var(--border-light)\] flex items-center justify-center"\>  
        \<LayoutGrid className\="w-8 h-8 text-\[var(--text-tertiary-light)\]" /\>  
      \</div\>  
      \<div className\="space-y-2"\>  
        \<h2 className\="text-xl font-bold text-\[var(--text-primary-light)\]"\>Catálogo de Objetos\</h2\>  
        \<p className\="text-sm text-\[var(--text-tertiary-light)\] max-w-sm"\>  
          Próximamente podrás gestionar tu catálogo de propiedades y productos,  
          con scraping automático de portales inmobiliarios.  
        \</p\>  
      \</div\>  
      \<span className\="px-4 py-2 rounded-full bg-\[var(--accent)\]/10 border border-\[var(--accent)\]/20 text-xs font-bold text-\[var(--accent)\] uppercase tracking-wider"\>  
        En desarrollo  
      \</span\>  
    \</div\>  
  );  
}  
---

## **PARTE 2 — CONEXIÓN DE CANALES META (WhatsApp \+ Instagram \+ Facebook)**

### **2.1 Estructura en Firestore**

Agregar a `src/lib/types/firestore.ts`:

typescript  
export interface Canal {  
  tipo: 'whatsapp' | 'instagram' | 'facebook';  
  nombre: string;  
  cuenta: string;  
  status: 'connected' | 'disconnected' | 'error' | 'pending';  
  metaAccessToken?: string;  
  metaPageId?: string;  
  metaPhoneNumberId?: string;   // solo WhatsApp  
  metaInstagramId?: string;     // solo Instagram  
  webhookVerified: boolean;  
  creadoEl: Timestamp;  
  actualizadoEl: Timestamp;  
}

### **2.2 Variables de entorno necesarias**

Agregar a `.env.local`:

META\_APP\_ID=  
META\_APP\_SECRET=  
META\_WEBHOOK\_VERIFY\_TOKEN=imala-vox-webhook-2026

### **2.3 Webhook de Meta — Cloud Function / API Route**

Crear `src/app/api/webhooks/meta/route.ts`:

typescript  
import { NextRequest, NextResponse } from 'next/server';  
import { db } from '@/lib/firebase';  
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';  
import { COLLECTIONS } from '@/lib/types/firestore';

// GET — verificación del webhook por Meta  
export async function GET(request: NextRequest) {  
  const searchParams \= request.nextUrl.searchParams;  
  const mode \= searchParams.get('hub.mode');  
  const token \= searchParams.get('hub.verify\_token');  
  const challenge \= searchParams.get('hub.challenge');

  if (mode \=== 'subscribe' && token \=== process.env.META\_WEBHOOK\_VERIFY\_TOKEN) {  
    return new NextResponse(challenge, { status: 200 });  
  }  
  return new NextResponse('Forbidden', { status: 403 });  
}

// POST — recibir eventos de Meta (mensajes \+ leads)  
export async function POST(request: NextRequest) {  
  const body \= await request.json();

  // Verificar firma HMAC  
  const signature \= request.headers.get('x-hub-signature-256');  
  // TODO: verificar firma con META\_APP\_SECRET

  if (body.object \=== 'page') {  
    for (const entry of body.entry || \[\]) {  
      // Mensajes de WhatsApp/Instagram/Facebook  
      for (const change of entry.changes || \[\]) {  
        if (change.field \=== 'messages') {  
          await procesarMensajeEntrante(change.value);  
        }  
        // Leads de formularios Meta Lead Ads  
        if (change.field \=== 'leadgen') {  
          await procesarLeadMeta(change.value, entry.id);  
        }  
      }  
    }  
  }

  return NextResponse.json({ status: 'ok' });  
}

async function procesarLeadMeta(leadData: any, pageId: string) {  
  // Buscar el workspace que tiene esta página conectada  
  const wsQuery \= query(  
    collection(db, COLLECTIONS.ESPACIOS),  
    where('canalesPageIds', 'array-contains', pageId)  
  );  
  const wsSnap \= await getDocs(wsQuery);  
  if (wsSnap.empty) return;

  const wsId \= wsSnap.docs\[0\].id;

  // Obtener datos completos del lead desde Meta Graph API  
  const leadId \= leadData.leadgen\_id;  
  const formId \= leadData.form\_id;  
  const campaignName \= leadData.ad\_name || 'Sin nombre';

  // Llamar a Meta Graph API para obtener los campos del formulario  
  const metaRes \= await fetch(  
    \`https://graph.facebook.com/v19.0/${leadId}?access\_token=${process.env.META\_ACCESS\_TOKEN}\`  
  );  
  const metaLead \= await metaRes.json();

  // Mapear campos del formulario  
  const campos: Record\<string, string\> \= {};  
  for (const field of metaLead.field\_data || \[\]) {  
    campos\[field.name\] \= field.values?.\[0\] || '';  
  }

  // Guardar en Firestore  
  await addDoc(  
    collection(db, COLLECTIONS.ESPACIOS, wsId, COLLECTIONS.LEADS),  
    {  
      origen: 'meta\_ads',  
      etapa: 'nuevo',  
      temperatura: 'frio',  
      nombre: \`${campos.first\_name || ''} ${campos.last\_name || ''}\`.trim() || 'Sin nombre',  
      email: campos.email || null,  
      telefono: campos.phone\_number || null,  
      camposFormulario: campos,  
      metaLeadId: leadId,  
      metaFormId: formId,  
      metaPageId: pageId,  
      campana: campaignName,  
      formulario: leadData.form\_name || 'Formulario sin nombre',  
      notas: '',  
      convertidoAContacto: false,  
      contactoId: null,  
      creadoEl: Timestamp.now(),  
      actualizadoEl: Timestamp.now(),  
    }  
  );  
}

async function procesarMensajeEntrante(messageData: any) {  
  // Lógica existente de procesamiento de mensajes  
  console.log('Mensaje entrante Meta:', messageData);  
}

### **2.4 Agregar al objeto COLLECTIONS en firestore.ts**

typescript  
LEADS: 'leads',  
ETAPAS\_EMBUDO: 'etapasEmbudo',  
CANALES: 'canales',  
NOTIFICACIONES: 'notificaciones',  
---

## **PARTE 3 — MÓDULO DE LEADS**

### **3.1 Interfaz de datos**

Agregar a `firestore.ts`:

typescript  
export type TemperaturaLead \= 'frio' | 'tibio' | 'caliente';  
export type OrigenLead \= 'meta\_ads' | 'organico' | 'manual';

export interface Lead {  
  id?: string;  
  origen: OrigenLead;  
  etapa: string;               // ID de la etapa del embudo (ej: 'nuevo', 'contactado', o custom)  
  temperatura: TemperaturaLead;  
  nombre: string;  
  email: string | null;  
  telefono: string | null;  
  camposFormulario: Record\<string, string\>;  // respuestas del formulario Meta  
  metaLeadId?: string;  
  metaFormId?: string;  
  metaPageId?: string;  
  campana?: string;            // nombre de la campaña  
  formulario?: string;         // nombre del formulario  
  notas: string;  
  convertidoAContacto: boolean;  
  contactoId: string | null;   // referencia al contacto CRM si fue convertido  
  creadoEl: Timestamp;  
  actualizadoEl: Timestamp;  
}

export interface EtapaEmbudo {  
  id?: string;  
  nombre: string;  
  orden: number;               // posición en el embudo  
  color: string;               // hex para identificación visual  
  esDefault: boolean;          // las etapas default no se pueden eliminar  
}

### **3.2 Etapas default del embudo**

Al crear un workspace en onboarding, crear automáticamente estas etapas en `espaciosDeTrabajo/{wsId}/etapasEmbudo`:

typescript  
const ETAPAS\_DEFAULT: Omit\<EtapaEmbudo, 'id'\>\[\] \= \[  
  { nombre: 'Nuevos', orden: 0, color: '\#3B82F6', esDefault: true },  
  { nombre: 'Contactados', orden: 1, color: '\#F59E0B', esDefault: true },  
  { nombre: 'En seguimiento', orden: 2, color: '\#8B5CF6', esDefault: true },  
  { nombre: 'Calificados', orden: 3, color: '\#22C55E', esDefault: true },  
  { nombre: 'Cerrados', orden: 4, color: '\#6B7280', esDefault: true },  
\];

### **3.3 Ruta y navegación**

Agregar en el sidebar principal bajo OPERACIÓN:

OPERACIÓN  
  → Bandeja de entrada  
  → Leads               ← NUEVO  
  → Contactos  
  → Difusión

Crear ruta: `src/app/dashboard/operacion/leads/page.tsx`

### **3.4 Vista de Leads — dos modos de visualización**

La página tiene un toggle en el header: **Vista Kanban** | **Vista Lista**

#### **VISTA KANBAN (default)**

\[Nuevos (3)\]    \[Contactados (1)\]    \[En seguimiento (2)\]    \[Calificados (0)\]    \[Cerrados (5)\]    \[+ Nueva etapa\]  
   ┌──────┐         ┌──────┐             ┌──────┐  
   │ Lead │         │ Lead │             │ Lead │  
   │ Card │         │ Card │             │ Card │  
   └──────┘         └──────┘             └──────┘  
   ┌──────┐  
   │ Lead │  
   │ Card │  
   └──────┘

Cada columna representa una etapa. Los leads se arrastran entre columnas para cambiar de etapa (usar `@dnd-kit/core` para drag and drop — ya es una dependencia común con shadcn).

**LeadCard en vista kanban:**

tsx  
// Card compacta con:  
// \- Indicador de temperatura (punto de color: azul=frío, naranja=tibio, rojo=caliente)  
// \- Nombre del lead  
// \- Badge de origen: "Meta Ads" (verde lima) | "Orgánico" (azul) | "Manual" (gris)  
// \- Nombre de campaña (si origen es meta\_ads) — texto pequeño truncado  
// \- Email y/o teléfono en texto secundario  
// \- Fecha de creación relativa ("hace 2 horas")  
// \- Botones de acción rápida al hover: Chat WA | Convertir | Ver detalle

#### **VISTA LISTA**

Tabla con columnas:

Nombre | Origen | Campaña/Formulario | Teléfono | Email | Etapa | Temperatura | Fecha | Acciones

Ordenable por cualquier columna. Filas clickeables que abren el panel de detalle.

### **3.5 Panel de detalle del lead (sheet lateral)**

Al hacer clic en un lead, abrir un Sheet (panel lateral derecho, 480px) con:

┌─────────────────────────────────┐  
│ \[Nombre lead\]          \[×\]      │  
│ \[Badge origen\] \[Badge etapa\]    │  
├─────────────────────────────────┤  
│ INFORMACIÓN DE CONTACTO         │  
│ Teléfono: \+54...                │  
│ Email: ...                      │  
├─────────────────────────────────┤  
│ ORIGEN DE LA CAMPAÑA            │  
│ Campaña: \[nombre campaña\]       │  
│ Formulario: \[nombre formulario\] │  
├─────────────────────────────────┤  
│ RESPUESTAS DEL FORMULARIO       │  
│ \[campo\]: \[respuesta\]            │  
│ \[campo\]: \[respuesta\]            │  
├─────────────────────────────────┤  
│ TEMPERATURA                     │  
│ \[Frío\] \[Tibio\] \[Caliente\]       │  
├─────────────────────────────────┤  
│ ETAPA DEL EMBUDO                │  
│ \[selector de etapa\]             │  
├─────────────────────────────────┤  
│ NOTAS INTERNAS                  │  
│ \[textarea libre\]                │  
├─────────────────────────────────┤  
│ \[Iniciar chat WhatsApp\]         │  
│ \[Convertir a contacto CRM\]      │  
└─────────────────────────────────┘

### **3.6 Filtros y búsqueda**

Barra de filtros sobre la vista (tanto kanban como lista):

tsx  
// Input de búsqueda: nombre, email, teléfono  
// Filtro Origen: Todos | Meta Ads | Orgánicos | Manuales  
// Filtro Campaña: dropdown con campañas únicas detectadas en los leads  
// Filtro Temperatura: Todos | Frío | Tibio | Caliente  
// Filtro Fecha: Hoy | Esta semana | Este mes | Rango personalizado

### **3.7 Gestión de etapas del embudo**

Botón "+ Nueva etapa" al final del kanban abre un popover inline:

tsx  
// Input: nombre de la etapa  
// Selector de color (8 colores predefinidos de nuestra paleta)  
// Botón "Agregar"  
// Las etapas default (Nuevos, Contactados, etc.) tienen ícono de lock — no se pueden eliminar  
// Las etapas custom tienen botón de eliminar (solo si no hay leads en esa etapa)

### **3.8 Métricas en el header de la vista**

Sobre la barra de filtros, 4 métricas rápidas:

tsx  
// Total leads este mes | Leads hoy | Convertidos a contacto | Tasa de conversión %

### **3.9 Acción "Convertir a contacto CRM"**

typescript  
async function convertirLeadAContacto(leadId: string, lead: Lead) {  
  // 1\. Crear contacto en la colección contactos del workspace  
  const contactoRef \= await addDoc(  
    collection(db, COLLECTIONS.ESPACIOS, wsId, COLLECTIONS.CONTACTOS),  
    {  
      nombre: lead.nombre,  
      email: lead.email,  
      telefono: lead.telefono,  
      relacionTag: 'Lead',  
      aiBlocked: false,  
      etiquetas: \['lead-meta-ads'\],   // si origen es meta\_ads  
      creadoEl: serverTimestamp(),  
    }  
  );

  // 2\. Marcar el lead como convertido  
  await updateDoc(doc(db, COLLECTIONS.ESPACIOS, wsId, COLLECTIONS.LEADS, leadId), {  
    convertidoAContacto: true,  
    contactoId: contactoRef.id,  
    actualizadoEl: serverTimestamp(),  
  });

  toast.success('Lead convertido a contacto CRM');  
}

### **3.10 Acción "Iniciar chat WhatsApp"**

typescript  
function iniciarChatWhatsApp(lead: Lead) {  
  if (\!lead.telefono) {  
    toast.error('Este lead no tiene número de teléfono');  
    return;  
  }  
  // Si ya fue convertido a contacto, navegar al inbox con ese contacto seleccionado  
  if (lead.contactoId) {  
    router.push(\`/dashboard/operacion/inbox?contactoId=${lead.contactoId}\`);  
  } else {  
    // Convertir primero, luego abrir inbox  
    toast.info('Primero convertí el lead a contacto para iniciar una conversación');  
  }  
}

### **3.11 Dependencias a instalar**

bash  
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities  
---

## **PARTE 4 — ORDEN DE IMPLEMENTACIÓN**

1. Placeholder "Próximamente" en Catálogo  
2. Tipos Lead, EtapaEmbudo y Canal en firestore.ts  
3. Agregar LEADS, ETAPAS\_EMBUDO, CANALES a COLLECTIONS  
4. Crear etapas default en onboarding/page.tsx al crear workspace  
5. Agregar "Leads" al sidebar bajo OPERACIÓN  
6. Construir leads/page.tsx — primero vista lista (más simple), luego kanban  
7. Construir panel de detalle (Sheet lateral)  
8. Implementar filtros y búsqueda  
9. Implementar gestión de etapas custom  
10. Implementar convertir a contacto \+ iniciar chat  
11. Crear API route del webhook Meta (`/api/webhooks/meta`)  
12. Actualizar canales/page.tsx para leer de Firestore (Issue C ya resuelto)  
13. Conectar lógica de recepción de leads del webhook al módulo de Leads

---

## **NOTA IMPORTANTE**

La conexión real del token de acceso de Meta (para que los leads lleguen automáticamente) requiere que el usuario autorice la app de Meta con su Página de Facebook. Esto usa el flujo OAuth de Meta Business. Por ahora, implementar la UI completa del módulo de Leads con leads de prueba cargados manualmente, y el webhook listo para recibir. La conexión OAuth de Meta se activa cuando el usuario hace clic en "Conectar" en Canales/page.tsx — esa UX completa se termina de implementar junto con la conexión de WhatsApp en esta misma fase.

