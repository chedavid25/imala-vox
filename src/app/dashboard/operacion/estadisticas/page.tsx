"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Target, 
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Clock,
  ExternalLink,
  Plus,
  Loader2,
  Inbox,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  MoreVertical,
  Bot,
  Award,
  Trophy,
  PieChart as PieChartIcon,
  Download,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  where 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, Lead, EtapaEmbudo, TareaCRM, Contacto, Conversacion, Agente } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { subDays, format, isAfter, startOfDay, endOfDay, isBefore } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function EstadisticasPage() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [activeTab, setActiveTab] = useState('resumen');
  const [dateRange, setDateRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  
  // States para datos reales
  const [leads, setLeads] = useState<(Lead & { id: string })[]>([]);
  const [etapas, setEtapas] = useState<(EtapaEmbudo & { id: string })[]>([]);
  const [conversaciones, setConversaciones] = useState<(Conversacion & { id: string })[]>([]);
  const [tareas, setTareas] = useState<(TareaCRM & { id: string })[]>([]);
  const [contactos, setContactos] = useState<(Contacto & { id: string })[]>([]);
  const [agentes, setAgentes] = useState<(Agente & { id: string })[]>([]);

  // 1. Suscripciones a Firestore
  useEffect(() => {
    if (!currentWorkspaceId) return;

    const unsubEtapas = onSnapshot(
      query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.ETAPAS_EMBUDO), orderBy("orden", "asc")),
      (snap) => setEtapas(snap.docs.map(d => ({ ...d.data(), id: d.id })) as any)
    );

    const unsubLeads = onSnapshot(
      query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.LEADS), orderBy("creadoEl", "desc")),
      (snap) => {
        setLeads(snap.docs.map(d => ({ ...d.data(), id: d.id })) as any);
        setLoading(false);
      }
    );

    const unsubConv = onSnapshot(
      query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONVERSACIONES), orderBy("ultimaActividad", "desc"), limit(2000)),
      (snap) => setConversaciones(snap.docs.map(d => ({ ...d.data(), id: d.id })) as any)
    );

    const unsubTareas = onSnapshot(
      query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, "tareasCRM"), orderBy("creadoEl", "desc")),
      (snap) => setTareas(snap.docs.map(d => ({ ...d.data(), id: d.id })) as any)
    );

    const unsubCont = onSnapshot(
      query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS), orderBy("creadoEl", "desc"), limit(2000)),
      (snap) => setContactos(snap.docs.map(d => ({ ...d.data(), id: d.id })) as any)
    );

    const unsubAgentes = onSnapshot(
      query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.AGENTES)),
      (snap) => setAgentes(snap.docs.map(d => ({ ...d.data(), id: d.id })) as any)
    );

    return () => {
      unsubEtapas();
      unsubLeads();
      unsubConv();
      unsubTareas();
      unsubCont();
      unsubAgentes();
    };
  }, [currentWorkspaceId]);

  // --- PROCESAMIENTO DE DATOS ---
  const metrics = useMemo(() => {
    if (loading) return null;

    const hoy = new Date();
    let diasAtras = 7;
    let fechaInicio = subDays(hoy, 7);

    if (dateRange === '24h') { diasAtras = 1; fechaInicio = subDays(hoy, 1); }
    else if (dateRange === '30d') { diasAtras = 30; fechaInicio = subDays(hoy, 30); }
    else if (dateRange === '90d') { diasAtras = 90; fechaInicio = subDays(hoy, 90); }
    else if (dateRange === '12m') { diasAtras = 365; fechaInicio = subDays(hoy, 365); }
    else if (dateRange === 'Año') { 
      fechaInicio = new Date(hoy.getFullYear(), 0, 1); 
      diasAtras = Math.floor((hoy.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
    }
    else if (dateRange === 'Hist') { fechaInicio = new Date(2020, 0, 1); diasAtras = 365 * 10; }

    const fechaPreviaInicio = subDays(fechaInicio, diasAtras);
    
    // Filtros por rango Actual vs Previo
    const leadsAct = leads.filter(l => l.creadoEl?.toDate() >= fechaInicio);
    const leadsPrev = leads.filter(l => l.creadoEl?.toDate() >= fechaPreviaInicio && l.creadoEl?.toDate() < fechaInicio);
    
    const contAct = contactos.filter(c => c.creadoEl?.toDate() >= fechaInicio);
    const contPrev = contactos.filter(c => c.creadoEl?.toDate() >= fechaPreviaInicio && c.creadoEl?.toDate() < fechaInicio);

    const convAct = conversaciones.filter(c => c.ultimaActividad?.toDate() >= fechaInicio);
    const convPrev = conversaciones.filter(c => c.ultimaActividad?.toDate() >= fechaPreviaInicio && c.ultimaActividad?.toDate() < fechaInicio);

    // Función para calcular cambio %
    const calcChange = (act: number, prev: number) => {
      if (prev === 0) return act > 0 ? `+${act}` : "0";
      const change = ((act - prev) / prev) * 100;
      return `${change >= 0 ? '+' : ''}${Math.round(change)}%`;
    };

    // A. Evolución (Leads & Contactos)
    const evolutionMap: Record<string, any> = {};
    const iteracionesLabel = diasAtras > 30 ? (diasAtras > 365 ? 'MM/yy' : 'MMM') : 'EEE';
    
    if (diasAtras > 60) {
      for (let i = 11; i >= 0; i--) {
        const d = subDays(hoy, i * 30);
        const label = format(d, 'MMM', { locale: es });
        evolutionMap[label] = { name: label, leads: 0, contactos: 0 };
      }
    } else {
      for (let i = diasAtras - 1; i >= 0; i--) {
        const d = subDays(hoy, i);
        const label = format(d, iteracionesLabel, { locale: es });
        evolutionMap[label] = { name: label, leads: 0, contactos: 0 };
      }
    }

    leadsAct.forEach(l => {
      const label = format(l.creadoEl.toDate(), diasAtras > 60 ? 'MMM' : iteracionesLabel, { locale: es });
      if (evolutionMap[label]) evolutionMap[label].leads++;
    });
    contAct.forEach(c => {
      const label = format(c.creadoEl.toDate(), diasAtras > 60 ? 'MMM' : iteracionesLabel, { locale: es });
      if (evolutionMap[label]) evolutionMap[label].contactos++;
    });

    // B. Chats Stats
    const convAI = convAct.filter(c => c.modoIA === 'auto').length;
    const convManual = convAct.length - convAI;
    const chatSourceData = [
      { name: 'IA Auto', value: convAI, color: 'var(--accent-active)' },
      { name: 'Manual', value: convManual, color: '#94a3b8' }
    ].filter(s => s.value > 0);

    // C. Tareas Stats
    const tareasCompletadas = tareas.filter(t => t.completada || t.estado === 'completada').length;
    const tareasPendientes = tareas.length - tareasCompletadas;
    const tareasPriorityData = [
      { name: 'Alta', value: tareas.filter(t => t.prioridad === 'alta' && !t.completada && t.estado !== 'completada').length, color: '#ef4444' },
      { name: 'Media', value: tareas.filter(t => t.prioridad === 'media' && !t.completada && t.estado !== 'completada').length, color: '#f59e0b' },
      { name: 'Baja', value: tareas.filter(t => t.prioridad === 'baja' && !t.completada && t.estado !== 'completada').length, color: '#3b82f6' },
    ];

    // D. Leads Source & Campañas & Formularios
    const sourceMap: Record<string, number> = {};
    const campaignMap: Record<string, number> = {};
    const formMap: Record<string, number> = {};
    
    leadsAct.forEach(l => { 
      sourceMap[l.origen || 'otros'] = (sourceMap[l.origen || 'otros'] || 0) + 1;
      if (l.campana) campaignMap[l.campana] = (campaignMap[l.campana] || 0) + 1;
      if (l.formulario) formMap[l.formulario] = (formMap[l.formulario] || 0) + 1;
    });

    const leadSourceData = Object.entries(sourceMap).map(([name, value]) => ({ 
      name: name.replace('_', ' ').toUpperCase(), 
      value,
      color: name === 'whatsapp' ? '#25D366' : name === 'meta_ads' ? '#0668E1' : '#94a3b8'
    }));

    const topCampaigns = Object.entries(campaignMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
    const topForms = Object.entries(formMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));

    // E. Agent Stats
    const agentStats = agentes.map(a => {
      const convs = convAct.filter(c => c.agenteId === a.id);
      const auto = convs.filter(c => c.modoIA === 'auto').length;
      return {
        id: a.id,
        nombre: a.nombre,
        total: convs.length,
        auto,
        manual: convs.length - auto,
        efficiency: convs.length > 0 ? Math.round((auto / convs.length) * 100) : 0
      };
    }).sort((a, b) => b.total - a.total);

    return {
      overview: {
        leads: { val: leadsAct.length, change: calcChange(leadsAct.length, leadsPrev.length), trend: leadsAct.length >= leadsPrev.length ? 'up' : 'down' },
        chats: { val: convAct.length, change: calcChange(convAct.length, convPrev.length), trend: convAct.length >= convPrev.length ? 'up' : 'down' },
        tasks: { val: tareasPendientes, change: calcChange(tareasPendientes, tareas.length - tareas.filter(t => t.completada).length), trend: 'up' },
        contacts: { val: contAct.length, change: calcChange(contAct.length, contPrev.length), trend: contAct.length >= contPrev.length ? 'up' : 'down' },
      },
      totalLeads: leadsAct.length,
      convAI,
      evolutionData: Object.values(evolutionMap),
      chatSourceData,
      tareasStatusData: [
        { name: 'Completas', value: tareasCompletadas, color: '#10b981' },
        { name: 'Pendientes', value: tareasPendientes, color: '#f59e0b' }
      ],
      tareasPriorityData,
      leadSourceData,
      topCampaigns,
      topForms,
      agentStats,
      funnelData: etapas.map(e => ({
        stage: e.nombre,
        count: leadsAct.filter(l => l.etapaId === e.id).length,
        color: e.color || '#3b82f6'
      }))
    };
  }, [leads, etapas, conversaciones, tareas, contactos, agentes, loading, dateRange]);

  const handleExportCSV = () => {
    if (!metrics) return;
    try {
      const headers = ["Periodo", "Total Leads", "Conversaciones IA", "Tareas Pendientes", "Nuevos Contactos"];
      const row = [dateRange, metrics.overview.leads.val, metrics.convAI, metrics.overview.tasks.val, metrics.overview.contacts.val];
      
      const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + row.join(",");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `reporte_imala_vox_${dateRange}_${format(new Date(), 'yyyyMMdd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Reporte generado correctamente");
    } catch (e) {
      toast.error("Error al generar el reporte");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-main)]">
        <Loader2 className="w-12 h-12 text-[var(--accent-active)] animate-spin" />
      </div>
    );
  }

  const data = metrics!;

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700 bg-[var(--bg-main)] min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary-light)] tracking-tight">Análisis de Negocio</h1>
          <p className="text-sm text-[var(--text-tertiary-light)] mt-1">Panel de Control y Analítica — Imalá Vox</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button 
            onClick={handleExportCSV}
            variant="outline" 
            className="rounded-2xl h-11 border-[var(--border-light)] bg-white text-[10px] font-black uppercase tracking-widest px-6 shadow-sm hover:bg-[var(--bg-input)] transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Descargar Reporte
          </Button>

          <div className="flex items-center gap-1.5 bg-[var(--bg-input)] p-1.5 rounded-2xl border border-[var(--border-light)] overflow-x-auto no-scrollbar">
            {['24h', '7d', '30d', '90d', '12m', 'Año', 'Hist'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  dateRange === range 
                    ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-lg' 
                    : 'text-[var(--text-tertiary-light)] hover:text-[var(--text-primary-light)] hover:bg-white/50'
                }`}
              >
                {range === '12m' ? '12 Meses' : range === 'Hist' ? 'Histórico' : range}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Tabs defaultValue="resumen" className="space-y-8" onValueChange={setActiveTab}>
        <TabsList className="bg-[var(--bg-input)] p-1 rounded-2xl border border-[var(--border-light)] w-full md:w-auto overflow-x-auto no-scrollbar">
          <TabsTrigger value="resumen" className="rounded-xl px-6 py-2.5 text-[11px] font-black uppercase tracking-widest data-[state=active]:bg-[var(--accent)] data-[state=active]:text-[var(--accent-text)] transition-all">Resumen</TabsTrigger>
          <TabsTrigger value="chats" className="rounded-xl px-6 py-2.5 text-[11px] font-black uppercase tracking-widest data-[state=active]:bg-[var(--accent)] data-[state=active]:text-[var(--accent-text)] transition-all">Bandeja</TabsTrigger>
          <TabsTrigger value="agentes" className="rounded-xl px-6 py-2.5 text-[11px] font-black uppercase tracking-widest data-[state=active]:bg-[var(--accent)] data-[state=active]:text-[var(--accent-text)] transition-all">Agentes IA</TabsTrigger>
          <TabsTrigger value="leads" className="rounded-xl px-6 py-2.5 text-[11px] font-black uppercase tracking-widest data-[state=active]:bg-[var(--accent)] data-[state=active]:text-[var(--accent-text)] transition-all">Leads</TabsTrigger>
          <TabsTrigger value="tareas" className="rounded-xl px-6 py-2.5 text-[11px] font-black uppercase tracking-widest data-[state=active]:bg-[var(--accent)] data-[state=active]:text-[var(--accent-text)] transition-all">Tareas</TabsTrigger>
          <TabsTrigger value="contactos" className="rounded-xl px-6 py-2.5 text-[11px] font-black uppercase tracking-widest data-[state=active]:bg-[var(--accent)] data-[state=active]:text-[var(--accent-text)] transition-all">Contactos</TabsTrigger>
        </TabsList>

        {/* --- CONTENIDO DE PESTAÑAS --- */}

        <TabsContent value="resumen" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard title="Leads Totales" value={data.overview.leads.val.toString()} change={data.overview.leads.change} trend={data.overview.leads.trend} icon={<Target className="w-5 h-5" />} color="blue" />
            <StatsCard title="Chats Activos" value={data.overview.chats.val.toString()} change={data.overview.chats.change} trend={data.overview.chats.trend} icon={<Inbox className="w-5 h-5" />} color="emerald" />
            <StatsCard title="Tareas Pendientes" value={data.overview.tasks.val.toString()} change={data.overview.tasks.change} trend="up" icon={<Clock className="w-5 h-5" />} color="amber" />
            <StatsCard title="Contactos CRM" value={data.overview.contacts.val.toString()} change={data.overview.contacts.change} trend={data.overview.contacts.trend} icon={<Users className="w-5 h-5" />} color="purple" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <ChartContainer title="Crecimiento General" subtitle="Leads vs Nuevos Contactos" className="lg:col-span-2">
              <AreaChart data={data.evolutionData}>
                <defs>
                  <linearGradient id="colorL" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--accent-active)" stopOpacity={0.1}/><stop offset="95%" stopColor="var(--accent-active)" stopOpacity={0}/></linearGradient>
                  <linearGradient id="colorC" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-tertiary-light)', fontSize: 10, fontWeight: 700}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-tertiary-light)', fontSize: 10, fontWeight: 700}} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="leads" stroke="var(--accent-active)" strokeWidth={3} fill="url(#colorL)" />
                <Area type="monotone" dataKey="contactos" stroke="#8b5cf6" strokeWidth={3} fill="url(#colorC)" />
              </AreaChart>
            </ChartContainer>

            <div className="bg-[var(--bg-sidebar)] rounded-[32px] p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-110 transition-transform duration-1000" />
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
                  <Zap className="text-[var(--accent)] w-6 h-6" />
                </div>
                <h3 className="text-2xl font-black text-white leading-tight">Resolución IA</h3>
                <p className="text-[var(--text-tertiary-dark)] font-medium mt-2">
                  La IA ha gestionado {data.convAI} conversaciones de forma autónoma.
                </p>
              </div>
              <div className="mt-8 relative z-10">
                <span className="text-6xl font-black text-[var(--accent)] tracking-tighter">
                  {conversaciones.length > 0 ? Math.round((data.convAI / conversaciones.length) * 100) : 0}%
                </span>
                <span className="block text-[10px] font-black text-[var(--text-tertiary-dark)] uppercase tracking-[0.2em] mt-2">Eficiencia Operativa</span>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="chats" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ChartContainer title="Segmentación de Respuestas" subtitle="IA vs Humano">
              <PieChart>
                <Pie 
                  data={data.chatSourceData} 
                  innerRadius={80} 
                  outerRadius={110} 
                  paddingAngle={8} 
                  dataKey="value"
                  label={({name, value, percent}: any) => `${name}: ${value} (${Math.round(percent * 100)}%)`}
                >
                  {data.chatSourceData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              </PieChart>
            </ChartContainer>
            
            <ChartContainer title="Mensajes por Canal" subtitle="Volumen de entrada">
              <BarChart data={data.leadSourceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {data.leadSourceData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        </TabsContent>

        <TabsContent value="agentes" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.agentStats.map((agent, idx) => (
              <div key={agent.id} className="bg-[var(--bg-card)] rounded-[32px] p-8 border border-[var(--border-light)] shadow-sm hover:border-[var(--accent-active)] transition-all group">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[var(--bg-input)] rounded-2xl flex items-center justify-center border border-[var(--border-light)] group-hover:bg-[var(--accent)] group-hover:text-black transition-all">
                      {idx === 0 ? <Trophy className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-[var(--text-primary-light)]">{agent.nombre}</h4>
                      <p className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">IA Agent Performance</p>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black border border-emerald-100">
                    {agent.efficiency}% AUTO
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="block text-2xl font-black text-[var(--text-primary-light)]">{agent.total}</span>
                      <span className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">Conversaciones</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-xl font-black text-[var(--text-secondary-light)]">{agent.auto}</span>
                      <span className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">Resueltas IA</span>
                    </div>
                  </div>
                  <div className="h-2 bg-[var(--bg-input)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[var(--accent-active)] rounded-full transition-all duration-1000" 
                      style={{ width: `${agent.efficiency}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="leads" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <ChartContainer title="Fuentes de Tráfico" subtitle="Distribución de origen" className="lg:col-span-1">
              {data.leadSourceData.length > 0 ? (
                <PieChart>
                  <Pie data={data.leadSourceData} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" label={({name, value}: any) => `${name}: ${value}`}>
                    {data.leadSourceData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-[var(--text-tertiary-light)]">
                  <Target className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Sin datos en este rango</p>
                </div>
              )}
            </ChartContainer>
            
            <ChartContainer title="Embudo Comercial" subtitle="Leads por etapa" className="lg:col-span-2">
              <div className="space-y-8 pt-4">
                {data.funnelData.map((stage, idx) => {
                  const percentage = data.totalLeads > 0 ? (stage.count / data.totalLeads) * 100 : 0;
                  return (
                    <div key={idx} className="relative group">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                          <span className="text-[11px] font-black text-[var(--text-primary-light)] uppercase tracking-[0.15em]">{stage.stage}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-black text-[var(--text-primary-light)]">{stage.count}</span>
                          <span className="text-[10px] font-bold text-[var(--text-tertiary-light)] bg-[var(--bg-input)] px-2 py-1 rounded-lg">{Math.round(percentage)}%</span>
                        </div>
                      </div>
                      <div className="h-4 bg-[var(--bg-input)] rounded-full overflow-hidden border border-[var(--border-light)] p-0.5">
                        <div 
                          className="h-full rounded-full transition-all duration-1000 shadow-sm" 
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: stage.color,
                            boxShadow: `0 0 15px ${stage.color}40`
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-[var(--bg-card)] rounded-[32px] p-8 border border-[var(--border-light)] shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary-light)] tracking-tight">Top Campañas</h3>
                  <p className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest mt-1">Ranking de Meta Ads</p>
                </div>
                <Award className="text-[var(--accent-active)] w-6 h-6 opacity-50" />
              </div>
              <div className="space-y-4">
                {data.topCampaigns.length > 0 ? data.topCampaigns.map((camp, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-[var(--bg-input)]/50 rounded-2xl border border-transparent hover:border-[var(--accent-active)] transition-all">
                    <span className="text-sm font-bold text-[var(--text-primary-light)] truncate max-w-[70%]">{camp.name}</span>
                    <span className="text-lg font-black text-[var(--accent-active)]">{camp.count}</span>
                  </div>
                )) : <p className="text-center py-8 text-[10px] font-black uppercase text-[var(--text-tertiary-light)]">Sin datos</p>}
              </div>
            </div>

            <div className="bg-[var(--bg-card)] rounded-[32px] p-8 border border-[var(--border-light)] shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary-light)] tracking-tight">Top Formularios</h3>
                  <p className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest mt-1">Conversión de Meta Leads</p>
                </div>
                <FileText className="text-[var(--accent-active)] w-6 h-6 opacity-50" />
              </div>
              <div className="space-y-4">
                {data.topForms.length > 0 ? data.topForms.map((form, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-[var(--bg-input)]/50 rounded-2xl border border-transparent hover:border-[var(--accent-active)] transition-all">
                    <span className="text-sm font-bold text-[var(--text-primary-light)] truncate max-w-[70%]">{form.name}</span>
                    <span className="text-lg font-black text-[var(--accent-active)]">{form.count}</span>
                  </div>
                )) : <p className="text-center py-8 text-[10px] font-black uppercase text-[var(--text-tertiary-light)]">Sin datos</p>}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tareas" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ChartContainer title="Estado de Productividad" subtitle="Completadas vs Pendientes">
              <PieChart>
                <Pie 
                  data={data.tareasStatusData} 
                  innerRadius={80} 
                  outerRadius={110} 
                  paddingAngle={8} 
                  dataKey="value"
                  label={({name, value, percent}: any) => `${name}: ${value} (${Math.round(percent * 100)}%)`}
                >
                  {data.tareasStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ChartContainer>

            <ChartContainer title="Prioridad de Pendientes" subtitle="Carga de trabajo por urgencia">
              <BarChart data={data.tareasPriorityData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} width={70} />
                <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} />
                <Bar dataKey="value" radius={[0, 10, 10, 0]} label={{ position: 'right', fontSize: 12, fontWeight: 'bold' }}>
                  {data.tareasPriorityData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        </TabsContent>

        <TabsContent value="contactos" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <ChartContainer title="Adquisición de Contactos" subtitle="Nuevos registros en el CRM">
            <AreaChart data={data.evolutionData}>
              <defs>
                <linearGradient id="colorContacts" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip />
              <Area 
                type="monotone" 
                dataKey="contactos" 
                stroke="#8b5cf6" 
                strokeWidth={4} 
                fill="url(#colorContacts)"
                label={{ position: 'top', fontSize: 10, fontWeight: 'bold', fill: '#8b5cf6' }} 
              />
            </AreaChart>
          </ChartContainer>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- COMPONENTES AUXILIARES ---

function StatsCard({ title, value, change, trend, icon, color }: any) {
  const isUp = trend === 'up';
  const colorMap: any = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  };

  return (
    <div className="bg-[var(--bg-card)] rounded-[32px] p-6 border border-[var(--border-light)] hover:border-[var(--border-light-strong)] transition-all group shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${colorMap[color]} border flex items-center justify-center transition-transform group-hover:scale-110`}>
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg ${isUp ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
          {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {change}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary-light)] mb-1">{title}</p>
        <h4 className="text-3xl font-black text-[var(--text-primary-light)] tracking-tight">{value}</h4>
      </div>
    </div>
  );
}

function ChartContainer({ title, subtitle, children, className }: any) {
  return (
    <div className={`bg-[var(--bg-card)] rounded-[32px] p-8 border border-[var(--border-light)] shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-bold text-[var(--text-primary-light)] tracking-tight">{title}</h3>
          <p className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest mt-1">{subtitle}</p>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full">
          <MoreVertical className="w-4 h-4 text-[var(--text-tertiary-light)]" />
        </Button>
      </div>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
