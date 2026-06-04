import React, { useState } from "react";
import { BottomSheet } from "@/components/mobile/shared/BottomSheet";
import { useContactos } from "@/hooks/useContactos";
import { Phone, Mail, Calendar, Tag, ShieldAlert, MessageCircle, Edit2, Check, X, User, Plus, Trash2, Loader2, PhoneCall, MessageSquare, Clock, TimerReset, FileText, MoreVertical, History, Pencil } from "lucide-react";
import { COLLECTIONS, EtiquetaCRM, Contacto, CategoriaCRM, InteraccionCRM } from "@/lib/types/firestore";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, doc, updateDoc, Timestamp, arrayRemove, orderBy, deleteDoc, addDoc } from "firebase/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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

  // Estados de Salud (Interacciones)
  const [activeTab, setActiveTab] = useState("perfil");
  const [interacciones, setInteracciones] = useState<InteraccionCRM[]>([]);
  const [newInteraction, setNewInteraction] = useState("");
  const [interactionType, setInteractionType] = useState<InteraccionCRM['tipo']>('nota');
  const [isSavingInteraction, setIsSavingInteraction] = useState(false);
  const [editingInteraction, setEditingInteraction] = useState<InteraccionCRM | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Cargar Interacciones del Contacto
  React.useEffect(() => {
    if (!currentWorkspaceId || !contactoId || !open) {
      setInteracciones([]);
      return;
    }
    const q = query(
      collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS, contactoId, "interacciones"),
      orderBy("creadoEl", "desc")
    );
    return onSnapshot(q, snap => setInteracciones(snap.docs.map(d => ({...d.data(), id: d.id} as InteraccionCRM))));
  }, [currentWorkspaceId, contactoId, open]);

  const groupedInteracciones = React.useMemo(() => {
    const groups: { [key: string]: InteraccionCRM[] } = {};
    interacciones.forEach(log => {
      if (!log.creadoEl) return;
      const date = format(log.creadoEl.toDate(), "yyyy-MM-dd");
      if (!groups[date]) groups[date] = [];
      groups[date].push(log);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [interacciones]);

  const handleAddInteraction = async (resetingOnly = false) => {
    if (!currentWorkspaceId || !contactoId) return;
    if (!resetingOnly && !newInteraction.trim()) return;

    setIsSavingInteraction(true);
    try {
      const contactRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS, contactoId);
      
      if (!resetingOnly) {
        await addDoc(collection(contactRef, "interacciones"), {
          tipo: interactionType,
          contenido: newInteraction.trim(),
          creadoEl: Timestamp.now(),
          creadoPor: "Operador"
        });
      }

      await updateDoc(contactRef, { ultimaInteraccion: Timestamp.now() });
      
      setNewInteraction("");
      toast.success(resetingOnly ? "Contador de salud reiniciado" : "Interacción registrada");
      if (resetingOnly) setActiveTab("perfil");
    } catch (e) { 
      toast.error("Error al registrar la interacción"); 
    } finally { 
      setIsSavingInteraction(false); 
    }
  };

  const handleUpdateInteraction = async () => {
    if (!currentWorkspaceId || !contactoId || !editingInteraction) return;
    setIsUpdating(true);
    try {
      const docRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS, contactoId, "interacciones", editingInteraction.id!);
      await updateDoc(docRef, {
        contenido: editingInteraction.contenido,
        tipo: editingInteraction.tipo,
        actualizadoEl: Timestamp.now()
      });
      toast.success("Interacción actualizada");
      setEditingInteraction(null);
    } catch (e) { 
      toast.error("Error al actualizar la interacción"); 
    } finally { 
      setIsUpdating(false); 
    }
  };

  const handleDeleteInteraction = async (id: string) => {
    if (!currentWorkspaceId || !contactoId) return;
    try {
      const docRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS, contactoId, "interacciones", id);
      await deleteDoc(docRef);
      toast.info("Interacción eliminada");
    } catch (e) { 
      toast.error("Error al eliminar la interacción"); 
    }
  };

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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col overflow-hidden">
          {!isEditing && (
            <div className="px-1 border-b border-slate-100 bg-slate-50/50 rounded-2xl mb-4 p-1">
              <TabsList className="w-full bg-transparent h-10 justify-start gap-2">
                <TabsTrigger value="perfil" className="flex-1 text-[10px] font-bold uppercase tracking-widest rounded-xl">Perfil</TabsTrigger>
                <TabsTrigger value="salud" className="flex-1 text-[10px] font-bold uppercase tracking-widest rounded-xl">Salud</TabsTrigger>
              </TabsList>
            </div>
          )}

          <TabsContent value="perfil" className="m-0 space-y-6">
            {/* Botón para promocionar a CRM (Solo en modo vista y si no es contacto CRM) */}
            {!isEditing && contact.esContactoCRM !== true && (
              <button 
                onClick={() => {
                  if (!currentWorkspaceId || !contactoId) return;
                  const contactRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS, contactoId);
                  updateDoc(contactRef, { esContactoCRM: true })
                    .then(() => toast.success("Agregado a Contactos CRM"))
                    .catch(() => toast.error("Error al agregar a contactos"));
                }}
                className="w-full h-12 bg-[var(--accent)] text-[var(--accent-text)] rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-[var(--accent)]/15 mb-3"
              >
                <Plus size={18} />
                Agregar a Contactos CRM
              </button>
            )}

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
                    <DropdownMenuContent align="end" className="w-[240px] bg-white border border-slate-100 max-h-[400px] overflow-y-auto no-scrollbar z-[300]">
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
                      className="bg-slate-50 text-slate-600 border border-slate-100 font-bold text-[10px] px-2 py-1 gap-1.5 rounded-lg group"
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
          </TabsContent>

          <TabsContent value="salud" className="m-0 space-y-6">
            {!isEditing && (
              <>
                {/* Formulario de registro de interacciones */}
                <div className="bg-white border border-slate-100 rounded-[24px] p-5 space-y-4 shadow-sm relative overflow-hidden group">
                  <div className="flex gap-2">
                    {[
                      { id: 'nota', icon: FileText, label: 'Nota', color: 'blue' },
                      { id: 'llamada', icon: PhoneCall, label: 'Llamada', color: 'emerald' },
                      { id: 'whatsapp', icon: MessageSquare, label: 'Chat', color: 'violet' },
                    ].map(type => (
                      <button 
                        key={type.id}
                        type="button"
                        onClick={() => setInteractionType(type.id as any)}
                        className={cn(
                          "flex-1 flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all border-2",
                          interactionType === type.id 
                            ? `bg-${type.color}-50 border-${type.color}-200 text-${type.color}-600 shadow-sm scale-[1.02]` 
                            : "bg-slate-50 border-transparent text-slate-400 hover:bg-white hover:border-slate-100"
                        )}
                      >
                        <type.icon className={cn("size-4", interactionType === type.id ? `text-${type.color}-600` : "text-slate-400")} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{type.label}</span>
                      </button>
                    ))}
                  </div>
                  
                  <Textarea 
                    placeholder="Detalla lo hablado con el cliente..."
                    className="bg-slate-50 border-transparent focus-visible:bg-white focus-visible:border-[var(--accent)]/30 text-[13px] min-h-[100px] rounded-2xl resize-none shadow-inner transition-all no-scrollbar"
                    value={newInteraction}
                    onChange={e => setNewInteraction(e.target.value)}
                  />
                  
                  <Button 
                    onClick={() => handleAddInteraction()} 
                    disabled={isSavingInteraction || !newInteraction.trim()}
                    className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] h-11 rounded-full font-bold text-xs shadow-lg shadow-[var(--accent)]/20 transition-all hover:scale-[1.01] active:scale-[0.98]"
                  >
                    {isSavingInteraction ? <Loader2 className="size-4 animate-spin" /> : (
                      <div className="flex items-center gap-2">
                        <Plus className="size-4" />
                        Guardar Registro
                      </div>
                    )}
                  </Button>
                </div>

                {/* Historial de Interacciones */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Historial CRM</Label>
                    <Badge variant="outline" className="text-[9px] font-bold px-2 py-0 h-4 border-slate-100 text-slate-400 italic">
                      {interacciones.length} registros
                    </Badge>
                  </div>
                  
                  <div className="space-y-6 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-50">
                    {groupedInteracciones.map(([date, logs]) => (
                      <div key={date} className="space-y-3">
                        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm py-1">
                          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                            {format(new Date(date + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es })}
                          </span>
                        </div>
                        
                        {logs.map(log => (
                          <div key={log.id} className="relative pl-9 space-y-1 group">
                            <div className={cn(
                              "absolute left-0 top-1 size-9 rounded-xl border border-white shadow-sm z-10 flex items-center justify-center transition-all",
                              log.tipo === 'nota' ? "bg-blue-50 text-blue-500" :
                              log.tipo === 'llamada' ? "bg-emerald-50 text-emerald-500" :
                              "bg-violet-50 text-violet-500"
                            )}>
                              {log.tipo === 'nota' ? <FileText className="size-4" /> :
                               log.tipo === 'llamada' ? <PhoneCall className="size-4" /> :
                               <MessageSquare className="size-4" />}
                            </div>
                            <div className="bg-white border border-slate-50 p-4 rounded-[22px] shadow-sm">
                              <div className="flex items-center justify-between mb-2">
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-tighter",
                                  log.tipo === 'nota' ? "text-blue-600" :
                                  log.tipo === 'llamada' ? "text-emerald-600" :
                                  "text-violet-600"
                                )}>{log.tipo}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-slate-300 tabular-nums">
                                    {format(log.creadoEl.toDate(), "HH:mm", { locale: es })}
                                  </span>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger
                                      render={
                                        <button className="p-0.5 hover:bg-slate-100 rounded transition-all">
                                          <MoreVertical className="size-3 text-slate-400" />
                                        </button>
                                      }
                                    />
                                    <DropdownMenuContent align="end" className="bg-white border-slate-100 shadow-xl rounded-xl p-1 w-32 z-[300]">
                                      <DropdownMenuItem onClick={() => setEditingInteraction(log)} className="text-xs font-bold gap-2 cursor-pointer rounded-lg hover:bg-slate-50">
                                        <Pencil className="size-3" /> Editar
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => handleDeleteInteraction(log.id!)} className="text-xs font-bold gap-2 text-rose-500 cursor-pointer rounded-lg hover:bg-rose-50">
                                        <Trash2 className="size-3" /> Borrar
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                              <p className="text-[12.5px] text-slate-600 font-medium leading-relaxed">{log.contenido}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                    {interacciones.length === 0 && (
                      <div className="py-12 flex flex-col items-center justify-center opacity-30 text-center gap-3">
                        <History className="size-10 text-slate-300" />
                        <p className="text-[11px] font-bold uppercase tracking-widest italic text-slate-400">Sin historial previo</p>
                      </div>
                    )}
                  </div>
                </div>

                <Button 
                  onClick={() => handleAddInteraction(true)}
                  variant="outline"
                  className="w-full border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100 h-11 rounded-xl text-xs font-semibold gap-2"
                >
                  <TimerReset className="size-4" />
                  Resetear Salud (Interacción Rápida)
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Modal para editar interacción */}
        <Dialog open={!!editingInteraction} onOpenChange={(open) => !open && setEditingInteraction(null)}>
          <DialogContent className="max-w-xs p-6 bg-white border-none shadow-2xl rounded-2xl z-[350]">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold tracking-tight">Editar Interacción</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="flex gap-2">
                {[
                  { id: 'nota', label: 'Nota' },
                  { id: 'llamada', label: 'Llamada' },
                  { id: 'whatsapp', label: 'WhatsApp' },
                ].map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => editingInteraction && setEditingInteraction({ ...editingInteraction, tipo: type.id as any })}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all uppercase tracking-widest",
                      editingInteraction?.tipo === type.id
                        ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                        : "bg-slate-50 border-transparent text-slate-400"
                    )}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              <Textarea
                className="min-h-[100px] bg-slate-50 border-transparent rounded-2xl focus-visible:bg-white resize-none text-xs"
                value={editingInteraction?.contenido || ""}
                onChange={e => editingInteraction && setEditingInteraction({ ...editingInteraction, contenido: e.target.value })}
              />
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1 h-9 rounded-xl text-xs font-semibold text-slate-500" onClick={() => setEditingInteraction(null)}>Cancelar</Button>
                <Button onClick={handleUpdateInteraction} disabled={isUpdating} className="flex-1 h-9 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800">
                  {isUpdating ? <Loader2 className="size-3.5 animate-spin" /> : "Guardar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </BottomSheet>
  );
}
