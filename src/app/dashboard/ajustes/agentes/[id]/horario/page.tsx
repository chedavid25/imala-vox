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
  AlertCircle,
  Users,
  HelpCircle,
  ChevronDown,
  Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [showHelp, setShowHelp] = useState(false);
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
    },
    horarioHumanoActivo: false,
    horarioHumano: {
      diasActivos: ["lun", "mar", "mie", "jue", "vie"],
      horaInicio: "09:00",
      horaFin: "18:00",
      sabadoHoraInicio: "09:00",
      sabadoHoraFin: "13:00",
      domingoHoraInicio: "10:00",
      domingoHoraFin: "13:00",
      mensajeFueraHorario: "Nuestro equipo humano atiende de lunes a viernes de 9 a 18hs. Te contactaremos en cuanto volvamos a la oficina."
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
            horario: agente.horario || data.horario,
            horarioHumanoActivo: agente.horarioHumanoActivo || false,
            horarioHumano: agente.horarioHumano || data.horarioHumano
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

  const toggleDia = (tipo: 'ia' | 'humano', diaId: string) => {
    const field = tipo === 'ia' ? 'horario' : 'horarioHumano';
    const currentDias = data[field]?.diasActivos || [];
    const newDias = currentDias.includes(diaId)
      ? currentDias.filter(d => d !== diaId)
      : [...currentDias, diaId];
    
    setData({
      ...data,
      [field]: { ...data[field]!, diasActivos: newDias }
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
        horarioHumanoActivo: data.horarioHumanoActivo,
        horarioHumano: data.horarioHumano,
        configuracionVersion: increment(1),
        actualizadoEl: serverTimestamp()
      });
      toast.success("Horarios actualizados correctamente");
    } catch (err) {
      toast.error("Error al guardar cambios");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[var(--accent)]" /></div>;

  const renderScheduleForm = (tipo: 'ia' | 'humano') => {
    const isIA = tipo === 'ia';
    const activeField = isIA ? 'horarioActivo' : 'horarioHumanoActivo';
    const dataField = isIA ? 'horario' : 'horarioHumano';
    const isActive = data[activeField];
    const schedule = data[dataField];

    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border-light)] p-8 rounded-3xl space-y-8 shadow-sm">
        <div className="flex items-center justify-between border-b border-[var(--border-light)] pb-6">
           <div className="flex items-center gap-3">
              <Calendar className={cn("w-5 h-5", isActive ? "text-[var(--accent)]" : "text-[var(--text-tertiary-light)]")} />
              <div>
                <Label className="text-base font-bold">{isIA ? 'Restringir IA por horario' : 'Horario de atención humana'}</Label>
                <p className="text-xs text-[var(--text-tertiary-light)] font-medium">
                  {isIA 
                    ? 'Si está desactivado, el agente responderá las 24hs.' 
                    : 'Indica a la IA cuándo hay operadores humanos disponibles.'}
                </p>
              </div>
           </div>
           <Switch 
            checked={isActive} 
            onCheckedChange={v => setData({ ...data, [activeField]: v })} 
           />
        </div>

        <div className={cn("space-y-8 transition-all duration-300", !isActive && "opacity-40 grayscale pointer-events-none")}>
          {/* Días Laborables */}
          <div className="space-y-4">
            <Label className="text-sm font-bold uppercase tracking-wider text-[var(--text-tertiary-light)]">Días laborables (Lun - Vie)</Label>
            <div className="flex flex-wrap gap-2">
              {DIAS.slice(0, 5).map(dia => {
                const isSelected = schedule?.diasActivos.includes(dia.id);
                return (
                  <button
                    key={dia.id}
                    onClick={() => toggleDia(tipo, dia.id)}
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
            {schedule?.diasActivos?.some(d => ['lun','mar','mie','jue','vie'].includes(d)) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-4 border-t border-[var(--border-light)]">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Sun className="w-4 h-4 text-[var(--accent)]" />
                    <Label className="text-sm font-bold text-[var(--text-primary-light)]">Hora de Apertura</Label>
                  </div>
                  <Input
                    type="time"
                    value={schedule?.horaInicio}
                    onChange={e => setData({...data, [dataField]: {...schedule!, horaInicio: e.target.value}})}
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
                    value={schedule?.horaFin}
                    onChange={e => setData({...data, [dataField]: {...schedule!, horaFin: e.target.value}})}
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
                onClick={() => toggleDia(tipo, 'sab')}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-bold border transition-all",
                  schedule?.diasActivos.includes('sab')
                    ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-text)] shadow-md"
                    : "bg-[var(--bg-input)] border-[var(--border-light)] text-[var(--text-tertiary-light)] hover:border-[var(--border-light-strong)]"
                )}
              >
                Sábado
              </button>

              {schedule?.diasActivos.includes('sab') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ml-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-[var(--text-primary-light)]">Apertura sábado</Label>
                    <Input
                      type="time"
                      value={schedule?.sabadoHoraInicio || ''}
                      onChange={e => setData({...data, [dataField]: {...schedule!, sabadoHoraInicio: e.target.value}})}
                      className="bg-[var(--bg-input)] border-[var(--border-light)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-[var(--text-primary-light)]">Cierre sábado</Label>
                    <Input
                      type="time"
                      value={schedule?.sabadoHoraFin || ''}
                      onChange={e => setData({...data, [dataField]: {...schedule!, sabadoHoraFin: e.target.value}})}
                      className="bg-[var(--bg-input)] border-[var(--border-light)]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Domingo */}
            <div className="space-y-3">
              <button
                onClick={() => toggleDia(tipo, 'dom')}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-bold border transition-all",
                  schedule?.diasActivos.includes('dom')
                    ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-text)] shadow-md"
                    : "bg-[var(--bg-input)] border-[var(--border-light)] text-[var(--text-tertiary-light)] hover:border-[var(--border-light-strong)]"
                )}
              >
                Domingo
              </button>

              {schedule?.diasActivos.includes('dom') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ml-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-[var(--text-primary-light)]">Apertura domingo</Label>
                    <Input
                      type="time"
                      value={schedule?.domingoHoraInicio || ''}
                      onChange={e => setData({...data, [dataField]: {...schedule!, domingoHoraInicio: e.target.value}})}
                      className="bg-[var(--bg-input)] border-[var(--border-light)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-[var(--text-primary-light)]">Cierre domingo</Label>
                    <Input
                      type="time"
                      value={schedule?.domingoHoraFin || ''}
                      onChange={e => setData({...data, [dataField]: {...schedule!, domingoHoraFin: e.target.value}})}
                      className="bg-[var(--bg-input)] border-[var(--border-light)]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-[var(--border-light)]">
            <Label className="text-sm font-bold text-[var(--text-primary-light)]">
              {isIA ? 'Mensaje fuera de horario IA' : 'Mensaje de ausencia humana'}
            </Label>
            <p className="text-xs text-[var(--text-tertiary-light)] mb-2">
              {isIA 
                ? 'Este mensaje se envía cuando el cliente escribe fuera del horario de la IA.' 
                : 'La IA usará esta información para avisar cuándo volverán los humanos.'}
            </p>
            <Textarea
              value={schedule?.mensajeFueraHorario}
              onChange={e => setData({...data, [dataField]: {...schedule!, mensajeFueraHorario: e.target.value}})}
              className="bg-[var(--bg-input)] border-[var(--border-light)] resize-none h-24 rounded-2xl p-4 text-sm"
              placeholder={isIA ? "Ej: Hola! En este momento no estamos atendiendo..." : "Ej: Nuestro equipo humano vuelve mañana a las 9hs..."}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-start gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[var(--text-primary-light)]">Horarios del Agente</h1>
          <p className="text-sm text-[var(--text-tertiary-light)]">Configura la disponibilidad de tu IA y de tu equipo humano.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHelp(v => !v)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all shrink-0 h-10",
              showHelp
                ? "bg-[var(--bg-sidebar)] border-[var(--border-dark)] text-[var(--accent)]"
                : "bg-[var(--bg-card)] border-[var(--border-light)] text-[var(--text-secondary-light)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary-light)]"
            )}
          >
            <HelpCircle className="w-4 h-4" />
            ¿Cómo funciona?
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showHelp && "rotate-180")} />
          </button>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] px-8 h-10 rounded-xl"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Guardar Cambios
          </Button>
        </div>
      </div>

      {/* Panel de ayuda expandible */}
      {showHelp && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-light)] rounded-3xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-6 py-6 border-b border-[var(--border-light)]">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--bg-sidebar)] border border-[var(--border-dark)] flex items-center justify-center shrink-0">
                <Lightbulb className="w-4 h-4 text-[var(--accent)]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-[var(--text-primary-light)]">Diferencia entre horarios</h3>
                <p className="text-sm text-[var(--text-secondary-light)] leading-relaxed">
                  Tenés dos tipos de horarios independientes para máxima flexibilidad:
                </p>
                <ul className="space-y-3 mt-3">
                  <li className="text-sm text-[var(--text-secondary-light)]">
                    <span className="font-bold text-[var(--text-primary-light)]">1. Horario de la IA:</span> Define cuándo el bot responde mensajes. Si está fuera de horario, la IA no responderá nada (o enviará el mensaje de fuera de servicio si el canal lo soporta).
                  </li>
                  <li className="text-sm text-[var(--text-secondary-light)]">
                    <span className="font-bold text-[var(--text-primary-light)]">2. Atención Humana:</span> Indica a la IA cuándo hay personas trabajando. Si un cliente pide hablar con alguien fuera de este horario, la IA le avisará cuándo vuelven y tomará el mensaje para que lo vean después.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="ia" className="space-y-6">
        <TabsList className="bg-[var(--bg-card)] border border-[var(--border-light)] p-1 rounded-2xl">
          <TabsTrigger value="ia" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-[var(--accent)] data-[state=active]:text-[var(--accent-text)]">
            <Sun className="w-4 h-4 mr-2" />
            Horario de la IA
          </TabsTrigger>
          <TabsTrigger value="humano" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-[var(--accent)] data-[state=active]:text-[var(--accent-text)]">
            <Users className="w-4 h-4 mr-2" />
            Atención Humana
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ia" className="mt-0 outline-none">
          {renderScheduleForm('ia')}
        </TabsContent>
        <TabsContent value="humano" className="mt-0 outline-none">
          {renderScheduleForm('humano')}
        </TabsContent>
      </Tabs>
    </div>
  );
}
