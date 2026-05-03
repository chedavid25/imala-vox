"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useContactos } from "@/hooks/useContactos";
import { useMensajes } from "@/hooks/useMensajes";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  setDoc, 
  arrayUnion, 
  arrayRemove, 
  Timestamp,
  addDoc
} from "firebase/firestore";
import { COLLECTIONS, CategoriaCRM, EtiquetaCRM, InteraccionCRM } from "@/lib/types/firestore";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CanalBadge } from "@/components/ui/CanalBadge";
import { 
  User, Mail, Phone, Calendar, Info, Package, History, Settings, Search,
  ExternalLink, FileText, Plus, X, Bot, ShieldAlert, Check, Image as ImageIcon,
  MoreVertical, Clock, MessageSquare, PhoneCall, Users, ChevronDown, ChevronRight,
  TimerReset, Loader2, Pencil, Trash2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { deleteDoc } from "firebase/firestore";
import { Avatar } from "@/components/ui/Avatar";
import { ModalNuevaTarea } from "@/components/crm/tasks/ModalNuevaTarea";

export function ContextPanel({ onSendMessage }: { onSendMessage?: (text: string) => void }) {
  const router = useRouter();
  const { selectedContactId, currentWorkspaceId, selectedChatId } = useWorkspaceStore();
  const { contactos } = useContactos();
  
  const [activeTab, setActiveTab] = useState("perfil");
  const [categories, setCategories] = useState<CategoriaCRM[]>([]);
  const [masterTags, setMasterTags] = useState<EtiquetaCRM[]>([]);
  const [interacciones, setInteracciones] = useState<InteraccionCRM[]>([]);
  
  const [objetos, setObjetos] = useState<any[]>([]);
  const [busquedaObjetos, setBusquedaObjetos] = useState("");
  const [loadingObjetos, setLoadingObjetos] = useState(false);

  const [newInteraction, setNewInteraction] = useState("");
  const [interactionType, setInteractionType] = useState<InteraccionCRM['tipo']>('nota');
  const [isSavingInteraction, setIsSavingInteraction] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedPhone, setEditedPhone] = useState("");
  const [editedEmail, setEditedEmail] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);

  const [editingInteraction, setEditingInteraction] = useState<InteraccionCRM | null>(null);
  const { mensajes } = useMensajes(selectedChatId);
  const [isUpdating, setIsUpdating] = useState(false);

  const selectedContact = contactos.find(c => 
    c.id === selectedContactId || (c as any).metaId === selectedContactId
  );

  const suggestedData = useMemo(() => {
    if (!mensajes || mensajes.length === 0) return null;
    
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /\+?[0-9]{7,15}/g;

    let foundEmail: string | null = null;
    let foundPhone: string | null = null;

    mensajes.slice(-20).forEach(m => {
      if (m.from !== 'operator' && m.from !== 'system') {
        const emailMatch = m.text?.match(emailRegex);
        if (emailMatch && (!selectedContact?.email || selectedContact.email === '')) foundEmail = emailMatch[0];
        
        const phoneMatch = m.text?.match(phoneRegex);
        if (phoneMatch && (!selectedContact?.telefono || selectedContact.telefono === '')) foundPhone = phoneMatch[0];
      }
    });

    if (foundEmail || foundPhone) return { email: foundEmail, phone: foundPhone };
    return null;
  }, [mensajes, selectedContact]);

  useEffect(() => {
    if (selectedContact) {
      setEditedName(selectedContact.nombre || "");
      setEditedPhone(selectedContact.telefono || "");
      setEditedEmail(selectedContact.email || "");
    }
  }, [selectedContact?.id]);

  // Cargar Categorías y Etiquetas Maestras
  useEffect(() => {
    if (!currentWorkspaceId) return;
    const qCats = query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CATEGORIAS_CRM), orderBy("orden", "asc"));
    const qTags = query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.ETIQUETAS_CRM));
    
    const unsubCats = onSnapshot(qCats, snap => setCategories(snap.docs.map(d => ({...d.data(), id: d.id} as CategoriaCRM))));
    const unsubTags = onSnapshot(qTags, snap => setMasterTags(snap.docs.map(d => ({...d.data(), id: d.id} as EtiquetaCRM))));
    
    return () => { unsubCats(); unsubTags(); };
  }, [currentWorkspaceId]);

  // Cargar Catálogo (Objetos)
  useEffect(() => {
    if (!currentWorkspaceId || activeTab !== "objetos") return;
    setLoadingObjetos(true);
    const q = query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.OBJETOS), orderBy("titulo", "asc"));
    return onSnapshot(q, snap => {
      setObjetos(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      setLoadingObjetos(false);
    });
  }, [currentWorkspaceId, activeTab]);

  const objetosFiltrados = useMemo(() => {
    if (!busquedaObjetos) return objetos;
    const q = busquedaObjetos.toLowerCase();
    return objetos.filter(o => 
      o.titulo.toLowerCase().includes(q) || 
      o.descripcion.toLowerCase().includes(q) ||
      (o.caracteristicas?.marca && o.caracteristicas.marca.toLowerCase().includes(q))
    );
  }, [objetos, busquedaObjetos]);

  const handleEnviarObjeto = (obj: any) => {
    if (!onSendMessage) {
      toast.error("No se puede enviar mensajes desde este panel");
      return;
    }
    const precioStr = obj.precio > 0 ? `💰 *Precio:* ${obj.moneda || 'USD'} ${obj.precio.toLocaleString('es-AR')}` : '💰 *Precio:* Consultar';
    const text = `🙌 *¡Hola! Te comparto la información de este inmueble:*\n\n🏠 *${obj.titulo}*\n${precioStr}\n\n📝 ${obj.descripcion}\n\n${obj.urlFuente ? `🔗 *Ver ficha completa:* ${obj.urlFuente}` : ''}`;
    onSendMessage(text);
    toast.success("Información enviada al chat");
  };

  // Cargar Interacciones
  useEffect(() => {
    if (!currentWorkspaceId || !selectedContact?.id) {
      setInteracciones([]);
      return;
    }
    const q = query(
      collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS, selectedContact.id, "interacciones"),
      orderBy("creadoEl", "desc")
    );
    return onSnapshot(q, snap => setInteracciones(snap.docs.map(d => ({...d.data(), id: d.id} as InteraccionCRM))));
  }, [currentWorkspaceId, selectedContact?.id]);
  
  const groupedInteracciones = useMemo(() => {
    const groups: { [key: string]: InteraccionCRM[] } = {};
    interacciones.forEach(log => {
      const date = format(log.creadoEl.toDate(), "yyyy-MM-dd");
      if (!groups[date]) groups[date] = [];
      groups[date].push(log);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [interacciones]);

  const handleUpdateField = async (field: string, value: any) => {
    const targetId = selectedContact?.id || selectedContactId;
    if (!currentWorkspaceId || !targetId) return;
    try {
      const contactRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS, targetId);
      await updateDoc(contactRef, { [field]: value });
      toast.success("Actualizado");
    } catch (e) { toast.error("Error al actualizar"); }
  };

  const handleAddTag = async (tag: EtiquetaCRM) => {
    if (!currentWorkspaceId || !selectedContact?.id) return;
    const contactRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS, selectedContact.id);
    
    try {
      const cat = categories.find(c => c.id === tag.categoriaId);
      let newTags = [...(selectedContact.etiquetas || [])];

      if (cat?.tipo === 'exclusiva') {
        // Semáforo: Quitar otras etiquetas de la misma categoría
        const otherTagsInCat = masterTags.filter(t => t.categoriaId === cat.id && t.id !== tag.id).map(t => t.id);
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
    if (!currentWorkspaceId || !selectedContact?.id) return;
    await updateDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS, selectedContact.id), {
      etiquetas: arrayRemove(tagId)
    });
  };

  const handleAddInteraction = async (resetingOnly = false) => {
    if (!currentWorkspaceId || !selectedContact?.id) return;
    if (!resetingOnly && !newInteraction.trim()) return;

    setIsSavingInteraction(true);
    try {
      const contactRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS, selectedContact.id);
      
      if (!resetingOnly) {
        // 1. Guardar en interacciones del contacto
        await addDoc(collection(contactRef, "interacciones"), {
          tipo: interactionType,
          contenido: newInteraction.trim(),
          creadoEl: Timestamp.now(),
          creadoPor: "Operador"
        });

        // 2. Si hay un chat activo y es una nota, inyectar en el chat
        if (selectedChatId && interactionType === 'nota') {
          const messagesRef = collection(
            db, 
            COLLECTIONS.ESPACIOS, currentWorkspaceId, 
            COLLECTIONS.CONVERSACIONES, selectedChatId, 
            COLLECTIONS.MENSAJES
          );
          
          await addDoc(messagesRef, {
            text: newInteraction.trim(),
            from: 'system',
            creadoEl: Timestamp.now(),
            metadata: { isInternalNote: true, source: 'crm_panel' }
          });
        }
      }

      await updateDoc(contactRef, { ultimaInteraccion: Timestamp.now() });
      
      setNewInteraction("");
      toast.success(resetingOnly ? "Contador reiniciado" : "Interacción registrada y sincronizada");
      if (resetingOnly) setActiveTab("perfil");
    } catch (e) { toast.error("Error al registrar"); }
    finally { setIsSavingInteraction(false); }
  };

  const handleUpdateInteraction = async () => {
    if (!currentWorkspaceId || !selectedContact?.id || !editingInteraction) return;
    setIsUpdating(true);
    try {
      const docRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS, selectedContact.id, "interacciones", editingInteraction.id!);
      await updateDoc(docRef, {
        contenido: editingInteraction.contenido,
        tipo: editingInteraction.tipo,
        actualizadoEl: Timestamp.now()
      });
      toast.success("Interacción actualizada");
      setEditingInteraction(null);
    } catch (e) { toast.error("Error al actualizar"); }
    finally { setIsUpdating(true); }
  };

  const handleDeleteInteraction = async (id: string) => {
    if (!currentWorkspaceId || !selectedContact?.id) return;
    try {
      const docRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS, selectedContact.id, "interacciones", id);
      await deleteDoc(docRef);
      toast.info("Interacción eliminada");
    } catch (e) { toast.error("Error al eliminar"); }
  };

  if (!selectedContactId) {
    return (
      <aside className="w-[var(--context-panel-width,350px)] h-full bg-[var(--bg-main)] flex flex-col items-center justify-center p-8 text-center space-y-4 shrink-0 border-l border-[var(--border-light)] hidden xl:flex">
        <div className="w-16 h-16 rounded-full bg-[var(--bg-card)] flex items-center justify-center text-[var(--text-tertiary-light)] shadow-inner">
          <Info className="w-8 h-8" />
        </div>
        <p className="text-[13px] font-bold text-[var(--text-primary-light)]">Selecciona un contacto</p>
      </aside>
    );
  }

  return (
    <aside className="w-[var(--context-panel-width,350px)] h-full bg-[var(--bg-card)] flex flex-col overflow-hidden shrink-0 border-l border-[var(--border-light)] hidden xl:flex">
      
      {/* Header Perfil */}
      <div className="p-6 border-b border-[var(--border-light)]">
        <div className="flex flex-col items-center text-center space-y-3">
          <Avatar 
            src={selectedContact?.avatarUrl} 
            name={selectedContact?.nombre || "Prospecto"} 
            size="xl"
            className="rounded-2xl border-2 border-[var(--accent)]/10"
          />
          <div className="group relative flex items-center justify-center gap-2">
            {isEditingName ? (
              <div className="flex items-center gap-2 w-full max-w-[200px]">
                <input 
                  type="text" 
                  value={editedName} 
                  onChange={(e) => setEditedName(e.target.value)}
                  className="bg-transparent border-b border-[var(--accent)] text-[16px] font-bold text-[var(--text-primary-light)] text-center w-full focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateField("nombre", editedName).then(() => setIsEditingName(false))}
                />
                <button onClick={() => handleUpdateField("nombre", editedName).then(() => setIsEditingName(false))}>
                  <Check className="size-4 text-emerald-500" />
                </button>
              </div>
            ) : (
              <>
                <h4 className="text-[16px] font-bold text-[var(--text-primary-light)] tracking-tight">
                  {selectedContact?.nombre || "Prospecto"}
                </h4>
                <button 
                  onClick={() => setIsEditingName(true)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 bg-slate-100 hover:bg-[var(--accent)] hover:text-black rounded-lg transition-all text-slate-600 shadow-sm"
                >
                  <Pencil className="size-3" />
                </button>
              </>
            )}
          </div>
          <div className="flex items-center justify-center gap-2 mt-1">
            <Badge className="text-[10px] font-bold bg-[var(--bg-sidebar)] text-[var(--accent)] border-none px-2.5 h-5 rounded-full shadow-sm">
              {selectedContact?.relacionTag || "LEAD"}
            </Badge>
            <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-[var(--text-tertiary-light)] font-bold uppercase tracking-widest">Activo</span>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 border-b border-[var(--border-light)] bg-[var(--bg-main)]/30">
          <TabsList className="w-full bg-transparent h-12 justify-start gap-4">
            <TabsTrigger value="perfil" className="text-[10px] font-bold uppercase tracking-widest">Perfil</TabsTrigger>
            <TabsTrigger value="interacciones" className="text-[10px] font-bold uppercase tracking-widest">Salud</TabsTrigger>
            <TabsTrigger value="objetos" className="text-[10px] font-bold uppercase tracking-widest">Interés</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          
          <TabsContent value="perfil" className="p-6 m-0 space-y-8 animate-in fade-in">
            {/* Información Básica */}
            <div className="space-y-4">
               <div className="flex items-center justify-between px-1">
                  <Label className="text-[10px] font-bold text-[var(--text-tertiary-light)] uppercase tracking-widest">Información Directa</Label>
                  {suggestedData && (
                    <Badge className="bg-emerald-500 text-white border-none animate-pulse text-[9px] font-bold">Nuevos Datos</Badge>
                  )}
               </div>

               {suggestedData && (
                  <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex flex-col gap-2 animate-in slide-in-from-right-4 duration-500">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1">
                      <Bot className="size-3" /> Sugerencia de la IA
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedData.phone && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 text-[10px] bg-white border-emerald-200 text-emerald-700 font-bold gap-1 rounded-lg hover:bg-emerald-100 transition-colors"
                          onClick={() => handleUpdateField("telefono", suggestedData.phone)}
                        >
                          <Plus className="size-3" /> Tel: {suggestedData.phone}
                        </Button>
                      )}
                      {suggestedData.email && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 text-[10px] bg-white border-emerald-200 text-emerald-700 font-bold gap-1 rounded-lg hover:bg-emerald-100 transition-colors"
                          onClick={() => handleUpdateField("email", suggestedData.email)}
                        >
                          <Plus className="size-3" /> Email: {suggestedData.email}
                        </Button>
                      )}
                    </div>
                  </div>
               )}

               <div className="grid gap-2">
                  <div className="bg-[var(--bg-input)]/50 p-3 rounded-xl border border-[var(--border-light)] group relative overflow-hidden">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[9px] font-bold text-[var(--text-tertiary-light)] uppercase">WhatsApp</p>
                      <button 
                        onClick={() => setIsEditingPhone(!isEditingPhone)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 bg-white hover:bg-[var(--accent)] hover:text-black rounded-lg shadow-sm transition-all text-slate-500"
                      >
                        {isEditingPhone ? <X className="size-3 text-rose-500" /> : <Pencil className="size-3" />}
                      </button>
                    </div>
                    {isEditingPhone ? (
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          value={editedPhone} 
                          onChange={(e) => setEditedPhone(e.target.value)}
                          className="bg-transparent border-b border-[var(--accent)] text-[13px] font-bold w-full focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdateField("telefono", editedPhone).then(() => setIsEditingPhone(false))}
                        />
                        <button onClick={() => handleUpdateField("telefono", editedPhone).then(() => setIsEditingPhone(false))}>
                          <Check className="size-4 text-emerald-500" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-[13px] font-semibold">{selectedContact?.telefono || "No disponible"}</p>
                    )}
                  </div>

                  <div className="bg-[var(--bg-input)]/50 p-3 rounded-xl border border-[var(--border-light)] group relative overflow-hidden">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[9px] font-bold text-[var(--text-tertiary-light)] uppercase">Email</p>
                      <button 
                        onClick={() => setIsEditingEmail(!isEditingEmail)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 bg-white hover:bg-[var(--accent)] hover:text-black rounded-lg shadow-sm transition-all text-slate-500"
                      >
                        {isEditingEmail ? <X className="size-3 text-rose-500" /> : <Pencil className="size-3" />}
                      </button>
                    </div>
                    {isEditingEmail ? (
                      <div className="flex items-center gap-2">
                        <input 
                          type="email" 
                          value={editedEmail} 
                          onChange={(e) => setEditedEmail(e.target.value)}
                          className="bg-transparent border-b border-[var(--accent)] text-[13px] font-bold w-full focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdateField("email", editedEmail).then(() => setIsEditingEmail(false))}
                        />
                        <button onClick={() => handleUpdateField("email", editedEmail).then(() => setIsEditingEmail(false))}>
                          <Check className="size-4 text-emerald-500" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-[13px] font-semibold">{selectedContact?.email || "Sin correo"}</p>
                    )}
                  </div>
                  <div className="bg-[var(--bg-input)]/50 p-3 rounded-xl border border-[var(--border-light)] group relative overflow-hidden">
                    <p className="text-[9px] font-bold text-[var(--text-tertiary-light)] uppercase mb-1">Cumpleaños</p>
                    <input 
                      type="date" 
                      value={selectedContact?.fechaNacimiento || ""} 
                      onChange={(e) => handleUpdateField("fechaNacimiento", e.target.value)}
                      className="text-[13px] font-semibold bg-transparent border-none outline-none w-full"
                    />
                  </div>
               </div>
               <div className="space-y-3">
                  <Label className="text-[10px] font-bold text-[var(--text-tertiary-light)] uppercase tracking-widest px-1">Próximo Seguimiento</Label>
                  <Button 
                    onClick={() => setIsAddingTask(true)}
                    variant="outline"
                    className="w-full border-[var(--border-light)] bg-white text-[var(--text-primary-light)] hover:bg-[var(--bg-input)] h-14 rounded-2xl text-xs font-semibold gap-3 p-4 justify-between transition-all group shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                        <Clock className="size-4 text-[var(--accent-text)]" />
                      </div>
                      <span className="tracking-tight">Programar Tarea de CRM</span>
                    </div>
                    <ChevronRight className="size-3.5 text-[var(--text-tertiary-light)]" />
                  </Button>
               </div>
               <Button 
                onClick={() => handleAddInteraction(true)}
                variant="outline"
                className="w-full border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100 h-11 rounded-xl text-xs font-semibold gap-2"
               >
                 <TimerReset className="size-4" />
                 Resetear Salud (Interacción Rápida)
               </Button>
            </div>

            {/* Tags Unificados */}
            <div className="space-y-4">
               <div className="flex items-center justify-between px-1">
                  <Label className="text-[10px] font-bold text-[var(--text-tertiary-light)] uppercase tracking-widest">Segmentación</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={
                      <Button variant="ghost" size="icon" className="size-7 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] shadow-sm">
                        <Plus className="size-4" />
                      </Button>
                    } />
                    <DropdownMenuContent align="end" className="w-[240px] bg-white border-[var(--border-light)] max-h-[400px] overflow-y-auto no-scrollbar">
                       {categories.map(cat => (
                         <div key={cat.id}>
                            <DropdownMenuGroup>
                              <DropdownMenuLabel className="text-[9px] font-bold uppercase tracking-tighter text-[var(--text-tertiary-light)] bg-slate-50 py-1">{cat.nombre}</DropdownMenuLabel>
                              {masterTags.filter(t => t.categoriaId === cat.id).map(tag => (
                                <DropdownMenuItem key={tag.id} onClick={() => handleAddTag(tag)} className="text-[12px] font-bold gap-2 py-2">
                                  <div className="size-2 rounded-full" style={{ backgroundColor: tag.colorBg }} />
                                  {tag.nombre}
                                  {(selectedContact?.etiquetas || []).includes(tag.id!) && <Check className="size-3 ml-auto text-emerald-500" />}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator className="bg-[var(--border-light)]" />
                         </div>
                       ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
               </div>

               <div className="flex flex-wrap gap-2">
                  {(selectedContact?.etiquetas || []).map(tId => {
                    const tag = masterTags.find(t => t.id === tId);
                    if (!tag) return null;
                    return (
                      <Badge 
                        key={tId} 
                        className="bg-[var(--bg-input)] text-[var(--text-primary-light)] border-[var(--border-light)] font-bold text-[10px] px-2 py-1 gap-1.5 rounded-lg group"
                      >
                        <div className="size-1.5 rounded-full" style={{ backgroundColor: tag.colorBg }} />
                        {tag.nombre}
                        <button onClick={() => handleRemoveTag(tId)} className="opacity-0 group-hover:opacity-100"><X className="size-2.5 text-rose-500" /></button>
                      </Badge>
                    );
                  })}
                  {(!selectedContact?.etiquetas || selectedContact.etiquetas.length === 0) && (
                    <p className="text-[11px] text-[var(--text-tertiary-light)] italic px-1">Sin etiquetas personalizadas</p>
                  )}
               </div>
            </div>
          </TabsContent>

          <TabsContent value="interacciones" className="p-6 m-0 space-y-6 animate-in fade-in">
             {/* Log de Interacción */}
             <div className="bg-white border border-[var(--border-light)] rounded-[24px] p-5 space-y-4 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--accent)] to-indigo-400 opacity-20" />
                
                <div className="flex gap-2">
                   {[
                     { id: 'nota', icon: FileText, label: 'Nota', color: 'blue' },
                     { id: 'llamada', icon: PhoneCall, label: 'Llamada', color: 'emerald' },
                     { id: 'whatsapp', icon: MessageSquare, label: 'Chat', color: 'violet' },
                   ].map(type => (
                     <button 
                      key={type.id}
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

             {/* Historial */}
             <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <Label className="text-[10px] font-bold text-[var(--text-tertiary-light)] uppercase tracking-widest">Historial CRM</Label>
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
                                "absolute left-0 top-1 size-9 rounded-xl border border-white shadow-sm z-10 flex items-center justify-center transition-all group-hover:scale-110",
                                log.tipo === 'nota' ? "bg-blue-50 text-blue-500" :
                                log.tipo === 'llamada' ? "bg-emerald-50 text-emerald-500" :
                                "bg-violet-50 text-violet-500"
                              )}>
                                 {log.tipo === 'nota' ? <FileText className="size-4" /> :
                                  log.tipo === 'llamada' ? <PhoneCall className="size-4" /> :
                                  <MessageSquare className="size-4" />}
                              </div>
                              <div className="bg-white border border-slate-50 p-4 rounded-[22px] shadow-sm group-hover:border-[var(--accent)]/20 transition-all group-hover:shadow-md">
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
                                        <DropdownMenuTrigger render={
                                          <button className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-100 rounded transition-all">
                                            <MoreVertical className="size-3 text-slate-400" />
                                          </button>
                                        } />
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => setEditingInteraction(log)} className="text-xs font-bold gap-2">
                                            <Pencil className="size-3" /> Editar
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem onClick={() => handleDeleteInteraction(log.id!)} className="text-xs font-bold gap-2 text-rose-500">
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
                        <History className="size-10" />
                        <p className="text-[11px] font-bold uppercase tracking-widest italic">Sin historial previo</p>
                     </div>
                   )}
                </div>
             </div>
          </TabsContent>

          <TabsContent value="objetos" className="p-4 m-0 flex flex-col h-full overflow-hidden animate-in fade-in">
             <div className="space-y-4 flex flex-col h-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Buscar producto..."
                    value={busquedaObjetos}
                    onChange={e => setBusquedaObjetos(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-[var(--accent)]/50 transition-all"
                  />
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
                   {loadingObjetos ? (
                     <div className="py-10 flex justify-center">
                        <Loader2 className="size-5 animate-spin text-slate-300" />
                     </div>
                   ) : objetosFiltrados.length === 0 ? (
                     <div className="py-20 text-center space-y-4 opacity-30">
                        <Package className="size-10 mx-auto" />
                        <p className="text-[12px] font-bold uppercase tracking-widest">No se encontraron productos</p>
                     </div>
                   ) : (
                     objetosFiltrados.map(obj => (
                       <div key={obj.id} className="bg-white border border-slate-100 rounded-2xl p-3 space-y-3 hover:border-[var(--accent)]/30 transition-all group shadow-sm">
                          <div className="flex gap-3">
                             {obj.fotos?.[0] ? (
                               <div className="size-12 rounded-lg overflow-hidden shrink-0 border border-slate-50">
                                 <img src={obj.fotos[0]} alt="p" className="w-full h-full object-cover" />
                               </div>
                             ) : (
                               <div className="size-12 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-50">
                                 <ImageIcon className="size-5 text-slate-300" />
                               </div>
                             )}
                             <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-700 truncate">{obj.titulo}</p>
                                <p className="text-[11px] font-black text-[var(--accent)] mt-0.5">
                                   {obj.precio > 0 ? `${obj.moneda || 'USD'} ${obj.precio.toLocaleString('es-AR')}` : 'Consultar'}
                                </p>
                             </div>
                          </div>
                          
                          <Button 
                            onClick={() => handleEnviarObjeto(obj)}
                            className="w-full h-8 bg-slate-50 hover:bg-[var(--accent)] text-slate-600 hover:text-black border border-slate-100 hover:border-transparent text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                          >
                            Enviar al Chat
                          </Button>
                       </div>
                     ))
                   )}
                </div>
             </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Dialogo de Edición */}
      <Dialog open={!!editingInteraction} onOpenChange={(open) => !open && setEditingInteraction(null)}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-black tracking-tight">Editar Interacción</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="flex gap-2">
                {[
                  { id: 'nota', icon: FileText, label: 'Nota', color: 'blue' },
                  { id: 'llamada', icon: PhoneCall, label: 'Llamada', color: 'emerald' },
                  { id: 'whatsapp', icon: MessageSquare, label: 'Chat', color: 'violet' },
                ].map(type => (
                  <button 
                  key={type.id}
                  onClick={() => editingInteraction && setEditingInteraction({...editingInteraction, tipo: type.id as any})}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all",
                    editingInteraction?.tipo === type.id 
                      ? `bg-${type.color}-50 border-${type.color}-200 text-${type.color}-600 shadow-sm scale-[1.02]` 
                      : "bg-slate-50 border-transparent text-slate-400 hover:bg-white hover:border-slate-100"
                  )}
                  >
                    <type.icon className={cn("size-4", editingInteraction?.tipo === type.id ? `text-${type.color}-600` : "text-slate-400")} />
                    <span className="text-[10px] font-black uppercase tracking-wider">{type.label}</span>
                  </button>
                ))}
             </div>
             <Textarea 
                value={editingInteraction?.contenido || ""}
                onChange={e => editingInteraction && setEditingInteraction({...editingInteraction, contenido: e.target.value})}
                className="bg-slate-50 border-transparent focus-visible:bg-white focus-visible:border-[var(--accent)]/30 text-[13px] min-h-[120px] rounded-2xl resize-none shadow-inner no-scrollbar transition-all"
             />
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setEditingInteraction(null)} className="rounded-full">Cancelar</Button>
             <Button onClick={handleUpdateInteraction} className="bg-[var(--accent)] text-[var(--accent-text)] rounded-full px-8">Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ModalNuevaTarea 
        open={isAddingTask}
        onOpenChange={setIsAddingTask}
        initialContactId={selectedContact?.id}
      />
    </aside>
  );
}
