"use client";

import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  CreditCard, 
  Frown, 
  ArrowUpRight, 
  ArrowDownRight,
  Loader2,
  Building2,
  Zap,
  Briefcase
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { obtenerMetricasSuperAdmin } from "@/app/actions/superadmin";
import { cn } from "@/lib/utils";
import { SuperAdminMetrics, Workspace } from "@/lib/types/firestore";

export default function SuperAdminPage() {
  const [data, setData] = useState<{ metricas: SuperAdminMetrics, workspaces: Workspace[] } | null>(null);
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
        <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Cargando Métricas Globales...</p>
      </div>
    );
  }

  const { metricas } = data;

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* HEADER METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="MRR (Monthly Revenue)" 
          value={`$${metricas.mrr.toLocaleString()}`} 
          trend="+12.5%" 
          trendUp={true}
          icon={CreditCard}
          color="bg-emerald-500"
        />
        <StatCard 
          title="Workspaces Activos" 
          value={metricas.workspacesActivos} 
          trend={metricas.nuevosEsteMes > 0 ? `+${metricas.nuevosEsteMes} este mes` : "Sin cambios"} 
          trendUp={true}
          icon={Building2}
          color="bg-blue-500"
        />
        <StatCard 
          title="Tasa de Churn" 
          value={`${((metricas.churnEsteMes / (metricas.workspacesActivos || 1)) * 100).toFixed(1)}%`} 
          trend={`${metricas.churnEsteMes} cancelados`} 
          trendUp={false}
          icon={Frown}
          color="bg-rose-500"
        />
        <StatCard 
          title="En Prueba (Trials)" 
          value={metricas.workspacesEnPrueba} 
          trend="Potencial conversión" 
          trendUp={true}
          icon={Zap}
          color="bg-amber-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* GROWTH CHART PLACEHOLDER / SUMMARY */}
        <Card className="lg:col-span-2 bg-black/40 border-white/5 rounded-[2.5rem] p-4">
          <CardHeader className="p-6">
            <CardTitle className="text-xl font-bold flex items-center gap-3">
              <TrendingUp className="size-5 text-[var(--accent)]" />
              Proyección de Crecimiento Anual (ARR)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex flex-col items-center justify-center space-y-4">
             <div className="text-6xl font-black text-white px-8 py-4 bg-white/5 rounded-3xl border border-white/5 shadow-2xl">
                ${metricas.arr.toLocaleString()}
                <span className="text-xs text-white/40 block text-center uppercase tracking-[0.3em] mt-2">USD / Anual</span>
             </div>
             <p className="text-white/40 text-xs text-center max-w-sm font-medium">
               Cálculo basado en el MRR actual multiplicado por 12 meses, sin proyectar crecimiento de adquisición constante.
             </p>
          </CardContent>
        </Card>

        {/* DISTRIBUTION BY PLAN */}
        <Card className="bg-black/40 border-white/5 rounded-[2.5rem] p-4">
          <CardHeader className="p-6">
            <CardTitle className="text-xl font-bold flex items-center gap-3">
              <Briefcase className="size-5 text-[var(--accent)]" />
              Distribución de Planes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
             <PlanBar label="Starter" count={data.workspaces.filter((w: Workspace) => w.plan === 'starter').length} total={metricas.totalWorkspaces} color="bg-slate-400" />
             <PlanBar label="Pro" count={data.workspaces.filter((w: Workspace) => w.plan === 'pro').length} total={metricas.totalWorkspaces} color="bg-blue-500" />
             <PlanBar label="Agencia" count={data.workspaces.filter((w: Workspace) => w.plan === 'agencia').length} total={metricas.totalWorkspaces} color="bg-[var(--accent)]" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, trendUp, icon: Icon, color }: { title: string, value: string | number, trend: string, trendUp: boolean, icon: any, color: string }) {
  return (
    <Card className="bg-black/40 border-white/5 rounded-[2rem] p-2 hover:bg-white/5 transition-all overflow-hidden group">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div className={cn("size-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 duration-500", color)}>
            <Icon className="size-6 text-black" />
          </div>
          <div className={cn("flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-lg", trendUp ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
            {trendUp ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {trend}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none">{title}</p>
          <h4 className="text-3xl font-black text-white tracking-tighter">{value}</h4>
        </div>
      </CardContent>
    </Card>
  );
}

function PlanBar({ label, count, total, color }: { label: string, count: number, total: number, color: string }) {
  const percentage = Math.round((count / (total || 1)) * 100);
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
           <span className="text-xs font-black uppercase tracking-widest text-white/80">{label}</span>
           <span className="block text-[10px] text-white/40 font-bold uppercase">{count} workspaces</span>
        </div>
        <span className="text-xl font-black text-white">{percentage}%</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-1000", color)} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}
