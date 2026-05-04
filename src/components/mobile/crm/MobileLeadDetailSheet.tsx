import React, { useState } from "react";
import { BottomSheet } from "../shared/BottomSheet";
import { User, Mail, Phone, Flame, Calendar, MessageCircle, ArrowRightLeft, Trash2, Hash, FileText, Edit2, Check, X, StickyNote, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { doc, updateDoc, Timestamp, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { toast } from "sonner";

interface MobileLeadDetailSheetProps {
  lead: any;
  open: boolean;
  onClose: () => void;
  onConvert: () => void;
  onWhatsApp: () => void;
  etapas: any[];
}

export function MobileLeadDetailSheet({ lead, open, onClose, onConvert, onWhatsApp, etapas }: MobileLeadDetailSheetProps) {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  // Historial de notas
  const [notasHistorial, setNotasHistorial] = useState<any[]>([]);
  const [nuevaNota, setNuevaNota] = useState("");
  const [guardandoNota, setGuardandoNota] = useState(false);

  // Cargar historial de notas
  React.useEffect(() => {
    if (!currentWorkspaceId || !lead?.id || !open) return;
    const notasRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.LEADS, lead.id, "notasLead");
    const q = query(notasRef, orderBy("creadoEl", "desc")); // Descendente para móvil (más reciente arriba)
    const unsub = onSnapshot(q, (snap) => {
      setNotasHistorial(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [currentWorkspaceId, lead?.id, open]);

  if (!lead) return null;

  const handleAddNota = async () => {
    if (!currentWorkspaceId || !nuevaNota.trim() || !lead?.id) return;
    setGuardandoNota(true);
    try {
      const notasRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.LEADS, lead.id, "notasLead");
      await addDoc(notasRef, { texto: nuevaNota.trim(), creadoEl: serverTimestamp() });
      setNuevaNota("");
      toast.success("Nota añadida");
    } catch {
      toast.error("Error al guardar la nota");
    } finally {
      setGuardandoNota(false);
    }
  };

  const etapa = etapas.find(e => e.id === lead.etapaId);

  const handleStartEdit = () => {
    setEditForm({
      nombre: lead.nombre || "",
      telefono: lead.telefono || "",
      email: lead.email || "",
      temperatura: lead.temperatura || "frio",
      notas: lead.notas || ""
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!currentWorkspaceId || !lead.id) return;
    setIsSaving(true);
    try {
      const leadRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.LEADS, lead.id);
      
      // Limpiar campos undefined
      const cleanData = Object.fromEntries(
        Object.entries(editForm).filter(([_, v]) => v !== undefined)
      );

      await updateDoc(leadRef, {
        ...cleanData,
        actualizadoEl: Timestamp.now()
      });
      toast.success("Lead actualizado correctamente");
      setIsEditing(false);
    } catch (error) {
      console.error("Error al actualizar lead:", error);
      toast.error("No se pudo actualizar el lead");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCall = () => {
    if (lead.telefono) {
      window.location.href = `tel:${lead.telefono.replace(/\s+/g, '')}`;
    } else {
      toast.error("No hay número de teléfono para llamar");
    }
  };

  const handleWhatsAppAction = () => {
    if (lead.telefono) {
      window.location.href = `https://wa.me/${lead.telefono.replace(/\D/g, '')}`;
    } else {
      toast.error("No hay número de teléfono para enviar WhatsApp");
    }
  };

  return (
    <BottomSheet 
      open={open} 
      onClose={() => { setIsEditing(false); onClose(); }} 
      title={isEditing ? "Editar Expediente" : "Expediente del Lead"}
    >
      <div className="p-5 space-y-6 pb-12">
        {/* Header con Perfil Rápido y Botón Editar */}
        <div className="relative flex items-center gap-5 p-5 bg-slate-50 rounded-[28px] border border-slate-100 shadow-inner">
          <button 
            onClick={isEditing ? () => setIsEditing(false) : handleStartEdit}
            className="absolute top-3 right-3 p-2 rounded-full bg-white border border-slate-100 text-slate-400 active:scale-90 transition-all shadow-sm"
          >
            {isEditing ? <X size={18} /> : <Edit2 size={18} />}
          </button>

          <div className="size-16 rounded-full bg-slate-900 flex items-center justify-center text-[var(--accent)] text-2xl font-bold shadow-lg shadow-slate-900/20">
            {lead.nombre?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <Input 
                value={editForm.nombre}
                onChange={e => setEditForm({ ...editForm, nombre: e.target.value })}
                className="font-bold text-base h-10 bg-white border-slate-200"
                placeholder="Nombre del lead"
              />
            ) : (
              <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1 truncate">{lead.nombre}</h3>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-white text-slate-500 border-slate-200 text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-lg shadow-none">
                {lead.origen === 'meta_ads' ? 'Meta Ads' : 'Orgánico'}
              </Badge>
              {isEditing ? (
                <div className="flex gap-1">
                   {['frio', 'tibio', 'caliente'].map(t => (
                     <button
                       key={t}
                       onClick={() => setEditForm({ ...editForm, temperatura: t })}
                       className={cn(
                         "size-6 rounded-md flex items-center justify-center transition-all",
                         editForm.temperatura === t 
                          ? (t === 'caliente' ? "bg-rose-50 text-white" : t === 'tibio' ? "bg-amber-500 text-white" : "bg-blue-500 text-white")
                          : "bg-white border border-slate-200 text-slate-300"
                       )}
                     >
                       <Flame size={14} className={cn(editForm.temperatura === t ? "fill-white" : "")} />
                     </button>
                   ))}
                </div>
              ) : (
                <div className={cn(
                  "flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest",
                  lead.temperatura === 'caliente' ? "text-rose-500" : "text-slate-400"
                )}>
                  <Flame size={12} className={cn(lead.temperatura === 'caliente' ? "fill-rose-500" : "")} />
                  {lead.temperatura}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info de Contacto Estilizada */}
        <div className="space-y-4">
          <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-[0.2em] px-1">Información de contacto</p>
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-[22px] shadow-sm">
              <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                 <Phone size={18} />
              </div>
              <div className="flex-1 min-w-0">
                 <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">WhatsApp / Teléfono</p>
                 {isEditing ? (
                   <input 
                     type="tel"
                     value={editForm.telefono || ""}
                     onChange={e => setEditForm({ ...editForm, telefono: e.target.value })}
                     className="w-full bg-transparent border-none focus:ring-0 text-sm font-semibold text-slate-700 p-0 mt-0.5"
                     placeholder="+54 9 11 ..."
                   />
                 ) : (
                   <p className="text-sm font-semibold text-slate-700 truncate">{lead.telefono || "No especificado"}</p>
                 )}
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-[22px] shadow-sm">
              <div className="size-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                 <Mail size={18} />
              </div>
              <div className="flex-1 min-w-0">
                 <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">Correo Electrónico</p>
                 {isEditing ? (
                   <input 
                     type="email"
                     value={editForm.email || ""}
                     onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                     className="w-full bg-transparent border-none focus:ring-0 text-sm font-semibold text-slate-700 p-0 mt-0.5"
                     placeholder="email@ejemplo.com"
                   />
                 ) : (
                   <p className="text-sm font-semibold text-slate-700 truncate">{lead.email || "No especificado"}</p>
                 )}
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-[22px] shadow-sm">
              <div className="size-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                 <Hash size={18} />
              </div>
              <div className="flex-1 min-w-0">
                 <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">Etapa en el Embudo</p>
                 <p className="text-sm font-semibold" style={{ color: etapa?.color }}>{etapa?.nombre || "Sin clasificar"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Botón Guardar Cambios */}
        {isEditing && (
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSaving ? <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={20} />}
            Guardar Cambios
          </button>
        )}

        {/* Respuestas del Formulario (Solo Vista) */}
        {!isEditing && lead.camposFormulario && Object.keys(lead.camposFormulario).length > 0 && (
          <div className="space-y-4">
            <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-[0.2em] px-1">Respuestas del Formulario</p>
            <div className="bg-slate-50/50 rounded-[28px] p-5 space-y-4 border border-slate-100 shadow-inner">
              {Object.entries(lead.camposFormulario).map(([key, value]) => (
                <div key={key} className="space-y-1.5 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                     <FileText size={12} className="text-slate-300" />
                     <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">{key.replace(/_/g, ' ')}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 pl-5">{String(value)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notas — Historial y Nueva */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-[0.2em]">Notas de seguimiento</p>
            <Badge className="bg-slate-100 text-slate-500 border-none font-bold text-[9px] px-2">{notasHistorial.length + (lead.notas ? 1 : 0)}</Badge>
          </div>
          
          {/* Campo para nueva nota (Solo Vista) */}
          {!isEditing && (
            <div className="space-y-2">
              <textarea 
                value={nuevaNota}
                onChange={e => setNuevaNota(e.target.value)}
                placeholder="Añadir una nota de seguimiento..."
                className="w-full min-h-[80px] bg-white rounded-2xl p-4 border border-slate-100 text-sm focus:ring-1 focus:ring-[var(--accent)] outline-none resize-none shadow-sm transition-all"
              />
              <button 
                onClick={handleAddNota}
                disabled={!nuevaNota.trim() || guardandoNota}
                className="w-full h-11 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                {guardandoNota ? <Loader2 className="size-4 animate-spin" /> : <StickyNote size={16} />}
                Añadir Nota
              </button>
            </div>
          )}

          <div className="space-y-3">
            {/* Nota legacy */}
            {lead.notas && (
              <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-100/50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-400/20" />
                <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <StickyNote size={10} /> Nota Inicial
                </p>
                <p className="text-sm font-medium text-amber-900/70 italic leading-relaxed">
                  "{lead.notas}"
                </p>
              </div>
            )}

            {/* Historial dinámico */}
            {notasHistorial.map((nota, i) => (
              <div key={nota.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-2">
                <div className="flex justify-between items-center">
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                     {nota.creadoEl?.toDate ? new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(nota.creadoEl.toDate()) : "Recién"}
                   </p>
                   <Badge className="bg-slate-50 text-slate-300 border-none text-[8px] font-bold">#{notasHistorial.length - i}</Badge>
                </div>
                <p className="text-sm font-medium text-slate-600 leading-relaxed">
                  {nota.texto}
                </p>
              </div>
            ))}

            {!lead.notas && notasHistorial.length === 0 && (
              <div className="py-8 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                <StickyNote className="size-8 text-slate-200 mx-auto mb-2" />
                <p className="text-[11px] text-slate-400 font-medium italic">Sin notas de seguimiento todavía</p>
              </div>
            )}
          </div>
        </div>

        {/* Acciones Críticas */}
        {!isEditing && (
          <div className="space-y-3 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleCall}
                className="h-14 rounded-2xl bg-blue-600 active:scale-95 transition-all text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-blue-600/20"
              >
                <Phone size={20} strokeWidth={2} /> Llamar
              </button>
              <button 
                onClick={handleWhatsAppAction}
                className="h-14 rounded-2xl bg-[#25D366] active:scale-95 transition-all text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-[#25D366]/20"
              >
                <MessageCircle size={20} strokeWidth={2} /> WhatsApp
              </button>
            </div>
            
            <button 
              onClick={onConvert}
              className="w-full h-14 rounded-2xl bg-slate-900 active:scale-95 transition-all text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20"
            >
              <ArrowRightLeft size={20} strokeWidth={2} /> Convertir a Contacto
            </button>

            <button className="w-full h-12 rounded-2xl text-rose-500 font-bold text-sm gap-2 hover:bg-rose-50 active:scale-95 transition-all flex items-center justify-center">
              <Trash2 size={18} /> Eliminar oportunidad
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
