# Imalá Vox — Sistema de Diseño

> Documento de referencia para mantener coherencia visual en todas las secciones.
> Antes de construir cualquier UI nueva, consultá estas reglas.

---

## 1. Paleta de colores y reglas de uso

### Tokens disponibles

| Token | Valor | Uso correcto |
|---|---|---|
| `--accent` | `#C8FF00` (lima) | **Solo sobre fondo oscuro.** Nunca como texto sobre blanco. |
| `--accent-hover` | `#B8EF00` | Variante hover del acento, también solo sobre oscuro. |
| `--accent-text` | `#1A1A18` | Texto sobre fondo `--accent`. |
| `--success` | `#22C55E` | Solo como ícono o punto de estado. Nunca como texto corrido. |
| `--error` | `#EF4444` | Texto destructivo, iconos de error. Funciona en claro y oscuro. |
| `--warning` | `#F59E0B` | Alertas. Funciona en claro. |
| `--bg-sidebar` | `#1F1F1E` | Fondo del sidebar y superficies oscuras. |
| `--bg-card` | `#FFFFFF` | Cards, paneles, modales. |
| `--bg-input` | `#EFEFED` | Inputs, fondos de chips/pills. |
| `--bg-main` | `#F5F5F4` | Fondo de páginas. |
| `--text-primary-light` | `#1A1A18` | Texto principal sobre fondos claros. |
| `--text-secondary-light` | `#6B6B67` | Texto secundario/descripción. |
| `--text-tertiary-light` | `#A3A39E` | Labels, placeholders, metadata. |
| `--border-light` | `#E5E5E3` | Bordes en fondos claros (cards, inputs). |

---

### ⚠️ Regla crítica: el acento `#C8FF00` sobre blanco es INVISIBLE

```
❌ MAL — texto acento sobre fondo blanco
<span className="text-[var(--accent)]">Activo</span>

✅ BIEN — acento como fondo con texto oscuro (en sidebar / dark surfaces)
<span className="bg-[var(--accent)] text-[var(--accent-text)]">Activo</span>

✅ BIEN — tint del acento como fondo con texto acento (en superficies claras)
<span className="bg-[var(--accent)]/10 text-[var(--accent-active)] border border-[var(--accent)]/20">
  Activo
</span>
```

**`--accent-active` (`#A0D400`)** es la versión oscura del acento, usable como texto sobre blanco con contraste aceptable.

---

## 2. Íconos — patrones y tamaños

### Tamaños estándar

| Contexto | Clase | Uso |
|---|---|---|
| Inline con texto pequeño | `w-3 h-3` | Labels, badges, chips |
| Inline con texto normal | `w-3.5 h-3.5` | Botones secundarios, menú items |
| Botones y acciones | `w-4 h-4` | Botones, toolbar, acciones |
| Cards y encabezados | `w-5 h-5` | Headers de sección, cards |
| Vacío / ilustración | `w-8 h-8` | Empty states |
| Hero / onboarding | `w-10 h-10` o `w-12 h-12` | Páginas vacías, primeras vistas |

### Contenedor de ícono (Icon Container)

Siempre que un ícono necesite destacar o estar solo (sin texto al lado), usá un contenedor cuadrado redondeado:

```tsx
// Variante acento — superficies oscuras o acción primaria destacada
<div className="w-9 h-9 rounded-xl bg-[var(--bg-sidebar)] border border-[var(--accent)]/30
                flex items-center justify-center shrink-0 shadow-sm">
  <MiIcono className="w-4 h-4 text-[var(--accent)]" />
</div>

// Variante neutra — cards en fondo claro
<div className="w-9 h-9 rounded-xl bg-[var(--bg-input)] border border-[var(--border-light)]
                flex items-center justify-center shrink-0">
  <MiIcono className="w-4 h-4 text-[var(--text-secondary-light)]" />
</div>

// Variante estado positivo (éxito / activo)
<div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200
                flex items-center justify-center shrink-0">
  <MiIcono className="w-4 h-4 text-emerald-600" />
</div>

// Variante estado de error / alerta
<div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200
                flex items-center justify-center shrink-0">
  <MiIcono className="w-4 h-4 text-red-500" />
</div>

// Variante advertencia
<div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200
                flex items-center justify-center shrink-0">
  <MiIcono className="w-4 h-4 text-amber-500" />
</div>
```

### Color de ícono por contexto

| Superficie | Color del ícono |
|---|---|
| Sidebar oscuro | `text-[var(--accent)]` ✅ |
| Card blanca — acción primaria | `text-[var(--accent-active)]` ✅ |
| Card blanca — elemento activo | `text-emerald-600` dentro de `bg-emerald-50` ✅ |
| Card blanca — neutral / decorativo | `text-[var(--text-secondary-light)]` ✅ |
| Card blanca — error / eliminar | `text-red-500` ✅ |
| Card blanca — advertencia | `text-amber-500` ✅ |

```
❌ MAL — ícono acento directo en card blanca
<CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />

✅ BIEN — ícono verde legible en card blanca
<CheckCircle2 className="w-4 h-4 text-emerald-600" />
```

---

## 3. Botones

### Primario (acción principal de la página)
```tsx
<Button className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)]
                   h-9 px-5 font-black text-[10px] uppercase tracking-widest rounded-xl
                   shadow-xl shadow-[var(--accent)]/20 transition-all">
  Guardar cambios
</Button>
```

### Secundario (acción alternativa)
```tsx
<Button variant="outline"
        className="h-9 px-4 bg-[var(--bg-card)] border-[var(--border-light)]
                   text-[var(--text-primary-light)] font-bold text-xs
                   hover:bg-[var(--bg-input)] hover:border-[var(--border-light-strong)]
                   transition-colors rounded-xl">
  Cancelar
</Button>
```

### Ghost (acción en contexto / tabla)
```tsx
<Button variant="ghost"
        className="h-8 px-3 text-xs font-bold text-[var(--text-secondary-light)]
                   hover:bg-[var(--bg-input)] hover:text-[var(--text-primary-light)]
                   rounded-lg transition-colors">
  Ver detalle
</Button>
```

### Destructivo (eliminar / acción irreversible)
```tsx
<Button className="h-8 px-3 text-xs font-bold
                   text-red-500 hover:bg-red-50 hover:text-red-600
                   border border-transparent hover:border-red-200
                   rounded-lg transition-all">
  Eliminar
</Button>
```

### Acción con ícono pequeño (toolbar / barra de herramientas)
```tsx
<button className="p-2 rounded-lg text-[var(--text-tertiary-light)]
                   hover:bg-[var(--bg-input)] hover:text-[var(--text-primary-light)]
                   transition-colors">
  <Settings className="w-4 h-4" />
</button>
```

### Estados de botón

| Estado | Fondo | Texto | Borde |
|---|---|---|---|
| Default primario | `--accent` | `--accent-text` | ninguno |
| Hover primario | `--accent-hover` | `--accent-text` | ninguno |
| Default secundario | `--bg-card` | `--text-primary-light` | `--border-light` |
| Hover secundario | `--bg-input` | `--text-primary-light` | `--border-light-strong` |
| Disabled (cualquier tipo) | opacidad `opacity-50`, `pointer-events-none` | — | — |
| Loading | igual al default + spinner `<Loader2 className="animate-spin">` | — | — |

---

## 4. Badges y chips de estado

### Estado activo / positivo
```tsx
// Con fondo tint — el más legible en cards blancas
<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full
                 bg-emerald-50 border border-emerald-200
                 text-[9px] font-black text-emerald-700 uppercase tracking-wider">
  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
  Activo
</span>
```

### Estado inactivo / apagado
```tsx
<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full
                 bg-[var(--bg-input)] border border-[var(--border-light)]
                 text-[9px] font-black text-[var(--text-tertiary-light)] uppercase tracking-wider">
  <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-tertiary-light)]" />
  Inactivo
</span>
```

### Estado en proceso / cargando
```tsx
<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full
                 bg-blue-50 border border-blue-200
                 text-[9px] font-black text-blue-600 uppercase tracking-wider">
  <Loader2 className="w-3 h-3 animate-spin" />
  Procesando
</span>
```

### Estado error
```tsx
<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full
                 bg-red-50 border border-red-200
                 text-[9px] font-black text-red-600 uppercase tracking-wider">
  <AlertCircle className="w-3 h-3" />
  Error
</span>
```

### Resaltado de acento (solo en sidebar oscuro o surfaces oscuras)
```tsx
<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full
                 bg-[var(--accent)]/15 border border-[var(--accent)]/30
                 text-[9px] font-black text-[var(--accent)] uppercase tracking-wider">
  Destacado
</span>
```

---

## 5. Items de lista / filas interactivas

### Fila normal (no seleccionada)
```tsx
<div className="flex items-center gap-3 p-4 rounded-2xl
                bg-[var(--bg-card)] border border-[var(--border-light)]
                hover:border-[var(--border-light-strong)] hover:bg-[var(--bg-input)]/30
                transition-all cursor-pointer">
  {/* contenido */}
</div>
```

### Fila seleccionada / activa
```tsx
<div className="flex items-center gap-3 p-4 rounded-2xl
                bg-[var(--bg-sidebar)] border border-[var(--accent)]/20
                shadow-sm cursor-pointer">
  {/* contenido — textos en claro ya que el fondo es oscuro */}
  <span className="text-sm font-bold text-[var(--text-primary-dark)]">Nombre</span>
</div>
```

> **Regla:** cuando el fondo cambia a `--bg-sidebar` (#1F1F1E), los textos deben usar `--text-primary-dark` o `--text-secondary-dark`, no `--text-primary-light`.

### Fila seleccionada — variante clara (cuando el fondo debe seguir blanco)
```tsx
<div className="relative flex items-center gap-3 p-4
                bg-[var(--bg-input)]/60 border-b border-[var(--border-light)]
                before:absolute before:left-0 before:top-0 before:bottom-0
                before:w-[3px] before:bg-[var(--accent)] before:rounded-r">
  {/* línea de acento a la izquierda */}
</div>
```

---

## 6. Banners y paneles de contexto

### Informativo / ayuda
```tsx
<div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3
                flex items-start gap-3">
  <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
  <p className="text-[12px] text-blue-700 leading-relaxed">Mensaje informativo.</p>
</div>
```

### Advertencia (ventana próxima a vencer, etc.)
```tsx
<div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3
                flex items-start gap-3">
  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
  <p className="text-[12px] text-amber-700 leading-relaxed">Mensaje de advertencia.</p>
</div>
```

### Error / bloqueante
```tsx
<div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3
                flex items-start gap-3">
  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
  <p className="text-[12px] text-red-700 leading-relaxed">Mensaje de error.</p>
</div>
```

### Éxito / confirmación
```tsx
<div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3
                flex items-start gap-3">
  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
  <p className="text-[12px] text-emerald-700 leading-relaxed">Acción completada.</p>
</div>
```

---

## 7. Inputs y campos de formulario

### Input estándar
```tsx
<Input className="bg-[var(--bg-input)] border-[var(--border-light)]
                  focus:border-[var(--accent-active)] focus:ring-2 focus:ring-[var(--accent)]/20
                  text-[var(--text-primary-light)] placeholder:text-[var(--text-tertiary-light)]
                  rounded-xl h-10 text-sm" />
```

### Label de campo
```tsx
<Label className="text-[11px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">
  Nombre del agente
</Label>
```

---

## 8. Secciones vacías (Empty States)

```tsx
<div className="flex flex-col items-center justify-center py-20 space-y-3 opacity-60">
  <div className="w-14 h-14 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-light)]
                  flex items-center justify-center">
    <MiIcono className="w-7 h-7 text-[var(--text-tertiary-light)]" />
  </div>
  <p className="text-sm font-bold text-[var(--text-secondary-light)]">Sin resultados</p>
  <p className="text-xs text-[var(--text-tertiary-light)] text-center max-w-xs">
    Descripción breve de qué falta o qué puede hacer el usuario.
  </p>
</div>
```

---

## 9. Tipografía — jerarquía

| Rol | Clases |
|---|---|
| Título de página | `text-2xl font-bold text-[var(--text-primary-light)] tracking-tight` |
| Subtítulo / descripción | `text-sm text-[var(--text-tertiary-light)]` |
| Label de sección | `text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest` |
| Nombre de ítem | `text-sm font-bold text-[var(--text-primary-light)]` |
| Detalle / metadata | `text-xs text-[var(--text-secondary-light)] font-medium` |
| Timestamp / micro | `text-[10px] font-semibold text-[var(--text-tertiary-light)] tabular-nums` |

---

## 10. Resumen rápido — reglas de oro

1. **`--accent` (#C8FF00) solo sobre fondo oscuro** (`--bg-sidebar`, `--bg-sidebar-deep`). En fondos claros, usá como background con `text-[var(--accent-text)]` o usá `--accent-active` (#A0D400) como color de texto.
2. **Verde de estado → `text-emerald-600` sobre `bg-emerald-50`**, nunca `text-[var(--success)]` solo sobre blanco.
3. **Íconos de acción en cards** → `text-[var(--text-secondary-light)]`, se iluminan a `text-[var(--text-primary-light)]` en hover.
4. **Fila seleccionada con fondo oscuro** → cambiar textos a `--text-primary-dark`.
5. **Bordes**: `--border-light` en reposo, `--border-light-strong` en hover, `--accent)/20` cuando está activo/seleccionado.
6. **Disabled**: siempre `opacity-50 pointer-events-none`, nunca cambiar color.
7. **Radios**: cards → `rounded-2xl` o `rounded-3xl`; botones → `rounded-xl`; chips/pills → `rounded-full`; inputs → `rounded-xl`.
