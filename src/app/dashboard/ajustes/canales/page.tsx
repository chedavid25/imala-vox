"use client";

import React from "react";
import { 
  MessageSquare, 
  Instagram, 
  Send, 
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
  { id: 'tg', nombre: 'Telegram Bot', icon: Send, color: '#0088cc', status: 'disconnected', cuenta: '-' },
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
                    variant="outline" 
                    className={cn(
                      "text-[9px] font-bold uppercase",
                      canal.status === 'connected' ? "bg-[var(--success)]/5 text-[var(--success)] border-[var(--success)]/20" : "bg-[var(--text-tertiary-light)]/5 text-[var(--text-tertiary-light)] border-[var(--border-light)]"
                    )}
                  >
                    {canal.status === 'connected' ? 'Conectado' : 'Desconectado'}
                  </Badge>
                </div>
                <p className="text-xs text-[var(--text-tertiary-light)] font-medium">
                  {canal.cuenta !== '-' ? `Cuenta: ${canal.cuenta}` : 'Sin cuenta vinculada'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end mr-4">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--success)] uppercase tracking-wider mb-1">
                  <Activity className="w-3 h-3" />
                  Sistema Online
                </div>
                <p className="text-[11px] text-[var(--text-tertiary-light)] font-medium">Último pulso: hace 2 min</p>
              </div>
              <Button variant="outline" size="sm" className="h-9 border-[var(--border-light)] hover:bg-[var(--bg-input)]">
                Configurar
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                <MoreVertical className="w-4 h-4" />
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
