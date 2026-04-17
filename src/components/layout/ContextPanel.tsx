"use client";

import React, { useState } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useContactos } from "@/hooks/useContactos";
import { IndicadorIA } from "@/components/ui/IndicadorIA";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, setDoc, arrayUnion, arrayRemove, Timestamp } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/types/firestore";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CanalBadge } from "@/components/ui/CanalBadge";
import { 
  User, Mail, Phone, Calendar, Info, Package, History, Settings, 
  ExternalLink, FileText, Plus, X, Bot, ShieldAlert, Users, Check
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ContextPanel() {
  const { selectedContactId } = useWorkspaceStore();
  const { contactos } = useContactos();
  const { currentWorkspaceId } = useWorkspaceStore();
  const [activeTab, setActiveTab] = useState("perfil");
  const [notas, setNotas] = useState<any[]>([]);
  const [newTag, setNewTag] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedPhone, setEditedPhone] = useState("");
  const [editedEmail, setEditedEmail] = useState("");

  // Búsqueda robusta del contacto (por ID de Firestore o metaId fallback)
  const selectedContact = contactos.find(c => 
    c.id === selectedContactId || (c as any).metaId === selectedContactId
  );

  // Sincronizar estados locales SOLO cuando cambia el ID del contacto seleccionado
  // Esto evita que actualizaciones menores en tiempo real (onSnapshot) borren lo que el usuario escribe
  React.useEffect(() => {
    if (selectedContact) {
      setEditedName(selectedContact.nombre || "");
      setEditedPhone(selectedContact.telefono || "");
      setEditedEmail(selectedContact.email || "");
    } else {
      setEditedName("");
      setEditedPhone("");
      setEditedEmail("");
    }
  }, [selectedContact?.id]); // Solo re-sincronizar si cambia el ID del contacto

  const handleUpdateName = async () => {
    const targetId = selectedContact?.id || selectedContactId;
    if (!editedName.trim() || !currentWorkspaceId || !targetId) return;
    try {
      const contactRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS, targetId);
      const newData: any = { nombre: editedName.trim() };
      if (!selectedContact) {
        newData.creadoEl = Timestamp.now();
        newData.esContactoCRM = false;
        newData.aiBlocked = false;
      }
      await setDoc(contactRef, newData, { merge: true });
      setIsEditingName(false);
      toast.success("Nombre actualizado");
    } catch (error) {
      console.error("Error updating name:", error);
      toast.error("Error al actualizar nombre");
    }
  };

  const handleUpdatePhone = async () => {
    const targetId = selectedContact?.id || selectedContactId;
    if (!currentWorkspaceId || !targetId) {
      toast.error("Falta ID de contacto");
      return;
    }
    
    // Verificación de duplicados
    const newPhone = editedPhone.trim();
    if (newPhone) {
      const duplicate = contactos.find(c => c.id !== targetId && c.telefono === newPhone);
      if (duplicate) {
        toast.error(`El teléfono ya pertenece a: ${duplicate.nombre || 'Otro contacto'}`);
        return;
      }
    }

    const toastId = toast.loading("Guardando...");
    setIsEditingPhone(false); // Cierre optimista
    try {
      const contactRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS, targetId);
      const newData: any = { telefono: editedPhone.trim() };
      if (!selectedContact) {
        newData.nombre = "Prospecto (Recuperado)";
        newData.creadoEl = Timestamp.now();
        newData.esContactoCRM = false;
        newData.aiBlocked = false;
      }
      await setDoc(contactRef, newData, { merge: true });
      toast.success("Teléfono actualizado", { id: toastId });
    } catch (error) {
      console.error("Error updating phone:", error);
      toast.error("Error al actualizar teléfono", { id: toastId });
    }
  };

  const handleUpdateEmail = async () => {
    const targetId = selectedContact?.id || selectedContactId;
    if (!currentWorkspaceId || !targetId) {
      toast.error("Falta ID de contacto");
      return;
    }

    // Verificación de duplicados
    const newEmail = editedEmail.trim();
    if (newEmail) {
      const duplicate = contactos.find(c => c.id !== targetId && c.email?.toLowerCase() === newEmail.toLowerCase());
      if (duplicate) {
        toast.error(`El email ya pertenece a: ${duplicate.nombre || 'Otro contacto'}`);
        return;
      }
    }

    const toastId = toast.loading("Guardando...");
    setIsEditingEmail(false); // Cierre optimista
    try {
      const contactRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS, targetId);
      const newData: any = { email: editedEmail.trim() };
      if (!selectedContact) {
        newData.nombre = "Prospecto (Recuperado)";
        newData.creadoEl = Timestamp.now();
        newData.esContactoCRM = false;
        newData.aiBlocked = false;
      }
      await setDoc(contactRef, newData, { merge: true });
      toast.success("Email actualizado", { id: toastId });
    } catch (error) {
      console.error("Error updating email:", error);
      toast.error("Error al actualizar email", { id: toastId });
    }
  };

  const handlePromoteToCRM = async () => {
    const targetId = selectedContact?.id || selectedContactId;
    if (!currentWorkspaceId || !targetId) return;
    try {
      const contactRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS, targetId);
      const newData: any = { 
        esContactoCRM: true,
        actualizadoEl: Timestamp.now()
      };
      if (!selectedContact) {
        newData.nombre = "Prospecto (Recuperado)";
        newData.creadoEl = Timestamp.now();
        newData.aiBlocked = false;
      }
      await setDoc(contactRef, newData, { merge: true });
      toast.success("Contacto agregado al CRM exitosamente");
    } catch (error) {
      console.error("Error promoting to CRM:", error);
      toast.error("Error al agregar al CRM");
    }
  };

  const handleToggleIA = async (blocked: boolean) => {
    if (!currentWorkspaceId || !selectedContactId) return;
    try {
      const contactRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS, selectedContactId);
      await updateDoc(contactRef, { aiBlocked: blocked });
      toast.success(blocked ? "IA Bloqueada para este contacto" : "IA Activada para este contacto");
    } catch (error) {
      toast.error("Error al actualizar control de IA");
    }
  };

  const handleAddTag = async () => {
    const targetId = selectedContact?.id || selectedContactId;
    if (!newTag.trim() || !currentWorkspaceId || !targetId) return;
    try {
      const contactRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS, targetId);
      await setDoc(contactRef, {
        etiquetas: arrayUnion(newTag.trim().toUpperCase())
      }, { merge: true });
      setNewTag("");
      toast.success("Etiqueta añadida");
    } catch (error) {
      toast.error("Error al añadir etiqueta");
    }
  };

  const handleRemoveTag = async (tag: string) => {
    if (!currentWorkspaceId || !selectedContact?.id) return;
    try {
      const contactRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS, selectedContact.id);
      await updateDoc(contactRef, {
        etiquetas: arrayRemove(tag)
      });
      toast.info("Etiqueta eliminada");
    } catch (error) {
      toast.error("Error al eliminar etiqueta");
    }
  };

  // Suscripción en tiempo real a las notas del contacto
  React.useEffect(() => {
    if (!currentWorkspaceId || !selectedContact?.id) {
      setNotas([]);
      return;
    }

    const notasRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS, selectedContact.id, "notas_internas");
    const q = query(notasRef, orderBy("creadoEl", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotas(docs);
    });

    return () => unsubscribe();
  }, [currentWorkspaceId, selectedContactId]);

  if (!selectedContactId) {
    return (
      <aside className="w-[var(--context-panel-width,350px)] h-full bg-[var(--bg-main)] flex flex-col items-center justify-center p-8 text-center space-y-4 shrink-0 border-l border-[var(--border-light)] hidden xl:flex">
        <div className="w-16 h-16 rounded-full bg-[var(--bg-input)] flex items-center justify-center text-[var(--text-tertiary-light)] shadow-inner">
          <Info className="w-8 h-8" />
        </div>
        <div>
          <p className="text-[15px] font-bold text-[var(--text-primary-light)]">Sin selección</p>
          <p className="text-[12px] text-[var(--text-tertiary-light)] mt-2 max-w-[200px]">
            Selecciona un contacto para visualizar su perfil completo y herramientas CRM.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-[var(--context-panel-width,350px)] h-full bg-[var(--bg-card)] flex flex-col overflow-hidden shrink-0 border-l border-[var(--border-light)] hidden xl:flex">
      {/* Mini Profile Header */}
      <div className="p-6 border-b border-[var(--border-light)] bg-gradient-to-b from-[var(--bg-sidebar)]/20 to-transparent">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-20 h-20 rounded-3xl bg-[var(--bg-input)] border-2 border-[var(--accent)]/20 flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300 relative overflow-hidden">
            {selectedContact?.avatarUrl ? (
              <img src={selectedContact.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-[var(--text-tertiary-light)] opacity-50" />
            )}
          </div>
          <div>
            {isEditingName ? (
              <input 
                autoFocus
                className="text-[17px] font-extrabold text-[var(--text-primary-light)] bg-[var(--bg-input)] border border-[var(--accent)] rounded-lg px-2 py-0.5 w-full outline-none text-center tracking-tight"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()}
                onBlur={() => setIsEditingName(false)}
              />
            ) : (
              <h4 
                className="text-[17px] font-extrabold text-[var(--text-primary-light)] tracking-tight cursor-pointer hover:text-[var(--accent)] transition-colors group flex items-center justify-center gap-2"
                onClick={() => {
                  setEditedName(selectedContact?.nombre || "");
                  setIsEditingName(true);
                }}
              >
                {selectedContact?.nombre || "Cargando..."}
                <Settings className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />
              </h4>
            )}
            <div className="flex items-center justify-center gap-2 mt-1">
              <Badge className="text-[10px] font-bold bg-[var(--text-primary-light)] text-[var(--accent)] hover:bg-[var(--text-secondary-light)] border-none px-2 py-0">
                {selectedContact?.relacionTag || "LEAD"}
              </Badge>
              <div className="w-1 h-1 rounded-full bg-[var(--text-tertiary-light)]"></div>
              <span className="text-[11px] text-[var(--text-secondary-light)] font-medium">Chat Activo</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* CRM Navigation Tabs */}
      <Tabs defaultValue="perfil" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 border-b border-[var(--border-light)] bg-[var(--bg-main)]/50">
          <TabsList className="w-full bg-transparent p-0 h-11 border-none justify-start gap-6">
            <TabsTrigger value="perfil" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--text-primary-light)] data-[state=active]:bg-transparent bg-transparent text-[var(--text-tertiary-light)] data-[state=active]:text-[var(--text-primary-light)] text-[11px] font-bold tracking-wider uppercase px-0 h-full">
              Perfil
            </TabsTrigger>
            <TabsTrigger value="catalogo" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--text-primary-light)] data-[state=active]:bg-transparent bg-transparent text-[var(--text-tertiary-light)] data-[state=active]:text-[var(--text-primary-light)] text-[11px] font-bold tracking-wider uppercase px-0 h-full">
              Catálogo
            </TabsTrigger>
            <TabsTrigger value="actividad" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--text-primary-light)] data-[state=active]:bg-transparent bg-transparent text-[var(--text-tertiary-light)] data-[state=active]:text-[var(--text-primary-light)] text-[11px] font-bold tracking-wider uppercase px-0 h-full">
              Actividad
            </TabsTrigger>
            <TabsTrigger value="notas" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--text-primary-light)] data-[state=active]:bg-transparent bg-transparent text-[var(--text-tertiary-light)] data-[state=active]:text-[var(--text-primary-light)] text-[11px] font-bold tracking-wider uppercase px-0 h-full border-r-0">
              Notas
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          <TabsContent value="perfil" className="p-6 m-0 space-y-8 animate-in fade-in slide-in-from-right-2 duration-300">
            {/* Contact Info */}
            <div className="space-y-4">
              <label className="text-[10px] font-extrabold text-[var(--text-tertiary-light)] uppercase tracking-[0.1em] px-1">Información de contacto</label>
              <div className="grid gap-3">
                <div className="group bg-[var(--bg-input)]/40 p-3 rounded-xl border border-transparent hover:border-[var(--accent)]/30 transition-all">
                  <p className="text-[10px] text-[var(--text-tertiary-light)] font-bold mb-1">TELÉFONO</p>
                  <div className="flex items-center justify-between gap-2">
                    {isEditingPhone ? (
                      <div className="flex items-center gap-1 w-full">
                        <input
                          autoFocus
                          className="w-full bg-transparent border-b border-[var(--accent)] text-[13px] text-[var(--text-primary-light)] font-medium outline-none py-0.5"
                          value={editedPhone}
                          onChange={(e) => setEditedPhone(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdatePhone()}
                        />
                        <button 
                          className="p-1.5 hover:bg-emerald-500/20 text-emerald-600 rounded-lg transition-colors cursor-pointer"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleUpdatePhone();
                          }}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-1.5 hover:bg-rose-500/20 text-rose-600 rounded-lg transition-colors cursor-pointer"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsEditingPhone(false);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <p 
                        className="text-[13px] text-[var(--text-primary-light)] font-medium flex-1 cursor-pointer"
                        onClick={() => {
                          setEditedPhone(selectedContact?.telefono || "");
                          setIsEditingPhone(true);
                        }}
                      >
                        {selectedContact?.telefono || "No disponible"}
                      </p>
                    )}
                    {!isEditingPhone && <Phone className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />}
                  </div>
                </div>

                <div className="group bg-[var(--bg-input)]/40 p-3 rounded-xl border border-transparent hover:border-[var(--accent)]/30 transition-all">
                  <p className="text-[10px] text-[var(--text-tertiary-light)] font-bold mb-1">EMAIL</p>
                  <div className="flex items-center justify-between gap-2">
                    {isEditingEmail ? (
                      <div className="flex items-center gap-1 w-full">
                        <input
                          autoFocus
                          className="w-full bg-transparent border-b border-[var(--accent)] text-[13px] text-[var(--text-primary-light)] font-medium outline-none py-0.5"
                          value={editedEmail}
                          onChange={(e) => setEditedEmail(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdateEmail()}
                        />
                        <button 
                          className="p-1.5 hover:bg-emerald-500/20 text-emerald-600 rounded-lg transition-colors cursor-pointer"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleUpdateEmail();
                          }}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-1.5 hover:bg-rose-500/20 text-rose-600 rounded-lg transition-colors cursor-pointer"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsEditingEmail(false);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <p 
                        className="text-[13px] text-[var(--text-primary-light)] font-medium flex-1 cursor-pointer"
                        onClick={() => {
                          setEditedEmail(selectedContact?.email || "");
                          setIsEditingEmail(true);
                        }}
                      >
                        {selectedContact?.email || "Sin email"}
                      </p>
                    )}
                    {!isEditingEmail && <Mail className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />}
                  </div>
                </div>

                {/* Botón de Promoción al CRM */}
                {(!selectedContact || selectedContact.esContactoCRM !== true) ? (
                  <Button 
                    variant="default" 
                    className="w-full mt-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-bold text-xs shadow-lg shadow-[var(--accent)]/20 py-6 rounded-2xl gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    onClick={async () => {
                      await handlePromoteToCRM();
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    Agregar a mis Contactos
                  </Button>
                ) : (
                  <div className="w-full mt-2 bg-emerald-500/10 text-emerald-600 font-bold text-[13px] py-4 rounded-2xl flex items-center justify-center gap-2 border border-emerald-500/20">
                    <Check className="w-[18px] h-[18px]" />
                    Contacto guardado en CRM
                  </div>
                )}
              </div>
            </div>

            {/* AI Control */}
            <div className="space-y-4">
              <label className="text-[10px] font-extrabold text-[var(--text-tertiary-light)] uppercase tracking-[0.1em] px-1 flex items-center justify-between">
                Control de Inteligencia Artificial
                <Settings className="w-3 h-3" />
              </label>
              <div className="bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-input)] border border-[var(--border-light)] rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "size-9 rounded-xl flex items-center justify-center border transition-all",
                      selectedContact?.aiBlocked 
                        ? "bg-rose-500/10 border-rose-500/20 text-rose-500" 
                        : "bg-[var(--accent)]/10 border-[var(--accent)]/20 text-[var(--accent)]"
                    )}>
                      {selectedContact?.aiBlocked ? <ShieldAlert className="size-5" /> : <Bot className="size-5" />}
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[13px] font-bold text-[var(--text-primary-light)] block italic">
                        {selectedContact?.aiBlocked ? "IA en Pausa" : "IA en Piloto"}
                      </span>
                      <span className="text-[10px] text-[var(--text-tertiary-light)] font-black uppercase tracking-widest">
                        {selectedContact?.aiBlocked ? "Modo Manual" : "Autónomo"}
                      </span>
                    </div>
                  </div>
                  <Switch 
                    checked={!selectedContact?.aiBlocked}
                    onCheckedChange={(checked) => handleToggleIA(!checked)}
                    className="data-[state=checked]:bg-[var(--accent)]"
                  />
                </div>
                <div className={cn(
                  "p-3 rounded-xl border transition-all duration-300",
                  selectedContact?.aiBlocked 
                    ? "bg-rose-500/5 border-rose-500/10" 
                    : "bg-[var(--accent)]/5 border-[var(--accent)]/10"
                )}>
                   <p className="text-[11px] text-[var(--text-secondary-light)] leading-relaxed font-bold">
                     {selectedContact?.aiBlocked 
                        ? "La IA ha sido silenciada. Solo tú puedes responder a este contacto."
                        : "La IA está analizando los mensajes y generará respuestas automáticamente."}
                   </p>
                </div>
              </div>
            </div>

            {/* Tags Section */}
            <div className="space-y-3">
              <label className="text-[10px] font-extrabold text-[var(--text-tertiary-light)] uppercase tracking-[0.1em] px-1">Etiquetas del Contacto</label>
              <div className="flex flex-wrap gap-2">
                {(selectedContact?.etiquetas || []).map((tag: string) => (
                  <Badge 
                    key={tag} 
                    variant="outline" 
                    className="group bg-[var(--bg-input)]/30 text-[var(--text-primary-light)] border-[var(--border-light)] font-bold text-[10px] pr-1.5 py-1 rounded-lg gap-1.5 transition-all hover:border-[var(--accent)]/50"
                  >
                    {tag}
                    <button 
                      onClick={() => handleRemoveTag(tag)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-rose-500/20 rounded transition-all text-rose-500"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </Badge>
                ))}
                
                <div className="flex items-center gap-1.5 w-full mt-2">
                  <input 
                    type="text"
                    placeholder="Nueva etiqueta..."
                    className="flex-1 bg-[var(--bg-input)] border border-[var(--border-light)] rounded-lg px-3 py-1.5 text-[11px] font-bold text-[var(--text-primary-light)] focus:border-[var(--accent)] transition-all outline-none"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <button 
                    onClick={handleAddTag}
                    className="size-8 rounded-lg bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-center shadow-lg shadow-[var(--accent)]/10 hover:opacity-90 transition-all font-bold"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="catalogo" className="p-6 m-0 animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 opacity-70">
              <div className="w-14 h-14 rounded-2xl bg-[var(--bg-input)] flex items-center justify-center">
                <Package className="w-7 h-7 text-[var(--text-tertiary-light)]" />
              </div>
              <div>
                <h5 className="text-[14px] font-bold text-[var(--text-primary-light)]">Catálogo de Productos / Servicios</h5>
                <p className="text-[11px] text-[var(--text-tertiary-light)] mt-1 max-w-[180px]">Próximamente: Envía enlaces rápidos de productos e inmuebles.</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="actividad" className="p-6 m-0 animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="relative space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-[var(--border-light)] px-1">
              {[
                { time: 'Hace 5m', text: 'Entrada del Lead desde Meta Ads', icon: ExternalLink, color: 'text-blue-500' },
                { time: 'Hace 4m', text: 'Primer contacto vía Messenger', icon: History, color: 'text-[var(--accent)]' },
                { time: 'Hace 2m', text: 'Respuesta automática de IA generada', icon: Settings, color: 'text-purple-500' },
              ].map((item, idx) => (
                <div key={idx} className="relative pl-8 flex flex-col gap-1">
                  <div className={cn(
                    "absolute left-0 top-1.5 w-6 h-6 rounded-full bg-[var(--bg-card)] border-2 border-[var(--border-light)] flex items-center justify-center z-10",
                    item.color
                  )}>
                    <item.icon className="w-3 h-3" />
                  </div>
                  <span className="text-[10px] font-bold text-[var(--text-tertiary-light)] uppercase">{item.time}</span>
                  <p className="text-[12px] text-[var(--text-primary-light)] font-semibold leading-tight">{item.text}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="notas" className="p-6 m-0 animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="space-y-4">
              <label className="text-[10px] font-extrabold text-[var(--text-tertiary-light)] uppercase tracking-[0.1em] px-1 flex items-center justify-between">
                Historial de Notas Internas
                <FileText className="w-3 h-3" />
              </label>
              
              {notas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 opacity-60">
                  <div className="w-12 h-12 rounded-xl bg-[var(--bg-input)] flex items-center justify-center">
                    <FileText className="w-6 h-6 text-[var(--text-tertiary-light)]" />
                  </div>
                  <p className="text-[11px] font-medium text-[var(--text-tertiary-light)] max-w-[150px]">
                    No hay notas internas registradas para este contacto.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notas.map((nota) => (
                    <div key={nota.id} className="bg-[#FEFCE8]/50 border border-yellow-100 rounded-xl p-3.5 space-y-2 shadow-sm transition-all hover:border-yellow-200">
                      <p className="text-[12.5px] text-yellow-900 leading-relaxed font-medium">
                        {nota.text}
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-yellow-100/50">
                        <div className="flex items-center gap-1.5">
                           <CanalBadge canal={nota.fuente || 'whatsapp'} showText={false} className="scale-[0.7] opacity-80" />
                           <span className="text-[9px] font-extrabold text-yellow-700/60 uppercase tracking-tighter">
                             {nota.fuente || 'General'}
                           </span>
                        </div>
                        <span className="text-[9px] font-bold text-yellow-600/60 tabular-nums">
                          {nota.creadoEl ? format(nota.creadoEl.toDate(), "d MMM, HH:mm", { locale: es }) : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Footer Actions */}
      <div className="p-4 border-t border-[var(--border-light)] bg-[var(--bg-main)]/30">
         <button className="w-full h-10 bg-transparent hover:bg-[var(--bg-input)] text-[var(--text-primary-light)] text-[12px] font-bold rounded-xl transition-all border border-[var(--border-light)] flex items-center justify-center gap-2">
            Ver historial completo CRM
            <ExternalLink className="w-3.5 h-3.5" />
         </button>
      </div>
    </aside>
  );
}
