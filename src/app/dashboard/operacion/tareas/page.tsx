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
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger 
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

type FilterType = 'hoy' | 'semana' | 'mes' | 'atrasadas' | 'completadas' | 'todas';

import { useMobileLayout } from "@/hooks/useMobileLayout";
import { MobileTaskList } from "@/components/mobile/crm/MobileTaskList";

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
  const [taskForm, setTaskForm] = useState({
    titulo: "",
    fecha: format(new Date(), "yyyy-MM-dd"),
    hora: "09:00",
    prioridad: 'media' as 'baja' | 'media' | 'alta',
    contactoId: "",
    estado: 'pendiente' as 'pendiente' | 'proceso' | 'completada',
    completada: false,
    recurrencia: {
      tipo: 'ninguna' as 'diaria' | 'semanal' | 'intervalo' | 'ninguna',
      config: {
        diasSemana: [] as number[],
        intervaloDias: 1
      }
    }
  });

  const [searchContactTerm, setSearchContactTerm] = useState("");
  const filteredContacts = useMemo(() => {
    return (contactos || []).filter(c => 
      c.nombre.toLowerCase().includes(searchContactTerm.toLowerCase()) ||
      c.telefono.includes(searchContactTerm)
    );
  }, [contactos, searchContactTerm]);

  // Persistencia de preferencias por usuario
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!currentWorkspaceId || !uid) return;

    const loadPrefs = async () => {
      try {
        const prefRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.MIEMBROS, uid);
        const snap = await getDoc(prefRef);
        if (snap.exists() && snap.data().preferenciasTareas) {
          const p = snap.data().preferenciasTareas;
          if (p.viewMode) setViewMode(p.viewMode);
          if (p.canvasGrouping) setCanvasGrouping(p.canvasGrouping);
          if (p.calendarView) setCalendarView(p.calendarView);
        }
      } catch (e) {
        console.error("Error cargando preferencias:", e);
      }
    };
    loadPrefs();
  }, [currentWorkspaceId]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!currentWorkspaceId || !uid || loading) return;

    const savePrefs = async () => {
      try {
        const prefRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.MIEMBROS, uid);
        await setDoc(prefRef, {
          preferenciasTareas: { viewMode, canvasGrouping, calendarView }
        }, { merge: true });
      } catch (e) {
        console.error("Error guardando preferencias:", e);
      }
    };
    
    const timer = setTimeout(savePrefs, 1000);
    return () => clearTimeout(timer);
  }, [viewMode, canvasGrouping, calendarView, currentWorkspaceId, loading]);

  // Suscripción a tareas
  useEffect(() => {
    if (!currentWorkspaceId) return;

    const tareasRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, "tareasCRM");
    const q = query(tareasRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => {
        const data = d.data() as TareaCRM;
        // Parche de migración: si no tiene estado, lo derivamos de completada
        if (!data.estado) {
          data.estado = data.completada ? 'completada' : 'pendiente';
        }
        return { ...data, id: d.id };
      });
      // Ordenar en memoria por fecha de vencimiento
      docs.sort((a, b) => a.venceEl.toMillis() - b.venceEl.toMillis());
      setTareas(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentWorkspaceId]);

  // Lógica de filtrado
  const filteredTareas = useMemo(() => {
    const today = startOfToday();
    const endOfWeek = addDays(today, 7);
    const endOfMonth = addDays(today, 30);

    return tareas.filter(t => {
      // Filtro de búsqueda
      const matchesSearch = t.titulo.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      // Filtro de categoría
      // Comparamos fecha y hora para "atrasadas"
      const now = new Date();
      const taskDateTime = new Date(`${t.fecha}T${t.hora || '00:00'}:00`);
      const todayStr = format(now, "yyyy-MM-dd");
      
      if (activeFilter === 'completadas') return t.estado === 'completada';
      if (t.estado === 'completada' && activeFilter !== 'todas') return false; 

      switch (activeFilter) {
        case 'hoy': return t.fecha === todayStr;
        case 'semana': return isWithinInterval(parseISO(t.fecha), { start: startOfToday(), end: addDays(startOfToday(), 7) });
        case 'mes': return isWithinInterval(parseISO(t.fecha), { start: startOfToday(), end: addDays(startOfToday(), 30) });
        case 'atrasadas': return isBefore(taskDateTime, now) && t.estado !== 'completada';
        case 'todas': return true;
        default: return true;
      }
    });
  }, [tareas, activeFilter, searchTerm]);

  const handleSaveTask = async () => {
    if (!currentWorkspaceId || !taskForm.titulo || !taskForm.fecha) return;

    try {
      if (editingTask) {
        const taskRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, "tareasCRM", editingTask.id!);
        await updateDoc(taskRef, {
          ...taskForm,
          venceEl: Timestamp.fromDate(new Date(taskForm.fecha + "T" + (taskForm.hora || "00:00") + ":00")),
          actualizadoEl: Timestamp.now(),
          estado: taskForm.estado || (taskForm.completada ? 'completada' : 'pendiente')
        });
        toast.success("Tarea actualizada");
      } else {
        const tasksRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, "tareasCRM");
        await addDoc(tasksRef, {
          ...taskForm,
          venceEl: Timestamp.fromDate(new Date(taskForm.fecha + "T" + (taskForm.hora || "00:00") + ":00")),
          completada: false,
          estado: 'pendiente',
          creadoEl: Timestamp.now()
        });
        toast.success("Tarea agendada");
      }
      setIsAddingTask(false);
      setEditingTask(null);
      setTaskForm({
        titulo: "",
        fecha: format(new Date(), "yyyy-MM-dd"),
        hora: "09:00",
        prioridad: 'media',
        contactoId: "",
        estado: 'pendiente',
        completada: false,
        recurrencia: { tipo: 'ninguna', config: { diasSemana: [], intervaloDias: 1 } }
      });
    } catch (error) {
      console.error("Error saving task:", error);
      toast.error("Error al guardar tarea");
    }
  };

  const toggleComplete = async (task: TareaCRM) => {
    if (!currentWorkspaceId || !task.id) return;
    try {
      const taskRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, "tareasCRM", task.id);
      const newStatus = task.estado === 'completada' ? 'pendiente' : 'completada';
      await updateDoc(taskRef, {
        completada: newStatus === 'completada',
        estado: newStatus,
        actualizadoEl: Timestamp.now()
      });
    } catch (e) {
      toast.error("Error al actualizar tarea");
    }
  };

  const handleQuickUpdate = async (taskOrRef: TareaCRM | { id: string }, updates: Partial<TareaCRM>) => {
    const taskId = taskOrRef.id;
    if (!currentWorkspaceId || !taskId) return;
    try {
      const taskRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, "tareasCRM", taskId);
      if (updates.estado === 'completada') updates.completada = true;
      else if (updates.estado) updates.completada = false;
      
      await updateDoc(taskRef, {
        ...updates,
        actualizadoEl: Timestamp.now()
      });
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

  return (
    <>
      {isMobile ? (
        <MobileTaskList 
          tareas={tareas}
          onToggleComplete={toggleComplete}
          onEdit={(t) => { setEditingTask(t); setTaskForm(t as any); setIsAddingTask(true); }}
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
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all group",
                      activeFilter === item.id 
                        ? "bg-[var(--accent)]/10 text-[var(--text-primary-light)] shadow-sm" 
                        : "text-[var(--text-secondary-light)] hover:bg-[var(--bg-main)]"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "size-8 rounded-lg flex items-center justify-center border transition-transform group-hover:scale-110",
                        activeFilter === item.id ? "bg-white border-white shadow-sm" : item.bgColor
                      )}>
                        <item.icon className={cn("size-4", item.color)} />
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
                          onToggleComplete={toggleComplete}
                          onEdit={(t) => { setEditingTask(t); setTaskForm(t as any); setIsAddingTask(true); }}
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
                  onTaskUpdate={(taskId, updates) => {
                    handleQuickUpdate({ id: taskId } as TareaCRM, updates);
                  }}
                  onEdit={(t) => { setEditingTask(t); setTaskForm(t as any); setIsAddingTask(true); }}
                  onDelete={handleDelete}
                />
              ) : (
                <TaskCalendarView 
                  tareas={tareas}
                  viewMode={calendarView}
                  onViewModeChange={setCalendarView}
                  onAddTask={(date) => {
                    setTaskForm({ ...taskForm, fecha: date });
                    setIsAddingTask(true);
                  }}
                  onEditTask={(t) => { setEditingTask(t); setTaskForm(t as any); setIsAddingTask(true); }}
                />
              )}
            </section>
          </main>
        </div>
      )}

      {/* Modal Unificado de Tareas */}
      <Dialog open={isAddingTask} onOpenChange={setIsAddingTask}>
        <DialogContent className="max-w-[650px] bg-white border-none shadow-2xl rounded-[32px] overflow-hidden p-0">
          <DialogHeader className="bg-slate-50/50 p-8 pb-4">
            <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-[var(--accent)] flex items-center justify-center text-[var(--accent-text)]">
                {editingTask ? <Pencil className="size-5" /> : <Plus className="size-5" />}
              </div>
              {editingTask ? "Editar Tarea" : "Programar Pendiente"}
            </DialogTitle>
          </DialogHeader>

          <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">¿Qué hay que hacer?</Label>
                <Input 
                  placeholder="Ej: Llamar para cerrar contrato..." 
                  className="h-12 rounded-2xl bg-slate-50/50 border-slate-100 text-[15px] font-bold focus:bg-white transition-all shadow-sm"
                  value={taskForm.titulo}
                  onChange={e => setTaskForm({...taskForm, titulo: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Fecha</Label>
                    <Input 
                      type="date"
                      className="h-12 rounded-2xl bg-slate-50/50 border-slate-100 text-[15px] font-bold focus:bg-white transition-all shadow-sm"
                      value={taskForm.fecha}
                      onChange={e => setTaskForm({...taskForm, fecha: e.target.value})}
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Hora</Label>
                    <Input 
                      type="time"
                      className="h-12 rounded-2xl bg-slate-50/50 border-slate-100 text-[15px] font-bold focus:bg-white transition-all shadow-sm"
                      value={taskForm.hora}
                      onChange={e => setTaskForm({...taskForm, hora: e.target.value})}
                    />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Prioridad</Label>
                    <Select 
                      value={taskForm.prioridad} 
                      onValueChange={(v:any) => setTaskForm({...taskForm, prioridad: v})}
                    >
                      <SelectTrigger className="h-12 rounded-2xl bg-slate-50/50 border-slate-100 text-[15px] font-bold focus:bg-white transition-all shadow-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-none shadow-2xl bg-white p-2">
                        <SelectItem value="alta" className="rounded-xl py-3 px-4 font-bold text-rose-500 focus:bg-rose-50">Urgente 🔥</SelectItem>
                        <SelectItem value="media" className="rounded-xl py-3 px-4 font-bold text-amber-500 focus:bg-amber-50">Media ⚡</SelectItem>
                        <SelectItem value="baja" className="rounded-xl py-3 px-4 font-bold text-slate-400 focus:bg-slate-50">Baja 💤</SelectItem>
                      </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Vincular Contacto</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button variant="outline" className="w-full h-12 rounded-2xl bg-slate-50/50 border-slate-100 text-[15px] font-bold justify-between px-4 outline-none">
                          {taskForm.contactoId ? (
                            <span className="text-slate-800">{contactos.find(c => (c.id === taskForm.contactoId || (c as any).id === taskForm.contactoId))?.nombre}</span>
                          ) : (
                            <span className="text-slate-400 uppercase text-[10px] tracking-widest">Seleccionar...</span>
                          )}
                          <ChevronRight className="size-4 text-slate-300" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[300px] rounded-2xl border-none shadow-2xl bg-white p-2">
                        <div className="p-2 mb-2">
                          <Input 
                            placeholder="Buscar contacto..."
                            className="h-10 rounded-xl bg-slate-50 border-none"
                            value={searchContactTerm}
                            onChange={e => setSearchContactTerm(e.target.value)}
                            onKeyDown={e => e.stopPropagation()}
                          />
                        </div>
                        <div className="max-h-[250px] overflow-y-auto no-scrollbar">
                          <DropdownMenuItem 
                            onClick={() => setTaskForm({...taskForm, contactoId: ""})}
                            className="rounded-xl py-3 px-4 font-bold text-slate-400 italic"
                          >
                            Ninguno
                          </DropdownMenuItem>
                          {filteredContacts.map(c => (
                            <DropdownMenuItem 
                              key={c.id} 
                              onClick={() => setTaskForm({...taskForm, contactoId: c.id!})}
                              className="rounded-xl py-3 px-4 font-bold text-slate-700"
                            >
                              {c.nombre}
                            </DropdownMenuItem>
                          ))}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </div>
              </div>

              <div className="space-y-3 p-4 bg-slate-50/50 rounded-3xl border border-slate-100">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Recurrencia Automática</Label>
                <div className="flex flex-wrap gap-2">
                  {(['ninguna', 'diaria', 'semanal', 'intervalo'] as const).map(tipo => (
                    <Button
                      key={tipo}
                      variant={taskForm.recurrencia.tipo === tipo ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        "rounded-full px-4 h-9 font-bold text-[11px] capitalize transition-all",
                        taskForm.recurrencia.tipo === tipo 
                          ? "bg-indigo-500 text-white shadow-lg shadow-indigo-200" 
                          : "bg-white text-slate-500 border-slate-100"
                      )}
                      onClick={() => setTaskForm({
                        ...taskForm, 
                        recurrencia: { ...taskForm.recurrencia, tipo }
                      })}
                    >
                      {tipo === 'intervalo' ? 'Cada X días' : tipo}
                    </Button>
                  ))}
                </div>

                {taskForm.recurrencia.tipo === 'intervalo' && (
                  <div className="pt-2 animate-in slide-in-from-top-2">
                    <Label className="text-[10px] font-bold text-slate-400 mb-1 block uppercase ml-1">¿Cada cuántos días?</Label>
                    <div className="flex items-center gap-3">
                      <Input 
                        type="number"
                        min="1"
                        className="h-10 w-20 rounded-xl bg-white border-slate-200 font-bold text-center"
                        value={taskForm.recurrencia.config.intervaloDias}
                        onChange={e => setTaskForm({
                          ...taskForm,
                          recurrencia: {
                            ...taskForm.recurrencia,
                            config: { ...taskForm.recurrencia.config, intervaloDias: parseInt(e.target.value) }
                          }
                        })}
                      />
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Días naturales</span>
                    </div>
                  </div>
                )}
                
                {taskForm.recurrencia.tipo === 'semanal' && (
                  <div className="pt-2 animate-in slide-in-from-top-2">
                    <Label className="text-[10px] font-bold text-slate-400 mb-2 block uppercase ml-1">Días de la semana</Label>
                    <div className="flex gap-2">
                      {['D','L','M','X','J','V','S'].map((dia, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            const dias = [...taskForm.recurrencia.config.diasSemana];
                            const index = dias.indexOf(idx);
                            if (index > -1) dias.splice(index, 1);
                            else dias.push(idx);
                            setTaskForm({...taskForm, recurrencia: {...taskForm.recurrencia, config: {...taskForm.recurrencia.config, diasSemana: dias}}});
                          }}
                          className={cn(
                            "size-9 rounded-xl font-bold text-[11px] transition-all border",
                            taskForm.recurrencia.config.diasSemana.includes(idx)
                              ? "bg-indigo-500 text-white border-indigo-400 shadow-md"
                              : "bg-white text-slate-400 border-slate-100 hover:border-slate-300"
                          )}
                        >
                          {dia}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
          </div>

          <DialogFooter className="p-8 bg-slate-50/30 border-t border-slate-100 rounded-b-[32px]">
              <Button 
              variant="ghost" 
              onClick={() => { setIsAddingTask(false); setEditingTask(null); }}
              className="h-12 px-8 rounded-2xl font-bold text-slate-400 hover:text-slate-600"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveTask}
                className="h-12 px-10 rounded-2xl font-bold bg-[var(--accent)] text-[var(--accent-text)] shadow-xl shadow-[var(--accent)]/30 hover:scale-105 active:scale-95 transition-all"
              >
                {editingTask ? "Guardar Cambios" : "Agendar Ahora"}
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
