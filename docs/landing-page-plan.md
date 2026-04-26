# Imalá Vox — Plan de Landing Page

## Objetivo de conversión
Llevar a visitantes fríos (tráfico de Meta Ads, orgánico, recomendaciones) a **iniciar prueba gratuita de 7 días** sin tarjeta de crédito. El secundario es que lleguen a ver precios y elijan un plan directamente.

---

## Paleta de colores

| Token              | Valor     | Uso                              |
|--------------------|-----------|----------------------------------|
| `--bg-sidebar`     | `#1F1F1E` | Hero, secciones oscuras, navbar  |
| `--bg-sidebar-deep`| `#161615` | Footer, fondos muy profundos     |
| `--accent`         | `#C8FF00` | CTAs principales, highlights     |
| `--bg-main`        | `#F5F5F4` | Secciones claras intermedias     |
| `--bg-card`        | `#FFFFFF` | Cards, features, pricing         |
| `--text-primary`   | `#1A1A18` | Titulares en fondo claro         |
| `--text-primary-dark`| `#EDEDED`| Titulares en fondo oscuro        |
| `--border-light`   | `#E5E5E3` | Bordes de cards                  |

**Tipografía:** Geist Sans (ya instalada en el proyecto)

**Accent secundario:** Degradado sutil `#C8FF00` → `#A0D400` para highlights de texto

---

## Estructura de secciones (en orden)

### 0. NAVBAR fija
- **Izquierda:** Logo Imalá Vox (imagen `/icons/icon-192.png` + texto)
- **Centro:** Links: Funciones · Precios · Canales · FAQ
- **Derecha:** "Iniciar sesión" (ghost) + "Probar gratis" (botón accent `#C8FF00`)
- **Fondo:** `#1F1F1E` con `backdrop-blur` al hacer scroll
- **Mobile:** Hamburger menu

---

### 1. HERO — Fondo oscuro `#1F1F1E`

**Chip/Badge superior:**
> 🤖  Agentes IA para WhatsApp, Instagram y Facebook

**Titular principal (grande, bold):**
> Tus clientes escriben a las 3am.  
> **Tu negocio les responde.**

**Subtítulo:**
> Imalá Vox crea agentes de inteligencia artificial que atienden, califican y venden por vos — en todos tus canales, las 24 horas, sin que tengas que estar presente.

**CTAs:**
- Primario: `Empezar gratis — 7 días sin tarjeta` (botón `#C8FF00` grande)
- Secundario: `Ver una demo` (ghost, con ícono play)

**Visual:** Mockup de browser/pantalla mostrando la bandeja de entrada del sistema (screenshot real o ilustración del chat con un agente respondiendo). Efecto de glow sutil con `#C8FF00` detrás.

**Métricas flotantes (sobre el mockup):**
- "⚡ Respuesta en < 2 seg"
- "🕐 Activo 24/7 todos los días"
- "💬 WhatsApp · Instagram · Facebook"

---

### 2. SOCIAL PROOF — Fondo claro `#F5F5F4`

**Título:** `Conectado con las plataformas que ya usás`

**Logos:** WhatsApp Business, Meta (Facebook + Instagram), MercadoPago

**Estadística rápida (3 números en fila):**
- `+500` Conversaciones automatizadas/día
- `24/7` Disponibilidad del agente
- `< 2s` Tiempo de respuesta promedio

*(Nota: ajustar números reales cuando haya data de clientes)*

---

### 3. PROBLEMA — Fondo oscuro `#1F1F1E`

**Título:**
> Gestionar mensajes manualmente  
> **te está costando clientes**

**Tres pain points (grid 3 cols con ícono):**

1. **Mensajes sin responder** — Un cliente que espera más de 5 minutos tiene 10 veces menos chances de cerrar. Y vos tenés decenas de chats abiertos.

2. **Horario limitado** — Tu negocio cierra. Las consultas no. Cada noche perdés oportunidades que tus competidores sí aprovechan.

3. **Demasiados canales** — WhatsApp, Instagram y Facebook al mismo tiempo, sin un sistema. El caos hace que leads calificados se te escapen.

---

### 4. SOLUCIÓN — Fondo claro `#F5F5F4`

**Supertítulo:** `La solución`  
**Título:**
> Un agente inteligente que  
> **conoce tu negocio mejor que nadie**

**Subtítulo:** Entrenás a Imalá Vox con tu información una sola vez. Él hace el resto: responde, califica, agenda y vende — en el idioma de tus clientes, con la voz de tu marca.

**Tres pilares (tabs o scroll horizontal):**

#### Pilar 1: Capturá
- **Título:** Todos tus canales, una sola bandeja
- **Descripción:** WhatsApp, Instagram y Facebook unificados. Nunca más perdas un mensaje por estar en la app equivocada.
- **Visual:** Screenshot de la bandeja de entrada del sistema

#### Pilar 2: Convertí
- **Título:** El agente que vende mientras dormís
- **Descripción:** Entrenalo con tu catálogo, precios y objeciones frecuentes. Responde dudas, sugiere productos y cierra ventas solo.
- **Visual:** Screenshot del chat IA respondiendo a un cliente

#### Pilar 3: Fidelizá
- **Título:** Seguimiento automático con cara humana
- **Descripción:** Difusiones personalizadas, seguimiento de leads y tareas automáticas para que ningún cliente quede en el olvido.
- **Visual:** Screenshot de la sección de leads/CRM

---

### 5. FEATURES DETALLADAS — Alternancia claro/oscuro

Serie de bloques feature (imagen + texto lado a lado, alternando posición):

#### Feature A — Fondo blanco
**Tag:** `Agentes IA`  
**Título:** Entrenalo con tu información en minutos  
**Descripción:** Subí PDFs, documentos, links de tu web y textos. El agente aprende tu negocio, tus precios, tus políticas. Vos controlás qué sabe y cómo responde.  
**Lista:**
- ✓ PDF, sitios web, textos propios
- ✓ Respuestas en el tono de tu marca
- ✓ Actualización de conocimiento en tiempo real
**Visual:** Screenshot de la sección "Base de conocimiento"

#### Feature B — Fondo oscuro `#1F1F1E`
**Tag:** `CRM Integrado`  
**Título:** Tu pipeline de ventas, sin herramientas extra  
**Descripción:** Leads capturados desde Meta Ads, gestión de contactos, tareas y seguimiento — todo dentro de Imalá Vox. Sin pagar por otro CRM.  
**Lista:**
- ✓ Leads desde campañas de Facebook e Instagram
- ✓ Contactos con historial completo
- ✓ Tareas y recordatorios automáticos
**Visual:** Screenshot de la sección Leads/CRM

#### Feature C — Fondo claro `#F5F5F4`
**Tag:** `Difusión Masiva`  
**Título:** Llegá a todos tus clientes con un click  
**Descripción:** Mandá campañas de WhatsApp a listas segmentadas por etiquetas. Ofertas, novedades, recordatorios. Con seguimiento de apertura y respuestas.  
**Lista:**
- ✓ Segmentación por etiquetas
- ✓ Programación de envíos
- ✓ Respuestas gestionadas por el agente
**Visual:** Screenshot de la sección Difusión

#### Feature D — Fondo oscuro
**Tag:** `Catálogo`  
**Título:** Tu negocio siempre actualizado  
**Descripción:** Cargá tus productos o servicios y el agente los recomienda en el momento exacto. Sin necesidad de que un humano esté disponible.  
**Lista:**
- ✓ Hasta 200 productos (Plan Pro) / Ilimitados (Agencia)
- ✓ El agente sugiere según la consulta
- ✓ Imágenes, precios y descripciones

---

### 6. CANALES — Fondo claro

**Título:** Donde ya están tus clientes  
**Subtítulo:** Conectate en minutos a los canales que más usan los negocios en Argentina y Latam.

**Tres cards grandes:**
- 🟢 **WhatsApp Business** — El canal #1 de consultas en Argentina. Respuestas automáticas, mensajes ricos y seguimiento de conversaciones.
- 🔵 **Instagram DMs** — Capturá los leads que llegan por tus stories y publicaciones. Sin perder ninguno.
- 🔷 **Facebook Messenger** — Automatizá las respuestas de tu página de Facebook y convertí consultas en ventas.

---

### 7. PRECIOS — Fondo `#F5F5F4`

**Título:** Elegí el plan que mejor se adapta  
**Subtítulo:** Sin contratos. Sin tarjeta para empezar. Cancelás cuando querés.

**Toggle:** Mensual / Anual (−20%)

**Tres cards de precios:**

#### Starter — $35 USD/mes
*Para negocios que están empezando a automatizar*
- 1 Agente Inteligente
- 1.000 conversaciones/mes
- 1.500 contactos CRM
- Base de conocimiento (PDF, webs)
- WhatsApp · Instagram · Facebook
- Leads, Tareas y Contactos
- Etiquetas y segmentación
- ✗ Catálogo de productos
- ✗ Difusión masiva
- ✗ Meta Ads / Workflows

**CTA:** `Probar gratis 7 días`

#### Pro — $79 USD/mes ⭐ Más popular
*Para negocios que quieren crecer con IA*
- Hasta 3 Agentes Inteligentes
- 3.000 conversaciones/mes
- 5.000 contactos CRM
- **Todo el Starter, más:**
- Catálogo de productos (200 items)
- Difusión masiva (hasta 1.000/envío)
- Meta Ads · Captura de leads de campañas
- ✗ Workflows automatizados

**CTA:** `Probar gratis 7 días`

#### Agencia — $179 USD/mes
*Para agencias y negocios de alto volumen*
- Hasta 10 Agentes Inteligentes
- 10.000 conversaciones/mes
- Contactos ilimitados
- **Todo el Pro, más:**
- Catálogo ilimitado
- Difusión sin límite
- Workflows automatizados

**CTA:** `Probar gratis 7 días`

**Nota debajo:** Los precios se cobran en ARS al dólar blue del día. · Sin tarjeta para la prueba gratuita.

---

### 8. FAQ — Fondo blanco

**Título:** Preguntas frecuentes

**Preguntas:**

1. **¿Necesito conocimientos técnicos para configurarlo?**  
   No. La configuración es visual e intuitiva. En menos de una hora tenés tu agente funcionando. Si necesitás ayuda, nuestro equipo te acompaña.

2. **¿El agente suena como un bot o como una persona?**  
   Depende de cómo lo configurés. Podés darle nombre, personalidad y un tono específico. La mayoría de los clientes no se dan cuenta de que es IA.

3. **¿Qué pasa si el agente no sabe responder algo?**  
   El agente puede escalar automáticamente la conversación a un humano cuando detecta que no tiene la respuesta. Vos definís las reglas.

4. **¿Puedo conectar mi WhatsApp actual?**  
   Sí, usando la API de WhatsApp Business. Te guiamos en todo el proceso de conexión.

5. **¿Cómo se cobran los precios en Argentina?**  
   Los precios base son en USD pero se cobran en ARS usando la cotización blue del día (con ajuste trimestral). Se procesan vía MercadoPago.

6. **¿Puedo cancelar cuando quiero?**  
   Sí, sin penalidades. Cancelás desde el panel y tu plan se mantiene activo hasta el fin del período pago.

---

### 9. CTA FINAL — Fondo oscuro `#1F1F1E`

**Título (grande):**
> Tu próximo cliente  
> ya te está escribiendo.  
> **¿Le respondés vos o tu agente?**

**Subtítulo:**
> Empezá gratis hoy. Sin tarjeta. Sin compromiso.  
> Tu agente puede estar activo en menos de una hora.

**CTA:** `Crear mi agente gratis` (botón grande `#C8FF00`)  
**Texto chico debajo:** 7 días de prueba · Sin tarjeta · Cancelás cuando querés

---

### 10. FOOTER — Fondo `#161615`

**Columnas:**
- **Imalá Vox** (logo + descripción corta + redes)
- **Producto:** Funciones · Precios · Canales · Integraciones
- **Legal:** Términos y condiciones · Política de privacidad
- **Contacto:** Email de soporte · WhatsApp de soporte

**Línea inferior:** © 2025 Imalá Vox · Hecho en Argentina 🇦🇷

---

## Decisiones de diseño clave

### Visual del Hero
- Fondo: `#1F1F1E` con ruido/grain sutil + grid de puntos en `#C8FF00` con muy baja opacidad (3-5%)
- Glow circular detrás del mockup: `#C8FF00` blur muy difuso, opacidad 15-20%
- El mockup del browser muestra la bandeja de entrada REAL del sistema

### Tipografía
- Titulares hero: `font-black` 56-72px, Geist Sans
- Titulares sección: `font-bold` 36-44px
- Highlight en titulares: color `#C8FF00` en las palabras clave
- Body: `font-medium` 16-18px, line-height 1.7

### Animaciones (sutiles)
- Fade-in + slide-up al hacer scroll (Intersection Observer)
- El mockup del hero con un leve float animation (CSS `@keyframes`)
- Los números de métricas con counter animation

### Screenshots del sistema
Sugerir capturas de:
1. Bandeja de entrada (inbox) — Feature principal
2. Chat con agente respondiendo — Para la sección "Convertí"
3. Sección de Leads/CRM — Para feature CRM
4. Base de conocimiento — Para feature entrenamiento
5. Sección de Difusión — Para feature broadcast

Placeholder: usar gradient cards con el color del sistema hasta tener screenshots reales.

### Mobile-first
- Navbar: hamburger menu
- Hero: stack vertical (texto arriba, mockup abajo)
- Features: single column
- Pricing: cards en scroll horizontal o stack vertical

---

## Ruta en Next.js

La landing irá en `src/app/page.tsx` (la raíz `/`), que actualmente existe pero está vacía o redirige.

**Importante:** La landing NO usa `AppLayout` (sin sidebar, sin auth). Tiene su propio layout con navbar y footer.

Para excluirla del AppLayout hay que modificar `AppLayout.tsx` para que no renderice el sidebar cuando `pathname === "/"`.

---

## Checklist antes de implementar

- [ ] Confirmar screenshots disponibles del sistema
- [ ] Confirmar email/WhatsApp de contacto para el footer
- [ ] Confirmar si hay redes sociales (Instagram, LinkedIn)
- [ ] Confirmar URL del video demo (si existe)
- [ ] Confirmar si el registro nuevo va a `/auth` o a otra ruta
- [ ] Confirmar si "Iniciar sesión" en navbar va a `/auth`
