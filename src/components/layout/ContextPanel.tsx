import React from "react";

export function ContextPanel() {
  return (
    <aside className="w-[var(--context-panel-width)] h-screen bg-[var(--bg-main)] border-l border-[var(--border-light)] flex flex-col shrink-0 hidden lg:flex">
      <div className="h-[var(--header-height)] border-b border-[var(--border-light)] flex items-center px-4">
        <h3 className="text-[13px] font-semibold text-[var(--text-primary-light)]">Contexto</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <section>
          <h4 className="text-[11px] font-medium text-[var(--text-secondary-light)] uppercase tracking-wider mb-3">
            CRM: Contacto
          </h4>
          <div className="bg-[var(--bg-card)] border border-[var(--border-light)] rounded-lg p-3">
            <p className="text-sm font-medium text-[var(--text-primary-light)]">Nombre del Lead</p>
            <p className="text-xs text-[var(--text-secondary-light)]">+54 9 11 ...</p>
          </div>
        </section>

        <section>
          <h4 className="text-[11px] font-medium text-[var(--text-secondary-light)] uppercase tracking-wider mb-3">
            Estado Agente IA
          </h4>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--accent)] ia-activa" />
            <span className="text-[13px] text-[var(--text-primary-light)]">Activo y Respondiendo</span>
          </div>
        </section>
      </div>
    </aside>
  );
}
