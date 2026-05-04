import React, { useState } from "react";
import { BottomSheet } from "@/components/mobile/shared/BottomSheet";
import { useContactos } from "@/hooks/useContactos";
import { Phone, Mail, Calendar, Tag, ShieldAlert, MessageCircle, Edit2, Check, X, User, Plus, Trash2, Loader2 } from "lucide-react";
import { COLLECTIONS, EtiquetaCRM, Contacto, CategoriaCRM } from "@/lib/types/firestore";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, doc, updateDoc, Timestamp, arrayRemove, orderBy, deleteDoc } from "firebase/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuPortal
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface MobileContactSheetProps {
  open: boolean;
  onClose: () => void;
  contactoId: string;
}

export function MobileContactSheet({ open, onClose, contactoId }: MobileContactSheetProps) {
  const { contactos } = useContactos();
  const [allTags, setAllTags] = useState<EtiquetaCRM[]>([]);
  const [categories, setCategories] = useState<CategoriaCRM[]>([]);
  const { currentWorkspaceId } = useWorkspaceStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [imgError, setImgError] = useState(false);
  const contact = contactos.find(c => c.id === contactoId);

  // Estados de edición
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Contacto>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Cargar configuración de etiquetas y categorías
  React.useEffect(() => {
    if (!currentWorkspaceId || !open) return;
    
    const qCats = query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CATEGORIAS_CRM), orderBy("orden", "asc"));
    const qTags = query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.ETIQUETAS_CRM));
    
    const unsubCats = onSnapshot(qCats, snap => setCategories(snap.docs.map(d => ({...d.data(), id: d.id} as CategoriaCRM))));
    const unsubTags = onSnapshot(qTags, snap => setAllTags(snap.docs.map(d => ({...d.data(), id: d.id} as EtiquetaCRM))));
    
    return () => { unsubCats(); unsubTags(); };
  }, [currentWorkspaceId, open]);

  const handleAddTag = async (tag: EtiquetaCRM) => {
    if (!currentWorkspaceId || !contactoId || !contact) return;
    const contactRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS, contactoId);
    
    try {
      const cat = categories.find(c => c.id === tag.categoriaId);
      let newTags = [...(contact.etiquetas || [])];

      if (cat?.tipo === 'exclusiva') {
        const otherTagsInCat = allTags.filter(t => t.categoriaId === cat.id && t.id !== tag.id).map(t => t.id);
        newTags = newTags.filter(tId => !otherTagsInCat.includes(tId));
      }

      if (!newTags.includes(tag.id!)) {
        newTags.push(tag.id!);
      }

      await updateDoc(contactRef, { etiquetas: newTags });
      toast.success(`Etiqueta ${tag.nombre} añadida`);
    } catch (e) { toast.error("Error al añadir etiqueta"); }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!currentWorkspaceId || !contactoId) return;
    await updateDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS, contactoId), {
      etiquetas: arrayRemove(tagId)
    });
  };

  // Inicializar form al editar
  const handleStartEdit = () => {
    if (!contact) return;
    setEditForm({
      nombre: contact.nombre || "",
      email: contact.email || "",
      fechaNacimiento: contact.fechaNacimiento || "",
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



  return (
    <BottomSheet 
      open={open} 
      onClose={() => { setIsEditing(false); onClose(); }} 
      title={isEditing ? "Editar Contacto" : "Detalle del Contacto"}
    >
      <div className="space-y-6 pb-10">
        {/* Header con Avatar y Botón Editar */}
        <div className="relative flex flex-col items-center gap-3 py-4">
          <div className="absolute top-0 right-0 flex items-center gap-1">
            {isEditing ? (
              <>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="p-2.5 rounded-full bg-slate-100 text-slate-500 active:scale-90 transition-all"
                >
                  <X size={20} />
                </button>
                <button 
                  onClick={handleSave}
                  className="p-2.5 rounded-full bg-emerald-500 text-white active:scale-90 transition-all shadow-md shadow-emerald-200"
                >
                  {isSaving ? <Loader2 className="size-5 animate-spin" /> : <Check size={20} />}
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={async () => {
                    if (window.confirm("¿Estás seguro de que deseas eliminar este contacto?")) {
                      try {
                        if (!currentWorkspaceId || !contactoId) return;
                        await deleteDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS, contactoId));
                        toast.success("Contacto eliminado");
                        onClose();
                      } catch (e) {
                        console.error(e);
                        toast.error("Error al eliminar");
                      }
                    }
                  }}
                  className="p-2.5 rounded-full bg-rose-50 text-rose-500 active:scale-90 transition-all"
                >
                  <Trash2 size={20} />
                </button>
                <button 
                  onClick={handleStartEdit}
                  className="p-2.5 rounded-full bg-slate-100 text-slate-500 active:scale-90 transition-all"
                >
                  <Edit2 size={20} />
                </button>
              </>
            )}
          </div>

          <div className="size-24 rounded-full bg-slate-100 border-4 border-slate-50 flex items-center justify-center overflow-hidden shadow-md">
            {contact.avatarUrl && !imgError ? (
              <img 
                src={contact.avatarUrl} 
                alt={contact.nombre} 
                className="w-full h-full object-cover" 
                onError={() => setImgError(true)}
              />
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

                </div>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-slate-900">{contact.nombre}</h2>
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

        {/* Segmentación (Igual que escritorio) */}
        <div className="space-y-4 pt-4 border-t border-slate-50">
           <div className="flex items-center justify-between px-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Segmentación</p>
              <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <DropdownMenuTrigger 
                  render={
                    <button 
                      type="button"
                      onClick={() => setIsMenuOpen(true)}
                      className="size-8 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] shadow-sm flex items-center justify-center active:scale-95 transition-all outline-none"
                    />
                  }
                >
                  <Plus className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuContent align="end" className="w-[240px] bg-white border-slate-100 max-h-[400px] overflow-y-auto no-scrollbar z-[300]">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="text-[9px] font-bold uppercase text-slate-400 px-2 py-1">Opciones</DropdownMenuLabel>
                      <DropdownMenuItem className="text-[12px] font-bold py-2" onClick={() => toast.info("Menu abierto")}>
                        <Check className="size-3 mr-2 text-emerald-500" />
                        Probar Menú
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator className="bg-slate-50" />
                    {categories.map(cat => (
                      <div key={cat.id}>
                        <DropdownMenuGroup>
                          <DropdownMenuLabel className="text-[9px] font-bold uppercase tracking-tighter text-slate-400 bg-slate-50 py-1">{cat.nombre}</DropdownMenuLabel>
                          {allTags.filter(t => t.categoriaId === cat.id).map(tag => (
                            <DropdownMenuItem key={tag.id} onClick={() => handleAddTag(tag)} className="text-[12px] font-bold gap-2 py-2">
                              <div className="size-2 rounded-full" style={{ backgroundColor: tag.colorBg }} />
                              {tag.nombre}
                              {(contact.etiquetas || []).includes(tag.id!) && <Check className="size-3 ml-auto text-emerald-500" />}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator className="bg-slate-50" />
                      </div>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenuPortal>
              </DropdownMenu>
           </div>

           <div className="flex flex-wrap gap-2">
              {(contact.etiquetas || []).map(tId => {
                const tag = allTags.find(t => t.id === tId);
                if (!tag) return null;
                return (
                  <Badge 
                    key={tId} 
                    className="bg-slate-50 text-slate-600 border-slate-100 font-bold text-[10px] px-2 py-1 gap-1.5 rounded-lg group"
                  >
                    <div className="size-1.5 rounded-full" style={{ backgroundColor: tag.colorBg }} />
                    {tag.nombre}
                    <button onClick={() => handleRemoveTag(tId)} className="ml-1"><X className="size-2.5 text-rose-500" /></button>
                  </Badge>
                );
              })}
              {(!contact.etiquetas || contact.etiquetas.length === 0) && (
                <p className="text-[11px] text-slate-400 italic px-1">Sin etiquetas personalizadas</p>
              )}
           </div>
        </div>

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
