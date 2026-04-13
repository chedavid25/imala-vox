"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { TestChat } from "@/components/ai/TestChat";
import { Bot, Sparkles, MessageSquare, Info } from "lucide-react";

export default function AgentePlaygroundPage() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const { id: agentId } = useParams();

  if (!currentWorkspaceId || !agentId) return null;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-[var(--border-light)] pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[var(--accent)] font-bold text-xs uppercase tracking-widest mb-1">
            <Sparkles className="w-3 h-3" />
            <span>Laboratorio de IA</span>
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-primary-light)] tracking-tight">Chat de Prueba</h1>
          <p className="text-sm text-[var(--text-tertiary-light)] font-medium max-w-[600px]">
            Valida las respuestas de tu agente en tiempo real. Este entorno utiliza tu base de conocimiento actual para generar respuestas precisas.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Columna del Chat (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8">
           <TestChat wsId={currentWorkspaceId} agentId={agentId as string} />
        </div>

        {/* Columna de Información (4 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          <div className="bg-[var(--bg-input)]/30 border border-[var(--border-light)] p-8 rounded-[2.5rem] space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
                <Info className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary-light)]">Información Útil</h3>
            </div>

            <div className="space-y-5">
              <InfoItem 
                title="RAG Context" 
                desc="La IA buscará automáticamente en los archivos y textos que hayas marcado como 'Activos' para este agente."
              />
              <InfoItem 
                title="Prompt Caching" 
                desc="El entorno utiliza caché efímero para que tus pruebas sean ultrarrápidas y consuman menos recursos."
              />
              <InfoItem 
                title="Modo Volátil" 
                desc="Lo que hables aquí no se guarda en el historial de contactos ni afecta al CRM. Es un entorno seguro."
              />
            </div>

            <div className="pt-4 border-t border-[var(--border-light)]">
              <p className="text-[11px] text-[var(--text-tertiary-light)] leading-relaxed italic font-medium">
                Tip: Si cambias las instrucciones en la pestaña lateral, recuerda guardar los cambios antes de volver aquí para que la IA tome la nueva configuración.
              </p>
            </div>
          </div>

          <div className="p-6 bg-[var(--accent)]/[0.03] border border-[var(--accent)]/10 rounded-3xl flex gap-4 items-center">
             <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                <MessageSquare className="w-5 h-5 text-[var(--accent)]" />
             </div>
             <div>
                <p className="text-xs font-bold text-[var(--text-primary-light)]">¿Todo listo?</p>
                <p className="text-[10px] text-[var(--text-tertiary-light)] font-medium">Una vez estés conforme, vincula el agente a un canal.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ title, desc }: { title: string, desc: string }) {
  return (
    <div className="space-y-1">
      <h4 className="text-xs font-bold text-[var(--text-primary-light)] uppercase tracking-tight">{title}</h4>
      <p className="text-[11px] text-[var(--text-secondary-light)] leading-relaxed font-medium">{desc}</p>
    </div>
  );
}
