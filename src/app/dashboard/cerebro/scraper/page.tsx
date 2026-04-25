"use client";

import React, { useState } from "react";
import { Globe, Loader2, Play, CheckCircle2, AlertCircle, HelpCircle, ChevronDown, Lightbulb, BookOpen, ShoppingCart, Building2, Stethoscope, GraduationCap, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ejemplos = [
  {
    icon: ShoppingCart,
    negocio: "Tienda online",
    url: "https://mitienda.com/productos",
    resultado: "La IA aprende todos tus productos, precios, stock y condiciones de envío. Puede responder '¿Tenés zapatillas talle 42?' sin que vos cargues nada manualmente.",
  },
  {
    icon: Building2,
    negocio: "Inmobiliaria",
    url: "https://reinmobiliaria.com/propiedades",
    resultado: "La IA conoce cada propiedad disponible: metros, ambientes, precio, barrio. Puede filtrar y recomendar opciones según lo que pide el cliente.",
  },
  {
    icon: Stethoscope,
    negocio: "Consultorio / Clínica",
    url: "https://clinica.com/servicios",
    resultado: "La IA aprende los servicios, especialidades, cobertura de obras sociales y horarios. Puede responder consultas frecuentes sin derivar al humano.",
  },
  {
    icon: GraduationCap,
    negocio: "Academia / Cursos",
    url: "https://academia.com/cursos",
    resultado: "La IA conoce los programas, precios, modalidades y fechas de inicio. Puede guiar a un interesado desde la primera consulta hasta la inscripción.",
  },
];

export default function LectorWebPage() {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[var(--text-primary-light)]">Lector Web</h1>
          <p className="text-sm text-[var(--text-tertiary-light)]">Enseñale a tu IA el contenido de cualquier sitio web, sin copiar ni pegar nada.</p>
        </div>
        <button
          onClick={() => setShowHelp(v => !v)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all",
            showHelp
              ? "bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)]"
              : "bg-[var(--bg-card)] border-[var(--border-light)] text-[var(--text-secondary-light)] hover:border-[var(--accent)]/30 hover:text-[var(--accent)]"
          )}
        >
          <HelpCircle className="w-4 h-4" />
          ¿Para qué sirve?
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showHelp && "rotate-180")} />
        </button>
      </div>

      {/* Panel de ayuda expandible */}
      {showHelp && (
        <div className="bg-[var(--bg-card)] border border-[var(--accent)]/20 rounded-3xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-6 pt-6 pb-4 border-b border-[var(--border-light)]">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center shrink-0">
                <Lightbulb className="w-4 h-4 text-[var(--accent)]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-[var(--text-primary-light)]">¿Qué hace el Lector Web?</h3>
                <p className="text-sm text-[var(--text-secondary-light)] leading-relaxed">
                  El Lector Web visita la URL que le indicás, lee todo el contenido de la página (textos, precios, descripciones, preguntas frecuentes, etc.) y lo guarda en el cerebro de tu IA. A partir de ese momento, el agente puede responder preguntas usando esa información <span className="font-semibold text-[var(--text-primary-light)]">sin que nadie tenga que cargarla manualmente</span>.
                </p>
                <p className="text-sm text-[var(--text-secondary-light)] leading-relaxed">
                  La lectura ocurre <span className="font-semibold text-[var(--text-primary-light)]">una sola vez</span> y el contenido queda guardado. Si el sitio se actualiza, podés releer la URL con el botón "Actualizar" desde la sección <span className="font-semibold">Base de Conocimiento → Sitios Web</span>.
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-[var(--text-tertiary-light)]" />
              <span className="text-[11px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">Ejemplos de uso</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ejemplos.map((ej, i) => (
                <div key={i} className="bg-[var(--bg-input)]/60 border border-[var(--border-light)] rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[var(--bg-card)] border border-[var(--border-light)] flex items-center justify-center shrink-0">
                      <ej.icon className="w-3.5 h-3.5 text-[var(--accent)]" />
                    </div>
                    <span className="text-[12px] font-bold text-[var(--text-primary-light)]">{ej.negocio}</span>
                  </div>
                  <p className="text-[11px] font-mono text-[var(--accent)]/70 bg-[var(--bg-card)] px-2 py-1 rounded-lg border border-[var(--border-light)] truncate">
                    {ej.url}
                  </p>
                  <p className="text-[12px] text-[var(--text-secondary-light)] leading-relaxed">
                    {ej.resultado}
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-3 mt-2">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[12px] font-bold text-amber-800">Recomendación</p>
                <p className="text-[12px] text-amber-700 leading-relaxed">
                  Apuntá URLs con contenido específico y relevante, no la home general. Por ejemplo: la página de precios, el catálogo de productos o la sección de preguntas frecuentes. Cuanto más concreto el contenido, mejores respuestas dará la IA.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-[var(--bg-card)] border border-[var(--border-light)] p-8 rounded-3xl space-y-6 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--bg-sidebar)] border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] shadow-sm">
                  <Play className="w-4 h-4 fill-current" />
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary-light)]">Lanzar nueva lectura</h3>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Globe className="absolute left-3 top-3 w-4 h-4 text-[var(--text-tertiary-light)]" />
                  <Input
                    placeholder="https://ejemplo.com/precios"
                    className="pl-10 bg-[var(--bg-input)] border-[var(--border-light)] rounded-xl"
                  />
                </div>
                <Button className="bg-[var(--accent)] text-[var(--accent-text)] px-6">Empezar</Button>
              </div>
            </div>

            <div className="pt-6 border-t border-[var(--border-light)] space-y-4">
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary-light)]">
                <span>Estado actual</span>
                <span className="text-[var(--accent)]">En reposo</span>
              </div>
              <div className="h-2 w-full bg-[var(--bg-input)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--accent)] w-0" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[var(--text-primary-light)] flex items-center gap-2 px-2">
              <Loader2 className="w-4 h-4 text-[var(--accent)]" />
              Lecturas realizadas recientemente
            </h3>
            <div className="grid gap-3">
              {[1, 2].map(i => (
                <div key={i} className="bg-[var(--bg-input)]/30 border border-[var(--border-light)] p-4 rounded-2xl flex items-center justify-between opacity-50 grayscale">
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-[var(--text-tertiary-light)]" />
                    <span className="text-xs font-medium">https://demo.com/pages/{i}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-[var(--border-light)] text-[var(--text-tertiary-light)]">Completado</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[var(--bg-card)] border border-[var(--border-light)] p-6 rounded-3xl space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary-light)]">Configuración</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-medium">
                <span>Profundidad</span>
                <span className="text-[var(--accent)]">Nivel 2</span>
              </div>
              <div className="flex items-center justify-between text-xs font-medium">
                <span>Tiempo máximo</span>
                <span className="text-[var(--accent)]">30s</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
