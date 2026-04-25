"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FileText, Type, Globe, BookOpen, HelpCircle, ChevronDown, AlertCircle, Lightbulb } from "lucide-react";

const ayudaPorTab: Record<string, {
  titulo: string;
  descripcion: string;
  recomendacion: string;
  ejemplos: { caso: string; detalle: string }[];
}> = {
  archivos: {
    titulo: "¿Para qué sirven los Archivos?",
    descripcion: "Subí documentos que contienen información clave de tu negocio: manuales de productos, políticas, catálogos, FAQ en PDF o Word. El sistema extrae el texto automáticamente y lo incorpora al cerebro de los agentes que actives.",
    recomendacion: "Preferí archivos con texto limpio (no escaneados). Los PDFs con imágenes o formularios no extraen bien. Máximo 20MB por archivo.",
    ejemplos: [
      { caso: "Manual de productos", detalle: "Subí el catálogo en PDF. La IA podrá responder sobre especificaciones, modelos y precios." },
      { caso: "Política de devoluciones", detalle: "Subí el documento Word. La IA citará las condiciones exactas cuando un cliente pregunte." },
      { caso: "Preguntas frecuentes", detalle: "Un TXT con las preguntas y respuestas más comunes le da a la IA respuestas listas al instante." },
    ],
  },
  textos: {
    titulo: "¿Para qué sirven los Textos Planos?",
    descripcion: "Escribí directamente la información que querés que la IA conozca, sin necesidad de subir un archivo. Ideal para datos cortos: horarios, precios, condiciones, instrucciones específicas o cualquier información estructurada.",
    recomendacion: "Mantené cada bloque enfocado en un solo tema. Cuanto más específico el título, más fácil para la IA usar la información correcta en el momento adecuado.",
    ejemplos: [
      { caso: "Horarios de atención", detalle: "Lunes a Viernes 9–18hs, Sábados 9–13hs. La IA lo menciona cuando le preguntan si están disponibles." },
      { caso: "Precios actualizados", detalle: "Listado de planes o servicios con sus valores. Evita que la IA improvise o dé precios incorrectos." },
      { caso: "Datos de contacto", detalle: "Dirección, teléfono, WhatsApp, email. La IA los brinda cuando el cliente los solicita." },
    ],
  },
  webs: {
    titulo: "¿Para qué sirven los Sitios Web?",
    descripcion: "Agregá URLs de tu sitio web y el sistema las lee automáticamente, extrayendo todo el contenido de texto. A diferencia de los archivos, no necesitás descargar nada: el Lector Web visita la página y guarda la información directamente.",
    recomendacion: "Apuntá a páginas con contenido específico: productos, servicios, precios, FAQ. Evitá la home o páginas con poco texto. Si el sitio se actualiza, usá el botón 'Actualizar' para que la IA aprenda los cambios.",
    ejemplos: [
      { caso: "Página de servicios", detalle: "La IA aprende qué ofrecés, cómo funciona cada servicio y cuánto cuesta." },
      { caso: "Sección de preguntas frecuentes", detalle: "La IA responde directamente con las respuestas oficiales de tu sitio." },
      { caso: "Catálogo o tienda online", detalle: "La IA puede recomendar productos según lo que el cliente busca." },
    ],
  },
};

const ayudaGeneral = {
  titulo: "¿Cómo funciona la Base de Conocimiento?",
  descripcion: "Todo lo que cargues aquí va a un pool global del workspace. Después, desde la configuración de cada agente, elegís qué recursos activa cada uno. Así podés tener un agente especializado en ventas con un contenido, y otro de soporte con otro distinto, usando la misma base.",
};

export default function ConocimientoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [showHelp, setShowHelp] = useState(false);

  const tabKey = pathname.split("/").pop() as string;
  const ayudaActual = ayudaPorTab[tabKey];

  const tabs = [
    { label: "Archivos", href: "/dashboard/cerebro/conocimiento/archivos", icon: FileText, key: "archivos" },
    { label: "Textos Planos", href: "/dashboard/cerebro/conocimiento/textos", icon: Type, key: "textos" },
    { label: "Sitios Web", href: "/dashboard/cerebro/conocimiento/webs", icon: Globe, key: "webs" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-4 h-4 text-[var(--text-tertiary-light)]" />
            <span className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">Base de Conocimiento</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary-light)] tracking-tight">Recursos del Workspace</h1>
          <p className="text-sm text-[var(--text-tertiary-light)]">
            Administrá el pool global de recursos compartidos para todos tus agentes.
          </p>
        </div>
        <button
          onClick={() => setShowHelp(v => !v)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all shrink-0",
            showHelp
              ? "bg-[var(--bg-sidebar)] border-[var(--border-dark)] text-[var(--accent)]"
              : "bg-[var(--bg-card)] border-[var(--border-light)] text-[var(--text-secondary-light)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary-light)]"
          )}
        >
          <HelpCircle className="w-4 h-4" />
          ¿Para qué sirve?
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showHelp && "rotate-180")} />
        </button>
      </div>

      {/* Panel de ayuda expandible */}
      {showHelp && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-light)] rounded-3xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">

          {/* Sección general — siempre visible */}
          <div className="px-6 pt-6 pb-4 border-b border-[var(--border-light)]">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--bg-sidebar)] border border-[var(--border-dark)] flex items-center justify-center shrink-0">
                <Lightbulb className="w-4 h-4 text-[var(--accent)]" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-[var(--text-primary-light)]">{ayudaGeneral.titulo}</h3>
                <p className="text-sm text-[var(--text-secondary-light)] leading-relaxed">{ayudaGeneral.descripcion}</p>
              </div>
            </div>
          </div>

          {/* Sección específica según tab activa */}
          {ayudaActual && (
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">
                  Esta pestaña — {tabs.find(t => t.key === tabKey)?.label}
                </span>
              </div>

              <p className="text-sm text-[var(--text-secondary-light)] leading-relaxed">{ayudaActual.descripcion}</p>

              {/* Ejemplos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {ayudaActual.ejemplos.map((ej, i) => (
                  <div key={i} className="bg-[var(--bg-input)]/50 border border-[var(--border-light)] rounded-2xl p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-tertiary-light)] shrink-0" />
                      <span className="text-[12px] font-bold text-[var(--text-primary-light)]">{ej.caso}</span>
                    </div>
                    <p className="text-[12px] text-[var(--text-secondary-light)] leading-relaxed pl-3.5">{ej.detalle}</p>
                  </div>
                ))}
              </div>

              {/* Recomendación */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-[12px] font-bold text-amber-800">Recomendación</p>
                  <p className="text-[12px] text-amber-700 leading-relaxed">{ayudaActual.recomendacion}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs de navegación */}
      <div className="border-b border-[var(--border-light)]">
        <nav className="flex gap-8">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex items-center gap-2 py-3.5 text-sm font-semibold transition-all border-b-2 relative",
                  isActive
                    ? "border-[var(--text-primary-light)] text-[var(--text-primary-light)]"
                    : "border-transparent text-[var(--text-tertiary-light)] hover:text-[var(--text-secondary-light)] hover:border-[var(--border-light-strong)]"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div>
        {children}
      </div>
    </div>
  );
}
