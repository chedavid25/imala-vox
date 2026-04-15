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
    <div className="flex flex-col items-center justify-center h-full min-h-[600px] p-12 text-center space-y-6 animate-in fade-in duration-700">  
      <div className="w-20 h-20 rounded-3xl bg-[var(--bg-input)] border border-[var(--border-light)] flex items-center justify-center shadow-inner">  
        <GitBranch className="w-10 h-10 text-[var(--text-tertiary-light)]" />  
      </div>  
      <div className="space-y-3">  
        <h2 className="text-2xl font-bold text-[var(--text-primary-light)] tracking-tight">Flujos de Trabajo (Automation)</h2>  
        <p className="text-sm text-[var(--text-tertiary-light)] max-w-md leading-relaxed">  
          Estamos construyendo un motor de automatización potente.  
          Próximamente podrás configurar disparadores personalizados,  
          acciones encadenadas y lógica condicional para tu CRM.  
        </p>  
      </div>  
      <div className="flex flex-col items-center gap-4">
        <span className="px-5 py-2 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.2em]">  
          Módulo en desarrollo  
        </span>
      </div>

      {/* Contenido original preservado para futura activación */}
      {/* 
      <div className="p-8 max-w-6xl mx-auto space-y-8 pb-20 text-left w-full opacity-20 pointer-events-none blur-[2px]">
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
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      */}
    </div>
  );
}
