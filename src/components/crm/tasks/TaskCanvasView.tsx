"use client";

import React, { useMemo, useState } from "react";
import { TareaCRM, Contacto } from "@/lib/types/firestore";
import { TaskCard } from "./TaskCard";
import { cn } from "@/lib/utils";
import { 
  DndContext, 
  closestCenter, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  useDroppable
} from "@dnd-kit/core";
import { 
  SortableContext, 
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TaskCanvasViewProps {
  tareas: TareaCRM[];
  contactos: Contacto[];
  grouping: "prioridad" | "estado";
  onTaskUpdate: (taskId: string, updates: Partial<TareaCRM>) => void;
  onEdit: (task: TareaCRM) => void;
  onDelete: (id: string) => void;
}

interface ColumnProps {
  id: string;
  title: string;
  tasks: TareaCRM[];
  contactos: Contacto[];
  onUpdate: (taskId: string, updates: Partial<TareaCRM>) => void;
  onEdit: (task: TareaCRM) => void;
  onDelete: (id: string) => void;
  color: string;
}

function SortableTaskCard(props: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: props.task.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 100 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard 
        {...props} 
        compact 
        dragHandleProps={{ attributes, listeners }} 
      />
    </div>
  );
}

function KanbanColumn({ id, title, tasks, contactos, onUpdate, onEdit, onDelete, color }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "flex flex-col w-[320px] shrink-0 h-full bg-slate-50/50 rounded-[32px] p-4 border transition-all duration-200",
        isOver ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-inner" : "border-slate-100/50"
      )}
    >
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <div className={cn("size-2.5 rounded-full shadow-sm", color)} />
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{title}</h3>
          <span className="bg-white px-2 py-0.5 rounded-full border border-slate-100 text-[9px] font-bold text-slate-400">
            {tasks.length}
          </span>
        </div>
      </div>

      <SortableContext id={id} items={tasks.map(t => t.id!)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-8 min-h-[150px]">
          {tasks.map(task => (
            <SortableTaskCard 
              key={task.id} 
              task={task} 
              contactos={contactos} 
              onUpdate={onUpdate}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
          {tasks.length === 0 && (
            <div className="h-24 border-2 border-dashed border-slate-100 rounded-[24px] flex items-center justify-center">
              <p className="text-[10px] font-medium text-slate-300 italic">Soltar aquí</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function TaskCanvasView({ 
  tareas, 
  contactos, 
  grouping, 
  onTaskUpdate, 
  onEdit, 
  onDelete 
}: TaskCanvasViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Sensibilidad optimizada para distinguir clic de arrastre
      },
    })
  );

  const columns = useMemo(() => {
    if (grouping === "estado") {
      return [
        { id: "pendiente", title: "Pendiente", color: "bg-slate-300" },
        { id: "proceso", title: "En Proceso", color: "bg-blue-500" },
        { id: "completada", title: "Completada", color: "bg-emerald-500" }
      ];
    } else {
      return [
        { id: "alta", title: "Prioridad Alta", color: "bg-rose-500" },
        { id: "media", title: "Prioridad Media", color: "bg-amber-500" },
        { id: "baja", title: "Prioridad Baja", color: "bg-slate-400" },
        { id: "completada", title: "Completadas", color: "bg-emerald-500" }
      ];
    }
  }, [grouping]);

  const getColumnTasks = (columnId: string) => {
    if (columnId === "completada") {
      return tareas.filter(t => t.estado === "completada");
    }
    
    if (grouping === "estado") {
      return tareas.filter(t => t.estado === columnId);
    } else {
      return tareas.filter(t => t.estado !== "completada" && t.prioridad === columnId);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      setActiveId(null);
      return;
    }

    const taskId = active.id as string;
    const overId = over.id as string;

    // Lógica para detectar a qué columna se movió
    let newGroup: string | null = null;
    
    // 1. Verificar si soltamos directamente sobre una columna
    const overColumn = columns.find(c => c.id === overId);
    if (overColumn) {
      newGroup = overColumn.id;
    } else {
      // 2. Si soltamos sobre una tarea, buscamos a qué grupo pertenece esa tarea
      const overTask = tareas.find(t => t.id === overId);
      if (overTask) {
        newGroup = grouping === "estado" ? overTask.estado! : (overTask.prioridad as string);
      }
    }

    if (newGroup) {
      const currentTask = tareas.find(t => t.id === taskId);
      if (!currentTask) return;

      if (grouping === "estado") {
        if (currentTask.estado !== newGroup) {
           onTaskUpdate(taskId, { estado: newGroup as any });
        }
      } else {
        if (newGroup === "completada") {
          if (currentTask.estado !== "completada") {
             onTaskUpdate(taskId, { estado: "completada" });
          }
        } else {
          if (currentTask.prioridad !== newGroup || currentTask.estado === "completada") {
             onTaskUpdate(taskId, { prioridad: newGroup as any, estado: "pendiente" });
          }
        }
      }
    }

    setActiveId(null);
  };

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter} // Más preciso que rectIntersection para listas
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 overflow-x-auto no-scrollbar p-8 pt-0">
        <div className="flex gap-6 h-full min-h-[600px]">
          {columns.map(col => (
              <KanbanColumn 
                key={col.id}
                id={col.id}
                title={col.title}
                color={col.color}
                tasks={getColumnTasks(col.id)}
                contactos={contactos}
                onUpdate={onTaskUpdate}
                onEdit={onEdit}
                onDelete={onDelete}
              />
          ))}
        </div>
      </div>

      <DragOverlay dropAnimation={{
        sideEffects: defaultDropAnimationSideEffects({
          styles: { active: { opacity: '0.5' } },
        }),
      }}>
        {activeId ? (
          <div className="rotate-2 scale-[1.02] shadow-2xl rounded-[20px] overflow-hidden cursor-grabbing">
            <TaskCard 
              task={tareas.find(t => t.id === activeId)!} 
              contactos={contactos} 
              onUpdate={() => {}} 
              onEdit={() => {}} 
              onDelete={() => {}} 
              compact 
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
