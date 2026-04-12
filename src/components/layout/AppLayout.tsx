import React from "react";
import { Sidebar } from "./Sidebar";
import { ContextPanel } from "./ContextPanel";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-main)]">
      {/* Columna 1: Sidebar */}
      <Sidebar />

      {/* Columna 2: Área Principal */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Cabecera del Panel Principal */}
        <header className="h-[var(--header-height)] border-b border-[var(--border-light)] bg-[var(--bg-main)] flex items-center justify-between px-6 shrink-0">
          <h1 className="text-[15px] font-semibold text-[var(--text-primary-light)]">Bandeja de entrada</h1>
          <div className="flex items-center gap-3">
             <button className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)] text-[var(--accent-text)] px-4 py-1.5 rounded-md text-[13px] font-medium transition-colors">
               Nueva conversación
             </button>
          </div>
        </header>

        {/* Contenido de la vista */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>

      {/* Columna 3: Panel de Contexto */}
      <ContextPanel />
    </div>
  );
}
