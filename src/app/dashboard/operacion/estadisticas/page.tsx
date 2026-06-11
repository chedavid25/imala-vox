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
  FileText,
  HelpCircle
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
import { COLLECTIONS, Lead, EtapaEmbudo, TareaCRM, Contacto, Conversacion, Agente, CategoriaCRM, EtiquetaCRM } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { estaEnHorario, HorarioHumano } from "@/lib/horarioHabil";
import { subDays, format, isAfter, startOfDay, endOfDay, isBefore } from "date-fns";

// Objetivo de SLA para "primera respuesta" (en segundos). 15 minutos por defecto.
const SLA_OBJETIVO_SEG = 15 * 60;

// Formatea segundos como "Xh Ym" / "Xm Ys" / "Xs" (uso en JSX)
const fmtDur = (segundos: number) => {
  if (!segundos) return "0s";
  if (segundos < 60) return `${segundos}s`;
  const minutos = Math.floor(segundos / 60);
  const segs = segundos % 60;
  if (minutos < 60) return `${minutos}m ${segs}s`;
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  return `${horas}h ${mins}m`;
};
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
  const [categorias, setCategorias] = useState<(CategoriaCRM & { id: string })[]>([]);
  const [etiquetas, setEtiquetas] = useState<(EtiquetaCRM & { id: string })[]>([]);

  // 1. Suscripciones a Firestore
  useEffect(() => {
    if (!currentWorkspaceId) return;

    const handleSubscriptionError = (err: any) => {
      if (err.code !== 'permission-denied') {
        console.error("Error en suscripción de estadísticas de Firestore:", err);
      }
    };

    const unsubEtapas = onSnapshot(
      query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.ETAPAS_EMBUDO), orderBy("orden", "asc")),
      (snap) => setEtapas(snap.docs.map(d => ({ ...d.data(), id: d.id })) as any),
      handleSubscriptionError
    );

    const unsubLeads = onSnapshot(
      query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.LEADS), orderBy("creadoEl", "desc")),
      (snap) => {
        setLeads(snap.docs.map(d => ({ ...d.data(), id: d.id })) as any);
        setLoading(false);
      },
      handleSubscriptionError
    );

    const unsubConv = onSnapshot(
      query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONVERSACIONES), orderBy("ultimaActividad", "desc"), limit(2000)),
      (snap) => setConversaciones(snap.docs.map(d => ({ ...d.data(), id: d.id })) as any),
      handleSubscriptionError
    );

    const unsubTareas = onSnapshot(
      query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, "tareasCRM"), orderBy("creadoEl", "desc")),
      (snap) => setTareas(snap.docs.map(d => ({ ...d.data(), id: d.id })) as any),
      handleSubscriptionError
    );

    const unsubCont = onSnapshot(
      query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS), orderBy("creadoEl", "desc"), limit(2000)),
      (snap) => setContactos(snap.docs.map(d => ({ ...d.data(), id: d.id })) as any),
      handleSubscriptionError
    );

    const unsubAgentes = onSnapshot(
      query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.AGENTES)),
      (snap) => setAgentes(snap.docs.map(d => ({ ...d.data(), id: d.id })) as any),
      handleSubscriptionError
    );

    const unsubCategorias = onSnapshot(
      query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CATEGORIAS_CRM), orderBy("orden", "asc")),
      (snap) => setCategorias(snap.docs.map(d => ({ ...d.data(), id: d.id })) as any),
      handleSubscriptionError
    );

    const unsubEtiquetas = onSnapshot(
      query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.ETIQUETAS_CRM)),
      (snap) => setEtiquetas(snap.docs.map(d => ({ ...d.data(), id: d.id })) as any),
      handleSubscriptionError
    );

    return () => {
      unsubEtapas();
      unsubLeads();
      unsubConv();
      unsubTareas();
      unsubCont();
      unsubAgentes();
      unsubCategorias();
      unsubEtiquetas();
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
      // Construir solo los meses que abarca el rango (evita meses vacíos en rangos cortos)
      const mesesRango = Math.min(12, Math.max(1, Math.ceil(diasAtras / 30)));
      for (let i = mesesRango - 1; i >= 0; i--) {
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
    let totalPrimeraRespuesta = 0;
    let primeraRespuestaCount = 0;
    let totalRespuestaIA = 0;
    let respuestasIACount = 0;
    let totalRespuestaHumano = 0;
    let respuestasHumanoCount = 0;

    let resolucionIA = 0;
    let derivacionHumano = 0;
    let sinIntervencion = 0;
    let chatsPendientes = 0;
    let chatsAbiertos = 0;

    // Mapa de calor (Lunes=0 a Domingo=6, 6 bloques de 4 horas: 00-04, 04-08, 08-12, 12-16, 16-20, 20-00)
    const heatMapData = Array.from({ length: 7 }, () => Array(6).fill(0));

    // Rangos de primera respuesta
    const rangosPrimeraRespuesta = {
      rapido: 0,    // < 1 min
      medio: 0,     // 1-5 min
      moderado: 0,  // 5-15 min
      lento: 0,     // 15-60 min
      muyLento: 0   // > 60 min
    };

    convAct.forEach(c => {
      // Tiempos de respuesta
      if (c.tiempoPrimeraRespuesta !== undefined && c.tiempoPrimeraRespuesta !== null) {
        totalPrimeraRespuesta += c.tiempoPrimeraRespuesta;
        primeraRespuestaCount++;

        const minutos = c.tiempoPrimeraRespuesta / 60;
        if (minutos < 1) rangosPrimeraRespuesta.rapido++;
        else if (minutos < 5) rangosPrimeraRespuesta.medio++;
        else if (minutos < 15) rangosPrimeraRespuesta.moderado++;
        else if (minutos < 60) rangosPrimeraRespuesta.lento++;
        else rangosPrimeraRespuesta.muyLento++;
      }

      if (c.tiempoRespuestaIAAcumulado && c.respuestasIAContador) {
        totalRespuestaIA += c.tiempoRespuestaIAAcumulado;
        respuestasIACount += c.respuestasIAContador;
      }

      if (c.tiempoRespuestaHumanoAcumulado && c.respuestasHumanoContador) {
        totalRespuestaHumano += c.tiempoRespuestaHumanoAcumulado;
        respuestasHumanoCount += c.respuestasHumanoContador;
      }

      // Clasificación según quién RESPONDIÓ realmente (no por banderas de escalada)
      const tuvoHumano = (c.respuestasHumanoContador || 0) > 0;
      const tuvoIA = (c.respuestasIAContador || 0) > 0;

      // Estado de la bandeja: mutuamente excluyente (resuelto > pendiente > abierto)
      if (c.estado === 'resuelto') {
        if (tuvoHumano) {
          derivacionHumano++;
        } else if (tuvoIA) {
          resolucionIA++;
        } else {
          sinIntervencion++;
        }
      } else if (c.pendiente === true) {
        chatsPendientes++;
      } else {
        chatsAbiertos++;
      }

      // Mapa de calor (Día de la semana y Bloque de hora)
      if (c.ultimaActividad) {
        const fecha = c.ultimaActividad.toDate();
        // Convertir Sunday=0 to index 6, Monday=1 to index 0, etc.
        const dia = fecha.getDay() === 0 ? 6 : fecha.getDay() - 1;
        const hora = fecha.getHours();
        const bloque = Math.floor(hora / 4);
        heatMapData[dia][bloque]++;
      }
    });

    const promedioPrimeraRespuesta = primeraRespuestaCount > 0 ? Math.round(totalPrimeraRespuesta / primeraRespuestaCount) : 0;
    const promedioRespuestaIA = respuestasIACount > 0 ? Math.round(totalRespuestaIA / respuestasIACount) : 0;
    const promedioRespuestaHumano = respuestasHumanoCount > 0 ? Math.round(totalRespuestaHumano / respuestasHumanoCount) : 0;

    const formatDuration = (segundos: number) => {
      if (!segundos) return "0s";
      if (segundos < 60) return `${segundos}s`;
      const minutos = Math.floor(segundos / 60);
      const segs = segundos % 60;
      if (minutos < 60) return `${minutos}m ${segs}s`;
      const horas = Math.floor(minutos / 60);
      const mins = minutos % 60;
      return `${horas}h ${mins}m`;
    };

    // === MÉTRICAS NUEVAS (horario hábil) ===

    // Mapa de agentes para conocer su horario de atención humana
    const agentesMap = new Map(agentes.map(a => [a.id, a]));

    // A) Cumplimiento de SLA (primera respuesta dentro del objetivo)
    let slaTotal = 0;
    let slaCumplidos = 0;

    // B) Ranking por operador (acumulado desde tiemposPorOperador)
    const operadorAgg: Record<string, { nombre: string; tiempo: number; count: number }> = {};

    // C) Dentro vs fuera de horario (según primer mensaje del cliente)
    let dentroHorario = 0;
    let fueraHorario = 0;

    // D) Tendencia de primera respuesta por día
    const trendMap: Record<string, { total: number; count: number }> = {};

    convAct.forEach(c => {
      // SLA
      if (c.tiempoPrimeraRespuesta !== undefined && c.tiempoPrimeraRespuesta !== null) {
        slaTotal++;
        if (c.tiempoPrimeraRespuesta <= SLA_OBJETIVO_SEG) slaCumplidos++;

        // Tendencia: agrupar por día del primer mensaje del cliente
        const fechaBase = c.primerMensajeClienteEl?.toDate?.() || c.ultimaActividad?.toDate?.();
        if (fechaBase && fechaBase >= fechaInicio) {
          const label = format(fechaBase, diasAtras > 60 ? 'MMM' : iteracionesLabel, { locale: es });
          if (!trendMap[label]) trendMap[label] = { total: 0, count: 0 };
          trendMap[label].total += c.tiempoPrimeraRespuesta;
          trendMap[label].count++;
        }
      }

      // Por operador
      if (c.tiemposPorOperador) {
        Object.entries(c.tiemposPorOperador).forEach(([uid, datos]: [string, any]) => {
          if (!operadorAgg[uid]) operadorAgg[uid] = { nombre: datos?.nombre || 'Operador', tiempo: 0, count: 0 };
          if (datos?.nombre) operadorAgg[uid].nombre = datos.nombre;
          operadorAgg[uid].tiempo += datos?.tiempoAcumulado || 0;
          operadorAgg[uid].count += datos?.contador || 0;
        });
      }

      // Dentro vs fuera de horario (solo si el agente tiene horario humano activo)
      const agente = c.agenteId ? agentesMap.get(c.agenteId) : null;
      const fechaEntrada = c.primerMensajeClienteEl?.toDate?.() || c.ultimaActividad?.toDate?.();
      if (agente?.horarioHumanoActivo && agente.horarioHumano && fechaEntrada) {
        if (estaEnHorario(fechaEntrada.getTime(), agente.horarioHumano as HorarioHumano)) dentroHorario++;
        else fueraHorario++;
      }
    });

    const tasaSLA = slaTotal > 0 ? Math.round((slaCumplidos / slaTotal) * 100) : 0;

    const operadorRankingData = Object.values(operadorAgg)
      .filter(o => o.count > 0)
      .map(o => ({ nombre: o.nombre, promedio: Math.round(o.tiempo / o.count), total: o.count }))
      .sort((a, b) => a.promedio - b.promedio)
      .slice(0, 8);

    const horarioEntradaData = [
      { name: 'En horario', value: dentroHorario, color: '#10b981' },
      { name: 'Fuera de horario', value: fueraHorario, color: '#94a3b8' }
    ].filter(s => s.value > 0);

    // Tendencia ordenada según los buckets de evolución ya generados
    const tendenciaRespuestaData = Object.keys(evolutionMap).map(label => ({
      name: label,
      segundos: trendMap[label] ? Math.round(trendMap[label].total / trendMap[label].count) : 0
    }));

    // Medir la gestión real (IA vs Humano) — según quién respondió de verdad
    let totalIAAuto = 0;
    let totalManual = 0;
    convAct.forEach(c => {
      if ((c.respuestasHumanoContador || 0) > 0) {
        totalManual++;
      } else if ((c.respuestasIAContador || 0) > 0) {
        totalIAAuto++;
      }
    });

    const convAI = totalIAAuto;
    const convManual = totalManual;
    // Tasa de resolución IA del PERÍODO: de las conversaciones que tuvieron respuesta,
    // qué proporción gestionó la IA sola (numerador y denominador en el mismo rango).
    const tasaResolucionIA = (convAI + convManual) > 0 ? Math.round((convAI / (convAI + convManual)) * 100) : 0;
    const chatSourceData = [
      { name: 'IA Auto', value: convAI, color: 'var(--accent-active)' },
      { name: 'Manual', value: convManual, color: '#94a3b8' }
    ].filter(s => s.value > 0);

    const chatResolutionData = [
      { name: 'Resuelto por IA', value: resolucionIA, color: '#10b981' },
      { name: 'Con Intervención Humana', value: derivacionHumano, color: '#f59e0b' },
      { name: 'Cerrado sin Respuesta', value: sinIntervencion, color: '#94a3b8' }
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

    // F. Demanda por Etiqueta y Categoría
    const contactMap = new Map(contactos.map(c => [c.id, c]));
    const etiquetaCounts: Record<string, number> = {};
    const categoriaCounts: Record<string, number> = {};

    convAct.forEach(c => {
      const contacto = contactMap.get(c.contactoId);
      if (contacto && contacto.etiquetas) {
        contacto.etiquetas.forEach(tId => {
          etiquetaCounts[tId] = (etiquetaCounts[tId] || 0) + 1;
        });
      }
    });

    const demandEtiquetasData = Object.entries(etiquetaCounts)
      .map(([tId, count]) => {
        const tag = etiquetas.find(t => t.id === tId);
        return {
          name: tag?.nombre || 'Desconocida',
          value: count,
          color: tag?.colorBg || '#3b82f6'
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    Object.entries(etiquetaCounts).forEach(([tId, count]) => {
      const tag = etiquetas.find(t => t.id === tId);
      if (tag && tag.categoriaId) {
        categoriaCounts[tag.categoriaId] = (categoriaCounts[tag.categoriaId] || 0) + count;
      }
    });

    const demandCategoriasData = Object.entries(categoriaCounts)
      .map(([catId, count]) => {
        const cat = categorias.find(c => c.id === catId);
        return {
          name: cat?.nombre || 'Sin Categoría',
          value: count,
          color: cat?.tipo === 'exclusiva' ? 'var(--accent-active)' : '#8b5cf6'
        };
      })
      .sort((a, b) => b.value - a.value);

    return {
      overview: {
        leads: { val: leadsAct.length, change: calcChange(leadsAct.length, leadsPrev.length), trend: leadsAct.length >= leadsPrev.length ? 'up' : 'down' },
        chats: { val: convAct.length, change: calcChange(convAct.length, convPrev.length), trend: convAct.length >= convPrev.length ? 'up' : 'down' },
        tasks: { val: tareasPendientes, change: calcChange(tareasPendientes, tareas.length - tareas.filter(t => t.completada).length), trend: 'up' },
        contacts: { val: contAct.length, change: calcChange(contAct.length, contPrev.length), trend: contAct.length >= contPrev.length ? 'up' : 'down' },
      },
      totalLeads: leadsAct.length,
      convAI,
      tasaResolucionIA,
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
      })),
      chatAdvanced: {
        promedioPrimeraRespuesta: formatDuration(promedioPrimeraRespuesta),
        promedioRespuestaIA: formatDuration(promedioRespuestaIA),
        promedioRespuestaHumano: formatDuration(promedioRespuestaHumano),
        tasaIA: (resolucionIA + derivacionHumano + sinIntervencion) > 0 
          ? Math.round((resolucionIA / (resolucionIA + derivacionHumano + sinIntervencion)) * 100) 
          : 0,
        tasaHumano: (resolucionIA + derivacionHumano + sinIntervencion) > 0 
          ? Math.round((derivacionHumano / (resolucionIA + derivacionHumano + sinIntervencion)) * 100) 
          : 0,
        chatResolutionData,
        chatStatusData: [
          { name: 'Abiertos', value: chatsAbiertos, color: '#3b82f6' },
          { name: 'Pendientes', value: chatsPendientes, color: '#f59e0b' },
          { name: 'Resueltos', value: (resolucionIA + derivacionHumano + sinIntervencion), color: '#10b981' }
        ].filter(s => s.value > 0),
        heatMapData,
        desgloseTiempos: [
          { name: '< 1 min', value: rangosPrimeraRespuesta.rapido, color: '#10b981' },
          { name: '1-5 min', value: rangosPrimeraRespuesta.medio, color: '#3b82f6' },
          { name: '5-15 min', value: rangosPrimeraRespuesta.moderado, color: '#f59e0b' },
          { name: '15-60 min', value: rangosPrimeraRespuesta.lento, color: '#ef4444' },
          { name: '> 60 min', value: rangosPrimeraRespuesta.muyLento, color: '#7c2d12' }
        ],
        demandEtiquetasData,
        demandCategoriasData,
        // Nuevas métricas (horario hábil)
        tasaSLA,
        slaCumplidos,
        slaTotal,
        operadorRankingData,
        horarioEntradaData,
        tendenciaRespuestaData
      }
    };
  }, [leads, etapas, conversaciones, tareas, contactos, agentes, categorias, etiquetas, loading, dateRange]);

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
            <StatsCard
              title="Conversaciones"
              value={data.overview.chats.val.toString()}
              change={data.overview.chats.change}
              trend={data.overview.chats.trend}
              icon={<Inbox className="w-5 h-5" />}
              color="emerald"
              tooltip="Total de conversaciones con actividad en el período seleccionado, comparado con el período anterior."
            />
            <StatsCard
              title="Primer Respuesta Promedio"
              value={data.chatAdvanced.promedioPrimeraRespuesta}
              change="Hábil"
              trend="up"
              icon={<Clock className="w-5 h-5" />}
              color="blue"
              tooltip="Tiempo promedio hasta la primera respuesta. Medido dentro del horario de atención humana cuando está configurado."
            />
            <StatsCard
              title="Resolución IA"
              value={`${data.tasaResolucionIA}%`}
              change="Autónomo"
              trend="up"
              icon={<Zap className="w-5 h-5" />}
              color="purple"
              tooltip="De las conversaciones que tuvieron respuesta en el período, qué porcentaje gestionó la IA sola, sin intervención humana."
            />
            <StatsCard
              title="Leads Nuevos"
              value={data.overview.leads.val.toString()}
              change={data.overview.leads.change}
              trend={data.overview.leads.trend}
              icon={<Target className="w-5 h-5" />}
              color="amber"
              tooltip="Nuevos leads captados en el período, comparado con el período anterior."
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <ChartContainer title="Crecimiento General" subtitle="Leads vs Nuevos Contactos" className="lg:col-span-2" tooltip="Evolución de nuevos leads y nuevos contactos del CRM a lo largo del período seleccionado.">
              <AreaChart data={data.evolutionData}>
                <defs>
                  <linearGradient id="colorL" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--accent-active)" stopOpacity={0.1}/><stop offset="95%" stopColor="var(--accent-active)" stopOpacity={0}/></linearGradient>
                  <linearGradient id="colorC" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-tertiary-light)', fontSize: 10, fontWeight: 700}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-tertiary-light)', fontSize: 10, fontWeight: 700}} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="leads" name="Leads" stroke="var(--accent-active)" strokeWidth={3} fill="url(#colorL)" />
                <Area type="monotone" dataKey="contactos" name="Contactos" stroke="#8b5cf6" strokeWidth={3} fill="url(#colorC)" />
              </AreaChart>
            </ChartContainer>

            <div className="bg-[var(--bg-sidebar)] rounded-[32px] p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-110 transition-transform duration-1000" />
              <div className="absolute top-6 right-6 z-20">
                <HelpTip text="Porcentaje de conversaciones que la IA gestionó de forma autónoma sobre el total. Es tu eficiencia operativa: cuánto resuelve el bot sin intervención humana." iconClassName="text-white/40 hover:text-white/80" />
              </div>
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
                  {data.tasaResolucionIA}%
                </span>
                <span className="block text-[10px] font-black text-[var(--text-tertiary-dark)] uppercase tracking-[0.2em] mt-2">Eficiencia Operativa</span>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="chats" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* KPIs Avanzados de Chats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard 
              title="Primer Respuesta Promedio" 
              value={data.chatAdvanced.promedioPrimeraRespuesta} 
              change="General" 
              trend="up" 
              icon={<Clock className="w-5 h-5" />}
              color="blue"
              tooltip="Tiempo promedio desde el primer mensaje del cliente hasta la primera respuesta. Si hay horario de atención humana configurado, se mide solo dentro de ese horario (no cuenta noches ni fines de semana)."
            />
            <StatsCard 
              title="Tasa de Resolución IA" 
              value={`${data.chatAdvanced.tasaIA}%`} 
              change="Autónomo" 
              trend="up" 
              icon={<Zap className="w-5 h-5" />} 
              color="emerald" 
              tooltip="Porcentaje de conversaciones gestionadas y resueltas exclusivamente por la IA sin requerir intervención humana."
            />
            <StatsCard 
              title="Respuesta Promedio IA" 
              value={data.chatAdvanced.promedioRespuestaIA} 
              change="IA" 
              trend="up" 
              icon={<Bot className="w-5 h-5" />} 
              color="purple" 
              tooltip="Tiempo promedio que tarda la IA en responder a los mensajes individuales del cliente."
            />
            <StatsCard 
              title="Respuesta Promedio Humano" 
              value={data.chatAdvanced.promedioRespuestaHumano} 
              change="Soporte" 
              trend="up" 
              icon={<Users className="w-5 h-5" />}
              color="amber"
              tooltip="Tiempo promedio que tardan los operadores humanos en responder. Se mide dentro del horario de atención humana configurado (descuenta noches y fines de semana)."
            />
          </div>

          {/* SLA + Tendencia + Dentro/Fuera de horario */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="flex flex-col gap-8">
              <StatsCard
                title="Cumplimiento de SLA"
                value={`${data.chatAdvanced.tasaSLA}%`}
                change={`${data.chatAdvanced.slaCumplidos}/${data.chatAdvanced.slaTotal}`}
                trend="up"
                icon={<CheckCircle2 className="w-5 h-5" />}
                color="emerald"
                tooltip={`Porcentaje de conversaciones respondidas dentro del objetivo de ${Math.round(SLA_OBJETIVO_SEG / 60)} minutos (medido en horario de atención humana).`}
              />
              <div className="bg-[var(--bg-card)] rounded-[32px] p-8 border border-[var(--border-light)] shadow-sm flex-1 flex flex-col">
                <div className="mb-4 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary-light)] tracking-tight">Dentro vs Fuera de Horario</h3>
                    <p className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest mt-1">Mensajes entrantes según atención humana</p>
                  </div>
                  <HelpTip text="De las conversaciones del período, cuántas iniciaron dentro del horario de atención humana y cuántas fuera. Muestra cuánto volumen entra cuando no hay nadie atendiendo (lo cubre la IA)." />
                </div>
                {data.chatAdvanced.horarioEntradaData.length > 0 ? (
                  <div className="flex-1 min-h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.chatAdvanced.horarioEntradaData} innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value">
                          {data.chatAdvanced.horarioEntradaData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(value: any) => [value, "Conversaciones"]} />
                        <Legend content={<PieLegend data={data.chatAdvanced.horarioEntradaData} />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex-1 min-h-[200px] flex flex-col items-center justify-center text-center text-[var(--text-tertiary-light)] px-4">
                    <Clock className="w-10 h-10 mb-3 opacity-20" />
                    <p className="text-[11px] font-bold leading-relaxed">Configurá el horario de atención humana para ver esta métrica.</p>
                  </div>
                )}
              </div>
            </div>

            <ChartContainer title="Tendencia de Primera Respuesta" subtitle="Evolución del tiempo de respuesta" className="lg:col-span-2" tooltip="Promedio del tiempo de primera respuesta por día/período, medido en horario de atención humana cuando está configurado. Sirve para ver si el equipo mejora con el tiempo.">
              <AreaChart data={data.chatAdvanced.tendenciaRespuestaData}>
                <defs>
                  <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-active)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--accent-active)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-tertiary-light)', fontSize: 10, fontWeight: 700 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-tertiary-light)', fontSize: 10, fontWeight: 700 }} tickFormatter={(v: any) => fmtDur(v)} width={60} />
                <Tooltip formatter={(value: any) => [fmtDur(value), "Primera respuesta"]} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="segundos" name="Primera respuesta" stroke="var(--accent-active)" strokeWidth={3} fill="url(#colorTrend)" />
              </AreaChart>
            </ChartContainer>
          </div>

          {/* Respuesta por operador */}
          <div className="bg-[var(--bg-card)] rounded-[32px] p-8 border border-[var(--border-light)] shadow-sm">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary-light)] tracking-tight">Respuesta por Miembro del Staff</h3>
                <p className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest mt-1">Velocidad promedio del equipo humano (horario hábil)</p>
              </div>
              <div className="flex items-center gap-3">
                <HelpTip text="Tiempo promedio de respuesta de cada miembro del equipo humano y cantidad de respuestas, medido dentro del horario de atención. El más rápido aparece primero." />
                <Users className="text-[var(--accent-active)] w-6 h-6 opacity-50" />
              </div>
            </div>
            {data.chatAdvanced.operadorRankingData.length > 0 ? (
              <div className="space-y-3">
                {data.chatAdvanced.operadorRankingData.map((op: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-4 p-4 bg-[var(--bg-input)]/50 rounded-2xl border border-transparent hover:border-[var(--accent-active)] transition-all">
                    <div className="w-9 h-9 rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] flex items-center justify-center font-black text-sm text-[var(--text-secondary-light)] shrink-0">
                      {idx === 0 ? <Trophy className="w-4 h-4 text-amber-500" /> : op.nombre?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-bold text-[var(--text-primary-light)] flex-1 truncate">{op.nombre}</span>
                    <span className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">{op.total} resp.</span>
                    <span className="text-base font-black text-[var(--accent-active)] w-20 text-right">{fmtDur(op.promedio)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 flex flex-col items-center justify-center text-[var(--text-tertiary-light)]">
                <Users className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest text-center">Aún no hay respuestas humanas<br />registradas en este rango</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <ChartContainer title="Estado de la Bandeja" subtitle="Distribución actual de conversaciones" className="lg:col-span-1" tooltip="Cómo se reparten las conversaciones del período entre abiertas, pendientes y resueltas.">
              <PieChart>
                <Pie 
                  data={data.chatAdvanced.chatStatusData} 
                  innerRadius={65} 
                  outerRadius={90} 
                  paddingAngle={5} 
                  dataKey="value"
                >
                  {data.chatAdvanced.chatStatusData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value: any) => [value, "Conversaciones"]} />
                <Legend content={<PieLegend data={data.chatAdvanced.chatStatusData} />} />
              </PieChart>
            </ChartContainer>

            <ChartContainer title="Resolución de Chats" subtitle="IA vs Derivaciones a Humano" className="lg:col-span-1" tooltip="De las conversaciones resueltas, cuántas las cerró la IA sola, cuántas se derivaron a un humano y cuántas no tuvieron intervención.">
              <PieChart>
                <Pie 
                  data={data.chatAdvanced.chatResolutionData} 
                  innerRadius={65} 
                  outerRadius={90} 
                  paddingAngle={5} 
                  dataKey="value"
                >
                  {data.chatAdvanced.chatResolutionData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value: any) => [value, "Conversaciones"]} />
                <Legend content={<PieLegend data={data.chatAdvanced.chatResolutionData} />} />
              </PieChart>
            </ChartContainer>

            <ChartContainer title="Distribución de Tiempos" subtitle="Tiempo de primera respuesta" className="lg:col-span-1" tooltip="Cuántas conversaciones cayeron en cada franja de tiempo de primera respuesta (menos de 1 min, 1-5 min, etc.).">
              <BarChart data={data.chatAdvanced.desgloseTiempos}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9}} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: 'transparent'}} formatter={(value: any) => [value, "Conversaciones"]} />
                <Bar dataKey="value" name="Conversaciones" radius={[8, 8, 0, 0]}>
                  {data.chatAdvanced.desgloseTiempos.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>

          {/* Gráficos de Demanda por Etiqueta y Categoría */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <ChartContainer title="Demanda por Etiqueta" subtitle="Top 10 etiquetas con más chats" className="lg:col-span-2" tooltip="Las 10 etiquetas de CRM más frecuentes entre las conversaciones del período. Útil para saber qué temas consultan más.">
              {data.chatAdvanced.demandEtiquetasData.length > 0 ? (
                <BarChart data={data.chatAdvanced.demandEtiquetasData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} width={100} />
                  <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} formatter={(value: any) => [value, "Conversaciones"]} />
                  <Bar dataKey="value" name="Conversaciones" radius={[0, 8, 8, 0]} label={{ position: 'right', fontSize: 11, fontWeight: 'bold' }}>
                    {data.chatAdvanced.demandEtiquetasData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-[var(--text-tertiary-light)]">
                  <Inbox className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Sin etiquetas en este rango</p>
                </div>
              )}
            </ChartContainer>

            <ChartContainer title="Demanda por Categoría" subtitle="Chats agrupados por categoría" className="lg:col-span-1" tooltip="Conversaciones agrupadas por la categoría de sus etiquetas de CRM.">
              {data.chatAdvanced.demandCategoriasData.length > 0 ? (
                <PieChart>
                  <Pie 
                    data={data.chatAdvanced.demandCategoriasData} 
                    innerRadius={65} 
                    outerRadius={90} 
                    paddingAngle={5} 
                    dataKey="value"
                  >
                    {data.chatAdvanced.demandCategoriasData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(value: any) => [value, "Conversaciones"]} />
                  <Legend content={<PieLegend data={data.chatAdvanced.demandCategoriasData} />} />
                </PieChart>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-[var(--text-tertiary-light)]">
                  <Inbox className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Sin categorías en este rango</p>
                </div>
              )}
            </ChartContainer>
          </div>

          {/* Mapa de Calor de Actividad de Chats */}
          <div className="bg-[var(--bg-card)] rounded-[32px] p-8 border border-[var(--border-light)] shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary-light)] tracking-tight">Mapa de Calor de Conversaciones</h3>
                <p className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest mt-1">Volumen de actividad según Día y Franja Horaria</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary-light)]">
                  <span>Menos</span>
                  <div className="w-3.5 h-3.5 bg-emerald-50 rounded" />
                  <div className="w-3.5 h-3.5 bg-emerald-200 rounded" />
                  <div className="w-3.5 h-3.5 bg-emerald-400 rounded" />
                  <div className="w-3.5 h-3.5 bg-emerald-600 rounded" />
                  <span>Más</span>
                </div>
                <HelpTip text="Volumen de conversaciones según el día de la semana y la franja horaria. Cuanto más oscuro, más actividad. Ayuda a identificar tus horas pico." />
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[700px] space-y-2">
                {/* Cabecera de horas */}
                <div className="grid grid-cols-7 gap-2 text-center text-[9px] font-black uppercase text-[var(--text-tertiary-light)] tracking-widest pl-[100px]">
                  <div>Madrugada<span className="block text-[8px] font-medium font-mono text-gray-400">00:00 - 04:00</span></div>
                  <div>Mañana Temp.<span className="block text-[8px] font-medium font-mono text-gray-400">04:00 - 08:00</span></div>
                  <div>Mañana/Mediodía<span className="block text-[8px] font-medium font-mono text-gray-400">08:00 - 12:00</span></div>
                  <div>Tarde Temprana<span className="block text-[8px] font-medium font-mono text-gray-400">12:00 - 16:00</span></div>
                  <div>Tarde/Noche<span className="block text-[8px] font-medium font-mono text-gray-400">16:00 - 20:00</span></div>
                  <div>Noche Tardía<span className="block text-[8px] font-medium font-mono text-gray-400">20:00 - 00:00</span></div>
                </div>

                {/* Filas de días */}
                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((diaLabel, diaIdx) => (
                  <div key={diaLabel} className="flex items-center gap-2">
                    <div className="w-[100px] text-xs font-bold text-[var(--text-secondary-light)]">{diaLabel}</div>
                    <div className="grid grid-cols-7 gap-2 flex-1">
                      {Array.from({ length: 6 }).map((_, bloqueIdx) => {
                        const valor = data.chatAdvanced.heatMapData[diaIdx]?.[bloqueIdx] || 0;
                        // Calcular color basado en la intensidad
                        let colorBg = 'bg-emerald-50 text-emerald-700';
                        if (valor > 10) colorBg = 'bg-emerald-600 text-white font-bold';
                        else if (valor > 5) colorBg = 'bg-emerald-400 text-emerald-950 font-bold';
                        else if (valor > 0) colorBg = 'bg-emerald-200 text-emerald-900';

                        return (
                          <div 
                            key={bloqueIdx} 
                            className={`h-11 rounded-xl flex items-center justify-center text-xs transition-all hover:scale-105 cursor-default ${colorBg}`}
                            title={`${valor} chats en esta franja`}
                          >
                            {valor}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
            <ChartContainer title="Fuentes de Tráfico" subtitle="Distribución de origen" className="lg:col-span-1" tooltip="De dónde provienen tus leads (WhatsApp, Meta Ads, etc.) en el período seleccionado.">
              {data.leadSourceData.length > 0 ? (
                <PieChart>
                  <Pie data={data.leadSourceData} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                    {data.leadSourceData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(value: any) => [value, "Leads"]} />
                  <Legend content={<PieLegend data={data.leadSourceData} />} />
                </PieChart>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-[var(--text-tertiary-light)]">
                  <Target className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Sin datos en este rango</p>
                </div>
              )}
            </ChartContainer>
            
            <ChartContainer title="Embudo Comercial" subtitle="Leads por etapa" className="lg:col-span-2" tooltip="Distribución de leads por etapa del embudo de ventas, con el porcentaje sobre el total.">
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
                <div className="flex items-center gap-3">
                  <HelpTip text="Las campañas de Meta Ads que más leads generaron en el período." />
                  <Award className="text-[var(--accent-active)] w-6 h-6 opacity-50" />
                </div>
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
                <div className="flex items-center gap-3">
                  <HelpTip text="Los formularios de Meta Leads que más contactos convirtieron en el período." />
                  <FileText className="text-[var(--accent-active)] w-6 h-6 opacity-50" />
                </div>
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
            <ChartContainer title="Estado de Productividad" subtitle="Completadas vs Pendientes" tooltip="Proporción de tareas completadas frente a las que siguen pendientes.">
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
                <Tooltip formatter={(value: any) => [value, "Tareas"]} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ChartContainer>

            <ChartContainer title="Prioridad de Pendientes" subtitle="Carga de trabajo por urgencia" tooltip="Tareas pendientes agrupadas por prioridad (alta, media, baja) para ver la carga del equipo.">
              <BarChart data={data.tareasPriorityData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} width={70} />
                <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} formatter={(value: any) => [value, "Tareas"]} />
                <Bar dataKey="value" name="Tareas" radius={[0, 10, 10, 0]} label={{ position: 'right', fontSize: 12, fontWeight: 'bold' }}>
                  {data.tareasPriorityData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        </TabsContent>

        <TabsContent value="contactos" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <ChartContainer title="Adquisición de Contactos" subtitle="Nuevos registros en el CRM" tooltip="Cantidad de nuevos contactos cargados en el CRM a lo largo del período.">
            <AreaChart data={data.evolutionData}>
              <defs>
                <linearGradient id="colorContacts" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip formatter={(value: any) => [value, "Contactos"]} />
              <Area 
                type="monotone" 
                dataKey="contactos" 
                name="Contactos"
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

// Botón de ayuda reutilizable (ícono + tooltip al pasar el mouse)
function HelpTip({ text, iconClassName }: { text: string; iconClassName?: string }) {
  return (
    <div className="relative group/tooltip shrink-0">
      <HelpCircle className={`w-4 h-4 cursor-help transition-colors ${iconClassName || "text-[var(--text-tertiary-light)] hover:text-[var(--text-secondary-light)]"}`} />
      <div className="absolute bottom-full right-0 mb-2 w-64 bg-slate-900 text-white text-[11px] p-3 rounded-xl shadow-xl opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-all duration-300 z-50 leading-relaxed font-normal normal-case tracking-normal text-left">
        {text}
        <div className="absolute top-full right-2 border-4 border-transparent border-t-slate-900" />
      </div>
    </div>
  );
}

// Leyenda de torta que muestra nombre + cantidad + porcentaje en cada ítem
function PieLegend({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  return (
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 pt-3 px-2">
      {data.map((entry, i) => (
        <li key={i} className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-secondary-light)]">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: entry.color }} />
          <span>{entry.name}</span>
          <span className="font-black text-[var(--text-primary-light)]">{entry.value}</span>
          <span className="text-[var(--text-tertiary-light)]">({total > 0 ? Math.round((entry.value / total) * 100) : 0}%)</span>
        </li>
      ))}
    </ul>
  );
}

function StatsCard({ title, value, change, trend, icon, color, tooltip }: any) {
  const isUp = trend === 'up';
  const colorMap: any = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  };

  return (
    <div className="bg-[var(--bg-card)] rounded-[32px] p-6 border border-[var(--border-light)] hover:border-[var(--border-light-strong)] transition-all group shadow-sm relative">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${colorMap[color]} border flex items-center justify-center transition-transform group-hover:scale-110`}>
          {icon}
        </div>
        <div className="flex items-center gap-2">
          {tooltip && (
            <div className="relative group/tooltip">
              <HelpCircle className="w-4 h-4 text-[var(--text-tertiary-light)] hover:text-[var(--text-secondary-light)] cursor-help transition-colors" />
              <div className="absolute bottom-full right-0 mb-2 w-64 bg-slate-900 text-white text-[11px] p-3 rounded-xl shadow-xl opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-all duration-300 z-50 leading-relaxed font-normal">
                {tooltip}
                <div className="absolute top-full right-2 border-4 border-transparent border-t-slate-900" />
              </div>
            </div>
          )}
          <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg ${isUp ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
            {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {change}
          </div>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary-light)] mb-1">{title}</p>
        <h4 className="text-3xl font-black text-[var(--text-primary-light)] tracking-tight">{value}</h4>
      </div>
    </div>
  );
}

function ChartContainer({ title, subtitle, children, className, tooltip }: any) {
  return (
    <div className={`bg-[var(--bg-card)] rounded-[32px] p-8 border border-[var(--border-light)] shadow-sm ${className}`}>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h3 className="text-lg font-bold text-[var(--text-primary-light)] tracking-tight">{title}</h3>
          <p className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest mt-1">{subtitle}</p>
        </div>
        {tooltip && <HelpTip text={tooltip} />}
      </div>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
