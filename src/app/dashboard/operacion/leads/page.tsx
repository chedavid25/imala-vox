"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Target, 
  LayoutGrid, 
  List, 
  Plus, 
  Search, 
  Filter, 
  ChevronRight,
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  MoreVertical,
  MessageCircle,
  Convert,
  Loader2,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  serverTimestamp,
  addDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, Lead, EtapaEmbudo } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

// DnD Kit Imports
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";

/**
 * MÓDULO DE LEADS - FASE 3
 * Gestión de prospectos con vista Kanban y Lista.
 */
export default function LeadsPage() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<(Lead & { id: string })[]>([]);
  const [etapas, setEtapas] = useState<(EtapaEmbudo & { id: string })[]>([]);
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<(Lead & { id: string }) | null>(null);
  const [converting, setConverting] = useState(false);

  // Escuchar Etapas del Embudo
  useEffect(() => {
    if (!currentWorkspaceId) return;

    const q = query(
      collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.ETAPAS_EMBUDO),
      orderBy("orden", "asc")
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setEtapas(snap.docs.map(d => ({ ...d.data(), id: d.id })) as any);
    });

    return () => unsubscribe();
  }, [currentWorkspaceId]);

  // Escuchar Leads
  useEffect(() => {
    if (!currentWorkspaceId) return;

    const q = query(
      collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.LEADS),
      orderBy("creadoEl", "desc")
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setLeads(snap.docs.map(d => ({ ...d.data(), id: d.id })) as any);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentWorkspaceId]);

  // Filtrado de Leads
  const filteredLeads = useMemo(() => {
    return leads.filter(l => 
      l.nombre.toLowerCase().includes(search.toLowerCase()) ||
      l.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.telefono?.includes(search)
    );
  }, [leads, search]);

  // Sensores para DnD
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const leadId = active.id as string;
    const overId = over.id as string;

    // Si soltamos sobre una etapa
    const stage = etapas.find(e => e.id === overId);
    if (stage) {
      const lead = leads.find(l => l.id === leadId);
      if (lead && lead.etapaId !== stage.id) {
        try {
          const leadRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId!, COLLECTIONS.LEADS, leadId);
          await updateDoc(leadRef, {
            etapaId: stage.id,
            actualizadoEl: serverTimestamp()
          });
          toast.success(`Lead movido a ${stage.nombre}`);
        } catch (err) {
          toast.error("Error al mover el lead");
        }
      }
    }
    
    setActiveId(null);
  };

  // Acción: Convertir Lead a Contacto CRM
  const handleConvertLead = async (lead: Lead & { id: string }) => {
    if (!currentWorkspaceId || converting) return;
    setConverting(true);
    const toastId = toast.loading("Convirtiendo lead a contacto CRM...");

    try {
      // 1. Crear el contacto
      const contactoData = {
        nombre: lead.nombre,
        email: lead.email,
        telefono: lead.telefono,
        relacionTag: 'Lead' as const,
        aiBlocked: false,
        etiquetas: lead.origen === 'meta_ads' ? ['lead-meta-ads'] : ['lead-organico'],
        creadoEl: serverTimestamp(),
      };

      const contactoRef = await addDoc(
        collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS),
        contactoData
      );

      // 2. Marcar lead como convertido
      const leadRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.LEADS, lead.id);
      await updateDoc(leadRef, {
        convertidoAContacto: true,
        contactoId: contactoRef.id,
        actualizadoEl: serverTimestamp()
      });

      toast.success("Lead convertido exitosamente", { id: toastId });
      setSelectedLead(null);
    } catch (err) {
      console.error("Error al convertir lead:", err);
      toast.error("Error al convertir el lead", { id: toastId });
    } finally {
      setConverting(false);
    }
  };

  const handleStartWhatsApp = (lead: Lead) => {
    if (!lead.telefono) {
      toast.error("Este lead no tiene número de teléfono");
      return;
    }

    if (lead.contactoId) {
      // Redirigir al inbox con el contacto seleccionado
      window.location.href = `/dashboard/operacion/inbox?contactoId=${lead.contactoId}`;
    } else {
      toast.info("Primero debes convertir el lead a contacto para iniciar una conversación gestionada por IA.");
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
        <p className="text-sm font-medium text-[var(--text-tertiary-light)]">Cargando embudo de ventas...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* HEADER & METRICAS */}
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[var(--accent)] mb-1">
              <Target className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Leads & Funnel</span>
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary-light)]">Gestión de Prospectos</h1>
            <p className="text-sm text-[var(--text-tertiary-light)]">Convierte leads de Meta Ads y orgánicos en clientes.</p>
          </div>

          <div className="flex items-center gap-2 bg-[var(--bg-input)] p-1 rounded-xl border border-[var(--border-light)]">
            <button 
              onClick={() => setView('kanban')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                view === 'kanban' ? "bg-white text-[var(--text-primary-light)] shadow-sm" : "text-[var(--text-tertiary-light)] hover:text-[var(--text-secondary-light)]"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Kanban
            </button>
            <button 
              onClick={() => setView('list')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                view === 'list' ? "bg-white text-[var(--text-primary-light)] shadow-sm" : "text-[var(--text-tertiary-light)] hover:text-[var(--text-secondary-light)]"
              )}
            >
              <List className="w-3.5 h-3.5" />
              Lista
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard title="Leads este mes" value={leads.length} icon={Users} trend="+12%" color="blue" />
          <MetricCard title="Nuevos hoy" value={leads.filter(l => {
              const hoy = new Date();
              const creado = l.creadoEl.toDate();
              return creado.getDate() === hoy.getDate() && creado.getMonth() === hoy.getMonth();
          }).length} icon={Clock} trend="Nuevo" color="orange" />
          <MetricCard title="Convertidos" value={leads.filter(l => l.convertidoAContacto).length} icon={CheckCircle2} color="green" />
          <MetricCard title="Tasa de Cierre" value="15%" icon={TrendingUp} color="purple" />
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary-light)]" />
          <Input 
            placeholder="Buscar por nombre, email o teléfono..." 
            className="pl-10 h-11 bg-white border-[var(--border-light)] rounded-xl focus:ring-1 focus:ring-[var(--accent)]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" className="h-11 rounded-xl border-[var(--border-light)] font-bold text-xs gap-2">
          <Filter className="w-4 h-4" /> Filtros
        </Button>
      </div>

      {/* VISTA CONTENIDO */}
      {view === 'kanban' ? (
        <div className="relative overflow-x-auto pb-4 custom-scrollbar">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 min-w-max">
              {etapas.map(etapa => (
                <KanbanColumn 
                  key={etapa.id} 
                  etapa={etapa} 
                  leads={filteredLeads.filter(l => l.etapaId === etapa.id)}
                  onSelected={setSelectedLead}
                />
              ))}
              
              {/* Botón Nueva Etapa */}
              <div className="w-80 h-[200px] border-2 border-dashed border-[var(--border-light)] rounded-3xl flex flex-col items-center justify-center p-6 text-center space-y-3 shrink-0 opacity-60 hover:opacity-100 transition-all cursor-pointer bg-white/30">
                <div className="w-10 h-10 rounded-full bg-[var(--bg-input)] flex items-center justify-center">
                  <Plus className="w-5 h-5 text-[var(--text-tertiary-light)]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary-light)]">Nueva Etapa</h4>
                  <p className="text-[11px] text-[var(--text-tertiary-light)]">Personaliza tu embudo</p>
                </div>
              </div>
            </div>
          </DndContext>
        </div>
      ) : (
        <div className="bg-white border border-[var(--border-light)] rounded-3xl overflow-hidden shadow-sm">
           <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border-light)] bg-[var(--bg-input)]/30">
                  <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary-light)]">Lead</th>
                  <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary-light)]">Origen</th>
                  <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary-light)]">Etapa</th>
                  <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary-light)]">Temperatura</th>
                  <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary-light)]">Creado</th>
                  <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary-light)]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-light)]">
                {filteredLeads.map(lead => (
                  <tr 
                    key={lead.id} 
                    className="hover:bg-[var(--bg-main)]/50 transition-colors group cursor-pointer"
                    onClick={() => setSelectedLead(lead)}
                  >
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[var(--text-primary-light)]">{lead.nombre}</span>
                        <span className="text-[11px] text-[var(--text-tertiary-light)]">{lead.telefono || lead.email || "Sin contacto"}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className={cn(
                        "text-[9px] font-black uppercase",
                        lead.origen === 'meta_ads' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {lead.origen.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full" style={{ backgroundColor: etapas.find(e => e.id === lead.etapaId)?.color || '#ccc' }} />
                         <span className="text-xs font-semibold">{etapas.find(e => e.id === lead.etapaId)?.nombre || "Unknown"}</span>
                      </div>
                    </td>
                    <td className="p-4">
                       <TemperatureDot temperature={lead.temperatura} />
                    </td>
                    <td className="p-4 text-xs font-medium text-[var(--text-secondary-light)]">
                      {formatDistanceToNow(lead.creadoEl.toDate(), { addSuffix: true, locale: es })}
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
           </table>
        </div>
      )}

      {/* PANEL DE DETALLE (Simulación de Sheet) */}
      {selectedLead && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" 
            onClick={() => setSelectedLead(null)}
          />
          <div className="relative w-full max-w-[480px] h-full bg-white shadow-2xl animate-in slide-in-from-right duration-500 overflow-y-auto custom-scrollbar">
            <LeadDetailContent 
              lead={selectedLead} 
              etapas={etapas} 
              onClose={() => setSelectedLead(null)}
              onConvert={() => handleConvertLead(selectedLead)}
              onWhatsApp={() => handleStartWhatsApp(selectedLead)}
              converting={converting}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, trend, color }: any) {
  const colorMap: any = {
    blue: "bg-blue-50 text-blue-500",
    orange: "bg-orange-50 text-orange-500",
    green: "bg-green-50 text-green-500",
    purple: "bg-purple-50 text-purple-500",
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-[var(--border-light)] flex items-center justify-between group hover:border-[var(--accent)] transition-all">
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-[var(--text-tertiary-light)] uppercase tracking-widest">{title}</p>
        <div className="flex items-baseline gap-2">
           <h3 className="text-2xl font-black text-[var(--text-primary-light)]">{value}</h3>
           {trend && <span className="text-[10px] font-black text-green-600 uppercase">{trend}</span>}
        </div>
      </div>
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", colorMap[color])}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}

function KanbanColumn({ etapa, leads, onSelected }: { etapa: EtapaEmbudo & { id: string }, leads: (Lead & { id: string })[], onSelected: (l: any) => void }) {
  return (
    <div className="w-80 shrink-0 flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: etapa.color }} />
          <h3 className="text-sm font-black text-[var(--text-primary-light)] uppercase tracking-tight flex items-center gap-2">
            {etapa.nombre}
            <span className="text-[11px] font-bold text-[var(--text-tertiary-light)] bg-[var(--bg-input)] px-2 py-0.5 rounded-full">
              {leads.length}
            </span>
          </h3>
        </div>
        {!etapa.esDefault ? (
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
            <MoreVertical className="w-3.5 h-3.5 text-[var(--text-tertiary-light)]" />
          </Button>
        ) : (
          <Lock className="w-3.5 h-3.5 text-[var(--text-tertiary-light)] opacity-30" />
        )}
      </div>

      <div 
        className="flex-1 min-h-[500px] bg-[var(--bg-input)]/40 rounded-3xl p-3 space-y-3"
      >
        {leads.map(lead => (
          <LeadCard key={lead.id} lead={lead} onClick={() => onSelected(lead)} />
        ))}
      </div>
    </div>
  );
}

function LeadCard({ lead, onClick }: { lead: Lead & { id: string }, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="bg-white p-4 rounded-2xl border border-[var(--border-light)] shadow-sm hover:shadow-md hover:border-[var(--accent)] transition-all cursor-pointer group animate-in slide-in-from-bottom-2 duration-300"
    >
      <div className="flex justify-between items-start mb-2">
         <Badge className={cn(
            "text-[8px] font-black uppercase px-2 py-0.5 h-4",
            lead.origen === 'meta_ads' ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"
          )}>
            {lead.origen === 'meta_ads' ? 'Meta Ads' : 'Orgánico'}
          </Badge>
          <TemperatureDot temperature={lead.temperatura} />
      </div>

      <div className="space-y-1">
        <h4 className="text-sm font-bold text-[var(--text-primary-light)] leading-tight">{lead.nombre}</h4>
        <p className="text-[11px] font-medium text-[var(--text-tertiary-light)] truncate">
          {lead.campana || lead.telefono || "Sin origen"}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--border-light)] flex items-center justify-between">
        <span className="text-[9px] font-bold text-[var(--text-tertiary-light)] uppercase flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          {formatDistanceToNow(lead.creadoEl.toDate(), { addSuffix: true, locale: es })}
        </span>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-1.5 hover:bg-[var(--accent)]/10 text-[var(--accent)] rounded-lg transition-colors">
            <MessageCircle className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 hover:bg-blue-50 text-blue-500 rounded-lg transition-colors">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

    </div>
  );
}

function LeadDetailContent({ lead, etapas, onClose, onConvert, onWhatsApp, converting }: any) {
  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)]">
      {/* Header */}
      <div className="p-6 bg-white border-b border-[var(--border-light)]">
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[var(--text-primary-light)]">{lead.nombre}</h2>
            <div className="flex items-center gap-2">
              <Badge className={cn(
                "text-[9px] font-black uppercase px-2 py-0.5",
                lead.origen === 'meta_ads' ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"
              )}>
                {lead.origen.replace('_', ' ')}
              </Badge>
              <Badge className="bg-white text-[var(--text-secondary-light)] border-[var(--border-light)] text-[9px] font-bold uppercase">
                {etapas.find((e: any) => e.id === lead.etapaId)?.nombre}
              </Badge>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <Plus className="w-5 h-5 rotate-45 text-[var(--text-tertiary-light)]" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <Button 
            onClick={onWhatsApp}
            className="bg-[var(--accent)] text-[var(--accent-text)] font-bold text-xs rounded-xl h-12 shadow-lg shadow-[var(--accent)]/10"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Inbox WA
          </Button>
          <Button 
            onClick={onConvert}
            disabled={lead.convertidoAContacto || converting}
            variant="outline"
            className="border-[var(--border-light-strong)] font-bold text-xs rounded-xl h-12 hover:bg-white"
          >
            {converting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <TrendingUp className="w-4 h-4 mr-2 text-blue-500" />}
            {lead.convertidoAContacto ? 'Convertido' : 'Convertir'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Info de contacto */}
        <Section title="Información de Contacto">
          <div className="space-y-4">
            <InfoRow label="Teléfono" value={lead.telefono || "No especificado"} />
            <InfoRow label="Email" value={lead.email || "No especificado"} />
          </div>
        </Section>

        {/* Origen */}
        <Section title="Origen de la Campaña">
          <div className="space-y-4">
            <InfoRow label="Campaña" value={lead.campana || "Desconocida"} />
            <InfoRow label="Formulario" value={lead.formulario || "Desconocido"} />
            <InfoRow label="ID Form Meta" value={lead.metaFormId || "-"} />
          </div>
        </Section>

        {/* Respuestas del formulario */}
        <Section title="Respuestas del Formulario">
          <div className="bg-[var(--bg-input)]/50 rounded-2xl p-4 space-y-4 border border-[var(--border-light)]/50">
            {Object.entries(lead.camposFormulario || {}).length > 0 ? (
              Object.entries(lead.camposFormulario).map(([key, val]: any) => (
                <div key={key} className="space-y-1">
                  <p className="text-[10px] font-bold text-[var(--text-tertiary-light)] uppercase tracking-wider">{key.replace('_', ' ')}</p>
                  <p className="text-sm font-medium text-[var(--text-secondary-light)]">{val}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-[var(--text-tertiary-light)] italic text-center py-4">Sin datos de formulario</p>
            )}
          </div>
        </Section>

        {/* Temperatura */}
        <Section title="Temperatura">
           <div className="flex gap-2">
             <TempButton active={lead.temperatura === 'frio'} type="frio" label="FrÍo" />
             <TempButton active={lead.temperatura === 'tibio'} type="tibio" label="Tibio" />
             <TempButton active={lead.temperatura === 'caliente'} type="caliente" label="Caliente" />
           </div>
        </Section>

        {/* Notas */}
        <Section title="Notas internas">
          <div className="relative group">
            <textarea 
               className="w-full min-h-[120px] bg-white border border-[var(--border-light)] rounded-2xl p-4 text-sm focus:ring-1 focus:ring-[var(--accent)] outline-none transition-all resize-none shadow-inner"
               placeholder="Añade observaciones sobre este prospecto..."
               defaultValue={lead.notas}
            />
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary-light)] opacity-70 ml-1">{title}</h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: any) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-[var(--border-light)]/30">
      <span className="text-xs font-medium text-[var(--text-tertiary-light)]">{label}</span>
      <span className="text-xs font-bold text-[var(--text-primary-light)]">{value}</span>
    </div>
  );
}

function TempButton({ active, type, label }: any) {
  const colors: any = {
    frio: active ? "bg-blue-500 text-white" : "text-blue-500 bg-white border-blue-100 hover:bg-blue-50",
    tibio: active ? "bg-orange-500 text-white" : "text-orange-500 bg-white border-orange-100 hover:bg-orange-50",
    caliente: active ? "bg-red-500 text-white" : "text-red-500 bg-white border-red-100 hover:bg-red-50",
  };
  
  return (
    <button className={cn(
      "flex-1 py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-300",
      colors[type],
      active ? "shadow-lg scale-[1.05] z-10" : "opacity-60"
    )}>
      {label}
    </button>
  );
}

function TemperatureDot({ temperature }: { temperature: string }) {
  const colors: any = {
    frio: "bg-blue-500 shadow-blue-500/30",
    tibio: "bg-orange-500 shadow-orange-500/30",
    caliente: "bg-red-500 shadow-red-500/30",
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-2 h-2 rounded-full shadow-lg", colors[temperature])} />
      <span className="text-[10px] font-bold text-[var(--text-tertiary-light)] uppercase tracking-tight">{temperature}</span>
    </div>
  );
}
