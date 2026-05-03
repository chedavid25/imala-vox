"use client";

import React from "react";
import { 
  Megaphone, 
  Plus, 
  Users, 
  MessageSquare, 
  Zap, 
  ArrowUpRight, 
  BarChart3,
  Calendar,
  Send,
  MoreHorizontal,
  ChevronRight,
  Construction
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DifusionPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700">
      
      {/* Header con Estética de Contraste */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)] border border-[var(--accent)]/20 shadow-sm">
            <Zap className="size-3.5 text-black fill-black" />
            <span className="text-[10px] font-black uppercase tracking-widest text-black">Módulo de Difusión</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-[var(--text-primary-light)] tracking-tight uppercase leading-none">
              Difusión <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--text-primary-light)] to-slate-400">Inteligente</span>
            </h1>
            <p className="text-[13px] text-[var(--text-secondary-light)] font-medium max-w-xl">
              Crea campañas masivas personalizadas con IA. Llega a miles de clientes como si fuera un mensaje uno a uno.
            </p>
          </div>
        </div>
        
        <Button className="bg-black hover:bg-slate-800 text-white h-14 px-8 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-3">
          <Plus className="size-4" /> Crear Nueva Campaña
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Send} label="Enviados" value="12.4k" trend="+14%" color="lime" />
        <StatCard icon={Users} label="Alcance" value="8.2k" trend="+8%" color="slate" />
        <StatCard icon={MessageSquare} label="Conversiones" value="1.2k" trend="+22%" color="lime" />
        <StatCard icon={BarChart3} label="ROI Est." value="x4.2" trend="+12%" color="slate" />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Campañas Recientes */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Campañas en curso</h3>
            <Button variant="ghost" className="text-[10px] font-bold uppercase text-[var(--accent)]">Ver todas</Button>
          </div>

          <div className="space-y-3">
             <CampaignItem 
                title="Promoción Otoño - Inmuebles" 
                status="Enviando" 
                progress={65} 
                sent={1200} 
                total={1840} 
                date="Hoy, 10:30 AM"
             />
             <CampaignItem 
                title="Re-engagement Inversores" 
                status="Completada" 
                progress={100} 
                sent={450} 
                total={450} 
                date="Ayer, 04:15 PM"
             />
             <CampaignItem 
                title="Newsletter Semanal" 
                status="Programada" 
                progress={0} 
                sent={0} 
                total={3200} 
                date="Mañana, 09:00 AM"
             />
          </div>
        </div>

        {/* Panel de Desarrollo / Próximamente */}
        <div className="bg-black text-white rounded-[32px] p-8 space-y-8 relative overflow-hidden shadow-2xl">
           <div className="absolute top-0 right-0 p-8 opacity-10">
              <Megaphone className="size-32 -rotate-12" />
           </div>

           <div className="relative space-y-6">
              <div className="size-12 rounded-2xl bg-[var(--accent)] flex items-center justify-center shadow-lg shadow-[var(--accent)]/20">
                <Construction className="size-6 text-black" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-black uppercase tracking-tight">Potenciado por IA</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  Estamos terminando de pulir el motor de personalización masiva. Pronto podrás:
                </p>
              </div>

              <ul className="space-y-4">
                 <li className="flex items-start gap-3">
                    <div className="size-5 rounded-full bg-[var(--accent)]/20 flex items-center justify-center shrink-0 mt-0.5">
                       <Check className="size-3 text-[var(--accent)]" />
                    </div>
                    <p className="text-[11px] font-bold text-slate-200">Segmentación dinámica por comportamiento e interés real.</p>
                 </li>
                 <li className="flex items-start gap-3">
                    <div className="size-5 rounded-full bg-[var(--accent)]/20 flex items-center justify-center shrink-0 mt-0.5">
                       <Check className="size-3 text-[var(--accent)]" />
                    </div>
                    <p className="text-[11px] font-bold text-slate-200">Generación automática de mensajes únicos para cada contacto.</p>
                 </li>
                 <li className="flex items-start gap-3">
                    <div className="size-5 rounded-full bg-[var(--accent)]/20 flex items-center justify-center shrink-0 mt-0.5">
                       <Check className="size-3 text-[var(--accent)]" />
                    </div>
                    <p className="text-[11px] font-bold text-slate-200">Análisis de sentimientos y respuestas automáticas inteligentes.</p>
                 </li>
              </ul>

              <div className="pt-4">
                 <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estado del Módulo</span>
                    <Badge className="bg-[var(--accent)] text-black font-black text-[9px] px-2 h-5">90% READY</Badge>
                 </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, trend, color }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-3 group hover:shadow-md transition-all">
      <div className="flex items-center justify-between">
        <div className={cn(
          "size-10 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300 shadow-sm",
          color === 'lime' ? "bg-[var(--accent)] text-black" : "bg-slate-50 text-slate-400"
        )}>
          <Icon className="size-5" />
        </div>
        <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">{trend}</span>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">{label}</p>
        <h4 className="text-2xl font-black text-slate-800">{value}</h4>
      </div>
    </div>
  );
}

function CampaignItem({ title, status, progress, sent, total, date }: any) {
  return (
    <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm hover:border-[var(--accent)]/30 transition-all group flex items-center gap-6">
      <div className={cn(
        "size-14 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-sm",
        status === 'Enviando' ? "bg-[var(--accent)] text-black animate-pulse" :
        status === 'Completada' ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
      )}>
        <BarChart3 className="size-6" />
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
           <div>
              <h4 className="text-[14px] font-black text-slate-800 tracking-tight">{title}</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{date}</p>
           </div>
           <div className="text-right">
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg",
                status === 'Enviando' ? "bg-[var(--accent)] text-black" :
                status === 'Completada' ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
              )}>{status}</span>
           </div>
        </div>

        <div className="space-y-1.5">
           <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
              <span className="text-slate-400">{sent} de {total} enviados</span>
              <span className="text-slate-800">{progress}%</span>
           </div>
           <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
              <div 
                className={cn("h-full transition-all duration-1000", status === 'Enviando' ? "bg-[var(--accent)]" : "bg-emerald-500")} 
                style={{ width: `${progress}%` }} 
              />
           </div>
        </div>
      </div>

      <button className="size-10 rounded-xl bg-slate-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-black hover:text-white">
         <ArrowUpRight className="size-4" />
      </button>
    </div>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="4" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function Badge({ children, className }: any) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", className)}>
      {children}
    </span>
  );
}
