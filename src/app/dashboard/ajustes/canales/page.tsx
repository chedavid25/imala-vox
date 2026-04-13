"use client";

import React from "react";
import { 
  MessageSquare, 
  Instagram, 
  MessageCircle, 
  Plus, 
  CheckCircle2, 
  Loader2,
  AlertCircle,
  MoreVertical,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "../../../../components/ui/badge";
import { cn } from "@/lib/utils";

const CANALES = [
  { id: 'wa', nombre: 'WhatsApp Business', icon: MessageSquare, color: '#25D366', status: 'connected', cuenta: '+54 9 11 2233-4455' },
  { id: 'ig', nombre: 'Instagram Direct', icon: Instagram, color: '#E1306C', status: 'connected', cuenta: '@imalavox_ok' },
  { id: 'fb', nombre: 'Facebook Messenger', icon: MessageCircle, color: '#1877F2', status: 'disconnected', cuenta: '-' },
];

export default function CanalesPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[var(--text-primary-light)]">Canales de Comunicación</h1>
          <p className="text-sm text-[var(--text-tertiary-light)]">Gestiona las conexiones activas de tu CRM.</p>
        </div>
        <Button className="bg-[var(--accent)] text-[var(--accent-text)]">
          <Plus className="w-4 h-4 mr-2" />
          Conectar Canal
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {CANALES.map((canal) => (
          <div 
            key={canal.id}
            className="group bg-[var(--bg-card)] border border-[var(--border-light)] rounded-3xl p-6 hover:shadow-xl hover:shadow-[var(--accent)]/5 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-5">
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg"
                style={{ backgroundColor: canal.color }}
              >
                <canal.icon className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[var(--text-primary-light)]">{canal.nombre}</h3>
                  <Badge 
                    className={cn(
                      "text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shadow-sm transition-all duration-500",
                      canal.status === 'connected' 
                        ? "bg-[#1A1A18] text-[#C8FF00] border-[#C8FF00]/20 ring-4 ring-[#C8FF00]/5" 
                        : "bg-[#1A1A18] text-[var(--text-tertiary-dark)] border-white/5 opacity-50"
                    )}
                  >
                    <div className={cn("w-1.5 h-1.5 rounded-full mr-1.5", canal.status === 'connected' ? "bg-[#C8FF00] animate-pulse" : "bg-gray-500")} />
                    {canal.status === 'connected' ? 'En línea' : 'Desconectado'}
                  </Badge>
                </div>
                <p className="text-[11px] text-[var(--text-tertiary-light)] font-medium">
                  {canal.cuenta !== '-' ? canal.cuenta : 'Esperando vinculación...'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end mr-4">
                {canal.status === 'connected' ? (
                  <>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#C8FF00] uppercase tracking-wider mb-0.5">
                      <Activity className="w-3 h-3 animate-pulse" />
                      Sistema Activo
                    </div>
                    <p className="text-[11px] text-[var(--text-tertiary-light)] font-medium">Último pulso: hace 2 min</p>
                  </>
                ) : (
                  <span className="text-[10px] text-[var(--text-tertiary-light)] font-bold uppercase tracking-widest">Sin conexión</span>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="border border-[var(--border-light-strong)] bg-transparent text-[var(--text-primary-light)] hover:bg-[var(--bg-input)] hover:border-[var(--accent)]/50 hover:text-[var(--accent)] transition-all font-semibold rounded-[var(--radius-md)] h-9 px-5 text-[12px]"
              >
                Configurar
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-[var(--bg-input)]">
                <MoreVertical className="w-4 h-4 text-[var(--text-tertiary-light)]" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-8 border-2 border-dashed border-[var(--border-light)] rounded-3xl flex flex-col items-center justify-center text-center space-y-4 bg-[var(--bg-card)]/30">
        <div className="w-12 h-12 rounded-full bg-[var(--bg-input)] flex items-center justify-center">
            <Plus className="w-6 h-6 text-[var(--text-tertiary-light)]" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-[var(--text-primary-light)]">¿Necesitas un canal personalizado?</h4>
          <p className="text-xs text-[var(--text-tertiary-light)] max-w-xs">Puedes conectar APIs personalizadas o Webhooks para integrar cualquier sistema externo.</p>
        </div>
        <Button variant="link" className="text-[var(--accent)] font-bold text-xs p-0 h-auto">Ver documentación de API →</Button>
      </div>
    </div>
  );
}
