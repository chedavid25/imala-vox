"use client";

import React from "react";
import { TareaCRM, Contacto } from "@/lib/types/firestore";
import { format, isBefore, startOfToday, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { 
  CheckCircle2, 
  Circle, 
  MoreVertical, 
  Trash2, 
  Pencil, 
  Calendar as CalendarIcon, 
  Clock, 
  User,
  Repeat,
  GripVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: TareaCRM;
  contactos: Contacto[];
  onUpdate: (taskId: string, updates: Partial<TareaCRM>) => void;
  onEdit: (task: TareaCRM) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
  // Props para DND
  dragHandleProps?: {
    attributes?: any;
    listeners?: any;
  };
}

export function TaskCard({ 
  task, 
  contactos, 
  onUpdate, 
  onEdit, 
  onDelete,
  compact = false,
  dragHandleProps
}: TaskCardProps) {
  const linkedContact = contactos.find(c => (c.id === task.contactoId || (c as any).id === task.contactoId));
  
  // Lógica de atraso por fecha y HORA
  const now = new Date();
  const taskDateTime = new Date(`${task.fecha}T${task.hora || '00:00'}:00`);
  const isAtrasada = isBefore(taskDateTime, now) && task.estado !== 'completada';

  return (
    <div className={cn(
      "group flex items-center gap-4 p-4 bg-[var(--bg-card)] rounded-[24px] border border-[var(--border-light)] transition-all",
      task.estado === 'completada' ? "opacity-60 grayscale bg-slate-50/50" : "hover:border-[var(--text-tertiary-light)] shadow-sm hover:shadow-lg hover:-translate-y-0.5",
      isAtrasada && task.estado !== 'completada' ? "border-rose-200 bg-rose-50/40" : "",
      compact ? "p-3 gap-3" : "p-5 gap-6"
    )}>
       {/* Manija de Arrastre DND */}
       {dragHandleProps && (
         <div 
           {...dragHandleProps.attributes} 
           {...dragHandleProps.listeners}
           className="cursor-grab active:cursor-grabbing p-1 -ml-2 transition-colors"
           style={{ color: '#1F1F1E' }}
         >
           <GripVertical className="size-4" />
         </div>
       )}

       <div onClick={() => onUpdate(task.id!, { estado: task.estado === 'completada' ? 'pendiente' : 'completada', completada: task.estado !== 'completada' })} className="shrink-0 cursor-pointer">
         {task.estado === 'completada' 
           ? <CheckCircle2 className="size-5 text-emerald-500" /> 
           : <Circle className={cn("size-5 text-slate-200 group-hover:text-[var(--accent)] transition-colors")} />
         }
       </div>

       <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
              <h3 className={cn(
                "text-[14px] font-semibold tracking-tight break-words flex-1",
                task.estado === 'completada' ? "line-through text-slate-400" : "text-[var(--text-primary-light)]"
              )}>{task.titulo}</h3>
              {/* Selector de Prioridad */}
              <DropdownMenu>
                <DropdownMenuTrigger className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wider transition-all hover:scale-105 outline-none",
                    task.prioridad === 'alta' ? "bg-rose-50 border-rose-200 text-rose-700" :
                    task.prioridad === 'media' ? "bg-amber-50 border-amber-300 text-amber-700" :
                    "bg-slate-50 border-slate-200 text-slate-600"
                  )}>
                    {task.prioridad}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="rounded-xl border-none shadow-2xl bg-white p-1 z-[60]">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUpdate(task.id!, { prioridad: 'alta' }); }} className="text-[11px] font-medium py-2 rounded-lg text-rose-600">Alta</DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUpdate(task.id!, { prioridad: 'media' }); }} className="text-[11px] font-medium py-2 rounded-lg text-amber-600">Media</DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUpdate(task.id!, { prioridad: 'baja' }); }} className="text-[11px] font-medium py-2 rounded-lg text-slate-500">Baja</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Selector de Estado */}
              <DropdownMenu>
                <DropdownMenuTrigger className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wider transition-all hover:scale-105 outline-none",
                    task.estado === 'proceso' ? "bg-blue-50 border-blue-200 text-blue-600" + (isAtrasada ? " animate-pulse" : "") :
                    isAtrasada ? "bg-rose-50 border-rose-200 text-rose-600 animate-pulse" :
                    task.estado === 'completada' ? "bg-emerald-50 border-emerald-200 text-emerald-600" :
                    "bg-slate-100 border-slate-200 text-slate-500"
                  )}>
                    {task.estado === 'completada' ? 'Completada' : 
                     task.estado === 'proceso' ? 'En Proceso' : 
                     isAtrasada ? 'Atrasado' : 'Pendiente'}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="rounded-xl border-none shadow-2xl bg-white p-1 z-[60]">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUpdate(task.id!, { estado: 'pendiente', completada: false }); }} className="text-[11px] font-medium py-2 rounded-lg">Pendiente</DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUpdate(task.id!, { estado: 'proceso', completada: false }); }} className="text-[11px] font-medium py-2 rounded-lg text-blue-600">En Proceso</DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUpdate(task.id!, { estado: 'completada', completada: true }); }} className="text-[11px] font-medium py-2 rounded-lg text-emerald-600">Completada</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {task.recurrencia && task.recurrencia.tipo !== 'ninguna' && (
                <div className="size-4 rounded-full bg-indigo-50 flex items-center justify-center">
                  <Repeat className="size-2.5 text-indigo-500" />
                </div>
              )}
          </div>

          {!compact && (
            <div className="flex items-center gap-3 text-[10px] font-semibold text-[var(--text-tertiary-light)] tabular-nums">
               <div className="flex items-center gap-1.5">
                  <CalendarIcon className="size-3.5 opacity-60" />
                  {format(new Date(task.fecha + "T00:00:00"), "d MMM", { locale: es })}
               </div>
               {task.hora && (
                 <div className="flex items-center gap-1.5 border-l border-[var(--border-light)] pl-3">
                    <Clock className="size-3.5 opacity-60" />
                    {task.hora}
                 </div>
               )}
               {linkedContact && (
                 <div className="flex items-center gap-1.5 border-l border-[var(--border-light)] pl-3 text-indigo-600 font-bold truncate max-w-[120px]">
                    <User className="size-3.5 opacity-60" />
                    {linkedContact.nombre.split(' ')[0]}
                 </div>
               )}
            </div>
          )}
       </div>

       <div className="flex items-center gap-1 pr-1 opacity-100 transition-opacity">
          <DropdownMenu>
             <DropdownMenuTrigger className="size-8 rounded-full hover:bg-slate-100 flex items-center justify-center outline-none focus-visible:ring-0 transition-colors">
                <MoreVertical className="size-3.5 text-slate-400" />
             </DropdownMenuTrigger>
             <DropdownMenuContent align="end" className="rounded-xl border-none shadow-2xl bg-white p-1 min-w-[140px]">
                <DropdownMenuItem 
                 onClick={() => onEdit(task)}
                 className="flex items-center gap-2 text-slate-600 font-medium text-xs py-2.5 px-3 rounded-lg focus:bg-slate-50"
                >
                  <Pencil className="size-3.5" /> Editar Tarea
                </DropdownMenuItem>
                <div className="h-px bg-slate-50 my-1" />
                <DropdownMenuItem 
                 onClick={() => onDelete(task.id!)}
                 className="flex items-center gap-2 text-rose-500 font-medium text-xs py-2.5 px-3 rounded-lg focus:bg-rose-50"
                >
                  <Trash2 className="size-3.5" /> Borrar Tarea
                </DropdownMenuItem>
             </DropdownMenuContent>
          </DropdownMenu>
       </div>
    </div>
  );
}
