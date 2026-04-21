"use client";

import React, { useState, useRef, useEffect } from "react";
import { CanalBadge } from "@/components/ui/CanalBadge";
import { useContactos } from "@/hooks/useContactos";
import { IndicadorIA } from "@/components/ui/IndicadorIA";
import { cn } from "@/lib/utils";
import { Send, Paperclip, Smile, Sparkles, CheckCircle2, UserPlus, MoreVertical, MessageCircle, ChevronDown, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/lib/firebase";
import { doc, updateDoc, collection, onSnapshot, query, Timestamp } from "firebase/firestore";
import { COLLECTIONS, Agente } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Trash2, BellOff, CheckCircle as CheckIcon } from "lucide-react";
import { deleteDoc } from "firebase/firestore";
import { pedirSugerenciaIAAction } from "@/app/actions/ai";
import { Loader2 } from "lucide-react";

interface ChatWindowProps {
  conversacion: any;
  mensajes: any[];
  onSendMessage: (text: string, isInternal?: boolean) => void;
}

export function ChatWindow({ conversacion, mensajes, onSendMessage }: ChatWindowProps) {
  const { contactos } = useContactos();
  const [inputText, setInputText] = useState("");
  const [mode, setMode] = useState<'public' | 'internal'>('public');
  const [miembros, setMiembros] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { currentWorkspaceId } = useWorkspaceStore();
  const [isRequestingSuggestion, setIsRequestingSuggestion] = useState(false);

  const selectedContact = contactos.find(c => c.id === conversacion?.contactoId);
  const contactName = selectedContact?.nombre || conversacion?.contactoNombre || "Desconocido";
  const contactFoto = selectedContact?.avatarUrl || null;

  // Cargar agentes y humanos para reasignación
  useEffect(() => {
    if (!currentWorkspaceId) return;
    
    // 1. Cargar Agentes IA
    const agentesRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.AGENTES);
    const unsubAgentes = onSnapshot(query(agentesRef), (snap) => {
      const agentesData = snap.docs.map(doc => ({ 
        id: doc.id, 
        nombre: `${doc.data().nombre} (IA)`,
        tipo: 'ai'
      }));
      
      // 2. Cargar Miembros Humanos
      const membersRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, "miembros");
      onSnapshot(query(membersRef), (mSnap) => {
        const miembrosData = mSnap.docs.map(doc => ({ 
          id: doc.id, 
          nombre: doc.data().nombre || doc.data().displayName || "Miembro",
          tipo: 'humano'
        }));

        // 3. Añadir al Usuario Actual
        const currentUser = auth.currentUser;
        const currentData = currentUser ? [{
          id: currentUser.uid,
          nombre: `${currentUser.displayName || currentUser.email?.split('@')[0] || "Yo"} (Tú)`,
          tipo: 'humano'
        }] : [];

        // Combinar todo
        setMiembros([...currentData, ...miembrosData, ...agentesData]);
      });
    });

    return () => unsubAgentes();
  }, [currentWorkspaceId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensajes]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText, mode === 'internal');
    setInputText("");
  };

  const handleResolve = async () => {
    if (!currentWorkspaceId || !conversacion.id) return;
    try {
      const convRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONVERSACIONES, conversacion.id);
      await updateDoc(convRef, {
        estado: 'resuelto',
        actualizadoEl: Timestamp.now()
      });
      toast.success("Conversación marcada como resuelta");
    } catch (error) {
      toast.error("Error al resolver la conversación");
    }
  };

  const handleReassign = async (miembroId: string, nombre: string) => {
    if (!currentWorkspaceId || !conversacion.id) return;
    try {
      const convRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONVERSACIONES, conversacion.id);
      await updateDoc(convRef, {
        asignadoA: miembroId,
        asignadoANombre: nombre,
        actualizadoEl: Timestamp.now()
      });
      toast.success(`Conversación reasignada a ${nombre}`);
    } catch (error) {
      toast.error("Error al reasignar");
    }
  };

  const handleDeleteConversation = async () => {
    if (!currentWorkspaceId || !conversacion.id) return;
    if (!confirm("¿Estás seguro de que quieres eliminar esta conversación? Esta acción no se puede deshacer.")) return;
    
    try {
      const convRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONVERSACIONES, conversacion.id);
      await deleteDoc(convRef);
      toast.success("Conversación eliminada");
    } catch (error) {
      toast.error("Error al eliminar");
    }
  };

  const handleMarkUnread = async () => {
    if (!currentWorkspaceId || !conversacion.id) return;
    try {
      const convRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONVERSACIONES, conversacion.id);
      await updateDoc(convRef, { unreadCount: 1 });
      toast.success("Marcada como no leída");
    } catch (error) {
      toast.error("Error al actualizar");
    }
  };

  const handleRequestSuggestion = async () => {
    if (!currentWorkspaceId || !conversacion?.id) return;
    
    setIsRequestingSuggestion(true);
    try {
      const res = await pedirSugerenciaIAAction(currentWorkspaceId, conversacion.id);
      if (res.success) {
        toast.success("Sugerencia solicitada a la IA");
      } else {
        toast.error(res.error || "No se pudo generar la sugerencia");
      }
    } catch (error) {
      toast.error("Error al conectar con la IA");
    } finally {
      setIsRequestingSuggestion(false);
    }
  };

  const handleResumeIA = async () => {
    if (!currentWorkspaceId || !conversacion?.id) return;
    try {
      const convRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONVERSACIONES, conversacion.id);
      await updateDoc(convRef, { 
        modoIA: 'auto',
        actualizadoEl: Timestamp.now()
      });
      toast.success("IA reanudada (Modo Automático)");
    } catch (error) {
      toast.error("Error al reanudar la IA");
    }
  };

  if (!conversacion) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[var(--bg-main)]">
        <div className="w-16 h-16 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] flex items-center justify-center mb-6 shadow-sm">
          <MessageCircle className="w-8 h-8 text-[var(--text-tertiary-light)]" />
        </div>
        <h3 className="text-lg font-bold text-[var(--text-primary-light)] mb-2">Buzón de Entrada Omnicanal</h3>
        <p className="text-sm text-[var(--text-secondary-light)] max-w-sm">
          Selecciona una conversación a la izquierda para comenzar a gestionar el contacto.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-card)]">
      {/* Header */}
      <header className="px-6 py-4 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--bg-card)] shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[var(--bg-input)] border border-[var(--border-light)] flex items-center justify-center font-bold text-sm shadow-sm relative overflow-hidden">
            {contactFoto ? (
              <img src={contactFoto} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              contactName.charAt(0).toUpperCase()
            )}
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-[var(--bg-card)] rounded-full"></div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-bold text-[var(--text-primary-light)] tracking-tight">
                {contactName}
              </h3>
              <CanalBadge canal={conversacion.canal || 'whatsapp'} showIcon={false} className="scale-90" />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-[var(--text-tertiary-light)] font-medium flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                En línea
              </span>
              <span className="text-[11px] text-[var(--text-tertiary-light)]">•</span>
              <IndicadorIA 
                status={
                  conversacion.modoIA === 'pausado' ? 'pausado' : 
                  (conversacion.modoIA === 'auto' || conversacion.modoIA === 'copiloto') ? 'activo' : 'pausado'
                } 
                className="scale-75 origin-left" 
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {conversacion.modoIA === 'pausado' && (
            <Button
              size="sm"
              onClick={handleResumeIA}
              className="h-8 gap-1.5 font-black text-[10px] bg-purple-600/10 text-purple-600 border border-purple-200 hover:bg-purple-600 hover:text-white transition-all animate-in fade-in zoom-in duration-300"
            >
              <Sparkles className="w-3 h-3" />
              REANUDAR IA
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md font-bold text-xs bg-[var(--bg-input)] border border-[var(--border-light)] hover:bg-[var(--bg-main)] text-[var(--text-primary-light)] transition-all shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50">
              <UserPlus className="w-3.5 h-3.5" />
              {conversacion.asignadoANombre || "Reasignar"}
              <ChevronDown className="w-3 h-3 opacity-50 transition-transform data-[open]:rotate-180" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[var(--bg-card)] border-[var(--border-light)] p-1">
              <div className="px-2 py-1.5 text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">Agentes Disponibles</div>
              {miembros.map((m) => (
                <DropdownMenuItem 
                  key={m.id} 
                  onClick={() => handleReassign(m.uid || m.id, m.nombre)}
                  className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary-light)] hover:bg-[var(--accent)] hover:text-[var(--accent-text)] cursor-pointer rounded-lg m-0.5"
                >
                  <div className="w-6 h-6 rounded-full bg-[var(--bg-input)] flex items-center justify-center text-[10px] border border-[var(--border-light)]">
                    {m.nombre.charAt(0)}
                  </div>
                  {m.nombre}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant="default" 
            size="sm" 
            onClick={handleResolve}
            className={cn(
              "h-8 gap-1.5 font-bold text-xs shadow-lg transition-all",
              conversacion.estado === 'resuelto' 
                ? "bg-[var(--success)]/20 text-[var(--success)] border border-[var(--success)]/30" 
                : "bg-[var(--accent)] hover:opacity-90 text-[var(--accent-text)]"
            )}
          >
            {conversacion.estado === 'resuelto' ? (
              <CheckCircle className="w-3.5 h-3.5" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            {conversacion.estado === 'resuelto' ? 'Resuelta' : 'Resolver'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger className="p-2 hover:bg-[var(--bg-input)] rounded-md transition-colors text-[var(--text-tertiary-light)] outline-none">
              <MoreVertical className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-[var(--bg-card)] border-[var(--border-light)] p-1">
              <DropdownMenuItem 
                onClick={handleMarkUnread}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-md hover:bg-[var(--bg-main)] cursor-pointer"
              >
                <BellOff className="w-3.5 h-3.5" />
                Marcar como no leído
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[var(--border-light)] mx-1 my-1" />
              <DropdownMenuItem 
                onClick={handleDeleteConversation}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-md text-red-500 hover:bg-red-500/10 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar Conversación
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Messages View */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 bg-[var(--bg-main)]/30 no-scrollbar"
      >
        {mensajes.map((msg, idx) => {
          const isNote = msg.metadata?.isInternalNote || msg.from === 'system';
          const isMe = msg.from === 'operator';
          
          return (
            <div key={msg.id || idx} className={cn(
              "flex w-full",
              isMe ? "justify-end" : "justify-start"
            )}>
              <div className={cn(
                "max-w-[70%] space-y-1",
                isMe ? "items-end" : "items-start"
              )}>
                <div className={cn(
                  "p-3.5 rounded-2xl text-[13.5px] leading-relaxed shadow-sm",
                  isNote 
                    ? "bg-[#FEFCE8] border border-yellow-200 text-yellow-800" 
                    : isMe 
                      ? "bg-[var(--accent)] text-[var(--accent-text)] font-semibold rounded-tr-none" 
                      : "bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-primary-light)] rounded-tl-none"
                )}>
                  {msg.text}
                </div>
                <div className="flex items-center gap-2 px-1 text-[10px] text-[var(--text-tertiary-light)] font-bold uppercase tracking-wider">
                  {isNote ? "NOTA INTERNA" : isMe ? "AGENTE IMALÁ" : "CLIENTE"}
                  <span>•</span>
                  {msg.creadoEl ? new Date(msg.creadoEl.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Composer Area */}
      <div className="px-6 py-4 border-t border-[var(--border-light)] bg-[var(--bg-card)] space-y-3 shadow-[0_-4px_15px_-5px_rgba(0,0,0,0.1)] flex-shrink-0">
        
        {/* Sugerencia Copiloto */}
        {conversacion.sugerenciaIA && (
          <div className="bg-gradient-to-r from-purple-50 to-purple-100/30 border border-purple-200/80 p-3 rounded-[12px] flex flex-col gap-2 relative shadow-sm animate-in slide-in-from-bottom-2 fade-in">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-500 fill-purple-500/20" />
              <span className="text-[10px] font-bold text-purple-600 tracking-wider">BORRADOR DEL COPILOTO</span>
            </div>
            <p className="text-[13px] text-purple-900/90 leading-relaxed pl-5 whitespace-pre-wrap">{conversacion.sugerenciaIA}</p>
            <div className="flex gap-2 justify-end mt-1">
              <Button variant="ghost" size="sm" className="h-7 text-purple-700/70 hover:text-purple-900 hover:bg-purple-200/50 text-xs transition-colors" onClick={async () => {
                if (!currentWorkspaceId || !conversacion?.id) return;
                await updateDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONVERSACIONES, conversacion.id), { sugerenciaIA: null });
              }}>Descartar</Button>
              <Button size="sm" className="h-7 bg-purple-600 text-white hover:bg-purple-700 text-xs shadow-sm transition-all shadow-purple-500/20" onClick={async () => {
                setInputText(conversacion.sugerenciaIA);
                setMode('public');
                if (!currentWorkspaceId || !conversacion?.id) return;
                await updateDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONVERSACIONES, conversacion.id), { sugerenciaIA: null });
              }}>Usar Texto</Button>
            </div>
          </div>
        )}
        {/* Composer Tabs */}
        <div className="flex items-center gap-1 bg-[var(--bg-input)] p-0.5 rounded-lg w-fit border border-[var(--border-light)]">
          <button 
            onClick={() => setMode('public')}
            className={cn(
              "px-4 py-1.5 rounded-md text-[11px] font-bold transition-all",
              mode === 'public' ? "bg-[var(--bg-card)] text-[var(--accent)] shadow-sm" : "text-[var(--text-secondary-light)] hover:text-[var(--text-primary-light)]"
            )}
          >
            MENSAJE PÚBLICO
          </button>
          <button 
            onClick={() => setMode('internal')}
            className={cn(
              "px-4 py-1.5 rounded-md text-[11px] font-bold transition-all",
              mode === 'internal' ? "bg-yellow-100/50 text-yellow-700 shadow-sm" : "text-[var(--text-secondary-light)] hover:text-[var(--text-primary-light)]"
            )}
          >
            NOTA INTERNA
          </button>
        </div>

        {/* Input Box */}
        <div className={cn(
          "rounded-xl border transition-all duration-200 focus-within:ring-2 focus-within:ring-[var(--accent)]/20 overflow-hidden",
          mode === 'internal' ? "bg-yellow-50/30 border-yellow-200" : "bg-[var(--bg-input)] border-[var(--border-light)]"
        )}>
          <Textarea 
            placeholder={mode === 'internal' ? "Escribe una nota interna para tu equipo..." : "Responde al cliente..."}
            className="border-none bg-transparent focus-visible:ring-0 resize-none min-h-[90px] p-4 text-[14px] leading-relaxed no-scrollbar"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          
          <div className="px-4 py-3 flex items-center justify-between border-t border-[var(--border-light)] bg-[var(--bg-card)]/50">
            <div className="flex items-center gap-1.5">
              <button className="p-2 hover:bg-[var(--bg-input)] rounded-lg text-[var(--text-tertiary-light)] transition-colors">
                <Paperclip className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-[var(--bg-input)] rounded-lg text-[var(--text-tertiary-light)] transition-colors">
                <Smile className="w-4 h-4" />
              </button>
              <div className="w-[1px] h-4 bg-[var(--border-light)] mx-1" />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRequestSuggestion}
                disabled={isRequestingSuggestion}
                className="h-8 gap-1.5 font-black text-[10px] text-[var(--accent)] bg-[var(--bg-sidebar)] hover:bg-[var(--bg-sidebar-hover)] hover:text-white px-4 rounded-full border border-[var(--accent)]/20 shadow-lg shadow-black/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {isRequestingSuggestion ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 fill-[var(--accent)]/20" />
                )}
                ASISTENTE IA
              </Button>
            </div>

            <Button 
              onClick={handleSend}
              disabled={!inputText.trim()}
              className={cn(
                "h-9 px-5 gap-2 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-xl",
                mode === 'internal' 
                  ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-200" 
                  : "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] shadow-[var(--accent)]/20"
              )}
            >
              <Send className="w-3.5 h-3.5" />
              {mode === 'internal' ? 'Guardar Nota' : 'Enviar mensaje'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
