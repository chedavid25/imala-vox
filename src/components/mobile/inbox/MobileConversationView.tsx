"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, ChevronLeft, Info, Plus, Paperclip, Smile, Loader2, Clock, CornerUpRight, CornerUpLeft, X, Search as SearchIcon, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/Avatar";
import { MobileContactSheet } from "./MobileContactSheet";
import { db } from "@/lib/firebase";
import { doc, updateDoc, Timestamp, collection, addDoc, getDocs, query } from "firebase/firestore";
import { COLLECTIONS, Contacto } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { enviarMensajeAccion } from "@/app/actions/channels";
import { getDoc } from "firebase/firestore";
import { useContactos } from "@/hooks/useContactos";
import { CanalBadge } from "@/components/ui/CanalBadge";
import { cn } from "@/lib/utils";

const shouldShowText = (text: string, mediaType?: string) => {
  if (!text) return false;
  if (mediaType === 'audio' && text === '[Audio]') return false;
  const isLabel = /^\[(Imagen|Video|Audio|Archivo|Sticker)(:\s*.*)?\]$/i.test(text.trim());
  return !isLabel;
};

interface MobileConversationViewProps {
  conversacion: any;
  mensajes: any[];
  onSendMessage: (text: string, isInternal?: boolean, replyToMsg?: any) => void;
  onBack: () => void;
  onOpenIAAssistant?: () => void;
  isRequestingSuggestion?: boolean;
}

export function MobileConversationView({
  conversacion,
  mensajes,
  onSendMessage,
  onBack,
  onOpenIAAssistant,
  isRequestingSuggestion
}: MobileConversationViewProps) {
  const { contactos } = useContactos();
  const { currentWorkspaceId } = useWorkspaceStore();
  const [inputText, setInputText] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [forwardMsg, setForwardMsg] = useState<any | null>(null);
  const [forwardSearch, setForwardSearch] = useState("");
  const [allConversaciones, setAllConversaciones] = useState<any[]>([]);
  const [isForwarding, setIsForwarding] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);

  const renderMessage = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, i) => {
      let processed = line;
      processed = processed.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
      processed = processed.replace(/_(.*?)_/g, '<em>$1</em>');
      return (
        <span key={i}>
          <span dangerouslySetInnerHTML={{ __html: processed }} />
          {i < lines.length - 1 && <br />}
        </span>
      );
    });
  };

  const handleTogglePendiente = async () => {
    if (!currentWorkspaceId || !conversacion?.id) return;
    const nuevoEstado = !conversacion.pendiente;
    try {
      const convRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONVERSACIONES, conversacion.id);
      await updateDoc(convRef, { 
        pendiente: nuevoEstado,
        actualizadoEl: Timestamp.now()
      });
      toast.success(nuevoEstado ? "Marcada como pendiente" : "Desmarcada como pendiente");
    } catch (error) {
      toast.error("Error al actualizar pendiente");
    }
  };

  const handleDiscardSuggestion = async () => {
    if (!currentWorkspaceId || !conversacion?.id) return;
    try {
      const convRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONVERSACIONES, conversacion.id);
      await updateDoc(convRef, { sugerenciaIA: null });
    } catch (e) {
      console.warn('[MobileInbox] Error al descartar sugerencia', e);
    }
  };

  const handleForwardMessage = async (destConv: any) => {
    if (!currentWorkspaceId || !forwardMsg) return;
    setIsForwarding(true);
    try {
      const destId = destConv.id;
      const text = forwardMsg.text || "";
      const metadata = forwardMsg.metadata 
        ? { ...forwardMsg.metadata, isForwarded: true } 
        : { isForwarded: true };

      // Guardar el mensaje en la base de datos de la conversación destino
      const messagesRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONVERSACIONES, destId, COLLECTIONS.MENSAJES);
      await addDoc(messagesRef, {
        text,
        from: 'operator',
        creadoEl: Timestamp.now(),
        metadata
      });

      // Actualizar la última actividad en la conversación destino
      const convRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONVERSACIONES, destId);
      await updateDoc(convRef, {
        ultimoMensaje: text || (metadata.mediaType === 'image' ? '📎 Imagen' : '📎 Archivo'),
        ultimaActividad: Timestamp.now()
      });

      // Si es WhatsApp o similar y tiene destinatario mapeado en el contacto
      const contactSnap = await getDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS, destConv.contactoId));
      if (contactSnap.exists()) {
        const contactData = contactSnap.data() as any;
        const destinatario = contactData.metaId || contactData.telefono;
        if (destinatario && !metadata.isInternalNote) {
          const mediaObj = metadata.mediaUrl ? { tipo: metadata.mediaType as 'image' | 'video' | 'document', url: metadata.mediaUrl } : undefined;
          await enviarMensajeAccion(currentWorkspaceId, destConv.canalId, destinatario, text || undefined, mediaObj);
        }
      }

      toast.success("Mensaje reenviado con éxito");
      setForwardMsg(null);
    } catch (error: any) {
      console.error("Error reenviando mensaje:", error);
      toast.error("No se pudo reenviar el mensaje");
    } finally {
      setIsForwarding(false);
    }
  };

  useEffect(() => {
    if (forwardMsg && currentWorkspaceId) {
      const convsRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONVERSACIONES);
      getDocs(query(convsRef)).then(snap => {
        setAllConversaciones(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }
  }, [forwardMsg, currentWorkspaceId]);

  const selectedContact = contactos.find(c => c.id === conversacion?.contactoId);
  const contactName = selectedContact?.nombre || conversacion?.contactoNombre || "Desconocido";
  const contactFoto = selectedContact?.avatarUrl || null;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensajes]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    
    // Feedback háptico (vibración corta)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }

    onSendMessage(inputText, false, replyingTo);
    setInputText("");
    setReplyingTo(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#E5DDD5] relative overflow-hidden">
      {/* Fondo con textura sutil (simulado) */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />

      {/* Header Mobile Estilo WhatsApp */}
      <header className="px-3 py-2.5 bg-[#1F1F1E] text-white flex items-center gap-2 z-20 shadow-md">
        <button onClick={onBack} className="p-1 -ml-1 active:bg-white/10 rounded-full transition-colors">
          <ChevronLeft size={28} className="text-[#C8FF00]" />
        </button>
        
        <div className="flex flex-1 items-center gap-3 overflow-hidden" onClick={() => setIsSheetOpen(true)}>
          <Avatar 
            src={contactFoto} 
            name={contactName} 
            size="md"
            className="border border-white/10"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-bold truncate leading-tight tracking-tight">
                {contactName}
              </h3>
              <CanalBadge 
                canal={conversacion.canal || 'whatsapp'} 
                showIcon={false} 
                className="scale-[0.7] origin-left border border-white/20" 
              />
            </div>
            <p className="text-[10px] font-semibold text-white/50 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
              <span className="size-1.5 bg-emerald-500 rounded-full animate-pulse" />
              En línea
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={handleTogglePendiente} 
            className={cn(
              "p-2 rounded-full transition-colors active:scale-95",
              conversacion.pendiente ? "text-amber-400 bg-amber-400/10" : "text-white/75"
            )}
          >
            <Clock size={20} />
          </button>
          <button onClick={() => setIsSheetOpen(true)} className="p-2 text-white/70 active:text-[var(--accent)] transition-colors">
            <Info size={20} />
          </button>
        </div>
      </header>

      {/* Mensajes */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 z-10 custom-scrollbar"
      >
        {mensajes.map((msg, idx) => {
          const isMe = msg.from === 'operator';
          const isNote = msg.from === 'system' || msg.metadata?.isInternalNote;

          return (
            <div key={msg.id || idx} className={cn(
              "flex w-full flex-col",
              isMe ? "items-end" : "items-start"
            )}>
              {/* Indicador Reenviado */}
              {msg.metadata?.isForwarded && (
                <span className="flex items-center gap-0.5 text-[9px] italic text-slate-400 mb-0.5 px-2">
                  <CornerUpRight size={10} className="text-slate-400" />
                  Reenviado
                </span>
              )}

              <div className="flex items-center gap-1.5 group max-w-[85%]">
                {/* Botones de Acción Móvil al lado del mensaje (Cliente) */}
                {!isMe && !isNote && (
                  <div className="flex items-center">
                    <button 
                      onClick={() => setReplyingTo(msg)}
                      className="p-1.5 active:bg-slate-200/50 rounded-full text-slate-400"
                      title="Responder"
                    >
                      <CornerUpLeft size={16} />
                    </button>
                    <button 
                      onClick={() => setForwardMsg(msg)}
                      className="p-1.5 active:bg-slate-200/50 rounded-full text-slate-400"
                      title="Reenviar"
                    >
                      <CornerUpRight size={16} />
                    </button>
                  </div>
                )}

                <div className={cn(
                  "rounded-2xl p-3 shadow-sm relative flex flex-col gap-2",
                  isNote 
                    ? "bg-amber-50 border border-amber-100 text-amber-900 mx-auto text-center text-xs italic" 
                    : isMe 
                      ? "bg-[#D9FDD3] text-slate-800 rounded-tr-none after:absolute after:top-0 after:-right-2 after:w-3 after:h-4 after:bg-[#D9FDD3] after:[clip-path:polygon(0_0,0_100%,100%_0)]" 
                      : "bg-white text-slate-800 rounded-tl-none after:absolute after:top-0 after:-left-2 after:w-3 after:h-4 after:bg-white after:[clip-path:polygon(100%_0,100%_100%,0_0)]"
                )}>
                  {/* Mensaje Citado en Celular */}
                  {msg.metadata?.replyToText && (
                    <div className={cn(
                      "p-2 rounded-lg border-l-4 text-xs mb-1 flex flex-col gap-0.5 max-w-full select-none cursor-pointer",
                      isMe 
                        ? "bg-black/10 border-slate-700 text-slate-800" 
                        : "bg-slate-100 border-slate-500 text-slate-700"
                    )}
                    onClick={() => {
                      const target = document.getElementById(msg.metadata.replyToId);
                      if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                    >
                      <span className={cn(
                        "font-bold text-[9px] uppercase",
                        isMe ? "text-slate-800" : "text-slate-500"
                      )}>
                        {msg.metadata.replyToFrom === 'operator' ? 'Tú (Operador)' : 'Cliente'}
                      </span>
                      <span className="truncate max-w-[180px]">{msg.metadata.replyToText}</span>
                    </div>
                  )}

                  {msg.metadata?.mediaUrl && (
                    <div className="w-full">
                      {msg.metadata.mediaType === "image" && (
                        <div className="relative inline-block">
                          <img 
                            src={msg.metadata.mediaUrl} 
                            alt={msg.metadata.fileName || "Imagen"} 
                            className="max-w-full max-h-60 rounded-xl object-cover cursor-pointer hover:opacity-95 active:scale-98 transition-all"
                            onClick={() => window.open(msg.metadata.mediaUrl, "_blank")}
                          />
                          <a
                            href={`/api/download?url=${encodeURIComponent(msg.metadata.mediaUrl)}&filename=${encodeURIComponent(msg.metadata.fileName || "imagen")}`}
                            download={msg.metadata.fileName || "imagen"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute top-2 right-2 p-2 bg-black/60 active:bg-black/80 text-white rounded-lg shadow-lg flex items-center justify-center"
                            title="Descargar imagen"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download size={16} />
                          </a>
                        </div>
                      )}
                      {msg.metadata.mediaType === "video" && (
                        <div className="relative inline-block">
                          <video 
                            src={msg.metadata.mediaUrl} 
                            controls 
                            className="max-w-full rounded-xl shadow-sm"
                          />
                          <a
                            href={`/api/download?url=${encodeURIComponent(msg.metadata.mediaUrl)}&filename=${encodeURIComponent(msg.metadata.fileName || "video.mp4")}`}
                            download={msg.metadata.fileName || "video.mp4"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute top-2 right-2 p-2 bg-black/60 active:bg-black/80 text-white rounded-lg shadow-lg flex items-center justify-center z-10"
                            title="Descargar video"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download size={16} />
                          </a>
                        </div>
                      )}
                      {(msg.metadata.mediaType === "audio" || (msg.metadata.fileName && (msg.metadata.fileName.endsWith('.bin') || msg.metadata.fileName.endsWith('.ogg') || msg.metadata.fileName.endsWith('.opus') || msg.metadata.fileName.endsWith('.aac') || msg.metadata.fileName.endsWith('.mp3')) && msg.text === '[Audio]')) && (
                        <audio controls className="max-w-full rounded-xl shadow-sm">
                          <source src={msg.metadata.mediaUrl} type="audio/ogg" />
                          <source src={msg.metadata.mediaUrl} type="audio/mpeg" />
                          <source src={msg.metadata.mediaUrl} type="audio/wav" />
                          Tu navegador no soporta el elemento de audio.
                        </audio>
                      )}
                      {msg.metadata.mediaType === "document" && !(msg.metadata.fileName && (msg.metadata.fileName.endsWith('.bin') || msg.metadata.fileName.endsWith('.ogg') || msg.metadata.fileName.endsWith('.opus') || msg.metadata.fileName.endsWith('.aac') || msg.metadata.fileName.endsWith('.mp3')) && msg.text === '[Audio]') && (
                        <div className="relative w-full">
                          <a 
                            href={msg.metadata.mediaUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className={cn(
                              "flex items-center gap-2.5 p-3 pr-10 rounded-xl border transition-all text-xs font-semibold select-none",
                              isMe 
                                ? "bg-black/5 hover:bg-black/10 border-black/10 text-slate-800" 
                                : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800"
                            )}
                          >
                            <FileText className="size-5 shrink-0 text-slate-500" />
                            <span className="truncate max-w-[130px]">{msg.metadata.fileName || "Descargar archivo"}</span>
                          </a>
                          <a
                            href={`/api/download?url=${encodeURIComponent(msg.metadata.mediaUrl)}&filename=${encodeURIComponent(msg.metadata.fileName || "archivo")}`}
                            download={msg.metadata.fileName || "archivo"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg shadow-sm flex items-center justify-center",
                              isMe 
                                ? "bg-black/10 active:bg-black/20 text-slate-700" 
                                : "bg-slate-200 active:bg-slate-300 text-slate-700"
                            )}
                            title="Descargar archivo"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download size={14} />
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {msg.text && (!msg.metadata?.mediaUrl || shouldShowText(msg.text, msg.metadata?.mediaType)) && (
                    <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{renderMessage(msg.text)}</p>
                  )}
                  <div className="flex justify-end mt-1">
                    <span className="text-[9px] font-semibold text-slate-400 tabular-nums uppercase tracking-tighter">
                      {msg.creadoEl ? new Date(msg.creadoEl.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                </div>

                {/* Botones de Acción Móvil al lado del mensaje (Operador) */}
                {isMe && !isNote && (
                  <div className="flex items-center">
                    <button 
                      onClick={() => setReplyingTo(msg)}
                      className="p-1.5 active:bg-slate-200/50 rounded-full text-slate-400"
                      title="Responder"
                    >
                      <CornerUpLeft size={16} />
                    </button>
                    <button 
                      onClick={() => setForwardMsg(msg)}
                      className="p-1.5 active:bg-slate-200/50 rounded-full text-slate-400"
                      title="Reenviar"
                    >
                      <CornerUpRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Composer Area */}
      <div className="p-2 bg-transparent z-20 space-y-2">
        {/* Sugerencia IA si está disponible */}
        {conversacion.sugerenciaIA && (
          <div className="mx-2 bg-white rounded-2xl p-3 shadow-lg border-l-4 border-purple-500 animate-in slide-in-from-bottom-4">
             <div className="flex items-center gap-2 mb-1.5">
               <Sparkles size={14} className="text-purple-500" />
               <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-widest">Sugerencia IA</span>
             </div>
             <p className="text-sm text-slate-600 leading-snug">{conversacion.sugerenciaIA}</p>
             <div className="flex justify-end gap-2 mt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs font-semibold text-slate-400"
                  onClick={handleDiscardSuggestion}
                >
                  Descartar
                </Button>
                <Button 
                  size="sm" 
                  className="h-7 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() => { setInputText(conversacion.sugerenciaIA); }}
                >
                  Usar texto
                </Button>
             </div>
          </div>
        )}

        {/* Visualización de responder/citar en Móvil */}
        {replyingTo && (
          <div className="mx-2 bg-white rounded-2xl p-3 shadow-lg border-l-4 border-emerald-500 flex items-center justify-between gap-3 animate-in slide-in-from-top-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-widest">
                Respondiendo a {replyingTo.from === 'operator' ? 'Tú (Operador)' : 'Cliente'}
              </p>
              <p className="text-sm text-slate-600 truncate mt-0.5">{replyingTo.text}</p>
            </div>
            <button 
              onClick={() => setReplyingTo(null)}
              className="p-1 active:bg-slate-100 rounded-full text-slate-400 hover:text-red-500"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1 bg-white rounded-[24px] px-4 py-2 flex items-end gap-2 shadow-sm border border-slate-200">
             <button className="p-1.5 text-slate-400 hover:text-slate-600">
               <Plus size={24} />
              </button>
              <Textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Escribe un mensaje"
                rows={1}
                className="flex-1 border-none bg-transparent focus-visible:ring-0 resize-none min-h-[40px] max-h-[120px] p-2 text-sm leading-tight no-scrollbar"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button 
                onClick={onOpenIAAssistant}
                className="p-1.5 text-slate-400 hover:text-[var(--accent)]"
              >
                {isRequestingSuggestion ? <Loader2 className="size-5 animate-spin" /> : <Sparkles size={22} />}
              </button>
          </div>

          <button 
            onClick={handleSend}
            disabled={!inputText.trim()}
            className={cn(
              "size-12 rounded-full flex items-center justify-center shadow-md transition-all active:scale-90",
              inputText.trim() ? "bg-emerald-500 text-white" : "bg-slate-300 text-slate-50"
            )}
          >
            <Send size={20} />
          </button>
        </div>
        
        {/* Safe area padding para el input */}
        <div style={{ height: "env(safe-area-inset-bottom)" }} />
      </div>

      {/* Sheet de Contacto */}
      <MobileContactSheet 
        open={isSheetOpen} 
        onClose={() => setIsSheetOpen(false)} 
        contactoId={conversacion.contactoId} 
        conversacion={conversacion}
      />

      {/* Modal de Reenvío Móvil */}
      <Dialog open={!!forwardMsg} onOpenChange={(open) => !open && setForwardMsg(null)}>
        <DialogContent className="max-w-xs bg-white rounded-2xl p-5 border-none shadow-2xl z-[300]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900">Reenviar mensaje a...</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar contacto..."
                className="pl-9 bg-slate-50 border-none text-xs h-9 rounded-xl focus:bg-white transition-all"
                value={forwardSearch}
                onChange={(e) => setForwardSearch(e.target.value)}
              />
            </div>
            
            <div className="space-y-1.5 max-h-[240px] overflow-y-auto no-scrollbar">
              {allConversaciones
                .filter(c => {
                  const contact = contactos.find(cnt => cnt.id === c.contactoId);
                  const name = contact?.nombre || c.contactoNombre || "";
                  return name.toLowerCase().includes(forwardSearch.toLowerCase());
                })
                .map(c => {
                  const contact = contactos.find(cnt => cnt.id === c.contactoId);
                  const name = contact?.nombre || c.contactoNombre || "Desconocido";
                  const avatar = contact?.avatarUrl || null;
                  
                  return (
                    <div key={c.id} className="flex items-center justify-between p-2 active:bg-slate-50 rounded-xl transition-all">
                      <div className="flex items-center gap-2.5">
                        <Avatar src={avatar} name={name} size="sm" className="w-8 h-8" />
                        <span className="text-xs font-bold text-slate-700">{name}</span>
                      </div>
                      <Button
                        size="sm"
                        disabled={isForwarding}
                        onClick={() => handleForwardMessage(c)}
                        className="h-7 px-3 text-[10px] bg-slate-900 text-white hover:bg-slate-800 rounded-lg"
                      >
                        Enviar
                      </Button>
                    </div>
                  );
                })}
              {allConversaciones.length === 0 && (
                <p className="text-[10px] text-slate-400 text-center py-4 italic">No hay conversaciones activas</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
