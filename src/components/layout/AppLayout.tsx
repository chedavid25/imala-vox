"use client";

import React from "react";
import { Sidebar } from "./Sidebar";
import { ContextPanel } from "./ContextPanel";
import { usePathname } from "next/navigation";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();

  // Mapeo simple de títulos basado en la ruta
  const getPageTitle = () => {
    if (pathname.includes("/operacion/inbox")) return "Bandeja de entrada";
    if (pathname.includes("/operacion/contactos")) return "Contactos";
    if (pathname.includes("/operacion/difusion")) return "Difusión";
    if (pathname.includes("/cerebro/catalogo")) return "Catálogo";
    if (pathname.includes("/cerebro/conocimiento")) return "Base de conocimiento";
    return "Dashboard";
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-main)]">
      {/* Columna 1: Sidebar */}
      <Sidebar />

      {/* Columna 2: Área Principal */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Cabecera del Panel Principal */}
        <header className="h-[var(--header-height)] border-b border-[var(--border-light)] bg-[var(--bg-card)] flex items-center justify-between px-6 shrink-0 z-10">
          <h1 className="text-[15px] font-bold text-[var(--text-primary-light)]">
            {getPageTitle()}
          </h1>
          <div className="flex items-center gap-3">
             <button className="bg-[var(--bg-input)] hover:bg-[var(--border-light)] text-[var(--text-secondary-light)] px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors border border-[var(--border-light)]">
               Sincronizar
             </button>
          </div>
        </header>

        {/* Contenido de la vista */}
        <div className="flex-1 overflow-y-auto bg-[var(--bg-main)]">
          {children}
        </div>
      </main>

      {/* Columna 3: Panel de Contexto */}
      <ContextPanel />
    </div>
  );
}
