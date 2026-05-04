"use client";

import React, { useState, useRef, useEffect } from "react";
import { CanalBadge } from "@/components/ui/CanalBadge";
import { useContactos } from "@/hooks/useContactos";
import { IndicadorIA } from "@/components/ui/IndicadorIA";
import { cn } from "@/lib/utils";
import { Send, Sparkles, ChevronLeft, Info, Plus, Paperclip, Smile, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/Avatar";
import { MobileContactSheet } from "./MobileContactSheet";

interface MobileConversationViewProps {
  conversacion: any;
  mensajes: any[];
  onSendMessage: (text: string, isInternal?: boolean) => void;
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
  const [inputText, setInputText] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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

    onSendMessage(inputText, false);
    setInputText("");
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
              "flex w-full",
              isMe ? "justify-end" : "justify-start"
            )}>
              <div className={cn(
                "max-w-[85%] rounded-2xl p-3 shadow-sm relative",
                isNote 
                  ? "bg-amber-50 border border-amber-100 text-amber-900 mx-auto text-center text-xs italic" 
                  : isMe 
                    ? "bg-[#D9FDD3] text-slate-800 rounded-tr-none after:absolute after:top-0 after:-right-2 after:w-3 after:h-4 after:bg-[#D9FDD3] after:[clip-path:polygon(0_0,0_100%,100%_0)]" 
                    : "bg-white text-slate-800 rounded-tl-none after:absolute after:top-0 after:-left-2 after:w-3 after:h-4 after:bg-white after:[clip-path:polygon(100%_0,100%_100%,0_0)]"
              )}>
                <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                <div className="flex justify-end mt-1">
                  <span className="text-[9px] font-semibold text-slate-400 tabular-nums uppercase tracking-tighter">
                    {msg.creadoEl ? new Date(msg.creadoEl.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
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
                  onClick={async () => { /* Logic to discard */ }}
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
      />
    </div>
  );
}
