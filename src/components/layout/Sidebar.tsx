import React from "react";

export function Sidebar() {
  return (
    <aside className="w-[var(--sidebar-width)] h-screen bg-[var(--bg-sidebar)] border-r border-[var(--border-dark)] flex flex-col shrink-0">
      <div className="p-4 border-b border-[var(--border-dark)]">
        <h2 className="text-[var(--text-primary-dark)] font-semibold text-sm">Imalá Vox</h2>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        <div className="px-2 py-1 text-[11px] font-medium text-[var(--text-secondary-dark)] uppercase tracking-wider">
          Operación
        </div>
        <NavItem label="Bandeja de entrada" active />
        <NavItem label="Contactos" />
        <NavItem label="Difusión" />
        
        <div className="pt-4 px-2 py-1 text-[11px] font-medium text-[var(--text-secondary-dark)] uppercase tracking-wider">
          Cerebro
        </div>
        <NavItem label="Catálogo" />
        <NavItem label="Base de conocimiento" />
      </nav>
      <div className="p-4 border-t border-[var(--border-dark)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[var(--bg-sidebar-hover)]" />
          <div className="text-xs">
            <p className="text-[var(--text-primary-dark)] font-medium">David</p>
            <p className="text-[var(--text-secondary-dark)]">Pro Plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <button
      className={`w-full text-left px-2 py-1.5 rounded-md text-[13px] transition-colors ${
        active 
          ? "bg-[var(--bg-sidebar-hover)] text-[var(--text-primary-dark)]" 
          : "text-[var(--text-secondary-dark)] hover:bg-[var(--bg-sidebar-hover)] hover:text-[var(--text-primary-dark)]"
      }`}
    >
      {label}
    </button>
  );
}
