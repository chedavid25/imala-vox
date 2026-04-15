"use client";

import React, { useState, useEffect } from "react";
import { 
  BarChart3, 
  Activity, 
  AlertCircle, 
  TrendingUp, 
  ChevronRight,
  Zap,
  Loader2,
  Users,
  MessageSquare
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { obtenerMetricasSuperAdmin } from "@/app/actions/superadmin";
import { cn } from "@/lib/utils";
import { Workspace } from "@/lib/types/firestore";

export default function UsoAdminPage() {
  const [data, setData] = useState<{ workspaces: Workspace[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await obtenerMetricasSuperAdmin();
        setData(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 text-[var(--accent)] animate-spin" />
        <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">Analizando Consumo en Tiempo Real...</p>
      </div>
    );
  }

  const { workspaces } = data;
  
  // Filtrar workspaces con uso significativo o cerca del límite
  const topUsage = [...workspaces].sort((a, b) => (b.uso?.convCount || 0) - (a.uso?.convCount || 0)).slice(0, 10);

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Monitor de Uso y Límites</h1>
          <p className="text-white/40 text-sm font-medium mt-1">Supervisión del consumo de recursos y créditos de la IA.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* TOP USAGE LIST */}
        <div className="lg:col-span-2 space-y-6">
           <h3 className="text-xl font-bold text-white flex items-center gap-3">
             <Activity className="size-5 text-[var(--accent)]" />
             Workspaces con Mayor Actividad
           </h3>
           
           <div className="grid gap-4">
              {topUsage.map((ws: any) => {
                const limit = ws.plan === 'starter' ? 1000 : ws.plan === 'pro' ? 5000 : 10000;
                const usage = ws.uso?.convCount || 0;
                const percentage = Math.min(100, (usage / limit) * 100);

                return (
                  <Card key={ws.id} className="bg-black/40 border-white/5 rounded-3xl p-6 hover:bg-white/5 transition-all">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3">
                           <div className="size-8 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-black text-white/40">
                              {ws.plan.charAt(0).toUpperCase()}
                           </div>
                           <span className="font-bold text-white">{ws.nombre}</span>
                           <Badge variant="outline" className="text-[8px] uppercase tracking-widest border-white/10 text-white/40">{ws.plan}</Badge>
                        </div>
                        <div className="space-y-1.5">
                           <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                             <span className="text-white/40">Conversaciones Usadas</span>
                             <span className={cn(percentage > 80 ? "text-rose-500" : "text-[var(--accent)]")}>
                               {usage.toLocaleString()} / {limit.toLocaleString()}
                             </span>
                           </div>
                           <Progress value={percentage} className={cn("h-1.5 bg-white/5", percentage > 80 ? "[&>div]:bg-rose-500" : "[&>div]:bg-[var(--accent)]")} />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-8 pl-8 border-l border-white/5">
                         <div className="text-center">
                            <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Contactos</p>
                            <p className="font-bold text-white text-sm">{ws.uso?.contactCount || 0}</p>
                         </div>
                         <div className="text-center">
                            <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Recursos</p>
                            <p className="font-bold text-white text-sm">{ws.uso?.objectCount || 0}</p>
                         </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
           </div>
        </div>

        {/* ALERTS & INSIGHTS */}
        <div className="space-y-6">
           <h3 className="text-xl font-bold text-white flex items-center gap-3">
             <AlertCircle className="size-5 text-[var(--accent)]" />
             Alertas de Capacidad
           </h3>

           <Card className="bg-rose-500/5 border-rose-500/20 rounded-3xl p-6 space-y-6">
             <div className="flex items-start gap-4">
                <div className="size-10 rounded-2xl bg-rose-500/20 flex items-center justify-center shrink-0">
                   <Zap className="size-5 text-rose-500" />
                </div>
                <div>
                   <h4 className="text-sm font-black text-white uppercase tracking-wider">Cerca del Límite ({">"}80%)</h4>
                   <p className="text-xs text-white/40 font-medium mt-1">Workspaces que podrían requerir un upgrade pronto.</p>
                </div>
             </div>
             
             <div className="space-y-3">
                {workspaces.filter((w:any) => {
                  const limit = w.plan === 'starter' ? 1000 : w.plan === 'pro' ? 5000 : 10000;
                  return (w.uso?.convCount || 0) / limit > 0.8;
                }).length === 0 ? (
                  <p className="text-[10px] text-white/20 font-bold uppercase italic text-center py-4">No hay alertas críticas.</p>
                ) : (
                  workspaces.filter((w:any) => {
                    const limit = w.plan === 'starter' ? 1000 : w.plan === 'pro' ? 5000 : 10000;
                    return (w.uso?.convCount || 0) / limit > 0.8;
                  }).map((w:any) => (
                    <div key={w.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                       <span className="text-xs font-bold text-white/80">{w.nombre}</span>
                       <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">{Math.round((w.uso?.convCount || 0) / (w.plan === 'starter' ? 1000 : w.plan === 'pro' ? 5000 : 10000)*100)}%</span>
                    </div>
                  ))
                )}
             </div>
           </Card>

           <Card className="bg-black/40 border-white/5 rounded-3xl p-6 space-y-4">
             <h4 className="text-xs font-black text-white uppercase tracking-[0.2em] opacity-40">Resumen Consolidado</h4>
             <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                   <MessageSquare className="size-4 text-[var(--accent)] mb-2" />
                   <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Total Conv.</p>
                   <p className="text-xl font-bold text-white">{workspaces.reduce((acc:any, ws:any) => acc + (ws.uso?.convCount || 0), 0).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                   <Users className="size-4 text-[var(--accent)] mb-2" />
                   <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Total Contactos</p>
                   <p className="text-xl font-bold text-white">{workspaces.reduce((acc:any, ws:any) => acc + (ws.uso?.contactCount || 0), 0).toLocaleString()}</p>
                </div>
             </div>
           </Card>
        </div>
      </div>
    </div>
  );
}
