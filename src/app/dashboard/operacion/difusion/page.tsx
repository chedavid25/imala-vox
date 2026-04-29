"use client";

import React from "react";
import { Megaphone, Construction } from "lucide-react";

export default function DifusionPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="size-20 rounded-3xl bg-[var(--accent)]/10 flex items-center justify-center border border-[var(--accent)]/20 shadow-2xl shadow-[var(--accent)]/5">
        <Megaphone className="size-10 text-[var(--accent)]" />
      </div>
      
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-black text-white tracking-tight uppercase tracking-[0.2em]">Difusión masiva</h1>
        <div className="flex items-center justify-center gap-2 text-white/40 font-bold text-xs uppercase tracking-widest">
          <Construction className="size-3.5" />
          Módulo en desarrollo
        </div>
      </div>

      <p className="max-w-md text-center text-white/40 text-sm leading-relaxed font-medium">
        Estamos preparando una herramienta potente para que puedas enviar mensajes masivos personalizados y campañas de re-engagement de forma inteligente.
      </p>

      <div className="pt-8 grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
         <FeaturePreview title="Segmentación" desc="Filtra por etiquetas y comportamiento." />
         <FeaturePreview title="IA Personalizada" desc="Mensajes únicos para cada contacto." />
         <FeaturePreview title="Programación" desc="Envía en el mejor horario para convertir." />
      </div>
    </div>
  );
}

function FeaturePreview({ title, desc }: { title: string, desc: string }) {
  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
      <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)]">{title}</h4>
      <p className="text-[11px] text-white/60 leading-snug">{desc}</p>
    </div>
  );
}
