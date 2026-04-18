"use client";

import React, { useState, useMemo } from "react";
import { TareaCRM } from "@/lib/types/firestore";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  addMonths, 
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  isSameDay,
  isToday 
} from "date-fns";
import { es } from "date-fns/locale";
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Calendar as CalendarIcon,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TaskCalendarViewProps {
  tareas: TareaCRM[];
  viewMode: 'month' | 'week' | 'day';
  onViewModeChange: (mode: 'month' | 'week' | 'day') => void;
  onAddTask: (date: string) => void;
  onEditTask: (task: TareaCRM) => void;
}

export function TaskCalendarView({ 
  tareas, 
  viewMode, 
  onViewModeChange, 
  onAddTask,
  onEditTask 
}: TaskCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const days = useMemo(() => {
    if (viewMode === 'month') {
      const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } else if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } else {
      return [currentDate];
    }
  }, [currentDate, viewMode]);

  const handlePrev = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const handleNext = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const getTasksForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return tareas.filter(t => t.fecha === dateStr);
  };

  return (
    <div className="flex-1 flex flex-col bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden m-8 mt-0">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-50 bg-slate-50/30">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-slate-800 capitalize">
            {format(currentDate, viewMode === 'month' ? "MMMM yyyy" : "d 'de' MMMM", { locale: es })}
          </h2>
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-100">
            <Button variant="ghost" size="icon" className="size-8 rounded-lg" onClick={handlePrev}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-3 rounded-lg text-[10px] font-semibold uppercase" onClick={() => setCurrentDate(new Date())}>
              Hoy
            </Button>
            <Button variant="ghost" size="icon" className="size-8 rounded-lg" onClick={handleNext}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
          {(['month', 'week', 'day'] as const).map((mode) => (
            <Button 
              key={mode}
              variant={viewMode === mode ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                "h-8 px-4 rounded-lg text-[10px] font-semibold uppercase transition-all",
                viewMode === mode ? "bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/20" : "text-slate-400"
              )}
              onClick={() => onViewModeChange(mode)}
            >
              {mode === 'month' ? 'Mes' : mode === 'week' ? 'Semana' : 'Día'}
            </Button>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {viewMode === 'month' && (
          <div className="grid grid-cols-7 h-full min-h-[600px]">
            {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map(d => (
              <div key={d} className="p-4 text-center text-[10px] font-semibold uppercase text-slate-400 border-b border-slate-50">
                {d}
              </div>
            ))}
            {days.map((day, idx) => {
              const dayTasks = getTasksForDay(day);
              const isTodayDay = isToday(day);
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();

              return (
                <div 
                  key={idx} 
                  className={cn(
                    "min-h-[120px] p-2 border-r border-b border-slate-50 transition-colors group relative",
                    !isCurrentMonth ? "bg-slate-50/20" : "bg-white",
                    isTodayDay ? "bg-indigo-50/10" : ""
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      "size-7 flex items-center justify-center text-[12px] font-semibold rounded-full transition-all",
                      isTodayDay ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20" : 
                      !isCurrentMonth ? "text-slate-300" : "text-slate-600"
                    )}>
                      {format(day, 'd')}
                    </span>
                    <button 
                      onClick={() => onAddTask(format(day, 'yyyy-MM-dd'))}
                      className="opacity-0 group-hover:opacity-100 size-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-[var(--accent)] hover:text-white transition-all shadow-sm"
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>

                  <div className="space-y-1 overflow-y-auto max-h-[80px] no-scrollbar">
                    {dayTasks.map(task => (
                      <div 
                        key={task.id}
                        onClick={() => onEditTask(task)}
                        className={cn(
                          "px-2 py-1 rounded-lg text-[10px] font-medium cursor-pointer transition-all border border-transparent hover:border-[var(--accent)] hover:shadow-sm truncate",
                          task.estado === 'completada' ? "bg-slate-50 text-slate-400 line-through" :
                          task.prioridad === 'alta' ? "bg-rose-50 text-rose-600" :
                          task.prioridad === 'media' ? "bg-amber-50 text-amber-600" :
                          "bg-slate-50 text-slate-600"
                        )}
                      >
                        {task.hora && <span className="mr-1 opacity-60 text-[8px]">{task.hora}</span>}
                        {task.titulo}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {(viewMode === 'week' || viewMode === 'day') && (
          <div className="flex h-full min-h-[600px]">
            {/* Hour labels */}
            <div className="w-16 shrink-0 border-r border-slate-50 pt-12">
               {Array.from({ length: 15 }).map((_, i) => (
                 <div key={i} className="h-20 text-[9px] font-semibold text-slate-300 text-center pr-2">
                   {i + 8 < 10 ? `0${i + 8}:00` : `${i + 8}:00`}
                 </div>
               ))}
            </div>

            {/* Columns */}
            <div className="flex-1 flex overflow-x-auto no-scrollbar">
              {days.map((day, idx) => {
                const dayTasks = getTasksForDay(day);
                const isTodayDay = isToday(day);

                return (
                  <div key={idx} className={cn(
                    "flex-1 min-w-[200px] border-r border-slate-50 bg-white relative",
                    isTodayDay ? "bg-indigo-50/5" : ""
                  )}>
                    <div className="h-12 border-b border-slate-50 flex flex-col items-center justify-center sticky top-0 bg-white/80 backdrop-blur-sm z-10">
                      <span className="text-[10px] font-semibold uppercase text-slate-400">{format(day, 'EEE', { locale: es })}</span>
                      <span className={cn("text-xs font-semibold", isTodayDay ? "text-[var(--accent)]" : "text-slate-700")}>{format(day, 'd')}</span>
                    </div>

                    <div className="relative h-[1200px] group">
                      {/* Grid lines */}
                      {Array.from({ length: 15 }).map((_, i) => (
                        <div 
                          key={i} 
                          onClick={() => {
                            const h = i + 8;
                            const hStr = h < 10 ? `0${h}:00` : `${h}:00`;
                            onAddTask(format(day, 'yyyy-MM-dd')); // En una implementación real pasaríamos la hora
                          }}
                          className="h-20 border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-crosshair" 
                        />
                      ))}

                      {/* Tasks */}
                      {dayTasks.map(task => {
                        const h = task.hora ? parseInt(task.hora.split(':')[0]) : 9;
                        const m = task.hora ? parseInt(task.hora.split(':')[1]) : 0;
                        const top = (h - 8) * 80 + (m / 60) * 80;

                        return (
                          <div 
                            key={task.id}
                            onClick={() => onEditTask(task)}
                            style={{ top: `${top}px` }}
                            className={cn(
                              "absolute left-1 right-1 p-2 rounded-xl border-2 shadow-sm cursor-pointer transition-all hover:scale-[1.02] z-20 min-h-[40px]",
                              task.estado === 'completada' ? "bg-white border-slate-100 text-slate-400 line-through opacity-60" :
                              task.prioridad === 'alta' ? "bg-rose-50 border-rose-100 text-rose-600" :
                              task.prioridad === 'media' ? "bg-amber-50 border-amber-100 text-amber-600" :
                              "bg-indigo-50 border-indigo-100 text-indigo-600"
                            )}
                          >
                             <div className="flex items-center justify-between mb-1">
                               <span className="text-[9px] font-semibold uppercase">{task.hora || '9:00'}HS</span>
                               <Clock className="size-2.5 opacity-40" />
                             </div>
                             <p className="text-[11px] font-semibold leading-tight truncate">{task.titulo}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
