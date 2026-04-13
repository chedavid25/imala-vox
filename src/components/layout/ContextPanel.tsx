"use client";

import React from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useContactos } from "@/hooks/useContactos";
import { IndicadorIA } from "@/components/ui/IndicadorIA";
import { User, Mail, Phone, Calendar, Info } from "lucide-react";

export function ContextPanel() {
  const { selectedContactId } = useWorkspaceStore();
  const { contactos } = useContactos();

  const selectedContact = contactos.find(c => c.id === selectedContactId);

  if (!selectedContactId) {
    return (
      <aside className="w-[var(--context-panel-width)] h-screen bg-[var(--bg-main)] border-l border-[var(--border-light)] flex flex-col shrink-0 hidden lg:flex">
        <div className="h-[var(--header-height)] border-b border-[var(--border-light)] flex items-center px-4">
          <h3 className="text-[13px] font-semibold text-[var(--text-primary-light)]">Contexto</h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-input)] flex items-center justify-center text-[var(--text-tertiary-light)]">
            <Info className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-secondary-light)]">Sin selección</p>
            <p className="text-xs text-[var(--text-tertiary-light)] mt-1">Selecciona un contacto para ver sus detalles y estado de IA.</p>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-[var(--context-panel-width)] h-screen bg-[var(--bg-main)] border-l border-[var(--border-light)] flex flex-col shrink-0 hidden lg:flex">
      <div className="h-[var(--header-height)] border-b border-[var(--border-light)] flex items-center px-4 bg-[var(--bg-card)]">
        <h3 className="text-[13px] font-semibold text-[var(--text-primary-light)]">Contexto de Contacto</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        {/* Sección de Identidad */}
        <section className="space-y-4">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-sidebar)] border-2 border-[var(--accent)]/30 flex items-center justify-center shadow-md">
              <User className="w-8 h-8 text-[var(--accent)]" />
            </div>
            <div>
              <h4 className="text-base font-bold text-[var(--text-primary-light)] tracking-tight">
                {selectedContact?.nombre || "Cargando..."}
              </h4>
              <p className="text-[11px] font-semibold text-[var(--accent)] uppercase tracking-widest">
                {selectedContact?.relacionTag || "CONTACTO"}
              </p>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-light)] rounded-xl p-4 space-y-3 shadow-sm">
            <div className="flex items-center gap-3 text-[13px]">
              <Phone className="w-4 h-4 text-[var(--text-tertiary-light)]" />
              <span className="text-[var(--text-secondary-light)] font-medium">
                {selectedContact?.telefono || "No disponible"}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[13px]">
              <Mail className="w-4 h-4 text-[var(--text-tertiary-light)]" />
              <span className="text-[var(--text-secondary-light)] font-medium truncate">
                {selectedContact?.email || "Sin email"}
              </span>
            </div>
            {selectedContact?.fechaNacimiento && (
              <div className="flex items-center gap-3 text-[13px]">
                <Calendar className="w-4 h-4 text-[var(--text-tertiary-light)]" />
                <span className="text-[var(--text-secondary-light)] font-medium">
                  {selectedContact.fechaNacimiento}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Sección de IA */}
        <section className="space-y-3 pt-4 border-t border-[var(--border-light)]">
          <h4 className="text-[11px] font-bold text-[var(--text-tertiary-light)] uppercase tracking-widest px-1">
            Estado de IA
          </h4>
          <div className="bg-[var(--bg-input)]/50 border border-[var(--border-light)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] font-medium text-[var(--text-secondary-light)]">Agente Autónomo</span>
              <IndicadorIA status={selectedContact?.aiBlocked ? 'error' : 'activo'} />
            </div>
            <p className="text-[12px] text-[var(--text-tertiary-light)] leading-relaxed italic">
              {selectedContact?.aiBlocked 
                ? "La IA ha sido bloqueada manualmente para este contacto para proteger su privacidad."
                : "El agente tiene permiso para procesar mensajes de este contacto usando la base de conocimiento."}
            </p>
          </div>
        </section>
      </div>

      <div className="p-4 border-t border-[var(--border-light)] bg-[var(--bg-card)]">
         <button className="w-full h-9 bg-[var(--bg-input)] hover:bg-[var(--border-light)] text-[var(--text-primary-light)] text-[12px] font-bold rounded-lg transition-colors border border-[var(--border-light)]">
           Ver historial completo
         </button>
      </div>
    </aside>
  );
}
