## **Propuesta de Diseño Mobile — Imala Vox**

### **Contexto del estado actual**

* Layout 3 columnas (Sidebar \+ Main \+ ContextPanel) — **no tiene ninguna adaptación mobile**  
* Diseño dark sidebar `#1F1F1E` \+ main claro `#F5F5F4` \+ acento lima `#C8FF00`  
* Componentes shadcn/ui \+ Tailwind v4  
* **Sin PWA** — hay que construirla desde cero

---

## **1\. ESTRATEGIA GENERAL**

### **Principio base**

**"Mobile es una app separada dentro del mismo proyecto"** — no es responsive del desktop, es un layout completamente distinto que se activa bajo `<768px`. El desktop no cambia nada.

### **Detección de contexto**

Un hook `useMobileLayout()` detecta el breakpoint y el store de UI ya maneja esto. El mismo `AppLayout.tsx` renderiza uno de dos árboles: el desktop actual, o el nuevo árbol mobile.

---

## **2\. PWA — INSTALABLE DESDE SAFARI**

### **Configuración necesaria**

* `public/manifest.json` con nombre, iconos, colores, `display: "standalone"`, `orientation: "portrait"`  
* Meta tags específicos de iOS en el `<head>`: `apple-mobile-web-app-capable`, `apple-touch-icon`, status bar style  
* Service Worker básico (solo cache de shell — no offline complejo)  
* Plugin `next-pwa` o configuración manual en `next.config.ts`

### **Experiencia de instalación**

Cuando el usuario abre la URL en Safari, aparece el banner nativo de iOS "Agregar a pantalla de inicio". La app se abre sin chrome del navegador, con barra de status en negro (combinando con el dark de la sidebar), icono con el logo de Imala sobre fondo `#1F1F1E`.

---

## **3\. NAVEGACIÓN MOBILE — BOTTOM TAB BAR**

**Reemplaza completamente la sidebar** en mobile. Barra fija en la parte inferior con 5 tabs:

```
[  Bandeja  ] [  Leads  ] [  Tareas  ] [  Contactos  ] [  Más  ]
     💬            🎯          ✓               👤           ···
```

* **Bandeja**: icono de chat con badge de mensajes no leídos (número rojo)  
* **Leads**: icono de embudo con badge de leads nuevos  
* **Tareas**: icono de check con badge de tareas vencidas  
* **Contactos**: icono de persona  
* **Más**: abre un bottom sheet con: Ajustes, Perfil, Cerrar sesión — y nada más

**Diseño de la barra:**

* Fondo `#1F1F1E` (igual que la sidebar desktop)  
* Íconos inactivos en gris `#6B7280`  
* Tab activo: ícono \+ label en `#C8FF00` (el acento lima)  
* Altura: 64px \+ safe area insets de iOS (padding-bottom: `env(safe-area-inset-bottom)`)  
* Sin borde superior, sutil sombra hacia arriba

---

## **4\. SECCIONES ESENCIALES EN MOBILE**

### **4.1 BANDEJA DE ENTRADA (prioridad máxima)**

**Vista lista de conversaciones:**

* Lista de tarjetas full-width, una por conversación  
* Cada tarjeta muestra: avatar del contacto (inicial \+ color de canal), nombre, último mensaje truncado, hora, badge de canal (WhatsApp/Messenger/Instagram/Web) con su color de marca, indicador de no leído  
* Swipe derecha → marcar como leído / Swipe izquierda → archivar (acción rápida)  
* Tap → abre vista de conversación completa

**Vista de conversación (full screen):**

* Header: botón volver \+ nombre del contacto \+ avatar \+ botón de "Ver perfil"  
* Burbujas de chat estilo WhatsApp (no tabla)  
* Input fijo abajo con botón enviar y botón de respuesta automática IA (el acento lima)  
* El panel de contexto del desktop NO aparece — hay un botón "Ver perfil" que abre un **bottom sheet** deslizable con la info del contacto  
* En el header también: botón de acción rápida según el canal — si es WhatsApp aparece el ícono de WhatsApp para abrir la conversación nativa, si es Messenger abre Messenger, etc.

### **4.2 LEADS**

**Vista principal:**

* Selector de vista: Lista o Kanban simplificado (swipe horizontal entre columnas)  
* En lista: tarjetas con nombre, canal de origen, estado (chip de color), fecha, y si tiene teléfono → botón de acción rápida directo en la tarjeta  
* Botón de teléfono en la tarjeta despliega un **action sheet** nativo con dos opciones: "Llamar" (abre el marcador) y "Enviar por WhatsApp" (abre `https://wa.me/[número]`)  
* Tap en la tarjeta → detalle del lead en pantalla completa con todas sus respuestas del formulario

**Vista detalle de lead:**

* Header con nombre \+ botones de acción rápida arriba  
* Secciones colapsables: Datos de contacto, Respuestas del formulario, Historial  
* CTA flotante: botón "Responder" que abre action sheet de canales

### **4.3 CONTACTOS**

**Vista tarjetas** (no tabla):

* Grid de 2 columnas con tarjetas compactas  
* Cada tarjeta: avatar grande (inicial en círculo con color), nombre, canal principal con badge, última actividad  
* Tap en tarjeta → perfil completo  
* Botón de búsqueda siempre visible en el header  
* Si tiene teléfono → en el perfil aparecen 2 botones grandes: "Llamar" y "WhatsApp"

### **4.4 TAREAS**

**Vista lista simple:**

* Tarjetas de tareas con: título, fecha límite (resaltada en rojo si está vencida), etiqueta de contacto asociado, checkbox para completar  
* Swipe derecha → completar / Swipe izquierda → eliminar  
* Filtro rápido arriba: Hoy / Pendientes / Completadas (chips horizontales scrolleables)  
* FAB (floating action button) en lima `#C8FF00` para crear nueva tarea

### **4.5 "MÁS" — Bottom Sheet**

Desde el tab "Más" se despliega un bottom sheet con:

* Avatar del usuario \+ nombre \+ email  
* "Mi perfil" → pantalla de perfil  
* "Ajustes básicos" → solo notificaciones y preferencias de idioma  
* "Cerrar sesión" → con confirmación

**Lo que NO va en mobile:** Cerebro (catálogo, knowledge base, scraper), configuración de Agentes IA, Workflows, Canales, Etiquetas avanzadas, Facturación. Si el usuario intenta acceder desde mobile verá un mensaje "Esta sección está disponible en escritorio".

---

## **5\. PATRONES DE INTERACCIÓN MÓVIL**

### **Click-to-action en teléfonos**

Cualquier número de teléfono en toda la app mobile se convierte en un botón que despliega:

```
┌─────────────────────────┐
│  +54 9 11 1234-5678     │
├─────────────────────────┤
│  📞 Llamar              │
│  💬 Enviar por WhatsApp │
│  📋 Copiar número       │
└─────────────────────────┘
```

### **Respuesta rápida por canal**

En Bandeja y Leads, siempre hay un botón visible del canal de origen con su ícono de marca. Tap → abre la app nativa o web del canal directamente en esa conversación.

### **Gestos**

* Pull-to-refresh en todas las listas  
* Swipe en tarjetas para acciones rápidas  
* Bottom sheets en lugar de modales (más natural en mobile)

---

## **6\. SISTEMA DE DISEÑO MOBILE**

### **Lo que se mantiene igual**

* Paleta de colores exacta (no hay tema separado)  
* Tipografía Geist Sans  
* Componentes shadcn/ui base  
* Bordes redondeados y espaciado actual

### **Lo que cambia en mobile**

* Sidebar → Bottom Tab Bar  
* Tablas → Listas de tarjetas  
* 3 columnas → pantalla completa por paso  
* Modales → Bottom Sheets (se deslizan desde abajo, más natural en iOS)  
* Hover states → Touch states con feedback táctil (`active:scale-[0.98]`)  
* Tamaño mínimo de tap target: 44×44px (Apple HIG)

### **Tamaños y espaciado**

* Font base body: 16px (evita zoom automático de iOS)  
* Padding horizontal: 16px  
* Espaciado entre tarjetas: 8px  
* Altura de tarjeta de conversación: 72px  
* Altura de bottom bar: 64px \+ safe area

---

## **7\. ARCHIVOS Y ESTRUCTURA TÉCNICA**

### **Archivos nuevos a crear**

```
public/
  manifest.json
  icons/
    icon-192.png
    icon-512.png
    apple-touch-icon.png
  sw.js (service worker básico)

src/
  components/
    layout/
      MobileLayout.tsx        ← árbol de layout mobile
      BottomTabBar.tsx        ← barra de navegación
      BottomSheet.tsx         ← componente reutilizable
    mobile/
      inbox/
        MobileConversationList.tsx
        MobileConversationView.tsx
        MobileContactSheet.tsx
      leads/
        MobileLeadsList.tsx
        MobileLeadDetail.tsx
      contacts/
        MobileContactsGrid.tsx
        MobileContactProfile.tsx
      tasks/
        MobileTasksList.tsx
      shared/
        PhoneActionSheet.tsx   ← click-to-call/whatsapp
        QuickChannelButton.tsx ← botón de canal con deeplink
  hooks/
    useMobileLayout.ts         ← detecta breakpoint
```

### **Modificaciones a archivos existentes**

* `AppLayout.tsx` — agrega fork: si `isMobile` renderiza `MobileLayout`, si no el layout actual  
* `layout.tsx` (root) — agrega meta tags PWA de iOS  
* `next.config.ts` — agrega headers de PWA y configuración de service worker  
* `globals.css` — agrega variables CSS para safe areas de iOS

---

## **8\. LO QUE QUIZÁS NO CONTEMPLASTE**

**a) Notificaciones push:** Para que el vendedor reciba un aviso cuando llega un mensaje, leads necesitarían push notifications. El PWA de iOS (desde iOS 16.4+) ya soporta Web Push Notifications. Vale la pena incluirlo — es clave para el caso de uso del vendedor.

**b) Badge en el ícono de la app:** El PWA puede mostrar el número de conversaciones sin leer como badge en el ícono de la app en iOS (también desde iOS 16.4+).

**c) Deep links desde WhatsApp/Messenger hacia la app:** Cuando un cliente escribe por WhatsApp y el sistema lo recibe, se podría generar un link que abra directamente esa conversación en la app. Útil para las notificaciones.

**d) Modo offline básico:** Con el service worker se puede cachear la shell de la app para que cargue aunque no haya internet, con un banner "Sin conexión" cuando no haya datos.

**e) Haptic feedback:** En iOS el PWA puede usar `navigator.vibrate()` para feedback táctil al completar acciones (marcar tarea como hecha, enviar mensaje). Pequeño detalle que hace sentir la app muy nativa.

---

## **RESUMEN DE PRIORIDADES**

| Prioridad | Item |
| ----- | ----- |
| 1 | PWA manifest \+ iOS meta tags |
| 2 | Bottom Tab Bar \+ MobileLayout fork en AppLayout |
| 3 | Bandeja mobile (lista \+ conversación) |
| 4 | Leads mobile \+ click-to-call/WhatsApp |
| 5 | Contactos en tarjetas |
| 6 | Tareas mobile |
| 7 | Push notifications |

---

¿Qué te parece esta propuesta? Dime qué querés ajustar, agregar o descartar antes de armar el documento final que le vas a pasar a Claude Code o Gemini para ejecutar.

consulta: si hacemos esta implementacion, luego es dificil poder hacerle mantenimiento de tener dos diseños distintos? q pasa si quiero volver atras con la implementacion. es facil q vuelva al estado en q esta ahora? la idea es copiar en bandeja de entrada algo similar a whatsapp para a la gente le quede esa idea de q es parecida. tanto en la gestion de chat como en la gestion de contactos. y en la seccion de tareas quizas podemos copiar la idea de la aplicacion q se llama: https://www.todoist.com/ que tiene una buena manera de trabajar en vista celular.

1.   
2.   
3. 

Buenas preguntas. Te respondo directo:

---

## **¿Es difícil mantener dos diseños?**

**No, si lo hacemos bien.** La clave está en el fork que propuse en `AppLayout.tsx`:

```
if (isMobile) return <MobileLayout />
return <DesktopLayout />  // ← el actual, intacto
```

Los componentes mobile viven en su propia carpeta `src/components/mobile/` y **no tocan nada del desktop**. Son archivos nuevos, no modificaciones. El desktop sigue funcionando exactamente igual.

El mantenimiento real implica: cuando agregás una feature nueva (ej. un nuevo tipo de lead), la hacés en desktop como siempre, y si querés que aparezca en mobile también la implementás allí. No es doble trabajo automático — es una decisión consciente por feature.

---

## **¿Es fácil revertir?**

**Muy fácil.** Básicamente es:

1. Borrar la carpeta `src/components/mobile/`  
2. Sacar el fork de `AppLayout.tsx` (3 líneas)  
3. Sacar el manifest y service worker de `public/`

Git hace esto en un comando si quedó en una branch separada. **Recomiendo fuertemente trabajar en una branch `feature/mobile`** — así el rollback es literalmente `git revert` o simplemente no mergear.

---

## **Inspiraciones de diseño**

Buena referencia WhatsApp para Bandeja \+ Contactos, y Todoist para Tareas. Lo que tomaría de cada una:

**WhatsApp:**

* Lista de chats: foto/avatar, nombre en negrita, último mensaje en gris, hora arriba a la derecha, badge circular con número  
* Conversación: burbujas con cola, fondo con textura sutil, input pegado abajo con ícono de send  
* Deslizar tarjeta de chat para acciones (archivar, silenciar)  
* Barra de búsqueda al hacer scroll hacia arriba

**Todoist:**

* Tareas como lista simple con checkbox circular a la izquierda  
* Subtareas indentadas  
* Chips de fecha con color rojo si venció, naranja si es hoy  
* Sección "Hoy" como vista principal  
* Swipe para completar con animación de tachado  
* FAB "+" para agregar tarea rápida con input inline (sin abrir pantalla nueva)

---

Una cosa a confirmar antes de seguir: ¿querés que el plan final incluya estas dos referencias como guía visual concreta para el ejecutor (Claude Code / Gemini), o preferís que el plan sea más técnico/estructural y dejás las referencias visuales como comentario aparte?

quiero que el plan tenga todo el detalle de estructura, tecnico y visual al detalle para q la ia no se pierda.

Antes de escribir el plan final necesito leer algunos archivos clave para que los detalles técnicos sean exactos y no genéricos.

**Read** d:\\Sistemas David\\Imala-Vox\\src\\app\\globals.css  
**Read** d:\\Sistemas David\\Imala-Vox\\src\\components\\layout\\AppLayout.tsx  
**Read** d:\\Sistemas David\\Imala-Vox\\src\\app\\layout.tsx  
**Read** d:\\Sistemas David\\Imala-Vox\\next.config.ts  
**Read** d:\\Sistemas David\\Imala-Vox\\src\\store\\useUIStore.ts  
**Glob**pattern: "src/app/dashboard/operacion/inbox/\*\*/\*.tsx"Found 1 file  
**Read** d:\\Sistemas David\\Imala-Vox\\src\\app\\dashboard\\operacion\\inbox\\page.tsx  
**Glob**pattern: "src/app/dashboard/operacion/\*\*/\*.tsx"Found 4 files  
**Read** d:\\Sistemas David\\Imala-Vox\\src\\app\\dashboard\\operacion\\leads\\page.tsx  
**Read** d:\\Sistemas David\\Imala-Vox\\src\\app\\dashboard\\operacion\\tareas\\page.tsx  
Tengo todo lo que necesito. Acá va el plan completo:

---

# **PLAN DE IMPLEMENTACIÓN MOBILE — IMALA VOX**

**Versión 1.0 — Para ejecución por IA**

---

## **CONTEXTO DEL PROYECTO**

* **Framework:** Next.js App Router (ver `node_modules/next/dist/docs/` antes de escribir código)  
* **Estilos:** Tailwind CSS v4 (postcss, sin `tailwind.config.js`) \+ shadcn/ui  
* **Fuente:** Geist Sans via variable CSS `--font-sans`  
* **Estado global:** Zustand — `useWorkspaceStore` y `useUIStore`  
* **Backend:** Firebase Firestore \+ Firebase Auth  
* **Componentes:** shadcn/ui \+ Lucide React para íconos

### **Paleta de colores exacta (no inventar valores):**

```
--bg-sidebar:          #1F1F1E   ← fondo nav mobile
--bg-sidebar-hover:    #2A2A28
--bg-main:             #F5F5F4   ← fondo pantallas
--bg-card:             #FFFFFF   ← tarjetas y burbujas
--bg-input:            #EFEFED
--accent:              #C8FF00   ← tab activo, FAB, CTAs
--accent-text:         #1A1A18   ← texto sobre acento
--text-primary-light:  #1A1A18
--text-secondary-light:#6B6B67
--text-tertiary-light: #A3A39E
--border-light:        #E5E5E3
--success:             #22C55E
--error:               #EF4444
--warning:             #F59E0B
--radius-lg:           12px
--radius-xl:           16px
```

---

## **PARTE 1 — PWA (INSTALABLE DESDE SAFARI iOS)**

### **1.1 Crear `public/manifest.json`**

```json
{
  "name": "Imalá Vox",
  "short_name": "Imalá Vox",
  "description": "Gestión de conversaciones y leads desde tu celular",
  "start_url": "/dashboard/operacion/inbox",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#1F1F1E",
  "theme_color": "#1F1F1E",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### **1.2 Crear `public/icons/`**

Generar dos íconos PNG del logo de Imala sobre fondo `#1F1F1E`:

* `icon-192.png` → 192×192px  
* `icon-512.png` → 512×512px  
* `apple-touch-icon.png` → 180×180px (mismo diseño, esquinas cuadradas — iOS las redondea solo)

### **1.3 Modificar `src/app/layout.tsx`**

Agregar en el `<head>` los meta tags de iOS y el link al manifest. El archivo actual exporta metadata como objeto — agregar también un export `viewport` separado para cumplir con Next.js App Router:

```
// Agregar estos exports en src/app/layout.tsx

export const metadata: Metadata = {
  title: "Imalá Vox - SaaS de Gestión de Agentes IA",
  description: "Gestión inteligente de conversaciones para WhatsApp, Instagram y Facebook.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Imalá Vox",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",         // ← clave para safe areas de iPhone con notch
  themeColor: "#1F1F1E",
};
```

Importar `Viewport` desde `"next"`.

### **1.4 Crear `public/sw.js` (Service Worker básico)**

```javascript
const CACHE_NAME = 'imala-vox-v1';
const SHELL_ASSETS = ['/', '/dashboard/operacion/inbox'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Solo responder con cache para navegación, no para API calls
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/'))
    );
  }
});
```

### **1.5 Registrar el Service Worker**

Crear `src/components/PwaRegister.tsx`:

```
"use client";
import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
```

Agregar `<PwaRegister />` dentro del `<body>` en `src/app/layout.tsx`.

---

## **PARTE 2 — HOOK DE DETECCIÓN MOBILE**

### **2.1 Crear `src/hooks/useMobileLayout.ts`**

```ts
import { useState, useEffect } from "react";

export function useMobileLayout() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isMobile;
}
```

---

## **PARTE 3 — FORK EN AppLayout**

### **3.1 Modificar `src/components/layout/AppLayout.tsx`**

Agregar al inicio del componente `AppLayout` (después de todos los hooks existentes, antes del return):

```
import { useMobileLayout } from "@/hooks/useMobileLayout";
import { MobileLayout } from "./MobileLayout";

// Dentro del componente AppLayout, después de todos los hooks:
const isMobile = useMobileLayout();

// En el return, reemplazar el bloque final:
if (isPublicRoute) return <>{children}</>;
if (isSessionLoading) return <AppLoadingSkeleton />;
if (isMobile) return <MobileLayout>{children}</MobileLayout>;

// El return original de desktop sigue intacto debajo
return (
  <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-main)]">
    {/* ... todo el layout desktop existente sin cambios ... */}
  </div>
);
```

**IMPORTANTE:** No modificar nada del layout desktop existente. Solo agregar el fork antes del return desktop.

---

## **PARTE 4 — MOBILE LAYOUT Y NAVEGACIÓN**

### **4.1 Crear `src/components/layout/MobileLayout.tsx`**

Este componente es el contenedor raíz de toda la experiencia mobile. Maneja:

* El área de contenido (pantalla menos la barra)  
* El Bottom Tab Bar fijo  
* Las safe areas de iOS

```
"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { BottomTabBar } from "./BottomTabBar";

interface MobileLayoutProps {
  children: React.ReactNode;
}

export function MobileLayout({ children }: MobileLayoutProps) {
  const pathname = usePathname();
  
  // En vista de conversación abierta ocultar la barra para más espacio
  const hideTabBar = pathname.includes("/inbox/") && pathname.split("/").length > 4;

  return (
    <div
      className="flex flex-col w-full bg-[var(--bg-main)]"
      style={{
        height: "100dvh",           // dvh para iOS Safari (descuenta la barra del navegador)
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      {/* Área de contenido — ocupa todo menos la tab bar */}
      <div
        className="flex-1 overflow-hidden"
        style={{
          paddingBottom: hideTabBar ? 0 : "calc(64px + env(safe-area-inset-bottom))",
        }}
      >
        {children}
      </div>

      {/* Bottom Tab Bar */}
      {!hideTabBar && <BottomTabBar />}
    </div>
  );
}
```

### **4.2 Crear `src/components/layout/BottomTabBar.tsx`**

Inspiración visual: barra de WhatsApp. Fondo oscuro `#1F1F1E`, tab activo en lima `#C8FF00`.

```
"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageCircle,
  Target,
  CheckSquare,
  Users,
  MoreHorizontal,
} from "lucide-react";
import { MasBottomSheet } from "@/components/mobile/shared/MasBottomSheet";
import { useConversaciones } from "@/hooks/useConversaciones";

const TABS = [
  {
    id: "inbox",
    label: "Bandeja",
    icon: MessageCircle,
    path: "/dashboard/operacion/inbox",
  },
  {
    id: "leads",
    label: "Leads",
    icon: Target,
    path: "/dashboard/operacion/leads",
  },
  {
    id: "tareas",
    label: "Tareas",
    icon: CheckSquare,
    path: "/dashboard/operacion/tareas",
  },
  {
    id: "contactos",
    label: "Contactos",
    icon: Users,
    path: "/dashboard/operacion/contactos",
  },
];

export function BottomTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [masOpen, setMasOpen] = useState(false);
  const { conversaciones } = useConversaciones();

  // Contar no leídos para badge en Bandeja
  const unreadCount = conversaciones.filter((c) => (c.unreadCount ?? 0) > 0).length;

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 flex items-center bg-[#1F1F1E] border-t border-[#2A2A28] z-50"
        style={{
          height: "64px",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {TABS.map((tab) => {
          const isActive = pathname.startsWith(tab.path);
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => router.push(tab.path)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 relative active:opacity-70 transition-opacity"
            >
              <div className="relative">
                <Icon
                  size={22}
                  className={isActive ? "text-[#C8FF00]" : "text-[#6B6B67]"}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                {/* Badge de no leídos — solo en Bandeja */}
                {tab.id === "inbox" && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-[#EF4444] text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-[3px] leading-none">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-medium ${
                  isActive ? "text-[#C8FF00]" : "text-[#6B6B67]"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* Tab "Más" */}
        <button
          onClick={() => setMasOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 active:opacity-70 transition-opacity"
        >
          <MoreHorizontal size={22} className="text-[#6B6B67]" strokeWidth={1.8} />
          <span className="text-[10px] font-medium text-[#6B6B67]">Más</span>
        </button>
      </div>

      <MasBottomSheet open={masOpen} onClose={() => setMasOpen(false)} />
    </>
  );
}
```

---

## **PARTE 5 — COMPONENTE BOTTOM SHEET (BASE REUTILIZABLE)**

### **5.1 Crear `src/components/mobile/shared/BottomSheet.tsx`**

Componente base que todos los bottom sheets del proyecto van a reutilizar. Se desliza desde abajo, oscurece el fondo, se puede cerrar con swipe down o tocando el fondo.

```
"use client";

import React, { useEffect } from "react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  maxHeight?: string;   // default "80vh"
}

export function BottomSheet({
  open,
  onClose,
  children,
  title,
  maxHeight = "80vh",
}: BottomSheetProps) {
  // Bloquear scroll del body cuando está abierto
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      {/* Overlay oscuro */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Panel deslizable */}
      <div
        className="relative bg-[#FFFFFF] rounded-t-[20px] overflow-hidden flex flex-col"
        style={{
          maxHeight,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Handle visual de arrastre */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-9 h-1 bg-[#E5E5E3] rounded-full" />
        </div>

        {/* Título opcional */}
        {title && (
          <div className="px-5 pb-3 pt-1 shrink-0 border-b border-[#E5E5E3]">
            <h3 className="text-[16px] font-semibold text-[#1A1A18]">{title}</h3>
          </div>
        )}

        {/* Contenido scrolleable */}
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
```

### **5.2 Crear `src/components/mobile/shared/MasBottomSheet.tsx`**

El sheet que se abre desde el tab "Más". Muestra perfil del usuario y opciones esenciales.

```
"use client";

import React from "react";
import { BottomSheet } from "./BottomSheet";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { User, Settings, LogOut, ChevronRight } from "lucide-react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

interface MasBottomSheetProps {
  open: boolean;
  onClose: () => void;
}

export function MasBottomSheet({ open, onClose }: MasBottomSheetProps) {
  const router = useRouter();
  const { workspace } = useWorkspaceStore();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/auth");
  };

  const navigate = (path: string) => {
    onClose();
    router.push(path);
  };

  const menuItems = [
    {
      icon: User,
      label: "Mi perfil",
      action: () => navigate("/dashboard/perfil"),
    },
    {
      icon: Settings,
      label: "Ajustes",
      action: () => navigate("/dashboard/ajustes"),
    },
  ];

  return (
    <BottomSheet open={open} onClose={onClose} maxHeight="60vh">
      {/* Nombre del workspace */}
      <div className="px-5 py-4 border-b border-[#E5E5E3]">
        <p className="text-[12px] text-[#A3A39E] uppercase tracking-wide mb-0.5">Espacio de trabajo</p>
        <p className="text-[16px] font-semibold text-[#1A1A18]">{workspace?.nombre || "Imalá Vox"}</p>
      </div>

      {/* Opciones */}
      <div className="py-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={item.action}
              className="w-full flex items-center gap-4 px-5 py-4 active:bg-[#F5F5F4] transition-colors"
            >
              <Icon size={20} className="text-[#6B6B67] shrink-0" />
              <span className="flex-1 text-left text-[15px] text-[#1A1A18]">{item.label}</span>
              <ChevronRight size={16} className="text-[#A3A39E]" />
            </button>
          );
        })}

        {/* Separador */}
        <div className="h-px bg-[#E5E5E3] mx-5 my-1" />

        {/* Cerrar sesión */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-5 py-4 active:bg-[#FEF2F2] transition-colors"
        >
          <LogOut size={20} className="text-[#EF4444] shrink-0" />
          <span className="flex-1 text-left text-[15px] text-[#EF4444] font-medium">Cerrar sesión</span>
        </button>
      </div>
    </BottomSheet>
  );
}
```

---

## **PARTE 6 — COMPONENTE PHONE ACTION (REUTILIZABLE)**

### **6.1 Crear `src/components/mobile/shared/PhoneActionSheet.tsx`**

Cualquier número de teléfono en la app mobile muestra este sheet al ser tocado.

```
"use client";

import React from "react";
import { BottomSheet } from "./BottomSheet";
import { Phone, MessageCircle, Copy } from "lucide-react";
import { toast } from "sonner";

interface PhoneActionSheetProps {
  phone: string;           // número con formato, ej: "+54 9 11 1234-5678"
  rawPhone: string;        // solo dígitos, ej: "5491112345678"
  open: boolean;
  onClose: () => void;
}

export function PhoneActionSheet({ phone, rawPhone, open, onClose }: PhoneActionSheetProps) {
  const handleCall = () => {
    window.location.href = `tel:${rawPhone}`;
    onClose();
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/${rawPhone}`, "_blank");
    onClose();
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(phone);
    toast.success("Número copiado");
    onClose();
  };

  const actions = [
    { icon: Phone, label: "Llamar", color: "#22C55E", action: handleCall },
    { icon: MessageCircle, label: "Enviar por WhatsApp", color: "#25D366", action: handleWhatsApp },
    { icon: Copy, label: "Copiar número", color: "#6B6B67", action: handleCopy },
  ];

  return (
    <BottomSheet open={open} onClose={onClose} maxHeight="40vh">
      <div className="px-5 py-3 border-b border-[#E5E5E3]">
        <p className="text-[17px] font-semibold text-[#1A1A18]">{phone}</p>
      </div>
      <div className="py-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={action.action}
              className="w-full flex items-center gap-4 px-5 py-4 active:bg-[#F5F5F4] transition-colors"
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${action.color}20` }}
              >
                <Icon size={18} style={{ color: action.color }} />
              </div>
              <span className="text-[15px] text-[#1A1A18]">{action.label}</span>
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
```

---

## **PARTE 7 — MOBILE INBOX (BANDEJA DE ENTRADA)**

**Inspiración visual:** WhatsApp — lista de chats, conversación full screen, burbujas.

### **7.1 Modificar `src/app/dashboard/operacion/inbox/page.tsx`**

Agregar fork mobile en `InboxContent`. El hook `useMobileLayout` decide qué renderizar:

```
import { useMobileLayout } from "@/hooks/useMobileLayout";
import { MobileInboxView } from "@/components/mobile/inbox/MobileInboxView";

// Dentro de InboxContent(), antes del return:
const isMobile = useMobileLayout();

if (isMobile) {
  return (
    <MobileInboxView
      conversaciones={conversaciones}
      selectedChatId={selectedChatId}
      mensajes={mensajes}
      onSelect={async (id) => {
        setSelectedChatId(id);
        if (currentWorkspaceId && id) {
          try {
            const convRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONVERSACIONES, id);
            await updateDoc(convRef, { unreadCount: 0 });
          } catch (e) {}
        }
      }}
      onSendMessage={handleSendMessage}
      onBack={() => setSelectedChatId(null)}
    />
  );
}
// El return desktop existente sigue abajo sin cambios
```

### **7.2 Crear `src/components/mobile/inbox/MobileInboxView.tsx`**

Orquestador: muestra lista O conversación según si hay un chat seleccionado.

```
"use client";

import React from "react";
import { MobileChatList } from "./MobileChatList";
import { MobileChatWindow } from "./MobileChatWindow";
import type { Conversacion, Mensaje } from "@/lib/types/firestore";

interface MobileInboxViewProps {
  conversaciones: Conversacion[];
  selectedChatId: string | null;
  mensajes: Mensaje[];
  onSelect: (id: string) => void;
  onSendMessage: (text: string, isInternal?: boolean) => void;
  onBack: () => void;
}

export function MobileInboxView({
  conversaciones,
  selectedChatId,
  mensajes,
  onSelect,
  onSendMessage,
  onBack,
}: MobileInboxViewProps) {
  const selectedChat = conversaciones.find((c) => c.id === selectedChatId);

  if (selectedChatId && selectedChat) {
    return (
      <MobileChatWindow
        conversacion={selectedChat}
        mensajes={mensajes}
        onSendMessage={onSendMessage}
        onBack={onBack}
      />
    );
  }

  return (
    <MobileChatList
      conversaciones={conversaciones}
      selectedId={selectedChatId || undefined}
      onSelect={onSelect}
    />
  );
}
```

### **7.3 Crear `src/components/mobile/inbox/MobileChatList.tsx`**

Lista de conversaciones estilo WhatsApp.

```
"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";
import { MobileChatListItem } from "./MobileChatListItem";
import type { Conversacion } from "@/lib/types/firestore";

interface MobileChatListProps {
  conversaciones: Conversacion[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function MobileChatList({ conversaciones, selectedId, onSelect }: MobileChatListProps) {
  const [search, setSearch] = useState("");

  const filtered = conversaciones.filter((c) => {
    if (!search) return true;
    const name = c.contactoNombre || c.contactoId || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full bg-[#FFFFFF]">
      {/* Header estilo WhatsApp */}
      <div className="px-4 pt-4 pb-2 bg-[#FFFFFF] border-b border-[#E5E5E3]">
        <h1 className="text-[22px] font-bold text-[#1A1A18] mb-3">Bandeja de entrada</h1>
        {/* Barra de búsqueda */}
        <div className="flex items-center gap-2 bg-[#EFEFED] rounded-[10px] px-3 py-2">
          <Search size={16} className="text-[#A3A39E] shrink-0" />
          <input
            type="text"
            placeholder="Buscar conversación..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-[15px] text-[#1A1A18] placeholder:text-[#A3A39E] outline-none"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-[#A3A39E] text-[14px]">
            No hay conversaciones
          </div>
        )}
        {filtered.map((conv) => (
          <MobileChatListItem
            key={conv.id}
            conversacion={conv}
            isSelected={conv.id === selectedId}
            onSelect={() => onSelect(conv.id)}
          />
        ))}
      </div>
    </div>
  );
}
```

### **7.4 Crear `src/components/mobile/inbox/MobileChatListItem.tsx`**

Tarjeta de conversación. Estilo WhatsApp: avatar con inicial, nombre, último mensaje, hora, badge de canal, badge de no leídos.

```
"use client";

import React from "react";
import type { Conversacion } from "@/lib/types/firestore";
import { CanalBadge } from "@/components/ui/CanalBadge";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface MobileChatListItemProps {
  conversacion: Conversacion;
  isSelected: boolean;
  onSelect: () => void;
}

// Colores de avatar por letra inicial
const AVATAR_COLORS = [
  "#C8FF00", "#22C55E", "#3B82F6", "#8B5CF6",
  "#F59E0B", "#EF4444", "#06B6D4", "#EC4899",
];

function getAvatarColor(name: string): string {
  const code = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[code];
}

export function MobileChatListItem({ conversacion, isSelected, onSelect }: MobileChatListItemProps) {
  const name = conversacion.contactoNombre || "Sin nombre";
  const initial = name.charAt(0).toUpperCase();
  const avatarBg = getAvatarColor(name);
  const hasUnread = (conversacion.unreadCount ?? 0) > 0;
  const unread = conversacion.unreadCount ?? 0;

  const timeLabel = conversacion.ultimaActividad
    ? formatDistanceToNow(conversacion.ultimaActividad.toDate(), {
        addSuffix: false,
        locale: es,
      })
    : "";

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-3 active:bg-[#F5F5F4] transition-colors border-b border-[#F0F0EE]"
    >
      {/* Avatar */}
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-[#1A1A18] font-bold text-[18px]"
        style={{ backgroundColor: avatarBg }}
      >
        {initial}
      </div>

      {/* Contenido central */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className={`text-[15px] truncate ${hasUnread ? "font-semibold text-[#1A1A18]" : "font-medium text-[#1A1A18]"}`}>
            {name}
          </span>
          <span className={`text-[12px] shrink-0 ml-2 ${hasUnread ? "text-[#C8FF00]" : "text-[#A3A39E]"}`}>
            {timeLabel}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={`text-[13px] truncate flex-1 ${hasUnread ? "text-[#1A1A18]" : "text-[#6B6B67]"}`}>
            {conversacion.ultimoMensaje || "Sin mensajes"}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {conversacion.canal && (
              <CanalBadge canal={conversacion.canal} size="xs" />
            )}
            {hasUnread && (
              <span className="bg-[#C8FF00] text-[#1A1A18] text-[11px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
```

### **7.5 Crear `src/components/mobile/inbox/MobileChatWindow.tsx`**

Conversación full screen. Header con botón volver \+ nombre \+ acciones. Burbujas estilo WhatsApp. Input fijo abajo.

```
"use client";

import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, Info, Send, Bot } from "lucide-react";
import type { Conversacion, Mensaje } from "@/lib/types/firestore";
import { MobileContactSheet } from "./MobileContactSheet";
import { MobileChatBubble } from "./MobileChatBubble";
import { QuickChannelButton } from "../shared/QuickChannelButton";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

interface MobileChatWindowProps {
  conversacion: Conversacion;
  mensajes: Mensaje[];
  onSendMessage: (text: string, isInternal?: boolean) => void;
  onBack: () => void;
}

export function MobileChatWindow({
  conversacion,
  mensajes,
  onSendMessage,
  onBack,
}: MobileChatWindowProps) {
  const [text, setText] = useState("");
  const [contactSheetOpen, setContactSheetOpen] = useState(false);
  const [isInternal, setIsInternal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll al último mensaje al cargar o al recibir nuevos
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSendMessage(trimmed, isInternal);
    setText("");
    inputRef.current?.focus();
  };

  const name = conversacion.contactoNombre || "Sin nombre";

  // Fondo de chat: patrón sutil gris claro (como WhatsApp Web en claro)
  return (
    <div className="flex flex-col h-full bg-[#ECE5DD]">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-3 py-2 bg-[#1F1F1E] shrink-0"
        style={{ paddingTop: "max(8px, env(safe-area-inset-top))" }}
      >
        <button
          onClick={onBack}
          className="p-2 -ml-1 active:opacity-70 transition-opacity"
        >
          <ArrowLeft size={22} className="text-[#EDEDED]" />
        </button>

        {/* Avatar + nombre */}
        <button
          onClick={() => setContactSheetOpen(true)}
          className="flex items-center gap-2.5 flex-1 min-w-0 active:opacity-80"
        >
          <div className="w-9 h-9 rounded-full bg-[#C8FF00] flex items-center justify-center text-[#1A1A18] font-bold text-[14px] shrink-0">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-[#EDEDED] truncate">{name}</p>
            {conversacion.modoIA === "activo" && (
              <p className="text-[11px] text-[#C8FF00]">IA activa</p>
            )}
          </div>
        </button>

        {/* Acciones derecha */}
        <div className="flex items-center gap-1">
          <QuickChannelButton canal={conversacion.canal} contactoId={conversacion.contactoId} />
          <button
            onClick={() => setContactSheetOpen(true)}
            className="p-2 active:opacity-70"
          >
            <Info size={20} className="text-[#EDEDED]" />
          </button>
        </div>
      </div>

      {/* Área de mensajes */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {mensajes.map((msg) => (
          <MobileChatBubble key={msg.id} mensaje={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Área de input — fija abajo */}
      <div
        className="bg-[#F0F0F0] px-3 py-2 shrink-0"
        style={{ paddingBottom: "calc(8px + env(safe-area-inset-bottom))" }}
      >
        {/* Toggle nota interna */}
        {isInternal && (
          <div className="mb-1.5 px-2 py-1 bg-[#F59E0B]/10 rounded-lg">
            <p className="text-[11px] text-[#F59E0B] font-medium">Nota interna — no se envía al contacto</p>
          </div>
        )}
        <div className="flex items-end gap-2">
          {/* Botón IA / Nota */}
          <button
            onClick={() => setIsInternal(!isInternal)}
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
              isInternal ? "bg-[#F59E0B]" : "bg-[#E5E5E3]"
            }`}
          >
            <Bot size={16} className={isInternal ? "text-white" : "text-[#6B6B67]"} />
          </button>

          {/* Textarea autoexpandible */}
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={isInternal ? "Escribe una nota interna..." : "Escribe un mensaje..."}
            rows={1}
            className="flex-1 bg-[#FFFFFF] rounded-[20px] px-4 py-2.5 text-[15px] text-[#1A1A18] placeholder:text-[#A3A39E] outline-none resize-none overflow-hidden leading-[1.4]"
            style={{ minHeight: "40px", maxHeight: "120px" }}
          />

          {/* Botón enviar */}
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="w-9 h-9 rounded-full bg-[#C8FF00] flex items-center justify-center shrink-0 disabled:opacity-40 active:bg-[#B8EF00] transition-colors"
          >
            <Send size={16} className="text-[#1A1A18]" />
          </button>
        </div>
      </div>

      {/* Sheet de info del contacto */}
      <MobileContactSheet
        conversacion={conversacion}
        open={contactSheetOpen}
        onClose={() => setContactSheetOpen(false)}
      />
    </div>
  );
}
```

### **7.6 Crear `src/components/mobile/inbox/MobileChatBubble.tsx`**

```
"use client";

import React from "react";
import type { Mensaje } from "@/lib/types/firestore";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface MobileChatBubbleProps {
  mensaje: Mensaje;
}

export function MobileChatBubble({ mensaje }: MobileChatBubbleProps) {
  const isFromOperator = mensaje.from === "operator";
  const isInternal = mensaje.metadata?.isInternalNote === true;
  const isIA = mensaje.from === "agent" || mensaje.from === "ia";

  const time = mensaje.creadoEl
    ? format(mensaje.creadoEl.toDate(), "HH:mm", { locale: es })
    : "";

  if (isInternal) {
    return (
      <div className="flex justify-center my-1">
        <div className="bg-[#F59E0B]/15 border border-[#F59E0B]/30 rounded-[12px] px-3 py-2 max-w-[80%]">
          <p className="text-[12px] text-[#92400E] font-medium mb-0.5">Nota interna</p>
          <p className="text-[13px] text-[#92400E]">{mensaje.text}</p>
          <p className="text-[10px] text-[#92400E]/60 text-right mt-1">{time}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isFromOperator || isIA ? "justify-end" : "justify-start"} mb-0.5`}>
      <div
        className="max-w-[78%] rounded-[18px] px-3.5 py-2 relative"
        style={{
          backgroundColor:
            isFromOperator
              ? "#C8FF00"
              : isIA
              ? "#DCF8C6"
              : "#FFFFFF",
          borderBottomRightRadius: isFromOperator || isIA ? "4px" : "18px",
          borderBottomLeftRadius: isFromOperator || isIA ? "18px" : "4px",
        }}
      >
        {isIA && (
          <p className="text-[10px] text-[#22C55E] font-semibold mb-0.5">Imalá IA</p>
        )}
        <p className="text-[14px] text-[#1A1A18] leading-[1.45] whitespace-pre-wrap">{mensaje.text}</p>
        <p className="text-[10px] text-[#6B6B67] text-right mt-1 -mb-0.5">{time}</p>
      </div>
    </div>
  );
}
```

### **7.7 Crear `src/components/mobile/inbox/MobileContactSheet.tsx`**

Panel deslizable con info del contacto. Aparece al tocar "Ver perfil" o el ícono de info.

```
"use client";

import React, { useState } from "react";
import { BottomSheet } from "../shared/BottomSheet";
import { PhoneActionSheet } from "../shared/PhoneActionSheet";
import type { Conversacion } from "@/lib/types/firestore";
import { useContactoById } from "@/hooks/useContactos";
import { Phone, Mail, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

interface MobileContactSheetProps {
  conversacion: Conversacion;
  open: boolean;
  onClose: () => void;
}

export function MobileContactSheet({ conversacion, open, onClose }: MobileContactSheetProps) {
  const [phoneSheetOpen, setPhoneSheetOpen] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState("");
  const router = useRouter();
  const { contacto } = useContactoById(conversacion.contactoId);

  const handlePhoneTap = (phone: string) => {
    const raw = phone.replace(/\D/g, "");
    setSelectedPhone(phone);
    setPhoneSheetOpen(true);
  };

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title="Perfil del contacto" maxHeight="75vh">
        <div className="px-5 py-4 space-y-4">
          {/* Avatar y nombre */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-[#C8FF00] flex items-center justify-center text-[#1A1A18] font-bold text-[22px]">
              {(contacto?.nombre || "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-[18px] font-semibold text-[#1A1A18]">{contacto?.nombre || "Sin nombre"}</p>
              {contacto?.email && (
                <p className="text-[13px] text-[#6B6B67]">{contacto.email}</p>
              )}
            </div>
          </div>

          {/* Teléfono — tappable */}
          {contacto?.telefono && (
            <button
              onClick={() => handlePhoneTap(contacto.telefono!)}
              className="w-full flex items-center gap-3 bg-[#F5F5F4] rounded-[12px] px-4 py-3 active:bg-[#EFEFED] transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[#22C55E]/15 flex items-center justify-center">
                <Phone size={15} className="text-[#22C55E]" />
              </div>
              <span className="text-[15px] text-[#1A1A18] font-medium">{contacto.telefono}</span>
            </button>
          )}

          {/* Canal */}
          <div className="bg-[#F5F5F4] rounded-[12px] px-4 py-3">
            <p className="text-[11px] text-[#A3A39E] uppercase tracking-wide mb-1">Canal de origen</p>
            <p className="text-[15px] text-[#1A1A18] font-medium capitalize">{conversacion.canal || "Desconocido"}</p>
          </div>

          {/* Ver perfil completo */}
          <button
            onClick={() => {
              onClose();
              router.push(`/dashboard/operacion/contactos?id=${conversacion.contactoId}`);
            }}
            className="w-full flex items-center justify-center gap-2 bg-[#1F1F1E] text-[#EDEDED] rounded-[12px] py-3.5 font-medium text-[15px] active:bg-[#2A2A28] transition-colors"
          >
            <ExternalLink size={16} />
            Ver perfil completo
          </button>
        </div>
      </BottomSheet>

      <PhoneActionSheet
        phone={contacto?.telefono || ""}
        rawPhone={(contacto?.telefono || "").replace(/\D/g, "")}
        open={phoneSheetOpen}
        onClose={() => setPhoneSheetOpen(false)}
      />
    </>
  );
}
```

### **7.8 Crear `src/components/mobile/shared/QuickChannelButton.tsx`**

Botón de acción rápida en el header del chat. Abre la app nativa del canal.

```
"use client";

import React from "react";
import { MessageCircle, Instagram, Facebook } from "lucide-react";

interface QuickChannelButtonProps {
  canal?: string;
  contactoId?: string;
}

// Deep links por canal
const CHANNEL_CONFIG: Record<string, { label: string; color: string; getUrl: (id: string) => string }> = {
  whatsapp: {
    label: "WhatsApp",
    color: "#25D366",
    getUrl: (id) => `https://wa.me/${id}`,
  },
  instagram: {
    label: "Instagram",
    color: "#E1306C",
    getUrl: (id) => `https://ig.me/m/${id}`,
  },
  messenger: {
    label: "Messenger",
    color: "#0084FF",
    getUrl: (id) => `https://m.me/${id}`,
  },
};

export function QuickChannelButton({ canal, contactoId }: QuickChannelButtonProps) {
  if (!canal || !contactoId) return null;
  const config = CHANNEL_CONFIG[canal.toLowerCase()];
  if (!config) return null;

  const handleOpen = () => {
    window.open(config.getUrl(contactoId), "_blank");
  };

  const icons: Record<string, React.ReactNode> = {
    whatsapp: <MessageCircle size={18} />,
    instagram: <Instagram size={18} />,
    messenger: <Facebook size={18} />,
  };

  return (
    <button
      onClick={handleOpen}
      className="p-2 active:opacity-70 transition-opacity rounded-full"
      style={{ color: config.color }}
      title={`Abrir en ${config.label}`}
    >
      {icons[canal.toLowerCase()]}
    </button>
  );
}
```

---

## **PARTE 8 — MOBILE LEADS**

### **8.1 Modificar `src/app/dashboard/operacion/leads/page.tsx`**

Al igual que inbox, agregar el fork mobile con `useMobileLayout()` antes del return principal. Pasar los datos ya cargados al componente mobile sin duplicar lógica de Firestore.

```
import { useMobileLayout } from "@/hooks/useMobileLayout";
import { MobileLeadsView } from "@/components/mobile/leads/MobileLeadsView";

// En el componente principal, antes del return desktop:
const isMobile = useMobileLayout();
if (isMobile) return <MobileLeadsView leads={leads} onUpdateLead={handleUpdateLead} />;
```

### **8.2 Crear `src/components/mobile/leads/MobileLeadsView.tsx`**

```
"use client";

import React, { useState } from "react";
import { Search, Filter } from "lucide-react";
import { MobileLeadCard } from "./MobileLeadCard";
import type { Lead } from "@/lib/types/firestore";

const ESTADO_FILTROS = ["Todos", "Nuevo", "En proceso", "Calificado", "Descartado"];

interface MobileLeadsViewProps {
  leads: Lead[];
  onUpdateLead: (id: string, data: Partial<Lead>) => void;
}

export function MobileLeadsView({ leads, onUpdateLead }: MobileLeadsViewProps) {
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");

  const filtered = leads.filter((l) => {
    const matchSearch = !search || (l.nombre || "").toLowerCase().includes(search.toLowerCase());
    const matchEstado = filtroEstado === "Todos" || l.estado === filtroEstado;
    return matchSearch && matchEstado;
  });

  return (
    <div className="flex flex-col h-full bg-[#F5F5F4]">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 bg-[#FFFFFF] border-b border-[#E5E5E3]">
        <h1 className="text-[22px] font-bold text-[#1A1A18] mb-3">Leads</h1>
        <div className="flex items-center gap-2 bg-[#EFEFED] rounded-[10px] px-3 py-2">
          <Search size={16} className="text-[#A3A39E] shrink-0" />
          <input
            type="text"
            placeholder="Buscar lead..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-[15px] text-[#1A1A18] placeholder:text-[#A3A39E] outline-none"
          />
        </div>
      </div>

      {/* Filtros de estado — scroll horizontal */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-none bg-[#FFFFFF] border-b border-[#E5E5E3]">
        {ESTADO_FILTROS.map((estado) => (
          <button
            key={estado}
            onClick={() => setFiltroEstado(estado)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
              filtroEstado === estado
                ? "bg-[#C8FF00] text-[#1A1A18]"
                : "bg-[#EFEFED] text-[#6B6B67]"
            }`}
          >
            {estado}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {filtered.map((lead) => (
          <MobileLeadCard key={lead.id} lead={lead} onUpdate={onUpdateLead} />
        ))}
        {filtered.length === 0 && (
          <div className="flex justify-center py-12 text-[#A3A39E] text-[14px]">
            No hay leads
          </div>
        )}
      </div>
    </div>
  );
}
```

### **8.3 Crear `src/components/mobile/leads/MobileLeadCard.tsx`**

Tarjeta de lead con: nombre, canal de origen, estado (chip), fecha, y botón de teléfono si tiene.

```
"use client";

import React, { useState } from "react";
import type { Lead } from "@/lib/types/firestore";
import { PhoneActionSheet } from "../shared/PhoneActionSheet";
import { MobileLeadDetail } from "./MobileLeadDetail";
import { Phone, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CanalBadge } from "@/components/ui/CanalBadge";

const ESTADO_COLORS: Record<string, { bg: string; text: string }> = {
  "Nuevo":       { bg: "#C8FF00", text: "#1A1A18" },
  "En proceso":  { bg: "#3B82F6", text: "#FFFFFF" },
  "Calificado":  { bg: "#22C55E", text: "#FFFFFF" },
  "Descartado":  { bg: "#E5E5E3", text: "#6B6B67" },
};

interface MobileLeadCardProps {
  lead: Lead;
  onUpdate: (id: string, data: Partial<Lead>) => void;
}

export function MobileLeadCard({ lead, onUpdate }: MobileLeadCardProps) {
  const [phoneSheetOpen, setPhoneSheetOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const estadoStyle = ESTADO_COLORS[lead.estado || "Nuevo"] || ESTADO_COLORS["Nuevo"];
  const fecha = lead.creadoEl
    ? format(lead.creadoEl.toDate(), "d MMM", { locale: es })
    : "";

  return (
    <>
      <div className="bg-[#FFFFFF] rounded-[16px] overflow-hidden shadow-sm">
        {/* Toque para ver detalle */}
        <button
          onClick={() => setDetailOpen(true)}
          className="w-full text-left p-4 active:bg-[#F5F5F4] transition-colors"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-[16px] font-semibold text-[#1A1A18] truncate mb-1">
                {lead.nombre || "Sin nombre"}
              </p>
              <div className="flex items-center gap-2">
                {lead.canal && <CanalBadge canal={lead.canal} size="xs" />}
                <span className="text-[12px] text-[#A3A39E]">{fecha}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: estadoStyle.bg, color: estadoStyle.text }}
              >
                {lead.estado || "Nuevo"}
              </span>
              <ChevronRight size={16} className="text-[#A3A39E]" />
            </div>
          </div>
          {lead.resumen && (
            <p className="text-[13px] text-[#6B6B67] line-clamp-2">{lead.resumen}</p>
          )}
        </button>

        {/* Botón teléfono si tiene — separado del área de tap */}
        {lead.telefono && (
          <div className="border-t border-[#F0F0EE] px-4 py-2.5 flex items-center justify-between">
            <span className="text-[13px] text-[#6B6B67]">{lead.telefono}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPhoneSheetOpen(true);
              }}
              className="flex items-center gap-1.5 bg-[#22C55E]/10 text-[#22C55E] px-3 py-1.5 rounded-full text-[12px] font-medium active:bg-[#22C55E]/20"
            >
              <Phone size={12} />
              Contactar
            </button>
          </div>
        )}
      </div>

      <PhoneActionSheet
        phone={lead.telefono || ""}
        rawPhone={(lead.telefono || "").replace(/\D/g, "")}
        open={phoneSheetOpen}
        onClose={() => setPhoneSheetOpen(false)}
      />

      <MobileLeadDetail
        lead={lead}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onUpdate={onUpdate}
      />
    </>
  );
}
```

### **8.4 Crear `src/components/mobile/leads/MobileLeadDetail.tsx`**

Bottom sheet con el detalle completo del lead: respuestas del formulario, opciones de cambio de estado, botón de responder.

```
"use client";

import React, { useState } from "react";
import { BottomSheet } from "../shared/BottomSheet";
import { PhoneActionSheet } from "../shared/PhoneActionSheet";
import type { Lead } from "@/lib/types/firestore";
import { Phone, MessageCircle, ChevronDown } from "lucide-react";
import { CanalBadge } from "@/components/ui/CanalBadge";

const ESTADOS = ["Nuevo", "En proceso", "Calificado", "Descartado"];

interface MobileLeadDetailProps {
  lead: Lead;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, data: Partial<Lead>) => void;
}

export function MobileLeadDetail({ lead, open, onClose, onUpdate }: MobileLeadDetailProps) {
  const [phoneSheetOpen, setPhoneSheetOpen] = useState(false);

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title={lead.nombre || "Lead"} maxHeight="90vh">
        <div className="px-5 pb-6 space-y-4">
          {/* Estado — selector */}
          <div>
            <p className="text-[11px] text-[#A3A39E] uppercase tracking-wide mb-2">Estado</p>
            <div className="flex gap-2 flex-wrap">
              {ESTADOS.map((est) => (
                <button
                  key={est}
                  onClick={() => onUpdate(lead.id, { estado: est })}
                  className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                    lead.estado === est
                      ? "bg-[#C8FF00] text-[#1A1A18]"
                      : "bg-[#EFEFED] text-[#6B6B67]"
                  }`}
                >
                  {est}
                </button>
              ))}
            </div>
          </div>

          {/* Canal */}
          {lead.canal && (
            <div className="flex items-center gap-2">
              <p className="text-[13px] text-[#6B6B67]">Canal:</p>
              <CanalBadge canal={lead.canal} />
            </div>
          )}

          {/* Respuestas del formulario */}
          {lead.respuestas && Object.keys(lead.respuestas).length > 0 && (
            <div>
              <p className="text-[11px] text-[#A3A39E] uppercase tracking-wide mb-2">Respuestas del formulario</p>
              <div className="space-y-2">
                {Object.entries(lead.respuestas).map(([pregunta, respuesta]) => (
                  <div key={pregunta} className="bg-[#F5F5F4] rounded-[12px] px-4 py-3">
                    <p className="text-[11px] text-[#A3A39E] mb-0.5">{pregunta}</p>
                    <p className="text-[14px] text-[#1A1A18]">{String(respuesta)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="space-y-2 pt-2">
            {lead.telefono && (
              <button
                onClick={() => setPhoneSheetOpen(true)}
                className="w-full flex items-center justify-center gap-2 bg-[#22C55E] text-white rounded-[12px] py-3.5 font-semibold text-[15px] active:bg-[#16A34A] transition-colors"
              >
                <Phone size={18} />
                Contactar — {lead.telefono}
              </button>
            )}
            {lead.canal && (
              <button
                className="w-full flex items-center justify-center gap-2 bg-[#1F1F1E] text-[#EDEDED] rounded-[12px] py-3.5 font-semibold text-[15px] active:bg-[#2A2A28] transition-colors"
              >
                <MessageCircle size={18} />
                Responder por {lead.canal}
              </button>
            )}
          </div>
        </div>
      </BottomSheet>

      <PhoneActionSheet
        phone={lead.telefono || ""}
        rawPhone={(lead.telefono || "").replace(/\D/g, "")}
        open={phoneSheetOpen}
        onClose={() => setPhoneSheetOpen(false)}
      />
    </>
  );
}
```

---

## **PARTE 9 — MOBILE CONTACTOS**

**Inspiración visual:** Grid de tarjetas estilo Contactos de iOS / WhatsApp.

### **9.1 Modificar `src/app/dashboard/operacion/contactos/page.tsx`**

Mismo patrón de fork:

```
import { useMobileLayout } from "@/hooks/useMobileLayout";
import { MobileContactosView } from "@/components/mobile/contactos/MobileContactosView";

const isMobile = useMobileLayout();
if (isMobile) return <MobileContactosView contactos={contactos} />;
```

### **9.2 Crear `src/components/mobile/contactos/MobileContactosView.tsx`**

```
"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";
import { MobileContactCard } from "./MobileContactCard";
import type { Contacto } from "@/lib/types/firestore";

interface MobileContactosViewProps {
  contactos: Contacto[];
}

export function MobileContactosView({ contactos }: MobileContactosViewProps) {
  const [search, setSearch] = useState("");

  const filtered = contactos.filter((c) =>
    !search || (c.nombre || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#F5F5F4]">
      <div className="px-4 pt-4 pb-3 bg-[#FFFFFF] border-b border-[#E5E5E3]">
        <h1 className="text-[22px] font-bold text-[#1A1A18] mb-3">Contactos</h1>
        <div className="flex items-center gap-2 bg-[#EFEFED] rounded-[10px] px-3 py-2">
          <Search size={16} className="text-[#A3A39E] shrink-0" />
          <input
            type="text"
            placeholder="Buscar contacto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-[15px] text-[#1A1A18] placeholder:text-[#A3A39E] outline-none"
          />
        </div>
      </div>

      {/* Grid 2 columnas */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((contacto) => (
            <MobileContactCard key={contacto.id} contacto={contacto} />
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="flex justify-center py-12 text-[#A3A39E] text-[14px]">
            No hay contactos
          </div>
        )}
      </div>
    </div>
  );
}
```

### **9.3 Crear `src/components/mobile/contactos/MobileContactCard.tsx`**

```
"use client";

import React, { useState } from "react";
import type { Contacto } from "@/lib/types/firestore";
import { MobileContactProfile } from "./MobileContactProfile";
import { CanalBadge } from "@/components/ui/CanalBadge";

const AVATAR_COLORS = [
  "#C8FF00","#22C55E","#3B82F6","#8B5CF6",
  "#F59E0B","#EF4444","#06B6D4","#EC4899",
];

function getAvatarColor(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

interface MobileContactCardProps {
  contacto: Contacto;
}

export function MobileContactCard({ contacto }: MobileContactCardProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const name = contacto.nombre || "Sin nombre";
  const initial = name.charAt(0).toUpperCase();
  const avatarBg = getAvatarColor(name);

  return (
    <>
      <button
        onClick={() => setProfileOpen(true)}
        className="bg-[#FFFFFF] rounded-[16px] p-4 flex flex-col items-center gap-2 shadow-sm active:bg-[#F5F5F4] transition-colors"
      >
        {/* Avatar grande */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-[#1A1A18] font-bold text-[22px]"
          style={{ backgroundColor: avatarBg }}
        >
          {initial}
        </div>

        {/* Nombre */}
        <p className="text-[13px] font-semibold text-[#1A1A18] text-center leading-tight line-clamp-2">
          {name}
        </p>

        {/* Canal badge */}
        {contacto.canalPrincipal && (
          <CanalBadge canal={contacto.canalPrincipal} size="xs" />
        )}

        {/* Última actividad */}
        {contacto.ultimaActividad && (
          <p className="text-[11px] text-[#A3A39E]">Activo recientemente</p>
        )}
      </button>

      <MobileContactProfile
        contacto={contacto}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />
    </>
  );
}
```

### **9.4 Crear `src/components/mobile/contactos/MobileContactProfile.tsx`**

```
"use client";

import React, { useState } from "react";
import { BottomSheet } from "../shared/BottomSheet";
import { PhoneActionSheet } from "../shared/PhoneActionSheet";
import type { Contacto } from "@/lib/types/firestore";
import { Phone, Mail, MessageCircle } from "lucide-react";
import { CanalBadge } from "@/components/ui/CanalBadge";
import { useRouter } from "next/navigation";

interface MobileContactProfileProps {
  contacto: Contacto;
  open: boolean;
  onClose: () => void;
}

export function MobileContactProfile({ contacto, open, onClose }: MobileContactProfileProps) {
  const [phoneSheetOpen, setPhoneSheetOpen] = useState(false);
  const router = useRouter();
  const name = contacto.nombre || "Sin nombre";

  return (
    <>
      <BottomSheet open={open} onClose={onClose} maxHeight="85vh">
        <div className="px-5 pb-8 space-y-4">
          {/* Avatar y nombre */}
          <div className="flex flex-col items-center pt-2 pb-2">
            <div className="w-20 h-20 rounded-full bg-[#C8FF00] flex items-center justify-center text-[#1A1A18] font-bold text-[32px] mb-3">
              {name.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-[20px] font-bold text-[#1A1A18]">{name}</h2>
            {contacto.email && (
              <p className="text-[13px] text-[#6B6B67] mt-0.5">{contacto.email}</p>
            )}
            {contacto.canalPrincipal && (
              <div className="mt-2">
                <CanalBadge canal={contacto.canalPrincipal} />
              </div>
            )}
          </div>

          {/* Acciones principales — dos botones grandes */}
          {contacto.telefono && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPhoneSheetOpen(true)}
                className="flex flex-col items-center gap-1.5 bg-[#22C55E]/10 rounded-[14px] py-4 active:bg-[#22C55E]/20"
              >
                <div className="w-10 h-10 rounded-full bg-[#22C55E] flex items-center justify-center">
                  <Phone size={18} className="text-white" />
                </div>
                <span className="text-[12px] font-medium text-[#22C55E]">Llamar</span>
              </button>
              <button
                onClick={() => window.open(`https://wa.me/${contacto.telefono!.replace(/\D/g,"")}`, "_blank")}
                className="flex flex-col items-center gap-1.5 bg-[#25D366]/10 rounded-[14px] py-4 active:bg-[#25D366]/20"
              >
                <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center">
                  <MessageCircle size={18} className="text-white" />
                </div>
                <span className="text-[12px] font-medium text-[#25D366]">WhatsApp</span>
              </button>
            </div>
          )}

          {/* Info adicional */}
          <div className="space-y-2">
            {contacto.telefono && (
              <div className="bg-[#F5F5F4] rounded-[12px] px-4 py-3">
                <p className="text-[11px] text-[#A3A39E] mb-0.5">Teléfono</p>
                <p className="text-[15px] text-[#1A1A18]">{contacto.telefono}</p>
              </div>
            )}
            {contacto.email && (
              <div className="bg-[#F5F5F4] rounded-[12px] px-4 py-3">
                <p className="text-[11px] text-[#A3A39E] mb-0.5">Email</p>
                <p className="text-[15px] text-[#1A1A18]">{contacto.email}</p>
              </div>
            )}
          </div>

          {/* Ver conversaciones */}
          <button
            onClick={() => {
              onClose();
              router.push(`/dashboard/operacion/inbox?contactoId=${contacto.id}`);
            }}
            className="w-full flex items-center justify-center gap-2 bg-[#1F1F1E] text-[#EDEDED] rounded-[12px] py-3.5 font-semibold text-[15px] active:bg-[#2A2A28]"
          >
            <MessageCircle size={18} />
            Ver conversaciones
          </button>
        </div>
      </BottomSheet>

      <PhoneActionSheet
        phone={contacto.telefono || ""}
        rawPhone={(contacto.telefono || "").replace(/\D/g, "")}
        open={phoneSheetOpen}
        onClose={() => setPhoneSheetOpen(false)}
      />
    </>
  );
}
```

---

## **PARTE 10 — MOBILE TAREAS**

**Inspiración visual:** Todoist — lista limpia, checkbox circular, sección "Hoy" por defecto, FAB para agregar, swipe para completar.

### **10.1 Modificar `src/app/dashboard/operacion/tareas/page.tsx`**

```
import { useMobileLayout } from "@/hooks/useMobileLayout";
import { MobileTareasView } from "@/components/mobile/tareas/MobileTareasView";

const isMobile = useMobileLayout();
if (isMobile) return <MobileTareasView tareas={tareas} onAddTarea={handleAddTarea} onUpdateTarea={handleUpdateTarea} onDeleteTarea={handleDeleteTarea} />;
```

### **10.2 Crear `src/components/mobile/tareas/MobileTareasView.tsx`**

```
"use client";

import React, { useState, useMemo } from "react";
import { Plus, Search } from "lucide-react";
import { MobileTareaItem } from "./MobileTareaItem";
import { MobileAddTareaSheet } from "./MobileAddTareaSheet";
import type { TareaCRM } from "@/lib/types/firestore";
import { isToday, isPast, isFuture } from "date-fns";

const FILTROS = [
  { id: "hoy",        label: "Hoy" },
  { id: "pendientes", label: "Pendientes" },
  { id: "vencidas",   label: "Vencidas" },
  { id: "completadas",label: "Completadas" },
];

interface MobileTareasViewProps {
  tareas: TareaCRM[];
  onAddTarea: (data: Partial<TareaCRM>) => void;
  onUpdateTarea: (id: string, data: Partial<TareaCRM>) => void;
  onDeleteTarea: (id: string) => void;
}

export function MobileTareasView({ tareas, onAddTarea, onUpdateTarea, onDeleteTarea }: MobileTareasViewProps) {
  const [filtro, setFiltro] = useState("hoy");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    return tareas.filter((t) => {
      const matchSearch = !search || (t.titulo || "").toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;

      const fechaVence = t.fechaVencimiento?.toDate();

      if (filtro === "hoy") return fechaVence ? isToday(fechaVence) : false;
      if (filtro === "pendientes") return t.estado !== "completada";
      if (filtro === "vencidas") return fechaVence ? isPast(fechaVence) && t.estado !== "completada" : false;
      if (filtro === "completadas") return t.estado === "completada";
      return true;
    });
  }, [tareas, filtro, search]);

  const handleToggle = (tarea: TareaCRM) => {
    const newEstado = tarea.estado === "completada" ? "pendiente" : "completada";
    onUpdateTarea(tarea.id, { estado: newEstado });
  };

  return (
    <div className="flex flex-col h-full bg-[#F5F5F4] relative">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 bg-[#FFFFFF] border-b border-[#E5E5E3]">
        <h1 className="text-[22px] font-bold text-[#1A1A18] mb-3">Tareas</h1>
        <div className="flex items-center gap-2 bg-[#EFEFED] rounded-[10px] px-3 py-2">
          <Search size={16} className="text-[#A3A39E] shrink-0" />
          <input
            type="text"
            placeholder="Buscar tarea..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-[15px] text-[#1A1A18] placeholder:text-[#A3A39E] outline-none"
          />
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-none bg-[#FFFFFF] border-b border-[#E5E5E3]">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
              filtro === f.id ? "bg-[#C8FF00] text-[#1A1A18]" : "bg-[#EFEFED] text-[#6B6B67]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto py-2">
        {filtered.map((tarea) => (
          <MobileTareaItem
            key={tarea.id}
            tarea={tarea}
            onToggle={() => handleToggle(tarea)}
            onDelete={() => onDeleteTarea(tarea.id)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-[#A3A39E] text-[15px]">
              {filtro === "hoy" ? "No hay tareas para hoy" : "Sin tareas"}
            </p>
          </div>
        )}
      </div>

      {/* FAB — Agregar tarea */}
      <button
        onClick={() => setAddOpen(true)}
        className="absolute bottom-6 right-6 w-14 h-14 bg-[#C8FF00] rounded-full flex items-center justify-center shadow-lg active:bg-[#B8EF00] transition-colors"
        style={{ bottom: "calc(24px + env(safe-area-inset-bottom))" }}
      >
        <Plus size={26} className="text-[#1A1A18]" strokeWidth={2.5} />
      </button>

      <MobileAddTareaSheet open={addOpen} onClose={() => setAddOpen(false)} onAdd={onAddTarea} />
    </div>
  );
}
```

### **10.3 Crear `src/components/mobile/tareas/MobileTareaItem.tsx`**

Fila de tarea estilo Todoist: checkbox circular a la izquierda, título, fecha con color semafórico, swipe.

```
"use client";

import React, { useRef, useState } from "react";
import type { TareaCRM } from "@/lib/types/firestore";
import { Trash2 } from "lucide-react";
import { format, isToday, isPast } from "date-fns";
import { es } from "date-fns/locale";

interface MobileTareaItemProps {
  tarea: TareaCRM;
  onToggle: () => void;
  onDelete: () => void;
}

export function MobileTareaItem({ tarea, onToggle, onDelete }: MobileTareaItemProps) {
  const isCompleted = tarea.estado === "completada";
  const fechaVence = tarea.fechaVencimiento?.toDate();

  // Color semafórico de fecha (Todoist style)
  const getFechaStyle = () => {
    if (!fechaVence || isCompleted) return { color: "#A3A39E", label: "" };
    if (isPast(fechaVence) && !isToday(fechaVence)) return { color: "#EF4444", label: "Vencida" };
    if (isToday(fechaVence)) return { color: "#F59E0B", label: "Hoy" };
    return {
      color: "#6B6B67",
      label: format(fechaVence, "d MMM", { locale: es }),
    };
  };

  const { color: fechaColor, label: fechaLabel } = getFechaStyle();

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 bg-[#FFFFFF] border-b border-[#F0F0EE] active:bg-[#F5F5F4] transition-colors">
      {/* Checkbox circular */}
      <button
        onClick={onToggle}
        className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
          isCompleted
            ? "bg-[#C8FF00] border-[#C8FF00]"
            : "border-[#D4D4D0]"
        }`}
      >
        {isCompleted && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="#1A1A18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <p className={`text-[15px] ${isCompleted ? "line-through text-[#A3A39E]" : "text-[#1A1A18]"}`}>
          {tarea.titulo}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {fechaLabel && (
            <span className="text-[11px] font-medium" style={{ color: fechaColor }}>
              {fechaLabel}
            </span>
          )}
          {tarea.contactoNombre && (
            <span className="text-[11px] text-[#A3A39E] truncate">• {tarea.contactoNombre}</span>
          )}
        </div>
      </div>

      {/* Eliminar */}
      <button
        onClick={onDelete}
        className="p-2 -mr-1 active:opacity-70"
      >
        <Trash2 size={16} className="text-[#D4D4D0]" />
      </button>
    </div>
  );
}
```

### **10.4 Crear `src/components/mobile/tareas/MobileAddTareaSheet.tsx`**

Sheet para agregar tarea rápida, estilo Todoist quick-add.

```
"use client";

import React, { useState } from "react";
import { BottomSheet } from "../shared/BottomSheet";
import type { TareaCRM } from "@/lib/types/firestore";
import { Calendar, User } from "lucide-react";

interface MobileAddTareaSheetProps {
  open: boolean;
  onClose: () => void;
  onAdd: (data: Partial<TareaCRM>) => void;
}

export function MobileAddTareaSheet({ open, onClose, onAdd }: MobileAddTareaSheetProps) {
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState("");

  const handleAdd = () => {
    if (!titulo.trim()) return;
    onAdd({
      titulo: titulo.trim(),
      estado: "pendiente",
      fechaVencimiento: fecha ? new Date(fecha) : undefined,
    });
    setTitulo("");
    setFecha("");
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Nueva tarea" maxHeight="55vh">
      <div className="px-5 py-4 space-y-4">
        {/* Input título */}
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="¿Qué necesitás hacer?"
          autoFocus
          className="w-full text-[17px] text-[#1A1A18] placeholder:text-[#A3A39E] outline-none bg-transparent"
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
        />

        {/* Fecha */}
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-[#6B6B67]" />
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="flex-1 text-[14px] text-[#1A1A18] bg-transparent outline-none"
          />
        </div>

        {/* Botón agregar */}
        <button
          onClick={handleAdd}
          disabled={!titulo.trim()}
          className="w-full bg-[#C8FF00] text-[#1A1A18] font-semibold text-[15px] py-3.5 rounded-[12px] disabled:opacity-40 active:bg-[#B8EF00] transition-colors"
        >
          Agregar tarea
        </button>
      </div>
    </BottomSheet>
  );
}
```

---

## **PARTE 11 — CSS PARA SAFE AREAS E IOS**

### **11.1 Agregar a `src/app/globals.css`**

```css
/* --- MOBILE / PWA --- */
:root {
  --mobile-bottom-bar: 64px;
  --safe-area-top:    env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
}

/* Ocultar scrollbar en filtros horizontales */
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }

/* Prevenir zoom en inputs en iOS (font-size >= 16px evita el zoom automático) */
@media (max-width: 767px) {
  input, textarea, select {
    font-size: 16px !important;
  }
}
```

---

## **PARTE 12 — PANTALLAS DESKTOP-ONLY EN MOBILE**

Para las secciones que **no tienen versión mobile** (Cerebro, Agentes, Workflows, etc.), agregar un componente de aviso en cada page:

### **12.1 Crear `src/components/mobile/shared/DesktopOnlyScreen.tsx`**

```
"use client";

import React from "react";
import { Monitor } from "lucide-react";

export function DesktopOnlyScreen({ seccion = "Esta sección" }: { seccion?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-4">
      <div className="w-16 h-16 bg-[#EFEFED] rounded-full flex items-center justify-center">
        <Monitor size={28} className="text-[#6B6B67]" />
      </div>
      <h2 className="text-[18px] font-semibold text-[#1A1A18]">{seccion} requiere escritorio</h2>
      <p className="text-[14px] text-[#6B6B67] leading-relaxed">
        Para una mejor experiencia, accedé desde una computadora.
      </p>
    </div>
  );
}
```

Usar en todas las pages de `/dashboard/cerebro/` y `/dashboard/ajustes/` (excepto perfil):

```
const isMobile = useMobileLayout();
if (isMobile) return <DesktopOnlyScreen seccion="La configuración de agentes" />;
```

---

## **RESUMEN DE ARCHIVOS A CREAR/MODIFICAR**

### **Archivos NUEVOS (no tocan nada existente):**

```
public/manifest.json
public/sw.js
public/icons/icon-192.png
public/icons/icon-512.png
public/icons/apple-touch-icon.png

src/hooks/useMobileLayout.ts
src/components/PwaRegister.tsx
src/components/layout/MobileLayout.tsx
src/components/layout/BottomTabBar.tsx

src/components/mobile/shared/BottomSheet.tsx
src/components/mobile/shared/MasBottomSheet.tsx
src/components/mobile/shared/PhoneActionSheet.tsx
src/components/mobile/shared/QuickChannelButton.tsx
src/components/mobile/shared/DesktopOnlyScreen.tsx

src/components/mobile/inbox/MobileInboxView.tsx
src/components/mobile/inbox/MobileChatList.tsx
src/components/mobile/inbox/MobileChatListItem.tsx
src/components/mobile/inbox/MobileChatWindow.tsx
src/components/mobile/inbox/MobileChatBubble.tsx
src/components/mobile/inbox/MobileContactSheet.tsx

src/components/mobile/leads/MobileLeadsView.tsx
src/components/mobile/leads/MobileLeadCard.tsx
src/components/mobile/leads/MobileLeadDetail.tsx

src/components/mobile/contactos/MobileContactosView.tsx
src/components/mobile/contactos/MobileContactCard.tsx
src/components/mobile/contactos/MobileContactProfile.tsx

src/components/mobile/tareas/MobileTareasView.tsx
src/components/mobile/tareas/MobileTareaItem.tsx
src/components/mobile/tareas/MobileAddTareaSheet.tsx
```

### **Archivos a MODIFICAR (cambios mínimos, quirúrgicos):**

```
src/app/layout.tsx              — agregar metadata PWA + PwaRegister
src/app/globals.css             — agregar variables safe-area + scrollbar-none + input font-size iOS
src/components/layout/AppLayout.tsx — agregar fork isMobile (3 líneas)
src/app/dashboard/operacion/inbox/page.tsx      — agregar fork mobile
src/app/dashboard/operacion/leads/page.tsx      — agregar fork mobile
src/app/dashboard/operacion/contactos/page.tsx  — agregar fork mobile
src/app/dashboard/operacion/tareas/page.tsx     — agregar fork mobile
```

### **El desktop NO cambia en nada.**

---

## **NOTAS IMPORTANTES PARA EL EJECUTOR**

1. **Next.js versión con breaking changes** — leer `node_modules/next/dist/docs/` antes de escribir código. Especialmente la API de `metadata` y `viewport` del App Router.  
2. **Tailwind v4** — no hay `tailwind.config.js`. Los colores se usan como `bg-[#1F1F1E]` o `var(--bg-sidebar)`. No inventar tokens.  
3. **`date-fns`** — ya está instalado. Usar `format`, `isToday`, `isPast`, `isFuture`, `formatDistanceToNow` con `{ locale: es }`.  
4. **Tipos de Firestore** — importar siempre desde `@/lib/types/firestore`. No crear tipos nuevos para entidades existentes.  
5. **`100dvh` vs `100vh`** — usar `100dvh` en mobile para que descuente la barra del navegador Safari correctamente.  
6. **`env(safe-area-inset-bottom)`** — usar en el BottomTabBar y en todos los elementos fijos al fondo para que no queden tapados por el home indicator de iPhone.  
7. **No usar `min-w-[1280px]`** en mobile — la variable `--min-app-width: 1280px` del CSS es solo para desktop. En el MobileLayout no aplicar esa restricción.  
8. **Los hooks existentes** (`useConversaciones`, `useMensajes`, `useContactos`) se reutilizan tal cual. No crear nuevas llamadas a Firestore en los componentes mobile.

---

Eso es el plan completo. Decime si querés ajustar alguna parte antes de darlo por final.

