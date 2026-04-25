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
  Loader2,
  Lock,
  ExternalLink,
  Pencil,
  Check,
  X,
  StickyNote
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogClose,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  serverTimestamp,
  addDoc,
  deleteDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, Lead, EtapaEmbudo } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import { PhoneActionMenu } from "@/components/crm/PhoneActionMenu";

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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";

/**
 * MÓDULO DE LEADS - FASE 3
 * Gestión de prospectos con vista Kanban y Lista.
 */
import { useMobileLayout } from "@/hooks/useMobileLayout";
import { MobileLeadList } from "@/components/mobile/crm/MobileLeadList";

export default function LeadsPage() {
  const router = useRouter();
  const { currentWorkspaceId } = useWorkspaceStore();
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<(Lead & { id: string })[]>([]);
  const [etapas, setEtapas] = useState<(EtapaEmbudo & { id: string })[]>([]);
  const [search, setSearch] = useState("");
  const [filtroOrigen, setFiltroOrigen] = useState<'todos' | 'meta_ads' | 'organico' | 'manual'>('todos');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const isMobile = useMobileLayout();
  
  // Lead seleccionado derivado (para reactividad total)
  const selectedLead = useMemo(() => 
    leads.find(l => l.id === selectedLeadId) || null,
  [leads, selectedLeadId]);

  const [converting, setConverting] = useState(false);
  
  // Estados Nueva Etapa
  const [isNewStageModalOpen, setIsNewStageModalOpen] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState("#3B82F6");
  const [isSavingStage, setIsSavingStage] = useState(false);

  // Estados Edición Etapa
  const [editingStage, setEditingStage] = useState<(EtapaEmbudo & { id: string }) | null>(null);

  // Estados Nuevo Lead Manual
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [newLeadData, setNewLeadData] = useState({
    nombre: "",
    email: "",
    telefono: "",
    etapaId: "",
    temperatura: "frio" as "frio" | "tibio" | "caliente",
    notas: "",
  });
  const [isSavingLead, setIsSavingLead] = useState(false);

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
    return leads.filter(l => {
      const matchSearch = l.nombre.toLowerCase().includes(search.toLowerCase()) ||
        l.email?.toLowerCase().includes(search.toLowerCase()) ||
        l.telefono?.includes(search);
      const matchOrigen = filtroOrigen === 'todos' || l.origen === filtroOrigen;
      return matchSearch && matchOrigen;
    });
  }, [leads, search, filtroOrigen]);

  // Cálculos de Métricas Reales
  const metrics = useMemo(() => {
    const hoy = new Date();
    const esteMes = hoy.getMonth();
    const esteAno = hoy.getFullYear();

    const nuevosHoy = leads.filter(l => {
      const creado = l.creadoEl?.toDate();
      return creado && 
             creado.getDate() === hoy.getDate() && 
             creado.getMonth() === hoy.getMonth() &&
             creado.getFullYear() === hoy.getFullYear();
    }).length;

    const enEsteMes = leads.filter(l => {
      const creado = l.creadoEl?.toDate();
      return creado && 
             creado.getMonth() === esteMes &&
             creado.getFullYear() === esteAno;
    }).length;

    // Calcular mes anterior
    const mesAnterior = esteMes === 0 ? 11 : esteMes - 1;
    const anoAnterior = esteMes === 0 ? esteAno - 1 : esteAno;

    const enMesAnterior = leads.filter(l => {
      const creado = l.creadoEl?.toDate();
      return creado && 
             creado.getMonth() === mesAnterior &&
             creado.getFullYear() === anoAnterior;
    }).length;

    // Calcular Tendencia
    let tendenciaLeads = "0%";
    if (enMesAnterior === 0) {
      if (enEsteMes > 0) tendenciaLeads = "+100%";
    } else {
      const diff = ((enEsteMes - enMesAnterior) / enMesAnterior) * 100;
      tendenciaLeads = `${diff >= 0 ? '+' : ''}${Math.round(diff)}%`;
    }

    // Se considera convertido si está en la etapa 'Cerrados' o marcado como convertido
    const convertidos = leads.filter(l => {
      const etapa = etapas.find(e => e.id === l.etapaId);
      return l.convertidoAContacto || etapa?.nombre === 'Cerrados';
    }).length;

    const tasaCierre = leads.length > 0 ? Math.round((convertidos / leads.length) * 100) : 0;

    return { nuevosHoy, enEsteMes, enMesAnterior, tendenciaLeads, convertidos, tasaCierre };
  }, [leads, etapas]);

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

    // 1. Buscar si soltamos directamente sobre una columna (etapa)
    let destinationStageId = etapas.find(e => e.id === overId)?.id;

    // 2. Si no, buscar si soltamos sobre otra card (obtener su etapa)
    if (!destinationStageId) {
      const overLead = leads.find(l => l.id === overId);
      if (overLead) {
        destinationStageId = overLead.etapaId;
      }
    }

    if (destinationStageId) {
      const lead = leads.find(l => l.id === leadId);
      if (lead && lead.etapaId !== destinationStageId) {
        try {
          const leadRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId!, COLLECTIONS.LEADS, leadId);
          await updateDoc(leadRef, {
            etapaId: destinationStageId,
            actualizadoEl: serverTimestamp()
          });
          toast.success(`Lead movido de etapa`);
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
        etiquetas: lead.origen === 'meta_ads' ? ['lead-meta-ads'] : ['lead-organico'],
        leadOrigenId: lead.id,
        origenCampana: lead.campana || null,
        origenFormulario: lead.formulario || null,
        camposFormulario: lead.camposFormulario || {},
        notas: lead.notas || '',
        creadoEl: serverTimestamp(),
      };

      const contactoRef = await addDoc(
        collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS),
        contactoData
      );

      // 2. Marcar lead como convertido
      const leadRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId!, COLLECTIONS.LEADS, lead.id);
      await updateDoc(leadRef, {
        convertidoAContacto: true,
        contactoId: contactoRef.id,
        actualizadoEl: serverTimestamp()
      });

      toast.success("Lead convertido a contacto CRM", { 
        id: toastId,
        action: {
          label: "Ver contacto →",
          onClick: () => router.push(`/dashboard/operacion/contactos`)
        },
        duration: 6000,
      });
      setSelectedLeadId(null);
    } catch (err) {
      console.error("Error al convertir lead:", err);
      toast.error("Error al convertir el lead", { id: toastId });
    } finally {
      setConverting(false);
    }
  };

  const handleAddStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspaceId || !newStageName || isSavingStage) return;

    setIsSavingStage(true);
    try {
      await addDoc(
        collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.ETAPAS_EMBUDO),
        {
          nombre: newStageName,
          color: newStageColor,
          orden: etapas.length,
          esDefault: false,
          creadoEl: serverTimestamp()
        }
      );
      toast.success("Nueva etapa añadida al embudo");
      setIsNewStageModalOpen(false);
      setNewStageName("");
      setNewStageColor("#3B82F6");
    } catch (err) {
      toast.error("Error al crear la etapa");
    } finally {
      setIsSavingStage(false);
    }
  };

  const handleUpdateStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspaceId || !editingStage || !newStageName || isSavingStage) return;

    setIsSavingStage(true);
    try {
      const stageRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId!, COLLECTIONS.ETAPAS_EMBUDO, editingStage.id);
      await updateDoc(stageRef, {
        nombre: newStageName,
        color: newStageColor,
        actualizadoEl: serverTimestamp()
      });
      toast.success("Etapa actualizada");
      setEditingStage(null);
      setNewStageName("");
      setNewStageColor("#3B82F6");
    } catch (err) {
      toast.error("Error al actualizar la etapa");
    } finally {
      setIsSavingStage(false);
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    // Verificar si es la última etapa
    if (etapas.length === 1) {
      toast.error("No puedes eliminar la última etapa del embudo.");
      return;
    }

    // Verificar si hay leads en esta etapa
    const leadsInStage = leads.filter(l => l.etapaId === stageId);
    if (leadsInStage.length > 0) {
      toast.error("No puedes borrar una etapa que tiene leads. Muévelos a otra etapa primero.");
      return;
    }

    if (!confirm("¿Estás seguro de que quieres eliminar esta etapa?")) return;

    try {
      await deleteDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId!, COLLECTIONS.ETAPAS_EMBUDO, stageId));
      toast.success("Etapa eliminada");
    } catch (err) {
      toast.error("Error al eliminar la etapa");
    }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspaceId || !newLeadData.nombre || isSavingLead) return;

    setIsSavingLead(true);
    try {
      await addDoc(
        collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.LEADS),
        {
          ...newLeadData,
          origen: 'manual',
          convertidoAContacto: false,
          creadoEl: serverTimestamp(),
          actualizadoEl: serverTimestamp()
        }
      );
      toast.success("Lead creado manualmente");
      setIsNewLeadModalOpen(false);
    } catch (err) {
      toast.error("Error al crear el lead");
    } finally {
      setIsSavingLead(false);
    }
  };

  const handleUpdateLeadField = async (leadId: string, field: string, value: any) => {
    if (!currentWorkspaceId) return;
    try {
      const leadRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId!, COLLECTIONS.LEADS, leadId);
      await updateDoc(leadRef, {
        [field]: value,
        actualizadoEl: serverTimestamp()
      });
      // toast.success("Información actualizada"); // Demasiado ruido para auto-save
    } catch (err) {
      toast.error("Error al guardar cambios");
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
    <>
      {isMobile ? (
        <MobileLeadList 
          leads={leads}
          etapas={etapas}
          onSelect={(lead) => setSelectedLeadId(lead.id)}
          onNewLead={() => setIsNewLeadModalOpen(true)}
          onConvert={handleConvertLead}
          onWhatsApp={handleStartWhatsApp}
        />
      ) : (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
          {/* HEADER & METRICAS */}
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[var(--accent)] mb-1">
                  <Target className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Leads & Funnel</span>
                </div>
                <h1 className="text-2xl font-bold text-[var(--text-primary-light)] tracking-tight">Gestión de Prospectos</h1>
                <p className="text-sm text-[var(--text-tertiary-light)] font-medium">Convierte leads de Meta Ads y orgánicos en clientes.</p>
              </div>

              <div className="flex items-center gap-1 bg-[var(--bg-input)] p-1 rounded-xl border border-[var(--border-light)] shadow-sm">
                <button 
                  onClick={() => setView('kanban')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all",
                    view === 'kanban' 
                      ? "bg-white text-[var(--text-primary-light)] shadow-sm" 
                      : "text-[var(--text-tertiary-light)] hover:text-[var(--text-secondary-light)]"
                  )}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Kanban
                </button>
                <button 
                  onClick={() => setView('list')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all",
                    view === 'list' 
                      ? "bg-white text-[var(--text-primary-light)] shadow-sm" 
                      : "text-[var(--text-tertiary-light)] hover:text-[var(--text-secondary-light)]"
                  )}
                >
                  <List className="w-3.5 h-3.5" />
                  Lista
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <MetricCard title="Leads este mes" value={metrics.enEsteMes} icon={Users} trend={metrics.tendenciaLeads} color="blue" />
              <MetricCard title="Nuevos hoy" value={metrics.nuevosHoy} icon={Clock} trend="Nuevo" color="orange" />
              <MetricCard title="Convertidos" value={metrics.convertidos} icon={CheckCircle2} color="green" />
              <MetricCard title="Tasa de Cierre" value={`${metrics.tasaCierre}%`} icon={TrendingUp} color="purple" />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary-light)]" />
              <Input 
                placeholder="Buscar prospectos..." 
                className="pl-10 h-11 bg-[var(--bg-input)] border-transparent rounded-2xl focus:border-[var(--accent-active)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all text-sm font-medium"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="flex gap-1.5 p-1 bg-[var(--bg-input)] rounded-2xl border border-[var(--border-light)]/50">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'meta_ads', label: 'Meta Ads' },
                { id: 'organico', label: 'Orgánico' },
                { id: 'manual', label: 'Manual' }
              ].map(pill => (
                <button
                  key={pill.id}
                  onClick={() => setFiltroOrigen(pill.id as any)}
                  className={cn(
                    "px-4 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2",
                    filtroOrigen === pill.id 
                      ? "bg-white text-[var(--text-primary-light)] shadow-sm" 
                      : "text-[var(--text-tertiary-light)] hover:text-[var(--text-secondary-light)]"
                  )}
                >
                  {pill.label}
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-full text-[9px] font-black transition-colors",
                    filtroOrigen === pill.id ? "bg-[var(--accent)] text-[var(--accent-text)]" : "bg-black/5 text-[var(--text-tertiary-light)]"
                  )}>
                    {pill.id === 'todos' ? leads.length : leads.filter(l => l.origen === pill.id).length}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  setNewLeadData({
                    nombre: "",
                    email: "",
                    telefono: "",
                    etapaId: etapas[0]?.id || "",
                    temperatura: "frio",
                    notas: ""
                  });
                  setIsNewLeadModalOpen(true);
                }}
                className="h-11 rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] shadow-lg shadow-[var(--accent)]/20 font-black text-[10px] uppercase tracking-widest gap-2 px-6 transition-all"
              >
                <Plus className="w-4 h-4" /> Nuevo Lead
              </Button>
            </div>
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
                      onSelected={(lead: any) => setSelectedLeadId(lead.id)}
                      onEdit={(e) => {
                        setEditingStage(e);
                        setNewStageName(e.nombre);
                        setNewStageColor(e.color);
                      }}
                      onDelete={handleDeleteStage}
                    />
                  ))}
                  
                  {/* Botón Nueva Etapa */}
                  <div 
                    onClick={() => setIsNewStageModalOpen(true)}
                    className="w-80 h-[200px] border-2 border-dashed border-[var(--border-light)] rounded-3xl flex flex-col items-center justify-center p-6 text-center space-y-3 shrink-0 opacity-60 hover:opacity-100 transition-all cursor-pointer bg-white/30"
                  >
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
                      <th className="p-4 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--text-tertiary-light)]">Lead</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--text-tertiary-light)]">Origen</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--text-tertiary-light)]">Etapa</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--text-tertiary-light)]">Temperatura</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--text-tertiary-light)]">Creado</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--text-tertiary-light)]">Actividad</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--text-tertiary-light)]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-light)]">
                      {filteredLeads.map(lead => (
                        <tr 
                          key={lead.id} 
                          className="hover:bg-[var(--bg-main)]/50 transition-colors group cursor-pointer"
                          onClick={() => setSelectedLeadId(lead.id)}
                        >
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-[var(--text-primary-light)]">{lead.nombre}</span>
                            {lead.telefono ? (
                              <div onClick={(e) => e.stopPropagation()}>
                                <PhoneActionMenu 
                                  phoneNumber={lead.telefono} 
                                  contactoId={lead.contactoId} 
                                  nombre={lead.nombre} 
                                  className="text-[11px] text-[var(--text-tertiary-light)]"
                                />
                              </div>
                            ) : (
                              <span className="text-[11px] text-[var(--text-tertiary-light)]">{lead.email || "Sin contacto"}</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider",
                            lead.origen === 'meta_ads' 
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                              : lead.origen === 'organico' 
                                ? "bg-blue-50 border-blue-200 text-blue-600" 
                                : "bg-[var(--bg-input)] border-[var(--border-light)] text-[var(--text-tertiary-light)]"
                          )}>
                            {lead.origen === 'meta_ads' ? 'Meta Ads' : lead.origen === 'organico' ? 'Orgánico' : 'Manual'}
                          </span>
                        </td>
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                          <Select 
                            value={lead.etapaId} 
                            onValueChange={(val) => handleUpdateLeadField(lead.id, 'etapaId', val)}
                          >
                            <SelectTrigger className="h-8 border-transparent hover:border-input bg-transparent shadow-none px-2 font-semibold text-xs gap-2">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: etapas.find(e => e.id === lead.etapaId)?.color || '#ccc' }} />
                              <span className="truncate">
                                {etapas.find(e => e.id === lead.etapaId)?.nombre || "Sin etapa"}
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              {etapas.map(e => (
                                <SelectItem key={e.id} value={e.id}>
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
                                    {e.nombre}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-4">
                           <TemperatureDot temperature={lead.temperatura} />
                        </td>
                        <td className="p-4 text-xs font-medium text-[var(--text-secondary-light)]">
                          {lead.creadoEl ? formatDistanceToNow(lead.creadoEl.toDate(), { addSuffix: true, locale: es }) : 'Recién creado'}
                        </td>
                        <td className="p-4 text-xs font-medium text-[var(--text-tertiary-light)]">
                          {lead.actualizadoEl ? formatDistanceToNow(lead.actualizadoEl.toDate(), { addSuffix: true, locale: es }) : '-'}
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
        </div>
      )}

      {/* PANEL DE DETALLE */}
      {selectedLeadId && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" 
            onClick={() => setSelectedLeadId(null)}
          />
          <div className="relative w-full max-w-[480px] h-full bg-white shadow-2xl animate-in slide-in-from-right duration-500 overflow-y-auto custom-scrollbar">
            {selectedLead && (
              <LeadDetailContent 
                lead={selectedLead} 
                etapas={etapas} 
                onClose={() => setSelectedLeadId(null)}
                onConvert={() => handleConvertLead(selectedLead)}
                onWhatsApp={() => handleStartWhatsApp(selectedLead)}
                onUpdateField={(field: string, val: any) => handleUpdateLeadField(selectedLead.id, field, val)}
                converting={converting}
              />
            )}
          </div>
        </div>
      )}

      {/* MODAL NUEVA ETAPA */}
      <Dialog open={isNewStageModalOpen} onOpenChange={setIsNewStageModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Etapa del Embudo</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleAddStage} className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[11px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest ml-1">Nombre de la etapa</Label>
              <Input 
                id="name"
                placeholder="Ej: Negociación, Visita..." 
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                required
                className="bg-[var(--bg-input)] border-[var(--border-light)] focus:border-[var(--accent-active)] focus:ring-2 focus:ring-[var(--accent)]/20 rounded-xl h-11 text-sm font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color" className="text-[11px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest ml-1">Color identificador</Label>
              <div className="flex items-center gap-4">
                <input 
                  id="color"
                  type="color" 
                  value={newStageColor}
                  onChange={(e) => setNewStageColor(e.target.value)}
                  className="w-12 h-12 rounded-xl border-0 cursor-pointer bg-transparent"
                />
                <span className="text-[10px] font-black tabular-nums text-[var(--text-tertiary-light)]">{newStageColor.toUpperCase()}</span>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <DialogClose render={<Button type="button" variant="ghost" className="rounded-xl" />}>
                Cancelar
              </DialogClose>
              <Button 
                type="submit" 
                disabled={isSavingStage || !newStageName}
                className="bg-[var(--accent)] text-[var(--accent-text)] hover:bg-[var(--accent-hover)] rounded-xl px-8 font-bold"
              >
                {isSavingStage ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear Etapa"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL EDITAR ETAPA */}
      <Dialog open={!!editingStage} onOpenChange={(open) => !open && setEditingStage(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Etapa</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleUpdateStage} className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre de la etapa</Label>
              <Input 
                id="edit-name"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                required
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-color">Color identificador</Label>
              <div className="flex items-center gap-4">
                <input 
                  id="edit-color"
                  type="color" 
                  value={newStageColor}
                  onChange={(e) => setNewStageColor(e.target.value)}
                  className="w-12 h-12 rounded-xl border-0 cursor-pointer bg-transparent"
                />
                <span className="text-xs font-mono text-[var(--text-tertiary-light)]">{newStageColor.toUpperCase()}</span>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <DialogClose render={<Button type="button" variant="ghost" className="rounded-xl" />}>
                Cancelar
              </DialogClose>
              <Button 
                type="submit" 
                disabled={isSavingStage || !newStageName}
                className="bg-[var(--accent)] text-[var(--accent-text)] hover:bg-[var(--accent-hover)] rounded-xl px-8 font-bold"
              >
                {isSavingStage ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL NUEVO LEAD MANUAL */}
      <Dialog open={isNewLeadModalOpen} onOpenChange={setIsNewLeadModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cargar Lead Manual</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleAddLead} className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Nombre completo</Label>
              <Input 
                placeholder="Nombre del prospecto" 
                value={newLeadData.nombre}
                onChange={(e) => setNewLeadData(prev => ({ ...prev, nombre: e.target.value }))}
                required
                className="h-12 rounded-2xl bg-slate-50/50 border-slate-100 text-sm font-bold focus:bg-white transition-all shadow-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Teléfono</Label>
                <Input 
                  placeholder="Ej: +54..." 
                  value={newLeadData.telefono}
                  onChange={(e) => setNewLeadData(prev => ({ ...prev, telefono: e.target.value }))}
                  className="h-12 rounded-2xl bg-slate-50/50 border-slate-100 text-sm font-bold focus:bg-white transition-all shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Email</Label>
                <Input 
                  type="email"
                  placeholder="prospecto@mail.com" 
                  value={newLeadData.email}
                  onChange={(e) => setNewLeadData(prev => ({ ...prev, email: e.target.value }))}
                  className="h-12 rounded-2xl bg-slate-50/50 border-slate-100 text-sm font-bold focus:bg-white transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Etapa Inicial</Label>
              <Select
                value={newLeadData.etapaId}
                onValueChange={(v) => setNewLeadData(prev => ({ ...prev, etapaId: v || "" }))}
              >
                <SelectTrigger className="h-12 rounded-2xl bg-slate-50/50 border-slate-100 text-sm font-bold focus:ring-1 focus:ring-[var(--accent)] transition-all">
                  {(() => {
                    const etapa = etapas.find(e => e.id === newLeadData.etapaId);
                    if (!etapa) return <span className="text-slate-400 font-normal">Seleccionar etapa...</span>;
                    return (
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: etapa.color }} />
                        <span>{etapa.nombre}</span>
                      </div>
                    );
                  })()}
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                  {etapas.map(e => (
                    <SelectItem key={e.id} value={e.id || ""} className="rounded-xl font-bold py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full" style={{ backgroundColor: e.color }} />
                        {e.nombre}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Temperatura inicial</Label>
              <div className="flex gap-2">
                {(['frio', 'tibio', 'caliente'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewLeadData(prev => ({ ...prev, temperatura: t }))}
                    className={cn(
                      "flex-1 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest border transition-all duration-300",
                      newLeadData.temperatura === t 
                        ? "bg-[var(--accent)] text-slate-900 border-[var(--accent)] shadow-md scale-[1.02]" 
                        : "bg-slate-50/50 text-slate-400 border-slate-100 hover:bg-white"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Notas internas</Label>
              <textarea 
                placeholder="Observaciones iniciales sobre el prospecto..." 
                value={newLeadData.notas}
                onChange={(e) => setNewLeadData(prev => ({ ...prev, notas: e.target.value }))}
                className="w-full min-h-[100px] bg-slate-50/50 border border-slate-100 rounded-2xl p-4 text-sm font-medium focus:bg-white focus:ring-1 focus:ring-[var(--accent)] outline-none resize-none transition-all shadow-sm"
              />
            </div>

            <DialogFooter className="pt-4">
              <DialogClose render={<Button type="button" variant="ghost" className="h-9 px-4 text-xs font-bold text-[var(--text-secondary-light)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary-light)] rounded-xl transition-colors" />}>
                Cancelar
              </DialogClose>
              <Button 
                type="submit" 
                disabled={isSavingLead || !newLeadData.nombre}
                className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] h-9 px-8 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-xl shadow-[var(--accent)]/20 transition-all"
              >
                {isSavingLead ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear Lead"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MetricCard({ title, value, icon: Icon, trend, color }: any) {
  const colorStyles: any = {
    blue: "bg-blue-50 border-blue-100 text-blue-600",
    orange: "bg-amber-50 border-amber-100 text-amber-600",
    green: "bg-emerald-50 border-emerald-100 text-emerald-600",
    purple: "bg-purple-50 border-purple-100 text-purple-600",
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-[var(--border-light)] flex items-center justify-between group hover:border-[var(--accent)] hover:shadow-md transition-all">
      <div className="space-y-1">
        <p className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-[0.1em]">{title}</p>
        <div className="flex items-baseline gap-2">
           <h3 className="text-2xl font-bold text-[var(--text-primary-light)] tracking-tight">{value}</h3>
           {trend && (
             <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-[9px] font-black text-emerald-700 uppercase tracking-wider">
               {trend}
             </span>
           )}
        </div>
      </div>
      <div className={cn(
        "w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 border shadow-sm", 
        colorStyles[color]
      )}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}

function KanbanColumn({ etapa, leads, onSelected, onEdit, onDelete }: { etapa: EtapaEmbudo & { id: string }, leads: (Lead & { id: string })[], onSelected: (l: any) => void, onEdit: (e: any) => void, onDelete: (id: string) => void }) {
  const { setNodeRef } = useDroppable({
    id: etapa.id,
  });

  return (
    <div className="w-80 shrink-0 flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: etapa.color }} />
          <h3 className="text-[11px] font-black text-[var(--text-primary-light)] uppercase tracking-widest flex items-center gap-2">
            {etapa.nombre}
            <span className="text-[10px] font-black text-[var(--text-tertiary-light)] bg-[var(--bg-input)] px-2.5 py-0.5 rounded-full border border-[var(--border-light)]">
              {leads.length}
            </span>
          </h3>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
              <MoreVertical className="w-3.5 h-3.5 text-[var(--text-tertiary-light)]" />
            </Button>
          } />
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onEdit(etapa)}>
              Editar Etapa
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              variant="destructive" 
              onClick={() => onDelete(etapa.id)}
              disabled={etapa.esDefault}
            >
              Borrar Etapa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div 
        ref={setNodeRef}
        className="flex-1 min-h-[500px] bg-[var(--bg-input)]/40 rounded-2xl p-3 space-y-3 border border-[var(--border-light)]/50"
      >
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map(lead => (
            <LeadCard key={lead.id} lead={lead} onClick={() => onSelected(lead)} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

function LeadCard({ lead, onClick }: { lead: Lead & { id: string }, onClick: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "bg-white p-4 rounded-2xl border border-[var(--border-light)] shadow-sm hover:shadow-md hover:border-[var(--accent)] transition-all cursor-pointer group animate-in slide-in-from-bottom-2 duration-300 touch-none",
        isDragging && "z-50 shadow-2xl rotate-2"
      )}
    >
      <div className="flex justify-between items-start mb-2">
         <span className={cn(
            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wider",
            lead.origen === 'meta_ads' 
              ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
              : lead.origen === 'organico' 
                ? "bg-blue-50 border-blue-200 text-blue-600" 
                : "bg-[var(--bg-input)] border-[var(--border-light)] text-[var(--text-tertiary-light)]"
          )}>
            {lead.origen === 'meta_ads' ? 'Meta Ads' : lead.origen === 'organico' ? 'Orgánico' : 'Manual'}
          </span>
          <TemperatureDot temperature={lead.temperatura} />
      </div>

      <div className="space-y-1">
        <h4 className="text-sm font-bold text-[var(--text-primary-light)] leading-tight">{lead.nombre}</h4>
        <p className="text-[11px] font-medium text-[var(--text-tertiary-light)] truncate">
          {lead.campana || lead.telefono || "Sin origen"}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--border-light)] flex items-center justify-between">
        <span className="text-[10px] font-semibold text-[var(--text-tertiary-light)] tabular-nums uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {lead.creadoEl ? formatDistanceToNow(lead.creadoEl.toDate(), { addSuffix: true, locale: es }) : 'Hace un momento'}
        </span>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-1.5 hover:bg-[var(--bg-input)] text-[var(--text-secondary-light)] hover:text-[var(--text-primary-light)] rounded-lg transition-colors">
            <MessageCircle className="w-4 h-4" />
          </button>
          <button className="p-1.5 hover:bg-[var(--bg-input)] text-[var(--text-secondary-light)] hover:text-[var(--text-primary-light)] rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function LeadDetailContent({ lead, etapas, onClose, onConvert, onWhatsApp, onUpdateField, converting }: any) {
  const router = useRouter();
  const { currentWorkspaceId } = useWorkspaceStore();

  // Historial de notas
  const [notasHistorial, setNotasHistorial] = useState<any[]>([]);
  const [nuevaNota, setNuevaNota] = useState("");
  const [guardandoNota, setGuardandoNota] = useState(false);

  // Edición inline de campos de contacto
  const [editingField, setEditingField] = useState<'telefono' | 'email' | null>(null);
  const [editFieldValue, setEditFieldValue] = useState("");

  useEffect(() => {
    if (!currentWorkspaceId || !lead?.id) return;
    const notasRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.LEADS, lead.id, "notasLead");
    const q = query(notasRef, orderBy("creadoEl", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setNotasHistorial(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [currentWorkspaceId, lead?.id]);

  const handleAddNota = async () => {
    if (!currentWorkspaceId || !nuevaNota.trim() || !lead?.id) return;
    setGuardandoNota(true);
    try {
      const notasRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.LEADS, lead.id, "notasLead");
      await addDoc(notasRef, { texto: nuevaNota.trim(), creadoEl: serverTimestamp() });
      setNuevaNota("");
    } catch {
      toast.error("Error al guardar la nota");
    } finally {
      setGuardandoNota(false);
    }
  };

  const handleStartEdit = (field: 'telefono' | 'email') => {
    setEditFieldValue(lead[field] || "");
    setEditingField(field);
  };

  const handleSaveField = async (field: 'telefono' | 'email') => {
    await onUpdateField(field, editFieldValue.trim());
    setEditingField(null);
  };

  const handleStartWhatsApp = () => {
    if (!lead.telefono) { toast.error("Este lead no tiene número de teléfono"); return; }
    if (lead.contactoId) {
      router.push(`/dashboard/operacion/inbox?contactoId=${lead.contactoId}`);
    } else {
      toast.info("Primero convertí el lead a contacto para iniciar una conversación.");
    }
  };

  const etapaActual = etapas.find((e: any) => e.id === lead.etapaId);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)]">
      {/* Header */}
      <div className="p-6 bg-white border-b border-[var(--border-light)]">
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[var(--text-primary-light)] tracking-tight">{lead.nombre}</h2>
            <div className="flex items-center gap-2">
              <span className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider",
                lead.origen === 'meta_ads'
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : lead.origen === 'organico'
                    ? "bg-blue-50 border-blue-200 text-blue-600"
                    : "bg-[var(--bg-input)] border-[var(--border-light)] text-[var(--text-tertiary-light)]"
              )}>
                {lead.origen === 'meta_ads' ? 'Meta Ads' : lead.origen === 'organico' ? 'Orgánico' : 'Manual'}
              </span>

              <Select value={lead.etapaId} onValueChange={(val) => onUpdateField('etapaId', val)}>
                <SelectTrigger className="h-7 text-[10px] font-bold border-[var(--border-light)] rounded-full px-3 w-auto bg-transparent">
                  <div className="flex items-center gap-1.5">
                    {etapaActual && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: etapaActual.color }} />}
                    <span>{etapaActual?.nombre || "Sin etapa"}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {etapas.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
                        {e.nombre}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <Plus className="w-5 h-5 rotate-45 text-[var(--text-tertiary-light)]" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <Button onClick={handleStartWhatsApp} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-black text-[10px] uppercase tracking-widest rounded-xl h-12 shadow-xl shadow-[var(--accent)]/20 transition-all">
            <MessageCircle className="w-4 h-4 mr-2" /> Inbox WA
          </Button>
          <Button
            onClick={lead.convertidoAContacto ? () => router.push(`/dashboard/operacion/contactos`) : onConvert}
            disabled={converting}
            variant="outline"
            className="h-12 px-4 bg-[var(--bg-card)] border-[var(--border-light)] text-[var(--text-primary-light)] font-bold text-xs hover:bg-[var(--bg-input)] hover:border-[var(--border-light-strong)] transition-colors rounded-xl"
          >
            {converting
              ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
              : lead.convertidoAContacto
                ? <ExternalLink className="w-4 h-4 mr-2 text-emerald-600" />
                : <TrendingUp className="w-4 h-4 mr-2 text-blue-600" />
            }
            {lead.convertidoAContacto ? 'Ver en CRM' : 'Convertir'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Info de contacto */}
        <Section title="Información de Contacto">
          <div className="space-y-3">
            {/* Teléfono editable */}
            <div className="flex justify-between items-center py-1 border-b border-[var(--border-light)]/30 gap-2">
              <span className="text-xs font-medium text-[var(--text-tertiary-light)] shrink-0">Teléfono</span>
              {editingField === 'telefono' ? (
                <div className="flex items-center gap-1.5 flex-1 justify-end">
                  <input
                    autoFocus
                    type="tel"
                    value={editFieldValue}
                    onChange={e => setEditFieldValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveField('telefono'); if (e.key === 'Escape') setEditingField(null); }}
                    className="flex-1 max-w-[160px] text-xs font-bold border border-[var(--accent)]/40 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-[var(--accent)]/50"
                  />
                  <button onClick={() => handleSaveField('telefono')} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setEditingField(null)} className="p-1 text-red-400 hover:bg-red-50 rounded"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {lead.telefono
                    ? <PhoneActionMenu phoneNumber={lead.telefono} contactoId={lead.contactoId} nombre={lead.nombre} className="text-xs font-bold" />
                    : <span className="text-xs font-bold text-[var(--text-tertiary-light)]">No especificado</span>
                  }
                  <button onClick={() => handleStartEdit('telefono')} className="p-1 hover:bg-[var(--bg-input)] rounded text-[var(--text-tertiary-light)] hover:text-[var(--accent)] transition-colors">
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Email editable */}
            <div className="flex justify-between items-center py-1 border-b border-[var(--border-light)]/30 gap-2">
              <span className="text-xs font-medium text-[var(--text-tertiary-light)] shrink-0">Email</span>
              {editingField === 'email' ? (
                <div className="flex items-center gap-1.5 flex-1 justify-end">
                  <input
                    autoFocus
                    type="email"
                    value={editFieldValue}
                    onChange={e => setEditFieldValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveField('email'); if (e.key === 'Escape') setEditingField(null); }}
                    className="flex-1 max-w-[180px] text-xs font-bold border border-[var(--accent)]/40 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-[var(--accent)]/50"
                  />
                  <button onClick={() => handleSaveField('email')} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setEditingField(null)} className="p-1 text-red-400 hover:bg-red-50 rounded"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--text-primary-light)]">{lead.email || "No especificado"}</span>
                  <button onClick={() => handleStartEdit('email')} className="p-1 hover:bg-[var(--bg-input)] rounded text-[var(--text-tertiary-light)] hover:text-[var(--accent)] transition-colors">
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
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
            <TempButton active={lead.temperatura === 'frio'} type="frio" label="Frío" onClick={() => onUpdateField('temperatura', 'frio')} />
            <TempButton active={lead.temperatura === 'tibio'} type="tibio" label="Tibio" onClick={() => onUpdateField('temperatura', 'tibio')} />
            <TempButton active={lead.temperatura === 'caliente'} type="caliente" label="Caliente" onClick={() => onUpdateField('temperatura', 'caliente')} />
          </div>
        </Section>

        {/* Notas — historial */}
        <Section title="Notas internas">
          <div className="space-y-3">
            {/* Nota heredada del campo legacy */}
            {lead.notas && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <StickyNote className="w-3 h-3" /> Nota inicial
                </p>
                <p className="text-[13px] text-amber-900 leading-relaxed whitespace-pre-wrap">{lead.notas}</p>
              </div>
            )}

            {/* Historial de notas */}
            {notasHistorial.map(nota => (
              <div key={nota.id} className="bg-white border border-[var(--border-light)] rounded-xl p-3 shadow-sm">
                <p className="text-[9px] font-bold text-[var(--text-tertiary-light)] uppercase tracking-widest mb-1.5">
                  {nota.creadoEl?.toDate ? format(nota.creadoEl.toDate(), "d MMM yyyy · HH:mm", { locale: es }) : ""}
                </p>
                <p className="text-[13px] text-[var(--text-secondary-light)] leading-relaxed whitespace-pre-wrap">{nota.texto}</p>
              </div>
            ))}

            {!lead.notas && notasHistorial.length === 0 && (
              <p className="text-xs text-[var(--text-tertiary-light)] italic text-center py-3">Sin notas todavía</p>
            )}

            {/* Nueva nota */}
            <div className="space-y-2 pt-1">
              <textarea
                className="w-full min-h-[80px] bg-white border border-[var(--border-light)] rounded-xl p-3 text-sm focus:ring-1 focus:ring-[var(--accent)] outline-none resize-none transition-all"
                placeholder="Escribí una nueva nota..."
                value={nuevaNota}
                onChange={e => setNuevaNota(e.target.value)}
              />
              <Button
                size="sm"
                onClick={handleAddNota}
                disabled={!nuevaNota.trim() || guardandoNota}
                className="h-8 text-[11px] font-black bg-[var(--accent)] text-[var(--accent-text)] hover:opacity-90 gap-1.5"
              >
                {guardandoNota ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Guardar nota
              </Button>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary-light)] ml-1">{title}</h3>
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

function TempButton({ active, type, label, onClick }: any) {
  const colors: any = {
    frio: active ? "bg-blue-500 text-slate-900" : "text-blue-500 bg-white border-blue-100 hover:bg-blue-50",
    tibio: active ? "bg-orange-500 text-slate-900" : "text-orange-500 bg-white border-orange-100 hover:bg-orange-50",
    caliente: active ? "bg-red-500 text-slate-900" : "text-red-500 bg-white border-red-100 hover:bg-red-50",
  };
  
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex-1 py-3 px-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all duration-300",
        colors[type],
        active ? "shadow-lg scale-[1.05] z-10" : "opacity-60"
      )}
    >
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
