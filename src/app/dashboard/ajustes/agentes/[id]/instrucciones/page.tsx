"use client";

import React, { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp, increment } from "firebase/firestore";
import { COLLECTIONS, Agente } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { 
  Save, 
  Loader2, 
  Sparkles, 
  HelpCircle, 
  ListOrdered, 
  FilePlus, 
  LayoutTemplate,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useParams } from "next/navigation";

const SNIPPETS = [
  { label: "Seguir pasos", icon: ListOrdered, text: "Seguí estos pasos en orden:\n1. \n2. \n3. " },
  { label: "Hacer preguntas", icon: HelpCircle, text: "Si no tenés la información, preguntá brevemente: " },
  { label: "Enviar recurso", icon: FilePlus, text: "Si el cliente pregunta sobre [tema], enviá el recurso [nombre]." },
  { label: "Usar plantillas", icon: LayoutTemplate, text: "Respondé usando esta estructura:\n- Saludo\n- Respuesta\n- Cierre" },
];

export default function InstruccionesAgente() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const { id } = useParams();
  const [instrucciones, setInstrucciones] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function fetchAgente() {
      if (!currentWorkspaceId || !id) return;
      try {
        const docRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.AGENTES, id as string);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data() as Agente;
          setInstrucciones(data.instrucciones || "");
        }
      } catch (err) {
        toast.error("Error al cargar las instrucciones");
      } finally {
        setLoading(false);
      }
    }
    fetchAgente();
  }, [currentWorkspaceId, id]);

  const insertSnippet = (snippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = instrucciones;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    setInstrucciones(before + snippet + after);
    
    // Devolvemos el foco
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 0);
  };

  const handleSave = async () => {
    if (!currentWorkspaceId || !id) return;
    setSaving(true);
    try {
      const docRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.AGENTES, id as string);
      await updateDoc(docRef, {
        instrucciones: instrucciones,
        configuracionVersion: increment(1),
        actualizadoEl: serverTimestamp()
      });
      toast.success("Instrucciones guardadas. El cerebro se está actualizando.");
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
    <div className="p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[var(--accent)] mb-1">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">IA Intelligence</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary-light)]">Instrucciones del Agente</h1>
          <p className="text-sm text-[var(--text-tertiary-light)]">
            Define el comportamiento, tono y reglas específicas que seguirá la IA.
          </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          {/* Barra de Snippets */}
          <div className="flex flex-wrap gap-2 p-1.5 bg-[var(--bg-input)] rounded-xl border border-[var(--border-light)] mb-2">
            {SNIPPETS.map((s, idx) => (
              <button
                key={idx}
                onClick={() => insertSnippet(s.text)}
                className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-[var(--text-secondary-light)] hover:bg-[var(--bg-card)] hover:text-[var(--accent)] rounded-lg transition-all border border-transparent hover:border-[var(--border-light)] shadow-sm"
              >
                <s.icon className="w-3.5 h-3.5" />
                {s.label}
              </button>
            ))}
          </div>

          <div className="relative group">
            <Textarea
              ref={textareaRef}
              value={instrucciones}
              onChange={(e) => setInstrucciones(e.target.value)}
              placeholder="Escribe aquí las instrucciones maestras para tu agente..."
              className="min-h-[500px] bg-[var(--bg-card)] border-[var(--border-light)] focus-visible:ring-1 focus-visible:ring-[var(--accent)] text-sm leading-relaxed p-6 rounded-2xl shadow-inner resize-none font-medium text-[var(--text-primary-light)]"
              maxLength={8000}
            />
            <div className="absolute bottom-4 right-6 flex items-center gap-2 text-[10px] font-bold text-[var(--text-tertiary-light)]">
              <span className={instrucciones.length > 7500 ? "text-[var(--error)]" : ""}>
                {instrucciones.length.toLocaleString()}
              </span>
              <span className="opacity-40">/ 8,000 caracteres</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-5 bg-[var(--accent)]/5 border border-[var(--accent)]/10 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 text-[var(--accent)]">
              <Info className="w-4 h-4" />
              <h4 className="text-sm font-bold">Consejos de Prompting</h4>
            </div>
            <ul className="text-xs text-[var(--text-secondary-light)] space-y-3 leading-relaxed font-medium">
              <li className="flex gap-2">
                <span className="text-[var(--accent)]">•</span>
                <span>Sé muy específico sobre qué **NO hacer** (prohibiciones claras).</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--accent)]">•</span>
                <span>Define el tono: ¿Formal, casual, empático, directo?</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--accent)]">•</span>
                <span>Si usas catálogos, indícale cómo debe presentar los precios.</span>
              </li>
            </ul>
          </div>

          <div className="p-5 bg-[var(--bg-card)] border border-[var(--border-light)] rounded-2xl space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary-light)]">Metadata del Modelo</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-tertiary-light)]">Motor</span>
                <span className="font-bold text-[var(--text-secondary-light)]">Claude 3.5 Sonnet</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-tertiary-light)]">Cache Status</span>
                <span className="font-bold text-[var(--success)]">Efemeral Enabled</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
