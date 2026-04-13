"use client";

import React from "react";
import { 
  GitBranch, 
  Zap, 
  MessageSquare, 
  Tag, 
  Bell, 
  Plus, 
  MoreVertical,
  ArrowRight,
  PlayCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const WORKFLOWS = [
  { 
    id: 1, 
    nombre: "Bienvenida Automática", 
    trigger: "Primer mensaje del cliente", 
    action: "Responder con Agente IA",
    active: true,
    executions: 1240
  },
  { 
    id: 2, 
    nombre: "Etiquetado por Intención", 
    trigger: "IA detecta 'Interés en Venta'", 
    action: "Aplicar Etiqueta 'Lead Calificado'",
    active: true,
    executions: 452
  },
  { 
    id: 3, 
    nombre: "Alerta de Urgencia", 
    trigger: "IA detecta 'Reclamo'", 
    action: "Notificar por Email a Soporte",
    active: false,
    executions: 89
  },
];

export default function WorkflowsPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-end border-b border-[var(--border-light)] pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[var(--accent)] mb-1">
            <GitBranch className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Automation Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary-light)]">Flujos de Trabajo (Automation)</h1>
          <p className="text-sm text-[var(--text-tertiary-light)]">Automatiza disparadores y acciones lógicas en tu CRM.</p>
        </div>
        <Button className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] px-8 shadow-md">
          <Plus className="w-4 h-4 mr-2" />
          Crear Workflow
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {WORKFLOWS.map((wf) => (
          <div 
            key={wf.id}
            className={cn(
              "group bg-[var(--bg-card)] border rounded-3xl p-6 transition-all",
              wf.active ? "border-[var(--border-light)] hover:border-[var(--accent)]/40 shadow-sm" : "border-[var(--border-light)] opacity-60 grayscale"
            )}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-5">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                  wf.active ? "bg-[var(--bg-sidebar)] border border-[var(--accent)]/30 text-[var(--accent)]" : "bg-[var(--bg-input)] text-[var(--text-tertiary-light)]"
                )}>
                  <Zap className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-[var(--text-primary-light)]">{wf.nombre}</h3>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary-light)] font-medium bg-[var(--bg-input)] px-2 py-1 rounded-lg">
                      <PlayCircle className="w-3 h-3" />
                      {wf.trigger}
                    </div>
                    <ArrowRight className="hidden sm:block w-3 h-3 text-[var(--text-tertiary-light)] opacity-40" />
                    <div className="flex items-center gap-1.5 text-xs text-[var(--accent)] font-bold bg-[var(--accent)]/5 px-2 py-1 rounded-lg">
                      <Zap className="w-3 h-3" />
                      {wf.action}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-4 md:pt-0">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-[var(--text-tertiary-light)] uppercase tracking-wider mb-0.5">Ejecuciones</p>
                  <p className="text-sm font-bold text-[var(--text-primary-light)]">{wf.executions.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={wf.active} />
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}

        <div className="p-12 border-2 border-dashed border-[var(--border-light)] rounded-3xl flex flex-col items-center justify-center text-center space-y-4 bg-[var(--bg-card)]/30 group hover:border-[var(--accent)]/40 transition-all cursor-pointer">
          <div className="w-14 h-14 rounded-2xl bg-[var(--bg-input)] flex items-center justify-center group-hover:bg-[var(--accent)] transition-all">
            <Plus className="w-7 h-7 text-[var(--text-tertiary-light)] group-hover:text-[var(--accent-text)]" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-[var(--text-primary-light)]">Explorar Plantillas de Automatización</h4>
            <p className="text-sm text-[var(--text-tertiary-light)] max-w-sm">No empieces de cero. Usa flujos pre-configurados para ventas, soporte o marketing.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
