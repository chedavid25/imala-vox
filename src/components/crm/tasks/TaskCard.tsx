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
  onToggleComplete: (task: TareaCRM) => void;
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
  onToggleComplete, 
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
      "group flex items-center gap-4 p-4 bg-white rounded-[20px] border transition-all",
      task.estado === 'completada' ? "opacity-60 grayscale border-slate-100" : "border-transparent shadow-sm hover:shadow-md hover:translate-x-1",
      isAtrasada && task.estado !== 'completada' ? "border-rose-100 bg-rose-50/20" : "",
      compact ? "p-3 gap-3" : "p-5 gap-6"
    )}>
       {/* Manija de Arrastre DND */}
       {dragHandleProps && (
         <div 
           {...dragHandleProps.attributes} 
           {...dragHandleProps.listeners}
           className="cursor-grab active:cursor-grabbing p-1 -ml-2 text-slate-200 hover:text-slate-400 transition-colors"
         >
           <GripVertical className="size-4" />
         </div>
       )}

       <div onClick={() => onToggleComplete(task)} className="shrink-0 cursor-pointer">
         {task.estado === 'completada' 
           ? <CheckCircle2 className="size-5 text-emerald-500" /> 
           : <Circle className={cn("size-5 text-slate-200 group-hover:text-[var(--accent)] transition-colors")} />
         }
       </div>

       <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
             <h3 className={cn(
               "text-[14px] font-semibold tracking-tight truncate",
               task.estado === 'completada' ? "line-through text-slate-400" : "text-slate-800"
             )}>{task.titulo}</h3>
             
             <Badge className={cn(
               "text-[8px] font-semibold uppercase tracking-tighter px-1.5 h-4",
               task.prioridad === 'alta' ? "bg-rose-50 text-rose-500" :
               task.prioridad === 'media' ? "bg-amber-50 text-amber-500" :
               "bg-slate-50 text-slate-400"
             )}>
               {task.prioridad}
             </Badge>

             {task.estado === 'proceso' && (
                <Badge className="bg-blue-50 text-blue-500 text-[8px] font-semibold uppercase tracking-tighter px-1.5 h-4">
                  En Proceso
                </Badge>
             )}

             {/* Selector rápido para móvil/canvas */}
             <DropdownMenu>
                <DropdownMenuTrigger 
                  render={
                    <Button variant="ghost" size="sm" className="h-4 px-1 text-[8px] font-semibold uppercase text-slate-400 hover:text-[var(--accent)] outline-none">
                      Cambiar
                    </Button>
                  } 
                />
                <DropdownMenuContent className="rounded-xl border-none shadow-2xl bg-white p-2 min-w-[150px]">
                  <div className="px-2 py-1 text-[8px] font-semibold text-slate-400 uppercase tracking-widest">Estado</div>
                  <DropdownMenuItem onClick={() => onToggleComplete({...task, estado: 'pendiente'})} className="text-[11px] font-medium py-2 rounded-lg">Poner Pendiente</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onToggleComplete({...task, estado: 'proceso'})} className="text-[11px] font-medium py-2 rounded-lg text-blue-500">Poner En Proceso</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onToggleComplete({...task, estado: 'completada'})} className="text-[11px] font-medium py-2 rounded-lg text-emerald-500">Completar</DropdownMenuItem>
                  <div className="h-px bg-slate-50 my-1" />
                  <div className="px-2 py-1 text-[8px] font-semibold text-slate-400 uppercase tracking-widest">Prioridad</div>
                  <DropdownMenuItem onClick={() => onToggleComplete({...task, prioridad: 'alta'})} className="text-[11px] font-medium py-2 rounded-lg text-rose-500">Alta</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onToggleComplete({...task, prioridad: 'media'})} className="text-[11px] font-medium py-2 rounded-lg text-amber-500">Media</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onToggleComplete({...task, prioridad: 'baja'})} className="text-[11px] font-medium py-2 rounded-lg text-slate-400">Baja</DropdownMenuItem>
                </DropdownMenuContent>
             </DropdownMenu>

             {task.recurrencia && task.recurrencia.tipo !== 'ninguna' && (
               <div className="size-4 rounded-full bg-indigo-50 flex items-center justify-center">
                 <Repeat className="size-2.5 text-indigo-500" />
               </div>
             )}
             {isAtrasada && <span className="text-[8px] font-semibold uppercase text-rose-500 animate-pulse">Atrasado</span>}
          </div>

          {!compact && (
            <div className="flex items-center gap-3 text-[10px] font-medium text-slate-400">
               <div className="flex items-center gap-1">
                  <CalendarIcon className="size-3" />
                  {format(new Date(task.fecha + "T00:00:00"), "d MMM", { locale: es })}
               </div>
               {task.hora && (
                 <div className="flex items-center gap-1 border-l border-slate-100 pl-3">
                    <Clock className="size-3" />
                    {task.hora}
                 </div>
               )}
               {linkedContact && (
                 <div className="flex items-center gap-1 border-l border-slate-100 pl-3 text-indigo-500 truncate max-w-[120px]">
                    <User className="size-3" />
                    {linkedContact.nombre.split(' ')[0]}
                 </div>
               )}
            </div>
          )}
       </div>

       <div className="flex items-center gap-1 pr-1 opacity-100 transition-opacity">
          <Button 
            variant="ghost" 
            size="icon" 
            className="size-8 rounded-full hover:bg-slate-100"
            onClick={() => onEdit(task)}
          >
             <Pencil className="size-3.5 text-slate-400" />
          </Button>
          <DropdownMenu>
             <DropdownMenuTrigger 
               render={
                <Button variant="ghost" size="icon" className="size-8 rounded-full hover:bg-rose-50 outline-none">
                  <MoreVertical className="size-3.5 text-slate-400" />
                </Button>
               } 
             />
             <DropdownMenuContent align="end" className="rounded-xl border-none shadow-2xl bg-white p-1">
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
