"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp, increment } from "firebase/firestore";
import { COLLECTIONS, Agente } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { 
  Clock, 
  Save, 
  Loader2, 
  Calendar,
  Moon,
  Sun,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";

const DIAS = [
  { id: "lun", label: "Lunes" },
  { id: "mar", label: "Martes" },
  { id: "mie", label: "Miércoles" },
  { id: "jue", label: "Jueves" },
  { id: "vie", label: "Viernes" },
  { id: "sab", label: "Sábado" },
  { id: "dom", label: "Domingo" },
];

export default function AgenteHorarioPage() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const { id: agentId } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<Partial<Agente>>({
    horarioActivo: false,
    horario: {
      diasActivos: ["lun", "mar", "mie", "jue", "vie"],
      horaInicio: "09:00",
      horaFin: "18:00",
      sabadoHoraInicio: "09:00",
      sabadoHoraFin: "13:00",
      domingoHoraInicio: "10:00",
      domingoHoraFin: "13:00",
      mensajeFueraHorario: "Hola! En este momento no estamos atendiendo. Dejanos tu consulta y te responderemos a la brevedad."
    }
  });

  useEffect(() => {
    async function fetchAgente() {
      if (!currentWorkspaceId || !agentId) return;
      try {
        const docRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.AGENTES, agentId as string);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const agente = snap.data() as Agente;
          setData({
            horarioActivo: agente.horarioActivo || false,
            horario: agente.horario || data.horario
          });
        }
      } catch (err) {
        toast.error("Error al cargar configuración de horario");
      } finally {
        setLoading(false);
      }
    }
    fetchAgente();
  }, [currentWorkspaceId, agentId]);

  const toggleDia = (diaId: string) => {
    const currentDias = data.horario?.diasActivos || [];
    const newDias = currentDias.includes(diaId)
      ? currentDias.filter(d => d !== diaId)
      : [...currentDias, diaId];
    
    setData({
      ...data,
      horario: { ...data.horario!, diasActivos: newDias }
    });
  };

  const handleSave = async () => {
    if (!currentWorkspaceId || !agentId) return;
    setSaving(true);
    try {
      const docRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.AGENTES, agentId as string);
      await updateDoc(docRef, {
        horarioActivo: data.horarioActivo,
        horario: data.horario,
        configuracionVersion: increment(1),
        actualizadoEl: serverTimestamp()
      });
      toast.success("Horario de atención actualizado");
    } catch (err) {
      toast.error("Error al guardar cambios");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[var(--accent)]" /></div>;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[var(--text-primary-light)]">Horario de Atención</h1>
          <p className="text-sm text-[var(--text-tertiary-light)]">Define cuándo debe el agente responder activamente.</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] px-8"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Guardar Cambios
        </Button>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border-light)] p-8 rounded-3xl space-y-8 shadow-sm">
        <div className="flex items-center justify-between border-b border-[var(--border-light)] pb-6">
           <div className="flex items-center gap-3">
              <Calendar className={cn("w-5 h-5", data.horarioActivo ? "text-[var(--accent)]" : "text-[var(--text-tertiary-light)]")} />
              <div>
                <Label className="text-base font-bold">Restringir por horario</Label>
                <p className="text-xs text-[var(--text-tertiary-light)] font-medium">Si está desactivado, el agente responderá las 24hs.</p>
              </div>
           </div>
           <Switch 
            checked={data.horarioActivo} 
            onCheckedChange={v => setData({ ...data, horarioActivo: v })} 
           />
        </div>

        <div className={cn("space-y-8 transition-all duration-300", !data.horarioActivo && "opacity-40 grayscale pointer-events-none")}>
          {/* Días Laborables */}
          <div className="space-y-4">
            <Label className="text-sm font-bold uppercase tracking-wider text-[var(--text-tertiary-light)]">Días laborables (Lun - Vie)</Label>
            <div className="flex flex-wrap gap-2">
              {DIAS.slice(0, 5).map(dia => {
                const isSelected = data.horario?.diasActivos.includes(dia.id);
                return (
                  <button
                    key={dia.id}
                    onClick={() => toggleDia(dia.id)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-bold border transition-all",
                      isSelected
                        ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-text)] shadow-md"
                        : "bg-[var(--bg-input)] border-[var(--border-light)] text-[var(--text-tertiary-light)] hover:border-[var(--border-light-strong)]"
                    )}
                  >
                    {dia.label}
                  </button>
                );
              })}
            </div>

            {/* Horario base L-V */}
            {data.horario?.diasActivos?.some(d => ['lun','mar','mie','jue','vie'].includes(d)) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-4 border-t border-[var(--border-light)]">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Sun className="w-4 h-4 text-[var(--accent)]" />
                    <Label className="text-sm font-bold text-[var(--text-primary-light)]">Hora de Apertura</Label>
                  </div>
                  <Input
                    type="time"
                    value={data.horario?.horaInicio}
                    onChange={e => setData({...data, horario: {...data.horario!, horaInicio: e.target.value}})}
                    className="bg-[var(--bg-input)] border-[var(--border-light)]"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Moon className="w-4 h-4 text-[var(--accent)]" />
                    <Label className="text-sm font-bold text-[var(--text-primary-light)]">Hora de Cierre</Label>
                  </div>
                  <Input
                    type="time"
                    value={data.horario?.horaFin}
                    onChange={e => setData({...data, horario: {...data.horario!, horaFin: e.target.value}})}
                    className="bg-[var(--bg-input)] border-[var(--border-light)]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Fin de semana */}
          <div className="space-y-4 pt-4 border-t border-[var(--border-light)]">
            <Label className="text-sm font-bold uppercase tracking-wider text-[var(--text-tertiary-light)]">Fin de semana</Label>

            {/* Sábado */}
            <div className="space-y-3">
              <button
                onClick={() => toggleDia('sab')}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-bold border transition-all",
                  data.horario?.diasActivos.includes('sab')
                    ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-text)] shadow-md"
                    : "bg-[var(--bg-input)] border-[var(--border-light)] text-[var(--text-tertiary-light)] hover:border-[var(--border-light-strong)]"
                )}
              >
                Sábado
              </button>

              {data.horario?.diasActivos.includes('sab') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ml-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-[var(--text-primary-light)]">Apertura sábado</Label>
                    <Input
                      type="time"
                      value={data.horario?.sabadoHoraInicio || ''}
                      onChange={e => setData({...data, horario: {...data.horario!, sabadoHoraInicio: e.target.value}})}
                      className="bg-[var(--bg-input)] border-[var(--border-light)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-[var(--text-primary-light)]">Cierre sábado</Label>
                    <Input
                      type="time"
                      value={data.horario?.sabadoHoraFin || ''}
                      onChange={e => setData({...data, horario: {...data.horario!, sabadoHoraFin: e.target.value}})}
                      className="bg-[var(--bg-input)] border-[var(--border-light)]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Domingo */}
            <div className="space-y-3">
              <button
                onClick={() => toggleDia('dom')}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-bold border transition-all",
                  data.horario?.diasActivos.includes('dom')
                    ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-text)] shadow-md"
                    : "bg-[var(--bg-input)] border-[var(--border-light)] text-[var(--text-tertiary-light)] hover:border-[var(--border-light-strong)]"
                )}
              >
                Domingo
              </button>

              {data.horario?.diasActivos.includes('dom') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ml-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-[var(--text-primary-light)]">Apertura domingo</Label>
                    <Input
                      type="time"
                      value={data.horario?.domingoHoraInicio || ''}
                      onChange={e => setData({...data, horario: {...data.horario!, domingoHoraInicio: e.target.value}})}
                      className="bg-[var(--bg-input)] border-[var(--border-light)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-[var(--text-primary-light)]">Cierre domingo</Label>
                    <Input
                      type="time"
                      value={data.horario?.domingoHoraFin || ''}
                      onChange={e => setData({...data, horario: {...data.horario!, domingoHoraFin: e.target.value}})}
                      className="bg-[var(--bg-input)] border-[var(--border-light)]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-[var(--border-light)]">
            <Label className="text-sm font-bold text-[var(--text-primary-light)]">Mensaje fuera de horario</Label>
            <Textarea
              value={data.horario?.mensajeFueraHorario}
              onChange={e => setData({...data, horario: {...data.horario!, mensajeFueraHorario: e.target.value}})}
              className="bg-[var(--bg-input)] border-[var(--border-light)] resize-none h-24 rounded-2xl p-4 text-sm"
              placeholder="Ej: Hola! Pronto volveremos a atender..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
