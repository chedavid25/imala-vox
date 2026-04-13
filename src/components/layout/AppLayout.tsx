"use client";

import React from "react";
import { Sidebar } from "./Sidebar";
import { ContextPanel } from "./ContextPanel";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();

  // Generar breadcrumbs dinámicos basados en la ruta
  const getBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return ['Dashboard'];
    
    return segments.map(segment => {
      // Capitalizar y limpiar guiones
      let label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
      
      // Casos especiales
      if (segment === 'dashboard') return 'Dashboard';
      if (segment === 'inbox') return 'Bandeja de entrada';
      if (segment === 'webs') return 'Sitios web';
      if (segment === 'agentes') return 'Agentes IA';
      if (segment === 'catalogo') return 'Catálogo';
      
      // Si es un ID de agente (asumimos que es el segmento 4 en /dashboard/ajustes/agentes/[id])
      if (segments[segments.indexOf(segment) - 1] === 'agentes' && segment !== 'agentes') {
        return `Agente: ${segment.slice(0, 8)}`;
      }

      return label;
    });
  };

  const breadcrumbs = getBreadcrumbs();

  const showContextPanel = pathname.includes('/inbox') || pathname.includes('/contactos');

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-main)]">
      {/* Columna 1: Sidebar (Maneja su propia lógica interna de 1 o 2 niveles) */}
      <Sidebar />

      {/* Columna 2: Área Principal */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Cabecera del Panel Principal con Breadcrumbs */}
        <header className="h-[var(--header-height)] border-b border-[var(--border-light)] bg-[var(--bg-card)] flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-2 text-[13px]">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                <span className={cn(
                  index === breadcrumbs.length - 1 
                    ? "font-bold text-[var(--text-primary-light)]" 
                    : "text-[var(--text-tertiary-light)]"
                )}>
                  {crumb}
                </span>
                {index < breadcrumbs.length - 1 && (
                  <span className="text-[var(--text-tertiary-light)]/40 mx-0.5">/</span>
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex items-center gap-3">
             <button className="bg-[var(--bg-card)] hover:bg-[var(--bg-input)] text-[var(--text-secondary-light)] px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all border border-[var(--border-light)] shadow-sm">
               Sincronizar
             </button>
          </div>
        </header>

        {/* Contenido de la vista */}
        <div className="flex-1 overflow-y-auto bg-[var(--bg-main)] custom-scrollbar">
          {children}
        </div>
      </main>

      {/* Columna 3: Panel de Contexto (Solo visible en ciertas rutas si es necesario) */}
      {showContextPanel && <ContextPanel />}
    </div>
  );
}
