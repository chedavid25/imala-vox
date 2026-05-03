"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useContactos } from "@/hooks/useContactos";
import { db, auth } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc,
  setDoc,
  Timestamp, 
  deleteDoc 
} from "firebase/firestore";
import { COLLECTIONS, TareaCRM, Contacto } from "@/lib/types/firestore";
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  Circle, 
  MoreVertical, 
  Trash2, 
  Pencil, 
  ChevronRight,
  User,
  AlertCircle,
  Check,
  RefreshCw,
  Repeat,
  X,
  LayoutGrid,
  List
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { format, isToday, isWithinInterval, addDays, startOfToday, endOfToday, isAfter, isBefore, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Nuevos componentes de vista
import { TaskCard } from "@/components/crm/tasks/TaskCard";
import { TaskCanvasView } from "@/components/crm/tasks/TaskCanvasView";
import { TaskCalendarView } from "@/components/crm/tasks/TaskCalendarView";
import { ModalNuevaTarea } from "@/components/crm/tasks/ModalNuevaTarea";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import { MobileTaskList } from "@/components/mobile/crm/MobileTaskList";

type FilterType = 'hoy' | 'semana' | 'mes' | 'atrasadas' | 'completadas' | 'todas';

export default function TareasPage() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const { contactos } = useContactos();
  const isMobile = useMobileLayout();
  
  const [tareas, setTareas] = useState<TareaCRM[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('hoy');
  const [searchTerm, setSearchTerm] = useState("");
  
  // Nuevos estados de visualización
  const [viewMode, setViewMode] = useState<'lista' | 'canvas' | 'calendario'>('lista');
  const [canvasGrouping, setCanvasGrouping] = useState<'prioridad' | 'estado'>('estado');
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month');
  
  // Estado para nueva tarea / edición
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<TareaCRM | null>(null);
  const [initialDate, setInitialDate] = useState<string | undefined>(undefined);

  // Escuchar tareas del workspace
  useEffect(() => {
    if (!currentWorkspaceId) return;

    setLoading(true);
    const tareasRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, "tareasCRM");
    const q = query(tareasRef, orderBy("fecha", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tareasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TareaCRM[];
      setTareas(tareasData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentWorkspaceId]);

  // Filtrado de tareas
  const filteredTareas = useMemo(() => {
    return tareas.filter(t => {
      const matchesSearch = t.titulo.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      const now = new Date();
      const taskDateTime = new Date(`${t.fecha}T${t.hora || '00:00'}:00`);

      if (activeFilter === 'completadas') return t.estado === 'completada';
      if (t.estado === 'completada' && activeFilter !== 'todas') return false;

      switch (activeFilter) {
        case 'hoy': return t.fecha === format(now, "yyyy-MM-dd");
        case 'semana': return isWithinInterval(parseISO(t.fecha), { start: startOfToday(), end: addDays(startOfToday(), 7) });
        case 'mes': return isWithinInterval(parseISO(t.fecha), { start: startOfToday(), end: addDays(startOfToday(), 30) });
        case 'atrasadas': return isBefore(taskDateTime, now) && t.estado !== 'completada';
        case 'todas': return true;
        default: return true;
      }
    });
  }, [tareas, activeFilter, searchTerm]);

  const handleQuickUpdate = async (taskId: string, updates: Partial<TareaCRM>) => {
    if (!currentWorkspaceId || !taskId) return;
    try {
      const taskRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, "tareasCRM", taskId);
      
      // Asegurar coherencia de flags
      const finalUpdates = { ...updates };
      if (updates.estado === 'completada') finalUpdates.completada = true;
      else if (updates.estado) finalUpdates.completada = false;
      
      await updateDoc(taskRef, {
        ...finalUpdates,
        actualizadoEl: Timestamp.now()
      });
      toast.success("Tarea actualizada");
    } catch (e) {
      console.error("Error al actualizar tarea:", e);
      toast.error("Error al actualizar");
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentWorkspaceId) return;
    try {
      const taskRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, "tareasCRM", id);
      await deleteDoc(taskRef);
      toast.info("Tarea eliminada");
    } catch (e) {
      toast.error("Error al eliminar");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--bg-main)]">
        <RefreshCw className="size-8 text-[var(--accent)] animate-spin" />
      </div>
    );
  }

  return (
    <>
      {isMobile ? (
        <MobileTaskList 
          tareas={tareas}
          onUpdate={handleQuickUpdate}
          onEdit={(t) => { setEditingTask(t); setIsAddingTask(true); }}
          onNewTask={() => { setEditingTask(null); setIsAddingTask(true); }}
        />
      ) : (
        <div className="flex h-full animate-in fade-in duration-500">
          {/* Sidebar de Filtros */}
          <aside className="w-64 border-r border-[var(--border-light)] bg-[var(--bg-card)] p-6 space-y-8 shrink-0 hidden md:block">
            <div>
              <h2 className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-[0.2em] mb-5 ml-1">Agenda</h2>
              <nav className="space-y-1">
                {[
                  { id: 'hoy', label: 'Para hoy', icon: CalendarIcon, color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-100' },
                  { id: 'semana', label: 'Esta semana', icon: Clock, color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-100' },
                  { id: 'mes', label: 'Este mes', icon: CalendarIcon, color: 'text-indigo-600', bgColor: 'bg-indigo-50 border-indigo-100' },
                  { id: 'atrasadas', label: 'Atrasadas', icon: AlertCircle, color: 'text-rose-600', bgColor: 'bg-rose-50 border-rose-100' },
                  { id: 'completadas', label: 'Completadas', icon: CheckCircle2, color: 'text-slate-500', bgColor: 'bg-slate-50 border-slate-200' },
                  { id: 'todas', label: 'Todo el historial', icon: Filter, color: 'text-slate-600', bgColor: 'bg-slate-50 border-slate-200' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveFilter(item.id as FilterType)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all group relative overflow-hidden",
                      activeFilter === item.id 
                        ? "bg-[var(--bg-input)]/80 text-[var(--text-primary-light)] shadow-sm before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[4px] before:bg-[var(--accent)] before:rounded-r" 
                        : "text-[var(--text-secondary-light)] hover:bg-[var(--bg-main)]"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "size-8 rounded-lg flex items-center justify-center border transition-transform group-hover:scale-110",
                        activeFilter === item.id ? "bg-[var(--accent)] border-[var(--accent)] shadow-sm" : item.bgColor
                      )}>
                        <item.icon className={cn("size-4", activeFilter === item.id ? "text-black" : item.color)} />
                      </div>
                      {item.label}
                    </div>
                    {item.id === 'atrasadas' && tareas.filter(t => isBefore(new Date(`${t.fecha}T${t.hora || '00:00'}:00`), new Date()) && t.estado !== 'completada').length > 0 && (
                      <span className="bg-rose-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black shadow-sm">
                        {tareas.filter(t => isBefore(new Date(`${t.fecha}T${t.hora || '00:00'}:00`), new Date()) && t.estado !== 'completada').length}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Area Principal */}
          <main className="flex-1 bg-[var(--bg-main)]/30 overflow-y-auto no-scrollbar flex flex-col">
            <header className="p-8 pb-4">
              <div className="flex items-center justify-between mb-8">
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold text-[var(--text-primary-light)] tracking-tight">Tareas del CRM</h1>
                  <p className="text-[13px] text-[var(--text-secondary-light)] font-medium">Gestiona tus recordatorios y compromisos comerciales.</p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-[var(--bg-input)] p-1 rounded-xl border border-[var(--border-light)] shadow-sm">
                    <button 
                      onClick={() => setViewMode('lista')}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all",
                        viewMode === 'lista' 
                          ? "bg-white text-[var(--text-primary-light)] shadow-sm" 
                          : "text-[var(--text-tertiary-light)] hover:text-[var(--text-secondary-light)]"
                      )}
                    >
                      <List className="size-4" /> 
                      Lista
                    </button>
                    <button 
                      onClick={() => setViewMode('canvas')}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all",
                        viewMode === 'canvas' 
                          ? "bg-white text-[var(--text-primary-light)] shadow-sm" 
                          : "text-[var(--text-tertiary-light)] hover:text-[var(--text-secondary-light)]"
                      )}
                    >
                      <LayoutGrid className="size-4" /> 
                      Canvas
                    </button>
                    <button 
                      onClick={() => setViewMode('calendario')}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all",
                        viewMode === 'calendario' 
                          ? "bg-white text-[var(--text-primary-light)] shadow-sm" 
                          : "text-[var(--text-tertiary-light)] hover:text-[var(--text-secondary-light)]"
                      )}
                    >
                      <CalendarIcon className="size-4" /> 
                      Calendario
                    </button>
                  </div>

                  {viewMode === 'canvas' && (
                    <Select value={canvasGrouping} onValueChange={(v:any) => setCanvasGrouping(v)}>
                      <SelectTrigger className="h-11 rounded-2xl border-none bg-slate-100/50 px-6 font-semibold text-slate-600 text-[13px] hover:bg-slate-100 transition-all">
                        <SelectValue placeholder="Agrupar por..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-none shadow-2xl bg-white p-2">
                        <SelectItem value="estado" className="rounded-xl py-3 px-4 font-semibold text-slate-700 focus:bg-slate-50">Estado</SelectItem>
                        <SelectItem value="prioridad" className="rounded-xl py-3 px-4 font-semibold text-slate-700 focus:bg-slate-50">Prioridad</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  <Button 
                    onClick={() => { setEditingTask(null); setIsAddingTask(true); }}
                    className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] h-11 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20 transition-all hover:scale-[1.02]"
                  >
                    <Plus className="size-4 mr-2" /> Nueva Tarea
                  </Button>
                </div>
              </div>
            </header>

            <section className="p-8 pt-4">
              {viewMode === 'lista' ? (
                <div className="flex-1 pb-12">
                  <div className="max-w-4xl mx-auto space-y-4">
                    {filteredTareas.length > 0 ? (
                      filteredTareas.map(task => (
                        <TaskCard 
                          key={task.id}
                          task={task} 
                          contactos={contactos}
                          onUpdate={handleQuickUpdate}
                          onEdit={(t) => { setEditingTask(t); setIsAddingTask(true); }}
                          onDelete={handleDelete}
                        />
                      ))
                    ) : (
                      <div className="h-[400px] flex flex-col items-center justify-center text-[var(--text-tertiary-light)] opacity-40">
                          <div className="size-16 rounded-[24px] bg-[var(--bg-input)] flex items-center justify-center mb-6">
                            <Check className="size-8" />
                          </div>
                          <p className="font-black uppercase tracking-[0.3em] text-[10px]">¡Todo al día!</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : viewMode === 'canvas' ? (
                <TaskCanvasView 
                  tareas={filteredTareas}
                  contactos={contactos}
                  grouping={canvasGrouping}
                  onTaskUpdate={handleQuickUpdate}
                  onEdit={(t) => { setEditingTask(t); setIsAddingTask(true); }}
                  onDelete={handleDelete}
                />
              ) : (
                <TaskCalendarView 
                  tareas={tareas}
                  viewMode={calendarView}
                  onViewModeChange={setCalendarView}
                  onAddTask={(date) => {
                    setInitialDate(date);
                    setEditingTask(null);
                    setIsAddingTask(true);
                  }}
                  onEditTask={(t) => { setEditingTask(t); setIsAddingTask(true); }}
                />
              )}
            </section>
          </main>
        </div>
      )}

      {/* Modal Unificado de Tareas */}
      <ModalNuevaTarea 
        open={isAddingTask}
        onOpenChange={setIsAddingTask}
        editingTask={editingTask}
        initialDate={initialDate}
        onSuccess={() => setInitialDate(undefined)}
      />
    </>
  );
}
