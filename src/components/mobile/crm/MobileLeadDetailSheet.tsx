import React, { useState } from "react";
import { BottomSheet } from "../shared/BottomSheet";
import { User, Mail, Phone, Flame, Calendar, MessageCircle, ArrowRightLeft, Trash2, Hash, FileText, Edit2, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { doc, updateDoc, Timestamp } from "firebase/firestore";
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

  if (!lead) return null;

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

        {/* Notas */}
        <div className="space-y-4">
          <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-[0.2em] px-1">Notas internas</p>
          {isEditing ? (
            <textarea 
              value={editForm.notas}
              onChange={e => setEditForm({ ...editForm, notas: e.target.value })}
              className="w-full min-h-[100px] bg-amber-50/30 rounded-[28px] p-5 border border-amber-100/50 text-sm font-medium text-amber-900/70 focus:ring-0"
              placeholder="Escribe notas internas aquí..."
            />
          ) : lead.notas && (
            <div className="bg-amber-50/30 rounded-[28px] p-5 border border-amber-100/50 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-amber-400/20" />
               <p className="text-sm font-medium text-amber-900/70 italic leading-relaxed pl-2">
                 "{lead.notas}"
               </p>
            </div>
          )}
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
