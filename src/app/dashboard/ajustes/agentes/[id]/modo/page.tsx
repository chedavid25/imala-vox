"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp, increment } from "firebase/firestore";
import { COLLECTIONS, Agente } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { 
  ShieldAlert, 
  MessageSquareReply, 
  Headset, 
  Mail, 
  Save, 
  Loader2, 
  ShieldCheck,
  Zap,
  UserCheck,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";

export default function AgenteModoEscaladaPage() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const { id: agentId } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<Partial<Agente>>({
    modoDefault: 'copiloto',
    strictMode: false,
    escalada: {
      mensajesSinResolucion: 5,
      mensajeEscalada: "Perdón, no logro entenderte bien. Te paso con un asesor humano.",
      notificarEmail: true
    }
  });

  useEffect(() => {
    async function fetchAgente() {
      if (!currentWorkspaceId || !agentId) return;
      try {
        const docRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.AGENTES, agentId as string);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setData(snap.data() as Agente);
        }
      } catch (err) {
        toast.error("Error al cargar configuración");
      } finally {
        setLoading(false);
      }
    }
    fetchAgente();
  }, [currentWorkspaceId, agentId]);

  const handleSave = async () => {
    if (!currentWorkspaceId || !agentId) return;

    // Validar que mensajesSinResolucion sea >= 1
    if (!data.escalada?.mensajesSinResolucion || data.escalada.mensajesSinResolucion < 1) {
      toast.error('El mínimo de mensajes sin resolución es 1');
      return;
    }

    // Validar que mensajeEscalada no esté vacío
    if (!data.escalada.mensajeEscalada?.trim()) {
      toast.error('El mensaje de escalada no puede estar vacío');
      return;
    }

    setSaving(true);
    try {
      const docRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.AGENTES, agentId as string);
      await updateDoc(docRef, {
        ...data,
        configuracionVersion: increment(1),
        actualizadoEl: serverTimestamp()
      });
      toast.success("Configuración de comportamiento guardada");
    } catch (err) {
      toast.error("Error al guardar cambios");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[var(--accent)]" /></div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-end border-b border-[var(--border-light)] pb-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[var(--text-primary-light)]">Modo y Escalada</h1>
          <p className="text-sm text-[var(--text-tertiary-light)]">Define cómo responde el agente y cuándo debe pedir ayuda humana.</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] px-8 shadow-lg shadow-[var(--accent)]/20"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Guardar Cambios
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* MODO DE RESPUESTA */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-[var(--bg-sidebar)] border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] shadow-sm">
                <MessageSquareReply className="w-5 h-5" />
             </div>
             <h3 className="text-lg font-bold text-[var(--text-primary-light)]">Modo de Respuesta</h3>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={() => setData({ ...data, modoDefault: 'auto' })}
              className={cn(
                "p-5 rounded-3xl border text-left transition-all relative overflow-hidden group",
                data.modoDefault === 'auto' ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-sm" : "border-[var(--border-light)] hover:border-[var(--border-light-strong)]"
              )}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold">Auto-reply</h4>
                  <p className="text-xs text-[var(--text-tertiary-light)] font-medium max-w-[200px]">El agente responde inmediatamente a cada mensaje del cliente.</p>
                </div>
                <Zap className={cn("w-5 h-5 transition-colors", data.modoDefault === 'auto' ? "text-[var(--accent)]" : "text-[var(--text-tertiary-light)]")} />
              </div>
            </button>

            <button 
              onClick={() => setData({ ...data, modoDefault: 'copiloto' })}
              className={cn(
                "p-5 rounded-3xl border text-left transition-all relative overflow-hidden group",
                data.modoDefault === 'copiloto' ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-sm" : "border-[var(--border-light)] hover:border-[var(--border-light-strong)]"
              )}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold">Copiloto (Sugerencias)</h4>
                  <p className="text-xs text-[var(--text-tertiary-light)] font-medium max-w-[200px]">El agente genera una respuesta pero el humano debe aprobarla o editarla.</p>
                </div>
                <UserCheck className={cn("w-5 h-5 transition-colors", data.modoDefault === 'copiloto' ? "text-[var(--accent)]" : "text-[var(--text-tertiary-light)]")} />
              </div>
            </button>
          </div>

          {/* MODO ESTRICTO */}
          <div className="p-6 bg-[var(--bg-card)] border border-[var(--border-light)] rounded-3xl space-y-4">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[var(--accent)]" />
                  <Label className="text-sm font-bold">Modo Estricto (RAG Only)</Label>
                </div>
                <Switch 
                  checked={data.strictMode} 
                  onCheckedChange={v => setData({ ...data, strictMode: v })} 
                />
             </div>
             <p className="text-[11px] text-[var(--text-tertiary-light)] leading-relaxed font-medium">
                Si está activado, el agente **solo** responderá con información presente en la base de conocimiento. Si no encuentra el dato, escalará automáticamente sin intentar "deducir" una respuesta.
             </p>
          </div>
        </div>

        {/* ESCALADA */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-[var(--error)]/10 flex items-center justify-center text-[var(--error)]">
                <ShieldAlert className="w-5 h-5" />
             </div>
             <h3 className="text-lg font-bold text-[var(--text-primary-light)]">Reglas de Escalada</h3>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-light)] p-8 rounded-3xl space-y-6">
            <div className="space-y-3">
              <Label className="text-[13px] font-bold">Mensajes sin resolución para escalar</Label>
              <Input 
                type="number" 
                value={data.escalada?.mensajesSinResolucion}
                onChange={e => setData({ ...data, escalada: { ...data.escalada!, mensajesSinResolucion: parseInt(e.target.value) }})}
                className="bg-[var(--bg-input)] border-[var(--border-light)]"
              />
              <p className="text-[10px] text-[var(--text-tertiary-light)] font-medium italic">Recomendado: 3 a 5 mensajes.</p>
            </div>

            <div className="space-y-3">
              <Label className="text-[13px] font-bold">Mensaje de despedida IA</Label>
              <Textarea 
                value={data.escalada?.mensajeEscalada}
                onChange={e => setData({ ...data, escalada: { ...data.escalada!, mensajeEscalada: e.target.value }})}
                className="bg-[var(--bg-input)] border-[var(--border-light)] resize-none h-24"
                placeholder="Ej: Te paso con mis colegas..."
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[var(--border-light)]">
               <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[var(--text-tertiary-light)]" />
                  <Label className="text-[13px] font-medium">Notificar escala por Email</Label>
               </div>
               <Switch 
                 checked={data.escalada?.notificarEmail}
                 onCheckedChange={v => setData({ ...data, escalada: { ...data.escalada!, notificarEmail: v }})}
               />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
