"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, Send, X, Users, Minimize2, Maximize2, Sparkles, User, AlertCircle
} from "lucide-react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { auth, db } from "@/lib/firebase";
import { 
  collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, 
  where, doc, getDocs, limit, Timestamp
} from "firebase/firestore";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUser = auth.currentUser;
  
  // Determinar si el chat está habilitado
  const isChatEnabled = workspace && workspace.plan !== "starter" && workspace.chatInternoHabilitado !== false;

  // Cargar miembros del equipo
  useEffect(() => {
    if (!currentWorkspaceId || !isChatEnabled || !isOpen) return;

    const membersRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, "miembros");
    const unsub = onSnapshot(membersRef, (snap) => {
      const list: Member[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (d.id !== currentUser?.uid) {
          list.push({
            uid: d.id,
            nombre: data.nombre || data.displayName || "Miembro"
          });
        }
      });
      setMembers(list);
    });

    return () => unsub();
  }, [currentWorkspaceId, isChatEnabled, isOpen, currentUser?.uid]);

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
          creadoEl: data.creadoEl
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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUser || !currentWorkspaceId) return;

    const text = inputText;
    setInputText("");

    try {
      let colPath = "";
      if (activeTab === "general") {
        colPath = `${COLLECTIONS.ESPACIOS}/${currentWorkspaceId}/chatsEquipo/general/mensajes`;
      } else {
        if (!selectedMember) return;
        const ids = [currentUser.uid, selectedMember.uid].sort();
        const chatId = `${ids[0]}_${ids[1]}`;
        colPath = `${COLLECTIONS.ESPACIOS}/${currentWorkspaceId}/chatsEquipo/${chatId}/mensajes`;
      }

      await addDoc(collection(db, colPath), {
        remitenteUid: currentUser.uid,
        remitenteNombre: currentUser.displayName || currentUser.email?.split("@")[0] || "Operador",
        contenido: text,
        creadoEl: serverTimestamp()
      });
    } catch (error) {
      console.error("Error al enviar mensaje de equipo:", error);
    }
  };

  if (!isChatEnabled) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      {/* Botón flotante burbuja */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.3)] transition-all hover:scale-105 active:scale-95"
        >
          <MessageSquare className="w-6 h-6 text-black" />
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
                            <span className="text-[12px] font-bold text-white/80">{m.nombre}</span>
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
                                  "max-w-[80%] px-3.5 py-2 rounded-2xl text-[12px] leading-relaxed font-semibold",
                                  isMe 
                                    ? "bg-[#C8FF00]/10 border border-[#C8FF00]/20 text-white rounded-tr-sm" 
                                    : "bg-white/5 border border-white/5 text-white/90 rounded-tl-sm"
                                )}
                              >
                                {m.contenido}
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Input bar */}
                    <form onSubmit={handleSend} className="p-3 border-t border-white/5 flex gap-2">
                      <Input
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Escribe un mensaje..."
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
