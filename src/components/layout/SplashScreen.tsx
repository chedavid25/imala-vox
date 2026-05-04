"use client";

import React from "react";
import Image from "next/image";

export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#1F1F1E] transition-opacity duration-500">
      <div className="relative flex flex-col items-center">
        {/* Logo con animación de entrada y pulso suave */}
        <div className="relative w-48 h-48 md:w-64 md:h-64 animate-in fade-in zoom-in duration-1000 ease-out">
          <Image
            src="/icons/logo transparente vox.png"
            alt="Imalá Vox Logo"
            fill
            sizes="(max-width: 768px) 192px, 256px"
            className="object-contain animate-pulse duration-[3000ms]"
            priority
          />
        </div>
        
        {/* Indicador de carga minimalista */}
        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#C8FF00] animate-bounce [animation-delay:-0.3s]" />
            <div className="w-2 h-2 rounded-full bg-[#C8FF00] animate-bounce [animation-delay:-0.15s]" />
            <div className="w-2 h-2 rounded-full bg-[#C8FF00] animate-bounce" />
          </div>
          <span className="text-[var(--text-secondary-dark)] text-sm font-medium tracking-widest uppercase opacity-50">
            Cargando Imalá Vox
          </span>
        </div>
      </div>
      
      {/* Glow sutil de fondo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#C8FF00]/5 blur-[120px] rounded-full pointer-events-none" />
    </div>
  );
}
