"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare, Send, X, Users, Minimize2, Maximize2, Sparkles, User, AlertCircle,
  Paperclip, FileText, Download, Loader2
} from "lucide-react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { auth, db, storage } from "@/lib/firebase";
import {
  collection, query, orderBy, onSnapshot, addDoc, serverTimestamp,
  where, doc, getDocs, limit, Timestamp
} from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COLLECTIONS } from "@/lib/types/firestore";

interface Member {
  uid: string;
  nombre: string;
}

interface Message {
  id: string;
  remitenteUid: string;
  remitenteNombre: string;
  contenido: string;
  creadoEl: any;
  mediaUrl?: string;
  mediaTipo?: "image" | "file";
  nombreArchivo?: string;
}

export function TeamChatBubble() {
  const { workspace, currentWorkspaceId } = useWorkspaceStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "dm">("general");
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Conteo de mensajes no leídos del canal general (cuando el chat está cerrado/minimizado)
  const [generalMsgs, setGeneralMsgs] = useState<{ uid: string; ms: number }[]>([]);
  const [lastSeen, setLastSeen] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState(0);

  // No leídos por mensaje directo, indexado por uid del otro miembro
  const [dmUnread, setDmUnread] = useState<Record<string, number>>({});

  const currentUser = auth.currentUser;

  // Se considera "viendo" el general solo cuando el chat está abierto, no minimizado y en esa pestaña
  const isViewingGeneral = isOpen && !isMinimized && activeTab === "general";
  // Se considera "viendo" un DM cuando el chat está abierto, no minimizado, en pestaña DM y con un miembro seleccionado
  const isViewingDM = isOpen && !isMinimized && activeTab === "dm" && !!selectedMember;

  // Helper para el chatId ordenado de un DM
  const dmChatId = (otherUid: string) => {
    if (!currentUser) return null;
    const ids = [currentUser.uid, otherUid].sort();
    return `${ids[0]}_${ids[1]}`;
  };

  // Totales para los badges
  const dmTotalUnread = Object.values(dmUnread).reduce((a, b) => a + b, 0);
  const totalUnread = unreadCount + dmTotalUnread;
  
  // Determinar si el chat está habilitado
  const isChatEnabled = workspace && workspace.plan !== "starter" && workspace.chatInternoHabilitado !== false;

  // Cargar miembros del equipo (siempre activo: necesario para detectar DMs entrantes en segundo plano)
  useEffect(() => {
    if (!currentWorkspaceId || !isChatEnabled) return;

    const membersRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, "miembros");
    const unsub = onSnapshot(membersRef, (snap) => {
      const list: Member[] = [];
      const ids = new Set<string>();
      snap.forEach((d) => {
        const data = d.data();
        ids.add(d.id);
        if (d.id !== currentUser?.uid) {
          list.push({
            uid: d.id,
            nombre: data.nombre || data.displayName || "Miembro"
          });
        }
      });

      // El propietario puede no tener documento en "miembros" (los espacios antiguos
      // solo crean docs para invitados). Lo agregamos sintéticamente para que los
      // invitados puedan enviarle mensajes directos.
      if (
        workspace?.propietarioUid &&
        workspace.propietarioUid !== currentUser?.uid &&
        !ids.has(workspace.propietarioUid)
      ) {
        list.unshift({
          uid: workspace.propietarioUid,
          nombre: workspace.propietarioEmail?.split("@")[0] || "Propietario"
        });
      }

      setMembers(list);
    });

    return () => unsub();
  }, [currentWorkspaceId, isChatEnabled, currentUser?.uid, workspace?.propietarioUid, workspace?.propietarioEmail]);

  // Cargar mensajes según el canal seleccionado
  useEffect(() => {
    if (!currentWorkspaceId || !isChatEnabled || !isOpen) return;

    let q;
    if (activeTab === "general") {
      const colRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, "chatsEquipo", "general", "mensajes");
      q = query(colRef, orderBy("creadoEl", "asc"));
    } else {
      if (!selectedMember || !currentUser) return;
      // Generar chatId ordenado para DM
      const ids = [currentUser.uid, selectedMember.uid].sort();
      const chatId = `${ids[0]}_${ids[1]}`;
      const colRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, "chatsEquipo", chatId, "mensajes");
      q = query(colRef, orderBy("creadoEl", "asc"));
    }

    const unsub = onSnapshot(q, (snap) => {
      const msgs: Message[] = [];
      snap.forEach((doc) => {
        const data = doc.data();
        msgs.push({
          id: doc.id,
          remitenteUid: data.remitenteUid,
          remitenteNombre: data.remitenteNombre || "Operador",
          contenido: data.contenido || "",
          creadoEl: data.creadoEl,
          mediaUrl: data.mediaUrl,
          mediaTipo: data.mediaTipo,
          nombreArchivo: data.nombreArchivo
        });
      });
      setMessages(msgs);
    });

    return () => unsub();
  }, [currentWorkspaceId, isChatEnabled, isOpen, activeTab, selectedMember?.uid, currentUser?.uid]);

  // Hacer scroll automático al final al recibir mensajes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Inicializar "última lectura" desde localStorage al cambiar de espacio
  useEffect(() => {
    if (!currentWorkspaceId) return;
    const stored = Number(localStorage.getItem(`teamchat_lastseen_${currentWorkspaceId}`) || 0);
    setLastSeen(stored);
  }, [currentWorkspaceId]);

  // Listener SIEMPRE activo del canal general para detectar mensajes nuevos
  // aunque el chat esté cerrado o minimizado.
  useEffect(() => {
    if (!currentWorkspaceId || !isChatEnabled) return;

    const colRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, "chatsEquipo", "general", "mensajes");
    const q = query(colRef, orderBy("creadoEl", "desc"), limit(30));
    const unsub = onSnapshot(q, (snap) => {
      const arr = snap.docs.map((d) => {
        const data = d.data();
        const ms = data.creadoEl?.toMillis ? data.creadoEl.toMillis() : 0;
        return { uid: data.remitenteUid as string, ms };
      });
      setGeneralMsgs(arr);
    });

    return () => unsub();
  }, [currentWorkspaceId, isChatEnabled]);

  // Recalcular el contador de no leídos (mensajes de otros más nuevos que la última lectura)
  useEffect(() => {
    if (isViewingGeneral) {
      setUnreadCount(0);
      return;
    }
    const count = generalMsgs.filter((m) => m.ms > lastSeen && m.uid !== currentUser?.uid).length;
    setUnreadCount(count);
  }, [generalMsgs, lastSeen, isViewingGeneral, currentUser?.uid]);

  // Marcar como leído al ver el canal general (al abrir o maximizar)
  useEffect(() => {
    if (isViewingGeneral && currentWorkspaceId) {
      const now = Date.now();
      localStorage.setItem(`teamchat_lastseen_${currentWorkspaceId}`, String(now));
      setLastSeen(now);
    }
  }, [isViewingGeneral, currentWorkspaceId, generalMsgs]);

  // Listener SIEMPRE activo por cada DM, para detectar mensajes directos entrantes
  // aunque el chat esté cerrado, minimizado o en otra conversación.
  useEffect(() => {
    if (!currentWorkspaceId || !isChatEnabled || !currentUser || members.length === 0) return;

    const unsubs: (() => void)[] = [];

    members.forEach((m) => {
      const chatId = dmChatId(m.uid);
      if (!chatId) return;
      const colRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, "chatsEquipo", chatId, "mensajes");
      const q = query(colRef, orderBy("creadoEl", "desc"), limit(30));
      const unsub = onSnapshot(q, (snap) => {
        const seenKey = `teamchat_dm_lastseen_${currentWorkspaceId}_${chatId}`;
        const seen = Number(localStorage.getItem(seenKey) || 0);
        let count = 0;
        snap.forEach((d) => {
          const data = d.data();
          const ms = data.creadoEl?.toMillis ? data.creadoEl.toMillis() : 0;
          if (ms > seen && data.remitenteUid !== currentUser.uid) count++;
        });
        setDmUnread((prev) => ({ ...prev, [m.uid]: count }));
      });
      unsubs.push(unsub);
    });

    return () => unsubs.forEach((u) => u());
  }, [currentWorkspaceId, isChatEnabled, currentUser?.uid, members]);

  // Marcar el DM activo como leído al verlo (al abrir, maximizar o llegar nuevos mensajes)
  useEffect(() => {
    if (isViewingDM && currentWorkspaceId && selectedMember) {
      const chatId = dmChatId(selectedMember.uid);
      if (!chatId) return;
      localStorage.setItem(`teamchat_dm_lastseen_${currentWorkspaceId}_${chatId}`, String(Date.now()));
      setDmUnread((prev) => ({ ...prev, [selectedMember.uid]: 0 }));
    }
  }, [isViewingDM, currentWorkspaceId, selectedMember?.uid, messages]);

  // Resuelve la ruta de la colección de mensajes (general o DM) y el chatId actual
  const getCurrentChat = (): { colPath: string; chatId: string } | null => {
    if (!currentUser || !currentWorkspaceId) return null;
    if (activeTab === "general") {
      return {
        chatId: "general",
        colPath: `${COLLECTIONS.ESPACIOS}/${currentWorkspaceId}/chatsEquipo/general/mensajes`,
      };
    }
    if (!selectedMember) return null;
    const ids = [currentUser.uid, selectedMember.uid].sort();
    const chatId = `${ids[0]}_${ids[1]}`;
    return {
      chatId,
      colPath: `${COLLECTIONS.ESPACIOS}/${currentWorkspaceId}/chatsEquipo/${chatId}/mensajes`,
    };
  };

  const remitenteNombre = () =>
    currentUser?.displayName || currentUser?.email?.split("@")[0] || "Operador";

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUser || !currentWorkspaceId) return;

    const text = inputText;
    setInputText("");

    try {
      const chat = getCurrentChat();
      if (!chat) return;

      await addDoc(collection(db, chat.colPath), {
        remitenteUid: currentUser.uid,
        remitenteNombre: remitenteNombre(),
        contenido: text,
        creadoEl: serverTimestamp()
      });
    } catch (error) {
      console.error("Error al enviar mensaje de equipo:", error);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permitir re-seleccionar el mismo archivo
    if (!file || !currentUser || !currentWorkspaceId) return;

    // Límite de 15 MB
    if (file.size > 15 * 1024 * 1024) {
      console.warn("Archivo demasiado grande para el chat interno (máx. 15 MB)");
      return;
    }

    const chat = getCurrentChat();
    if (!chat) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const isImage = file.type.startsWith("image/");
      const path = `workspaces/${currentWorkspaceId}/team-chat/${chat.chatId}/${Date.now()}.${ext}`;
      const fileRef = storageRef(storage, path);
      const uploadTask = uploadBytesResumable(fileRef, file);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on("state_changed", null, reject, () => resolve());
      });

      const downloadUrl = await getDownloadURL(fileRef);

      await addDoc(collection(db, chat.colPath), {
        remitenteUid: currentUser.uid,
        remitenteNombre: remitenteNombre(),
        contenido: "",
        mediaUrl: downloadUrl,
        mediaTipo: isImage ? "image" : "file",
        nombreArchivo: file.name,
        creadoEl: serverTimestamp()
      });
    } catch (error) {
      console.error("Error al subir archivo al chat de equipo:", error);
    } finally {
      setUploading(false);
    }
  };

  if (!isChatEnabled) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      {/* Botón flotante burbuja */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative w-14 h-14 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.3)] transition-all hover:scale-105 active:scale-95"
        >
          <MessageSquare className="w-6 h-6 text-black" />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] bg-red-500 text-white text-[11px] font-black rounded-full flex items-center justify-center px-1.5 leading-none border-2 border-[var(--bg-main)] shadow-lg">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </button>
      )}

      {/* Ventana de Chat */}
      {isOpen && (
        <div 
          className={cn(
            "w-[380px] bg-[#161615] border border-white/10 rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col transition-all overflow-hidden",
            isMinimized ? "h-[60px]" : "h-[500px]"
          )}
        >
          {/* Header */}
          <div className="px-5 py-4 bg-[#1F1F1E] border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#C8FF00] animate-pulse" />
              <span className="text-xs font-black text-white/95 uppercase tracking-widest">Chat de Equipo</span>
              {isMinimized && totalUnread > 0 && (
                <span className="min-w-[20px] h-[20px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1.5 leading-none shadow">
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsMinimized(!isMinimized)} 
                className="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition-colors"
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button 
                onClick={() => setIsOpen(false)} 
                className="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Cuerpo y footer (sólo si no está minimizado) */}
          {!isMinimized && (
            <>
              {/* Tabs */}
              <div className="flex bg-[#1F1F1E] border-b border-white/5 p-1">
                <button
                  onClick={() => { setActiveTab("general"); setSelectedMember(null); }}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5",
                    activeTab === "general" ? "bg-white/5 text-[#C8FF00]" : "text-white/40 hover:text-white"
                  )}
                >
                  <Users className="w-3.5 h-3.5" />
                  Equipo (General)
                </button>
                <button
                  onClick={() => setActiveTab("dm")}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5",
                    activeTab === "dm" ? "bg-white/5 text-[#C8FF00]" : "text-white/40 hover:text-white"
                  )}
                >
                  <User className="w-3.5 h-3.5" />
                  Directos (DMs)
                  {dmTotalUnread > 0 && (
                    <span className="min-w-[16px] h-[16px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 leading-none">
                      {dmTotalUnread > 99 ? "99+" : dmTotalUnread}
                    </span>
                  )}
                </button>
              </div>

              {/* Área principal */}
              <div className="flex-1 flex overflow-hidden">
                {/* Panel de DMs lateral si estamos en pestaña DM */}
                {activeTab === "dm" && !selectedMember ? (
                  <div className="flex-grow flex flex-col p-4 overflow-y-auto">
                    <span className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-3 px-1">Seleccionar Compañero</span>
                    {members.length === 0 ? (
                      <div className="flex-grow flex flex-col items-center justify-center text-center opacity-40 py-10">
                        <AlertCircle className="w-8 h-8 mb-2" />
                        <p className="text-[11px] font-semibold text-white/70">No hay otros miembros</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {members.map((m) => (
                          <button
                            key={m.uid}
                            onClick={() => setSelectedMember(m)}
                            className="w-full text-left p-3 rounded-2xl border border-white/5 hover:border-[#C8FF00]/20 bg-white/[0.02] hover:bg-[#C8FF00]/5 flex items-center gap-3 transition-all active:scale-[0.98]"
                          >
                            <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-[#C8FF00] uppercase">
                              {m.nombre.charAt(0)}
                            </div>
                            <span className="text-[12px] font-bold text-white/80 flex-1">{m.nombre}</span>
                            {(dmUnread[m.uid] || 0) > 0 && (
                              <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 leading-none shrink-0">
                                {dmUnread[m.uid] > 99 ? "99+" : dmUnread[m.uid]}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  // Ventana de Mensajes (General o DM Activo)
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Header secundario para DM activo */}
                    {activeTab === "dm" && selectedMember && (
                      <div className="px-4 py-2.5 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-[#C8FF00] uppercase">
                            {selectedMember.nombre.charAt(0)}
                          </div>
                          <span className="text-[11px] font-bold text-white/80">{selectedMember.nombre}</span>
                        </div>
                        <button 
                          onClick={() => setSelectedMember(null)} 
                          className="text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white/70"
                        >
                          Atrás
                        </button>
                      </div>
                    )}

                    {/* Mensajes */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
                      {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                          <MessageSquare className="w-8 h-8 mb-2" />
                          <p className="text-[11px] font-semibold text-white/70">Sin mensajes aún. ¡Comenzá la charla!</p>
                        </div>
                      ) : (
                        messages.map((m) => {
                          const isMe = m.remitenteUid === currentUser?.uid;
                          return (
                            <div key={m.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                              {!isMe && (
                                <span className="text-[9px] text-white/30 font-bold mb-1 ml-1">{m.remitenteNombre}</span>
                              )}
                              <div
                                className={cn(
                                  "max-w-[80%] px-3.5 py-2 rounded-2xl text-[12px] leading-relaxed font-semibold space-y-2",
                                  isMe
                                    ? "bg-[#C8FF00]/10 border border-[#C8FF00]/20 text-white rounded-tr-sm"
                                    : "bg-white/5 border border-white/5 text-white/90 rounded-tl-sm"
                                )}
                              >
                                {m.mediaUrl && m.mediaTipo === "image" && (
                                  <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer" className="block">
                                    <img
                                      src={m.mediaUrl}
                                      alt={m.nombreArchivo || "imagen"}
                                      className="rounded-xl max-h-48 w-auto object-cover border border-white/10"
                                    />
                                  </a>
                                )}
                                {m.mediaUrl && m.mediaTipo === "file" && (
                                  <a
                                    href={m.mediaUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={m.nombreArchivo}
                                    className="flex items-center gap-2.5 px-1 py-1 group/file"
                                  >
                                    <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                      <FileText className="w-4 h-4 text-[#C8FF00]" />
                                    </div>
                                    <span className="text-[11px] font-bold truncate max-w-[160px]">{m.nombreArchivo || "Archivo"}</span>
                                    <Download className="w-3.5 h-3.5 opacity-50 group-hover/file:opacity-100 shrink-0" />
                                  </a>
                                )}
                                {m.contenido && <p>{m.contenido}</p>}
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Input bar */}
                    <form onSubmit={handleSend} className="p-3 border-t border-white/5 flex gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
                        onChange={handleFileSelect}
                      />
                      <Button
                        type="button"
                        size="icon"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        title="Adjuntar archivo o imagen"
                        className="bg-white/5 hover:bg-white/10 text-white/70 hover:text-white h-10 w-10 shrink-0 rounded-xl border border-white/5"
                      >
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                      </Button>
                      <Input
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={uploading ? "Subiendo archivo..." : "Escribe un mensaje..."}
                        disabled={uploading}
                        className="bg-white/5 border-white/5 rounded-xl h-10 text-xs font-semibold text-white placeholder-white/20 focus:ring-1 focus:ring-[#C8FF00]/30"
                      />
                      <Button
                        type="submit"
                        size="icon"
                        className="bg-[#C8FF00] hover:bg-[#C8FF00]/90 text-black h-10 w-10 shrink-0 rounded-xl"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
