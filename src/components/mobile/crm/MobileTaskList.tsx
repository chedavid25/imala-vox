import React, { useState, useMemo } from "react";
import { Plus, Search, Calendar, Clock, CheckCircle2, Circle, AlertCircle, Check, MoreVertical, User, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isBefore, parseISO, startOfToday, addDays, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { TareaCRM } from "@/lib/types/firestore";
import { useContactos } from "@/hooks/useContactos";

interface MobileTaskListProps {
  tareas: TareaCRM[];
  onUpdate: (taskId: string, updates: Partial<TareaCRM>) => void;
  onEdit: (task: TareaCRM) => void;
  onNewTask: () => void;
}

type FilterType = 'hoy' | 'semana' | 'atrasadas' | 'completadas' | 'todas';

export function MobileTaskList({ tareas, onUpdate, onEdit, onNewTask }: MobileTaskListProps) {
  const { contactos } = useContactos();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("hoy");

  const now = new Date();
  const todayStart = startOfToday();
  const nextWeek = addDays(todayStart, 7);

  // Lógica de filtrado avanzada
  const filteredTareas = useMemo(() => {
    return tareas.filter(t => {
      const matchesSearch = t.titulo.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      const taskDate = parseISO(t.fecha);
      const isDone = t.estado === 'completada';

      if (activeFilter === 'completadas') return isDone;
      if (isDone && activeFilter !== 'todas') return false;

      switch (activeFilter) {
        case 'hoy': return t.fecha === format(now, "yyyy-MM-dd");
        case 'semana': return isWithinInterval(taskDate, { start: todayStart, end: nextWeek });
        case 'atrasadas': return isBefore(new Date(`${t.fecha}T${t.hora || '00:00'}:00`), now) && !isDone;
        case 'todas': return true;
        default: return true;
      }
    });
  }, [tareas, search, activeFilter]);

  const counts = useMemo(() => ({
    atrasadas: tareas.filter(t => t.estado !== 'completada' && isBefore(new Date(`${t.fecha}T${t.hora || '00:00'}:00`), now)).length,
    hoy: tareas.filter(t => t.estado !== 'completada' && t.fecha === format(now, "yyyy-MM-dd")).length,
  }), [tareas]);

  const TaskItem = ({ task }: { task: TareaCRM }) => {
    const isOverdue = isBefore(new Date(`${task.fecha}T${task.hora || '00:00'}:00`), now) && task.estado !== 'completada';
    const associatedContact = task.contactoId ? contactos.find(c => c.id === task.contactoId) : null;
    
    return (
      <div 
        onClick={() => onEdit(task)}
        className={cn(
          "bg-white rounded-[24px] p-4 shadow-sm border border-slate-100 flex items-start gap-4 active:scale-[0.98] transition-all relative overflow-hidden",
          task.estado === 'completada' ? "opacity-60 bg-slate-50/50" : "bg-white"
        )}
      >
        {/* Checkbox Circular */}
        <button 
          onClick={(e) => { e.stopPropagation(); onUpdate(task.id!, { estado: task.estado === 'completada' ? 'pendiente' : 'completada' }); }}
          className={cn(
            "size-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all duration-300",
            task.estado === 'completada' 
              ? "bg-emerald-500 border-emerald-500 text-white" 
              : task.prioridad === 'alta' ? "border-rose-400 bg-rose-50/30" : "border-slate-200 bg-white"
          )}
        >
          {task.estado === 'completada' && <Check size={14} strokeWidth={4} />}
        </button>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h4 className={cn(
              "text-[15px] font-semibold leading-snug tracking-tight",
              task.estado === 'completada' ? "line-through text-slate-400 font-normal" : "text-slate-900"
            )}>
              {task.titulo}
            </h4>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 pt-1">
             {/* Tag de Prioridad (Igual que escritorio) */}
             <div className={cn(
               "px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wider",
               task.prioridad === 'alta' ? "bg-rose-50 border-rose-200 text-rose-700" :
               task.prioridad === 'media' ? "bg-amber-50 border-amber-300 text-amber-700" :
               "bg-slate-50 border-slate-200 text-slate-600"
             )}>
               {task.prioridad}
             </div>

             {/* Tag de Estado (Igual que escritorio) */}
             <div className={cn(
               "px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wider",
               task.estado === 'proceso' ? "bg-blue-50 border-blue-200 text-blue-600" + (isOverdue ? " animate-pulse" : "") :
               isOverdue ? "bg-rose-50 border-rose-200 text-rose-600 animate-pulse" :
               task.estado === 'completada' ? "bg-emerald-50 border-emerald-200 text-emerald-600" :
               "bg-slate-100 border-slate-200 text-slate-500"
             )}>
                {task.estado === 'completada' ? 'Completada' : 
                 task.estado === 'proceso' ? 'En Proceso' : 
                 isOverdue ? 'Atrasado' : 'Pendiente'}
             </div>

             {/* Info de tiempo */}
             <div className={cn(
               "flex items-center gap-1 text-[10px] font-bold uppercase tracking-tighter ml-auto",
               isOverdue ? "text-rose-500" : "text-slate-400"
             )}>
               <Clock size={12} strokeWidth={2.5} />
               {isToday(parseISO(task.fecha)) ? "Hoy" : format(parseISO(task.fecha), "d MMM", { locale: es })}
               {task.hora && ` • ${task.hora}`}
             </div>
          </div>

          {associatedContact && (
            <div className="flex items-center gap-2 pt-1 border-t border-slate-50 mt-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50/50 px-2 py-1 rounded-lg">
                <User size={12} className="shrink-0" />
                <span className="truncate">{associatedContact.nombre}</span>
              </div>
            </div>
          )}
        </div>

        <button className="p-1 text-slate-300 mt-0.5">
          <MoreVertical size={18} />
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#F5F5F4] relative">
      {/* Header Premium */}
      <div className="bg-white px-5 pt-6 pb-4 space-y-5 shadow-sm">
        <div className="flex items-center justify-between">
           <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mis Tareas</h1>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Planificación Diaria</p>
           </div>
           <div className="size-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
              <Search size={20} />
           </div>
        </div>

        {/* Filtros horizontales (Pills) */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'atrasadas', label: 'Atrasadas', icon: AlertCircle, count: counts.atrasadas, active: activeFilter === 'atrasadas' },
            { id: 'hoy', label: 'Hoy', icon: Calendar, count: counts.hoy, active: activeFilter === 'hoy' },
            { id: 'semana', label: 'Semana', icon: Clock, active: activeFilter === 'semana' },
            { id: 'completadas', label: 'Listas', icon: CheckCircle2, active: activeFilter === 'completadas' },
            { id: 'todas', label: 'Todas', icon: Tag, active: activeFilter === 'todas' }
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id as any)}
              className={cn(
                "px-4 py-2.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 shrink-0 border-2",
                filter.active 
                  ? "bg-[var(--accent)] border-[var(--accent)] text-slate-900 shadow-sm" 
                  : "bg-white border-slate-50 text-slate-400"
              )}
            >
              <filter.icon size={14} />
              {filter.label}
              {filter.count !== undefined && filter.count > 0 && (
                <span className={cn(
                  "size-4 rounded-full flex items-center justify-center text-[9px] font-bold",
                  filter.active ? "bg-white text-slate-900" : "bg-slate-100 text-slate-500"
                )}>
                  {filter.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lista Scrolleable */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3 pb-32 custom-scrollbar">
        {filteredTareas.length > 0 ? (
          filteredTareas.map(t => <TaskItem key={t.id} task={t} />)
        ) : (
          <div className="py-24 flex flex-col items-center justify-center text-center px-10">
            <div className="size-20 rounded-[32px] bg-white shadow-sm flex items-center justify-center mb-6 text-slate-200">
              <Check size={40} strokeWidth={2} />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-widest">¡Libre de tareas!</h3>
            <p className="text-[11px] font-medium text-slate-400 mt-2 leading-relaxed">
              No hay pendientes en esta sección. Relájate o agrega algo nuevo.
            </p>
          </div>
        )}
      </div>

      {/* FAB Premium */}
      <button 
        onClick={onNewTask}
        className="fixed bottom-24 right-6 size-14 bg-[var(--accent)] text-[var(--accent-text)] rounded-2xl shadow-2xl shadow-[var(--accent)]/40 flex items-center justify-center active:scale-90 transition-all z-30"
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>
    </div>
  );
}
