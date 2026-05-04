"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Plus, 
  Pencil, 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronRight,
  X,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
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
import { format } from "date-fns";
import { Timestamp, collection, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, TareaCRM } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useContactos } from "@/hooks/useContactos";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ModalNuevaTareaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTask?: TareaCRM | null;
  initialContactId?: string;
  initialDate?: string;
  onSuccess?: () => void;
}

export function ModalNuevaTarea({ 
  open, 
  onOpenChange, 
  editingTask = null, 
  initialContactId = "",
  initialDate,
  onSuccess 
}: ModalNuevaTareaProps) {
  const { currentWorkspaceId } = useWorkspaceStore();
  const { contactos } = useContactos();
  
  const [isSaving, setIsSaving] = useState(false);
  const [searchContactTerm, setSearchContactTerm] = useState("");
  
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

  // Reset/Initial form
  useEffect(() => {
    if (open) {
      if (editingTask) {
        setTaskForm({
          titulo: editingTask.titulo || "",
          fecha: editingTask.fecha || format(new Date(), "yyyy-MM-dd"),
          hora: editingTask.hora || "09:00",
          prioridad: editingTask.prioridad || 'media',
          contactoId: editingTask.contactoId || "",
          estado: editingTask.estado || (editingTask.completada ? 'completada' : 'pendiente'),
          completada: editingTask.completada || false,
          recurrencia: editingTask.recurrencia ? {
            tipo: editingTask.recurrencia.tipo,
            config: editingTask.recurrencia.config || { diasSemana: [], intervaloDias: 1 }
          } : { 
            tipo: 'ninguna', 
            config: { diasSemana: [], intervaloDias: 1 } 
          } as any
        });
      } else {
        setTaskForm({
          titulo: "",
          fecha: initialDate || format(new Date(), "yyyy-MM-dd"),
          hora: format(new Date(), "HH:mm"),
          prioridad: 'media',
          contactoId: initialContactId,
          estado: 'pendiente',
          completada: false,
          recurrencia: { 
            tipo: 'ninguna', 
            config: { diasSemana: [], intervaloDias: 1 } 
          }
        });
      }
    }
  }, [open, editingTask, initialContactId, initialDate]);

  const filteredContacts = useMemo(() => {
    return (contactos || []).filter(c => 
      c.nombre.toLowerCase().includes(searchContactTerm.toLowerCase()) ||
      c.telefono.includes(searchContactTerm)
    );
  }, [contactos, searchContactTerm]);

  const handleSaveTask = async () => {
    if (!currentWorkspaceId || !taskForm.titulo || !taskForm.fecha) {
      toast.error("Completá el título y la fecha");
      return;
    }

    setIsSaving(true);
    try {
      const venceEl = new Date(taskForm.fecha + "T" + (taskForm.hora || "00:00") + ":00");
      
      if (editingTask?.id) {
        const taskRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, "tareasCRM", editingTask.id);
        await updateDoc(taskRef, {
          ...taskForm,
          venceEl: Timestamp.fromDate(venceEl),
          actualizadoEl: Timestamp.now(),
          estado: taskForm.estado || (taskForm.completada ? 'completada' : 'pendiente')
        });
        toast.success("Tarea actualizada");
      } else {
        const tasksRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, "tareasCRM");
        await addDoc(tasksRef, {
          ...taskForm,
          venceEl: Timestamp.fromDate(venceEl),
          completada: false,
          estado: 'pendiente',
          creadoEl: Timestamp.now()
        });
        toast.success("Tarea agendada");
      }
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving task:", error);
      toast.error("Error al guardar tarea");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[650px] bg-white border-none shadow-2xl rounded-[32px] overflow-hidden p-0">
        <DialogHeader className="bg-slate-50/50 p-8 pb-4">
          <DialogTitle className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-[var(--accent)] flex items-center justify-center text-[var(--accent-text)]">
              {editingTask ? <Pencil className="size-5" /> : <Plus className="size-5" />}
            </div>
            {editingTask ? "Editar Tarea" : "Programar Pendiente"}
          </DialogTitle>
        </DialogHeader>

        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 ml-1">¿Qué hay que hacer?</Label>
            <Input 
              placeholder="Ej: Llamar para cerrar contrato..." 
              className="h-12 rounded-2xl bg-slate-50/50 border-slate-100 text-[15px] font-semibold focus:bg-white transition-all shadow-sm"
              value={taskForm.titulo}
              onChange={e => setTaskForm({...taskForm, titulo: e.target.value})}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
                <Label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 ml-1">Fecha</Label>
                <Input 
                  type="date"
                  className="h-12 rounded-2xl bg-slate-50/50 border-slate-100 text-[15px] font-semibold focus:bg-white transition-all shadow-sm"
                  value={taskForm.fecha}
                  onChange={e => setTaskForm({...taskForm, fecha: e.target.value})}
                />
            </div>
            <div className="space-y-2">
                <Label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 ml-1">Hora</Label>
                <Input 
                  type="time"
                  className="h-12 rounded-2xl bg-slate-50/50 border-slate-100 text-[15px] font-semibold focus:bg-white transition-all shadow-sm"
                  value={taskForm.hora}
                  onChange={e => setTaskForm({...taskForm, hora: e.target.value})}
                />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
                <Label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 ml-1">Prioridad</Label>
                <Select 
                  value={taskForm.prioridad} 
                  onValueChange={(v:any) => setTaskForm({...taskForm, prioridad: v})}
                >
                  <SelectTrigger className="h-12 rounded-2xl bg-slate-50/50 border-slate-100 text-[15px] font-semibold focus:bg-white transition-all shadow-sm">
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
                <Label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 ml-1">Vincular Contacto</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger className="w-full h-12 rounded-2xl bg-slate-50/50 border-slate-100 text-[15px] font-semibold flex items-center justify-between px-4 outline-none border transition-all hover:border-slate-200">
                    {taskForm.contactoId ? (
                      <span className="text-slate-800 truncate pr-2">
                        {contactos.find(c => (c.id === taskForm.contactoId))?.nombre || "Contacto seleccionado"}
                      </span>
                    ) : (
                      <span className="text-slate-400 uppercase text-[10px] tracking-widest">Seleccionar...</span>
                    )}
                    <ChevronRight className="size-4 text-slate-300" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[300px] rounded-2xl border-none shadow-2xl bg-white p-2 z-[60]">
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
                        className="rounded-xl py-3 px-4 font-bold text-slate-400 italic cursor-pointer"
                      >
                        Ninguno
                      </DropdownMenuItem>
                      {filteredContacts.map(c => (
                        <DropdownMenuItem 
                          key={c.id} 
                          onClick={() => setTaskForm({...taskForm, contactoId: c.id!})}
                          className="rounded-xl py-3 px-4 font-bold text-slate-700 cursor-pointer"
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
            <Label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 ml-1">Recurrencia Automática</Label>
            <div className="flex flex-wrap gap-2">
              {(['ninguna', 'diaria', 'semanal', 'intervalo'] as const).map(tipo => (
                <Button
                  key={tipo}
                  type="button"
                  variant={taskForm.recurrencia.tipo === tipo ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    "rounded-full px-4 h-9 font-semibold text-[11px] capitalize transition-all",
                    taskForm.recurrencia.tipo === tipo 
                      ? "bg-indigo-500 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-600" 
                      : "bg-white text-slate-500 border-slate-100 hover:bg-slate-50"
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
                <Label className="text-[10px] font-semibold text-slate-400 mb-1 block uppercase ml-1">¿Cada cuántos días?</Label>
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
                <Label className="text-[10px] font-semibold text-slate-400 mb-2 block uppercase ml-1">Días de la semana</Label>
                <div className="flex gap-2">
                  {['D','L','M','X','J','V','S'].map((dia, idx) => (
                    <button
                      key={idx}
                      type="button"
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
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-12 px-8 rounded-2xl font-semibold text-slate-400 hover:text-slate-600"
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSaveTask}
            className="h-12 px-10 rounded-2xl font-semibold bg-[var(--accent)] text-[var(--accent-text)] shadow-xl shadow-[var(--accent)]/30 hover:scale-105 active:scale-95 transition-all"
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="size-5 animate-spin" /> : (editingTask ? "Guardar Cambios" : "Agendar Ahora")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
