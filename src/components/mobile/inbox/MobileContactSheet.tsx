import React, { useState } from "react";
import { BottomSheet } from "@/components/mobile/shared/BottomSheet";
import { useContactos } from "@/hooks/useContactos";
import { Phone, Mail, Calendar, Tag, ShieldAlert, MessageCircle, Edit2, Check, X, User } from "lucide-react";
import { COLLECTIONS, EtiquetaCRM, Contacto } from "@/lib/types/firestore";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, doc, updateDoc, Timestamp } from "firebase/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MobileContactSheetProps {
  open: boolean;
  onClose: () => void;
  contactoId: string;
}

export function MobileContactSheet({ open, onClose, contactoId }: MobileContactSheetProps) {
  const { contactos } = useContactos();
  const [allTags, setAllTags] = useState<EtiquetaCRM[]>([]);
  const { currentWorkspaceId } = useWorkspaceStore();
  
  const contact = contactos.find(c => c.id === contactoId);

  // Estados de edición
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Contacto>>({});
  const [isSaving, setIsSaving] = useState(false);

  if (!contact) return null;

  // Cargar etiquetas para resolver nombres
  React.useEffect(() => {
    if (!currentWorkspaceId || !open) return;
    const qTags = query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.ETIQUETAS_CRM));
    const unsubscribe = onSnapshot(qTags, (snap) => {
      setAllTags(snap.docs.map(d => ({ ...d.data(), id: d.id } as EtiquetaCRM)));
    });
    return () => unsubscribe();
  }, [currentWorkspaceId, open]);

  // Inicializar form al editar
  const handleStartEdit = () => {
    if (!contact) return;
    setEditForm({
      nombre: contact.nombre || "",
      email: contact.email || "",
      fechaNacimiento: contact.fechaNacimiento || "",
      relacionTag: contact.relacionTag || "Prospecto",
      telefono: contact.telefono || ""
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!currentWorkspaceId || !contactoId) return;
    setIsSaving(true);
    try {
      const contactRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS, contactoId);
      
      // Limpiar campos undefined para evitar error de Firestore
      const cleanData = Object.fromEntries(
        Object.entries(editForm).filter(([_, v]) => v !== undefined)
      );

      await updateDoc(contactRef, {
        ...cleanData,
        actualizadoEl: Timestamp.now()
      });
      toast.success("Contacto actualizado correctamente");
      setIsEditing(false);
    } catch (error) {
      console.error("Error al actualizar contacto:", error);
      toast.error("No se pudo actualizar el contacto");
    } finally {
      setIsSaving(false);
    }
  };

  if (!contact) return null;

  const relacionTags = ["Prospecto", "Cliente", "VIP", "Inactivo", "Referido"];

  return (
    <BottomSheet 
      open={open} 
      onClose={() => { setIsEditing(false); onClose(); }} 
      title={isEditing ? "Editar Contacto" : "Detalle del Contacto"}
    >
      <div className="space-y-6 pb-10">
        {/* Header con Avatar y Botón Editar */}
        <div className="relative flex flex-col items-center gap-3 py-4">
          <button 
            onClick={isEditing ? () => setIsEditing(false) : handleStartEdit}
            className="absolute top-0 right-2 p-2 rounded-full bg-slate-100 text-slate-500 active:scale-90 transition-all"
          >
            {isEditing ? <X size={20} /> : <Edit2 size={20} />}
          </button>

          <div className="size-24 rounded-full bg-slate-100 border-4 border-slate-50 flex items-center justify-center overflow-hidden shadow-md">
            {contact.avatarUrl ? (
              <img src={contact.avatarUrl} alt={contact.nombre} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-slate-300">
                {contact.nombre?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          
          <div className="text-center w-full px-4">
            {isEditing ? (
              <div className="space-y-3 mt-2">
                <Input 
                  value={editForm.nombre}
                  onChange={e => setEditForm({ ...editForm, nombre: e.target.value })}
                  className="text-center font-bold text-lg h-12 bg-white rounded-2xl border-slate-100"
                  placeholder="Nombre completo"
                />
                <div className="flex flex-wrap justify-center gap-2">
                   {relacionTags.map(tag => (
                     <button
                       key={tag}
                       onClick={() => setEditForm({ ...editForm, relacionTag: tag })}
                       className={cn(
                         "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border",
                         editForm.relacionTag === tag 
                          ? "bg-[var(--accent)] border-[var(--accent)] text-slate-900 shadow-sm" 
                          : "bg-white border-slate-100 text-slate-400"
                       )}
                     >
                       {tag}
                     </button>
                   ))}
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-slate-900">{contact.nombre}</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  {contact.relacionTag || "Prospecto"}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Acciones Principales (Solo en modo vista) */}
        {!isEditing && (
          <div className="grid grid-cols-2 gap-3 px-1">
            <button 
              onClick={() => {
                if (contact.telefono) {
                  window.location.href = `https://wa.me/${contact.telefono.replace(/\D/g, '')}`;
                } else {
                  toast.error("No hay número de teléfono para enviar WhatsApp");
                }
              }}
              className="flex flex-col items-center justify-center gap-2 p-4 bg-[#25D366]/10 text-[#25D366] rounded-3xl border border-[#25D366]/20 font-semibold text-sm active:scale-95 transition-all"
            >
              <div className="size-10 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shadow-lg shadow-[#25D366]/20">
                <MessageCircle size={20} />
              </div>
              WhatsApp
            </button>
            
            <button 
              onClick={() => {
                if (contact.telefono) {
                  window.location.href = `tel:${contact.telefono}`;
                } else {
                  toast.error("No hay número de teléfono para llamar");
                }
              }}
              className="flex flex-col items-center justify-center gap-2 p-4 bg-blue-50 text-blue-600 rounded-3xl border border-blue-100 font-semibold text-sm active:scale-95 transition-all"
            >
              <div className="size-10 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Phone size={20} />
              </div>
              Llamar
            </button>
          </div>
        )}

        {/* Info Cards / Form Fields */}
        <div className="grid gap-3">
          {/* Teléfono */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
            <div className="size-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
              <Phone size={18} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">Teléfono</p>
              {isEditing ? (
                <input 
                  type="tel"
                  value={editForm.telefono || ""}
                  onChange={e => setEditForm({ ...editForm, telefono: e.target.value })}
                  className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-900 p-0"
                  placeholder="+54 9 11 ..."
                />
              ) : (
                <p className="text-sm font-bold text-slate-900">{contact.telefono || "No disponible"}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
            <div className="size-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
              <Mail size={18} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">Email</p>
              {isEditing ? (
                <input 
                  type="email"
                  value={editForm.email || ""}
                  onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-900 p-0"
                  placeholder="email@ejemplo.com"
                />
              ) : (
                <p className="text-sm font-bold text-slate-900">{contact.email || "No disponible"}</p>
              )}
            </div>
          </div>

          {/* Cumpleaños */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
            <div className="size-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
              <Calendar size={18} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">Cumpleaños</p>
              {isEditing ? (
                <input 
                  type="date"
                  value={editForm.fechaNacimiento || ""}
                  onChange={e => setEditForm({ ...editForm, fechaNacimiento: e.target.value })}
                  className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-900 p-0"
                />
              ) : (
                <p className="text-sm font-bold text-slate-900">{contact.fechaNacimiento || "No disponible"}</p>
              )}
            </div>
          </div>
        </div>

        {/* Botón Guardar (Solo en modo edición) */}
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

        {/* Etiquetas / Tags (Solo en modo vista para simplificar) */}
        {!isEditing && (
          <div className="space-y-3 pb-6">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest pl-1">Etiquetas de Segmentación</p>
            <div className="flex flex-wrap gap-2">
              {contact.etiquetas && contact.etiquetas.length > 0 ? (
                contact.etiquetas.map((tagId: string) => {
                  const tag = allTags.find(t => t.id === tagId);
                  return (
                    <span 
                      key={tagId} 
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-600 text-[11px] font-semibold rounded-lg border border-slate-200 shadow-sm"
                    >
                      <div className="size-1.5 rounded-full" style={{ backgroundColor: tag?.colorBg || '#cbd5e1' }} />
                      {tag?.nombre || '...'}
                    </span>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 italic pl-1">Sin etiquetas</p>
              )}
            </div>
          </div>
        )}

        {/* Acciones de Seguridad */}
        {!isEditing && (
          <div className="pt-4 border-t border-slate-100">
             <button className="w-full flex items-center gap-3 p-4 text-rose-500 font-semibold hover:bg-rose-50 rounded-2xl transition-colors">
               <ShieldAlert size={18} />
               Bloquear Contacto
             </button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
