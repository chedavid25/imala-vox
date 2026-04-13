"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp, increment } from "firebase/firestore";
import { COLLECTIONS, Agente } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { 
  Save, 
  Loader2, 
  Users2,
  Contact2,
  ShieldQuestion,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useParams } from "next/navigation";

export default function RolPublicoAgente() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const { id } = useParams();
  const [data, setData] = useState({
    rolPublico: "",
    rolAgente: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchAgente() {
      if (!currentWorkspaceId || !id) return;
      try {
        const docRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.AGENTES, id as string);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const agente = snap.data() as Agente;
          setData({
            rolPublico: agente.rolPublico || "",
            rolAgente: agente.rolAgente || ""
          });
        }
      } catch (err) {
        toast.error("Error al cargar datos del agente");
      } finally {
        setLoading(false);
      }
    }
    fetchAgente();
  }, [currentWorkspaceId, id]);

  const handleSave = async () => {
    if (!currentWorkspaceId || !id) return;
    setSaving(true);
    try {
      const docRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.AGENTES, id as string);
      await updateDoc(docRef, {
        rolPublico: data.rolPublico,
        rolAgente: data.rolAgente,
        configuracionVersion: increment(1),
        actualizadoEl: serverTimestamp()
      });
      toast.success("Perfil de identidad actualizado");
    } catch (err) {
      toast.error("Error al guardar cambios");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[var(--text-primary-light)]">Rol y Público Objetivo</h1>
          <p className="text-sm text-[var(--text-tertiary-light)]">
            Define quién es el agente y con quién está interactuando.
          </p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] px-8 shadow-md"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Guardar Cambios
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
        <div className="md:col-span-12 space-y-8">
          
          {/* CAMPO 1: PÚBLICO */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-light)] p-8 rounded-3xl space-y-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-sidebar)] border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] shadow-sm">
                <Users2 className="w-5 h-5" />
              </div>
              <div>
                <Label htmlFor="publico" className="text-base font-bold text-[var(--text-primary-light)]">¿Con quién va a hablar tu agente?</Label>
                <p className="text-xs text-[var(--text-tertiary-light)]">Describe el perfil de tu cliente ideal o el tipo de usuario.</p>
              </div>
            </div>
            
            <div className="relative">
              <Textarea 
                id="publico"
                placeholder="Ej: Personas interesadas en alquilar departamentos temporarios en Buenos Aires, buscando confort y buena ubicación."
                value={data.rolPublico}
                onChange={e => setData({...data, rolPublico: e.target.value})}
                maxLength={300}
                className="bg-[var(--bg-input)] border-[var(--border-light)] min-h-[100px] text-sm resize-none rounded-2xl p-4 focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
              />
              <div className="absolute bottom-3 right-4 text-[10px] font-bold text-[var(--text-tertiary-light)] opacity-50">
                {data.rolPublico.length} / 300
              </div>
            </div>
          </div>

          {/* CAMPO 2: ROL */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-light)] p-8 rounded-3xl space-y-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-sidebar)] border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] shadow-sm">
                <Contact2 className="w-5 h-5" />
              </div>
              <div>
                <Label htmlFor="rol" className="text-base font-bold text-[var(--text-primary-light)]">¿Cuál es el rol de tu agente?</Label>
                <p className="text-xs text-[var(--text-tertiary-light)]">Define el cargo o la función del agente dentro de tu equipo.</p>
              </div>
            </div>
            
            <div className="relative">
              <Textarea 
                id="rol"
                placeholder="Ej: Un concierge de hospitalidad proactivo, experto en la ciudad y apasionado por brindar un servicio de excelencia."
                value={data.rolAgente}
                onChange={e => setData({...data, rolAgente: e.target.value})}
                maxLength={300}
                className="bg-[var(--bg-input)] border-[var(--border-light)] min-h-[100px] text-sm resize-none rounded-2xl p-4 focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
              />
              <div className="absolute bottom-3 right-4 text-[10px] font-bold text-[var(--text-tertiary-light)] opacity-50">
                {data.rolAgente.length} / 300
              </div>
            </div>
          </div>

          <div className="p-6 bg-[var(--bg-input)] rounded-2xl border border-[var(--border-light)] flex gap-4">
            <div className="shrink-0">
              <Info className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <p className="text-[13px] text-[var(--text-secondary-light)] leading-relaxed">
              <span className="font-bold">Efecto en la IA:</span> Estos campos se inyectan automáticamente en la parte superior de cada interacción. El público ayuda al agente a elegir el tono adecuado, y el rol define su autoridad y límites de respuesta.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
